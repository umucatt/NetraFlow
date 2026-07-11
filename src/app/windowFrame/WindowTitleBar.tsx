import { WindowControls } from './WindowControls';
import type { WindowTitleBarProps } from './windowFrameTypes';

export function WindowTitleBar({
  controller,
  productIconPath,
  productName,
  showBrand,
  showWindowControls
}: WindowTitleBarProps) {
  return (
    <header
      className="window-frame__titlebar window-titlebar"
      aria-label="Application title bar"
    >
      {showBrand ? (
        <div className="window-frame__brand window-titlebar__brand">
          <img
            src={productIconPath}
            alt=""
            aria-hidden="true"
            className="window-frame__brand-icon window-titlebar__icon"
          />
          <strong className="window-frame__brand-title window-titlebar__title">
            {productName}
          </strong>
        </div>
      ) : null}

      <div className="window-frame__titlebar-drag" aria-hidden="true" />

      {showWindowControls ? <WindowControls {...controller} /> : null}
    </header>
  );
}
