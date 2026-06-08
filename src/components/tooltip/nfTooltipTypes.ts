import type { ReactElement, ReactNode } from 'react';

export type NfTooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export type NfFloatingTooltipData = {
  content: ReactNode;
  x: number;
  y: number;
};

export type NfTooltipProps = {
  content: ReactNode;
  children: ReactElement;
  placement?: NfTooltipPlacement;
  delayMs?: number;
  disabled?: boolean;
  className?: string;
  wrap?: boolean;
};

export type NfFloatingTooltipProps = {
  tooltip: NfFloatingTooltipData | null;
  placement?: NfTooltipPlacement;
  className?: string;
};
