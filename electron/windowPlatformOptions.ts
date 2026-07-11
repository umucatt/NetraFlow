import path from 'node:path';
import type { BrowserWindowConstructorOptions } from 'electron';

export type PlatformWindowOptionsInput = Readonly<{
  platform: NodeJS.Platform;
  appResourceRoot: string;
}>;

export const getAppIconPath = ({ platform, appResourceRoot }: PlatformWindowOptionsInput) =>
  path.join(
    appResourceRoot,
    platform === 'linux' ? 'public/icons/linux/512x512.png' : 'public/icons/netraflow.ico'
  );

export const getPlatformWindowOptions = ({
  platform,
  appResourceRoot
}: PlatformWindowOptionsInput): BrowserWindowConstructorOptions => {
  if (platform === 'win32') {
    return {
      icon: getAppIconPath({ platform, appResourceRoot }),
      frame: false
    };
  }

  if (platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset'
    };
  }

  if (platform === 'linux') {
    return {
      icon: getAppIconPath({ platform, appResourceRoot })
    };
  }

  return {};
};
