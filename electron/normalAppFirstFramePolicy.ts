export const shouldDeferNormalAppFirstShow = (
  platform: NodeJS.Platform,
  isPackaged: boolean
) => platform === 'win32' || (platform === 'linux' && isPackaged);

export const shouldWaitForStableRendererFrame = (
  platform: NodeJS.Platform,
  isPackaged: boolean
) => platform === 'linux' && isPackaged;

export const canShowNormalAppWindow = (
  pageLoaded: boolean,
  rendererReady: boolean,
  waitForStableRendererFrame: boolean
) => pageLoaded && (!waitForStableRendererFrame || rendererReady);
