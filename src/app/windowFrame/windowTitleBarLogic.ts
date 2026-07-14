export const isCustomWindowTitleBarVisible = (platform: DesktopPlatform) =>
  platform !== 'linux';

export const isCustomWindowTitleBrandVisible = (platform: DesktopPlatform) =>
  platform === 'win32';

export const areCustomWindowControlsVisible = (platform: DesktopPlatform) =>
  platform === 'win32';
