export type LockScreenState =
  | 'locked'
  | 'authenticating'
  | 'unlock-exiting'
  | 'unlocked';

export const isLockScreenVisible = (state: LockScreenState) => state !== 'unlocked';

export const isAppContentInertForLockScreen = (state: LockScreenState) =>
  state !== 'unlocked';

export const isLockScreenPanelExiting = (state: LockScreenState) =>
  state === 'unlock-exiting';
