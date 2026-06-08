import {
  useId,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type {
  NfFloatingTooltipData,
  NfFloatingTooltipProps,
  NfTooltipPlacement
} from './nfTooltipTypes';

const FLOATING_TOOLTIP_OFFSET_PX = 14;
const VIEWPORT_PADDING_PX = 8;

type TooltipPosition = {
  top: number;
  left: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const hasTooltipContent = (content: ReactNode) =>
  content !== null && content !== undefined && content !== false;

const getFloatingTooltipPosition = (
  tooltip: NfFloatingTooltipData,
  tooltipRect: DOMRect,
  placement: NfTooltipPlacement
): TooltipPosition => {
  const centeredLeft = tooltip.x - tooltipRect.width / 2;
  const centeredTop = tooltip.y - tooltipRect.height / 2;

  const rawPosition: TooltipPosition =
    placement === 'bottom'
      ? {
          top: tooltip.y + FLOATING_TOOLTIP_OFFSET_PX,
          left: centeredLeft
        }
      : placement === 'left'
        ? {
            top: centeredTop,
            left: tooltip.x - tooltipRect.width - FLOATING_TOOLTIP_OFFSET_PX
          }
        : placement === 'right'
          ? {
              top: centeredTop,
              left: tooltip.x + FLOATING_TOOLTIP_OFFSET_PX
            }
          : {
              top: tooltip.y - tooltipRect.height - FLOATING_TOOLTIP_OFFSET_PX,
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

export default function NfFloatingTooltip({
  tooltip,
  placement = 'top',
  className = ''
}: NfFloatingTooltipProps) {
  const reactId = useId();
  const tooltipId = `nf-floating-tooltip-${reactId.replace(/:/g, '')}`;
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const shouldRenderTooltip =
    tooltip !== null &&
    hasTooltipContent(tooltip.content) &&
    typeof document !== 'undefined';

  useLayoutEffect(() => {
    if (!shouldRenderTooltip || tooltip === null) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const tooltipElement = tooltipRef.current;

      if (!tooltipElement) {
        return;
      }

      setPosition(
        getFloatingTooltipPosition(
          tooltip,
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
  }, [placement, shouldRenderTooltip, tooltip]);

  if (!shouldRenderTooltip || tooltip === null) {
    return null;
  }

  return createPortal(
    <div
      id={tooltipId}
      ref={tooltipRef}
      role="tooltip"
      className={['nf-tooltip', `nf-tooltip--${placement}`, 'nf-tooltip--chart', className]
        .filter(Boolean)
        .join(' ')}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        opacity: position ? undefined : 0
      }}
    >
      {tooltip.content}
    </div>,
    document.body
  );
}
