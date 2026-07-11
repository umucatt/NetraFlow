import type {
  CSSProperties,
  HTMLAttributes,
  MouseEventHandler,
  ReactNode,
  RefObject,
  UIEventHandler
} from 'react';

export type AppShellMainContentPosition = 'left' | 'right';

export type AppShellProps = {
  children?: ReactNode;
  className: string;
  mainContentPosition?: AppShellMainContentPosition;
  style?: CSSProperties;
  shellProps?: Omit<HTMLAttributes<HTMLElement>, 'children' | 'className' | 'style'>;
  hiddenControls?: ReactNode;
  focusRestoreRef?: RefObject<HTMLElement | null>;
  mainContent: ReactNode;
  mainContentRef?: RefObject<HTMLElement | null>;
  mainContentClassName: string;
  mainContentAriaDisabled?: boolean;
  onMainContentClick?: MouseEventHandler<HTMLElement>;
  onMainContentScroll?: UIEventHandler<HTMLElement>;
  rightPanel?: ReactNode;
  rightPanelRef?: RefObject<HTMLElement | null>;
  rightPanelClassName?: string;
  rightPanelAriaLabel: string;
  onRightPanelClick?: MouseEventHandler<HTMLElement>;
  onRightPanelScroll?: UIEventHandler<HTMLElement>;
};
