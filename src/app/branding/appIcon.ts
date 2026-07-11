export type AppIconPlatform = 'win32' | 'darwin' | 'linux' | undefined;

export const getAppIconResource = (platform: AppIconPlatform) =>
  platform === 'darwin' ? 'icons/netraflow-macos.svg' : 'icons/netraflow.svg';
