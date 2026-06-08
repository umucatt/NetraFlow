import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type { NfTooltipPlacement, NfTooltipProps } from './nfTooltipTypes';

const DEFAULT_TOOLTIP_DELAY_MS = 420;
const TOOLTIP_OFFSET_PX = 9;
const VIEWPORT_PADDING_PX = 8;

type TooltipPosition = {
  top: number;
  left: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const hasTooltipContent = (content: ReactNode) =>
  content !== null && content !== undefined && content !== false;

const getTooltipPosition = (
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: NfTooltipPlacement
): TooltipPosition => {
  const centeredLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
  const centeredTop = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;

  const rawPosition: TooltipPosition =
    placement === 'bottom'
      ? {
          top: triggerRect.bottom + TOOLTIP_OFFSET_PX,
          left: centeredLeft
        }
      : placement === 'left'
        ? {
            top: centeredTop,
            left: triggerRect.left - tooltipRect.width - TOOLTIP_OFFSET_PX
          }
        : placement === 'right'
          ? {
              top: centeredTop,
              left: triggerRect.right + TOOLTIP_OFFSET_PX
            }
          : {
              top: triggerRect.top - tooltipRect.height - TOOLTIP_OFFSET_PX,
              left: centeredLeft
            };

  return {
    top: clamp(
      rawPosition.top,
      VIEWPORT_PADDING_PX,
      window.innerHeight - tooltipRect.height - VIEWPORT_PADDING_PX
    ),
    left: clamp(
      rawPosition.left,
      VIEWPORT_PADDING_PX,
      window.innerWidth - tooltipRect.width - VIEWPORT_PADDING_PX
    )
  };
};

const mergeDescribedBy = (
  child: ReactElement,
  tooltipId: string,
  isVisible: boolean
) => {
  if (!isVisible) {
    return child;
  }

  const childProps = child.props as Record<string, unknown>;
  const existingDescribedBy =
    typeof childProps['aria-describedby'] === 'string'
      ? childProps['aria-describedby']
      : '';
  const describedBy = [existingDescribedBy, tooltipId].filter(Boolean).join(' ');

  return cloneElement(child as ReactElement<Record<string, unknown>>, {
    'aria-describedby': describedBy
  });
};

export default function NfTooltip({
  content,
  children,
  placement = 'top',
  delayMs = DEFAULT_TOOLTIP_DELAY_MS,
  disabled = false,
  className = '',
  wrap = false
}: NfTooltipProps) {
  const reactId = useId();
  const tooltipId = `nf-tooltip-${reactId.replace(/:/g, '')}`;
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const shouldRenderTooltip =
    isVisible &&
    !disabled &&
    hasTooltipContent(content) &&
    typeof document !== 'undefined';

  const clearShowTimer = () => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  const hideTooltip = () => {
    clearShowTimer();
    setIsVisible(false);
    setPosition(null);
  };

  const scheduleShowTooltip = () => {
    if (disabled || !hasTooltipContent(content) || typeof window === 'undefined') {
      return;
    }

    clearShowTimer();
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      setIsVisible(true);
    }, delayMs);
  };

  useEffect(
    () => () => {
      clearShowTimer();
    },
    []
  );

  useEffect(() => {
    if (disabled || !hasTooltipContent(content)) {
      hideTooltip();
    }
  }, [content, disabled]);

  useLayoutEffect(() => {
    if (!shouldRenderTooltip) {
      return;
    }

    const updatePosition = () => {
      const triggerElement = triggerRef.current;
      const tooltipElement = tooltipRef.current;

      if (!triggerElement || !tooltipElement) {
        return;
      }

      setPosition(
        getTooltipPosition(
          triggerElement.getBoundingClientRect(),
          tooltipElement.getBoundingClientRect(),
          placement
        )
      );
    };

    updatePosition();

    const frameId = window.requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [placement, shouldRenderTooltip, content]);

  return (
    <>
      <span
        ref={triggerRef}
        className={['nf-tooltip-trigger', className].filter(Boolean).join(' ')}
        onMouseEnter={scheduleShowTooltip}
        onMouseLeave={hideTooltip}
        onFocus={scheduleShowTooltip}
        onBlur={hideTooltip}
      >
        {mergeDescribedBy(children, tooltipId, shouldRenderTooltip)}
      </span>
      {shouldRenderTooltip
        ? createPortal(
            <div
              id={tooltipId}
              ref={tooltipRef}
              role="tooltip"
              className={[
                'nf-tooltip',
                `nf-tooltip--${placement}`,
                wrap ? 'nf-tooltip--wrap' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                opacity: position ? undefined : 0
              }}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
