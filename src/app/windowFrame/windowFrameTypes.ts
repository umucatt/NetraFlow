import type { HTMLAttributes, ReactNode } from 'react';

export type WindowFrameController = {
  isMaximized: boolean;
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
};

export type WindowFrameProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  productIconPath: string;
  productName: string;
  contentInert?: boolean;
};

export type WindowTitleBarProps = {
  controller: WindowFrameController;
  productIconPath: string;
  productName: string;
  showBrand: boolean;
  showWindowControls: boolean;
};

export type WindowControlsProps = WindowFrameController;

export type WindowControl = 'minimize' | 'maximize' | 'close';

export type WindowControlIconName = WindowControl | 'restore';
