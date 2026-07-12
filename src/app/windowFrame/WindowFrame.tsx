import { WindowBackdrop } from './WindowBackdrop';
import { WindowTitleBar } from './WindowTitleBar';
import { useWindowFrameController } from './useWindowFrameController';
import {
  areCustomWindowControlsVisible,
  isCustomWindowTitleBrandVisible,
  isCustomWindowTitleBarVisible
} from './windowTitleBarLogic';
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
  const showTitleBar = isCustomWindowTitleBarVisible(platform);
  const showBrand = isCustomWindowTitleBrandVisible(platform);
  const showWindowControls = areCustomWindowControlsVisible(platform);
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
      {showTitleBar ? (
        <WindowTitleBar
          controller={controller}
          productIconPath={productIconPath}
          productName={productName}
          showBrand={showBrand}
          showWindowControls={showWindowControls}
        />
      ) : null}
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
