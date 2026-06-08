import { WindowBackdrop } from './WindowBackdrop';
import { WindowTitleBar } from './WindowTitleBar';
import { useWindowFrameController } from './useWindowFrameController';
import type { WindowFrameProps } from './windowFrameTypes';

export function WindowFrame({
  children,
  className,
  productIconPath,
  productName,
  ...frameProps
}: WindowFrameProps) {
  const controller = useWindowFrameController();
  const frameClassName = [
    'window-frame',
    controller.isMaximized ? 'is-maximized' : '',
    className ?? ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={frameClassName} {...frameProps}>
      <WindowBackdrop />
      <WindowTitleBar
        controller={controller}
        productIconPath={productIconPath}
        productName={productName}
      />
      <div className="window-frame__content">{children}</div>
    </div>
  );
}
