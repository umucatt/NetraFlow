import { WindowBackdrop } from './WindowBackdrop';
import { WindowTitleBar } from './WindowTitleBar';
import { useWindowFrameController } from './useWindowFrameController';
import { isCustomWindowTitleBrandVisible } from './windowTitleBarLogic';
import type { WindowFrameProps } from './windowFrameTypes';

export function WindowFrame({
  children,
  className,
  productIconPath,
  productName,
  contentInert = false,
  ...frameProps
}: WindowFrameProps) {
  const controller = useWindowFrameController();
  const platform = window.appInfo?.platform ?? 'win32';
  const showBrand = isCustomWindowTitleBrandVisible(platform);
  const showWindowControls = platform === 'win32';
  const frameClassName = [
    'window-frame',
    `window-frame--${platform}`,
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
        showBrand={showBrand}
        showWindowControls={showWindowControls}
      />
      <div
        className="window-frame__content"
        inert={contentInert || undefined}
        aria-hidden={contentInert || undefined}
      >
        {children}
      </div>
    </div>
  );
}
