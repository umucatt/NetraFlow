import {
  NfWindowCloseIcon,
  NfWindowMaximizeIcon,
  NfWindowMinimizeIcon,
  NfWindowRestoreIcon
} from '../../assets/icons';
import NfSvgIcon from '../../components/NfSvgIcon';

import type {
  WindowControl,
  WindowControlIconName,
  WindowControlsProps
} from './windowFrameTypes';

const WINDOW_CONTROL_ICONS: Record<WindowControlIconName, string> = {
  minimize: NfWindowMinimizeIcon,
  maximize: NfWindowMaximizeIcon,
  restore: NfWindowRestoreIcon,
  close: NfWindowCloseIcon
};

const renderWindowControlIcon = (
  control: WindowControl,
  isMaximized = false
) => {
  const iconName: WindowControlIconName =
    control === 'maximize' && isMaximized ? 'restore' : control;

  return (
    <NfSvgIcon
      svg={WINDOW_CONTROL_ICONS[iconName]}
      className={`window-control-icon window-control-icon--${iconName}`}
      decorative
    />
  );
};

export function WindowControls({
  isMaximized,
  minimize,
  toggleMaximize,
  close
}: WindowControlsProps) {
  return (
    <div className="window-frame__controls window-controls">
      <button
        type="button"
        className="window-frame__control window-control-button"
        onPointerUp={minimize}
        aria-label="最小化"
      >
        {renderWindowControlIcon('minimize')}
      </button>
      <button
        type="button"
        className={`window-frame__control window-control-button${
          isMaximized ? ' maximized' : ''
        }`}
        onPointerUp={toggleMaximize}
        aria-label={isMaximized ? '还原' : '最大化'}
      >
        {renderWindowControlIcon('maximize', isMaximized)}
      </button>
      <button
        type="button"
        className="window-frame__control window-control-button window-control-button--close"
        onPointerUp={close}
        aria-label="关闭"
      >
        {renderWindowControlIcon('close')}
      </button>
    </div>
  );
}
