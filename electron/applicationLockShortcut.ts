export const LOCK_ACCELERATOR = 'CommandOrControl+Shift+L';

export type ApplicationLockShortcutInput = {
  type: string;
  key: string;
  shift: boolean;
  control: boolean;
  meta: boolean;
  alt: boolean;
  isAutoRepeat?: boolean;
  isComposing?: boolean;
};

export const isApplicationLockShortcut = (
  platform: NodeJS.Platform,
  input: ApplicationLockShortcutInput
) => {
  if (
    input.type !== 'keyDown' ||
    input.key.toLocaleLowerCase() !== 'l' ||
    !input.shift ||
    input.alt ||
    input.isAutoRepeat ||
    input.isComposing
  ) {
    return false;
  }

  return platform === 'darwin'
    ? input.meta && !input.control
    : input.control && !input.meta;
};

export type RendererLockCommandState = {
  rendererReady: boolean;
  applicationLockAllowed: boolean;
  passwordProtectionEnabled: boolean;
  isLocked: boolean;
  isUnlocking: boolean;
  lockRequestInProgress: boolean;
  isDestructiveShutdown: boolean;
  isAppQuitInProgress: boolean;
  hasUsableWindow: boolean;
};

export const canRequestRendererLockCommand = ({
  rendererReady,
  applicationLockAllowed,
  isLocked,
  isUnlocking,
  lockRequestInProgress,
  isDestructiveShutdown,
  isAppQuitInProgress,
  hasUsableWindow
}: RendererLockCommandState) =>
  rendererReady &&
  applicationLockAllowed &&
  !isLocked &&
  !isUnlocking &&
  !lockRequestInProgress &&
  !isDestructiveShutdown &&
  !isAppQuitInProgress &&
  hasUsableWindow;
