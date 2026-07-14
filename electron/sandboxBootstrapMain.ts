import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import { readSync, writeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clearLinuxAppImageUnsandboxedConsent,
  writeLinuxAppImageUnsandboxedConsent
} from './linuxAppImagePreferences.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let bootstrapWindow: BrowserWindow | null = null;
let transitionStarted = false;
type BootstrapTheme = 'light' | 'dark';
const BOOTSTRAP_BACKGROUND_COLORS: Record<BootstrapTheme, string> = {
  light: '#f6f3ea',
  dark: '#171a1f'
};
const CONSENT_HANDOFF_EXIT_CODE = 73;
const CONSENT_ACCEPTED_MESSAGE = 'CONSENT_ACCEPTED';
const CONSENT_ACK_MESSAGE = 'CONSENT_ACK';
const FIRST_FRAME_READY_TIMEOUT_MS = 15_000;
const getBootstrapTheme = (): BootstrapTheme => nativeTheme.shouldUseDarkColors ? 'dark' : 'light';

const getConsentDescriptor = () => {
  const rawDescriptor = process.env.NF_LAUNCHER_CONSENT_FD;
  const descriptor = rawDescriptor ? Number.parseInt(rawDescriptor, 10) : Number.NaN;
  return Number.isSafeInteger(descriptor) && descriptor >= 3 ? descriptor : null;
};

const requestLauncherConsentAcknowledgement = () => {
  const descriptor = getConsentDescriptor();
  if (descriptor === null) return false;
  const accepted = Buffer.from(CONSENT_ACCEPTED_MESSAGE, 'ascii');
  const acknowledgement = Buffer.alloc(Buffer.byteLength(CONSENT_ACK_MESSAGE));
  try {
    if (writeSync(descriptor, accepted) !== accepted.length) return false;
    const count = readSync(descriptor, acknowledgement, 0, acknowledgement.length, null);
    return count === acknowledgement.length && acknowledgement.toString('ascii') === CONSENT_ACK_MESSAGE;
  } catch {
    return false;
  }
};

const createBootstrapWindow = () => {
  const initialTheme = getBootstrapTheme();
  const window = new BrowserWindow({
    title: 'NetraFlow',
    width: 760,
    height: 520,
    show: false,
    backgroundColor: BOOTSTRAP_BACKGROUND_COLORS[initialTheme],
    minWidth: 680,
    minHeight: 460,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--nf-bootstrap-theme=${initialTheme}`]
    }
  });
  bootstrapWindow = window;
  let pageLoaded = false;
  let rendererReady = false;
  let didShow = false;
  const showWhenReady = () => {
    if (pageLoaded && rendererReady && !didShow && !window.isDestroyed()) {
      didShow = true;
      window.show();
    }
  };
  const handleFirstFrameReady = (event: Electron.IpcMainEvent) => {
    if (event.sender !== window.webContents || rendererReady) return;
    rendererReady = true;
    showWhenReady();
  };
  ipcMain.on('bootstrap-first-frame-ready', handleFirstFrameReady);
  window.webContents.once('did-finish-load', () => {
    pageLoaded = true;
    syncTheme();
    showWhenReady();
  });
  const firstFrameTimeout = setTimeout(() => {
    if (didShow || window.isDestroyed()) return;
    console.error('[NetraFlow bootstrap] Renderer first frame did not become ready');
    app.exit(1);
  }, FIRST_FRAME_READY_TIMEOUT_MS);
  window.webContents.once('render-process-gone', (_event, details) => {
    if (didShow) return;
    console.error('[NetraFlow bootstrap] Renderer exited before first frame', details.reason);
    app.exit(1);
  });
  window.webContents.once('did-fail-load', (_event, code, description) => {
    if (didShow || code === -3) return;
    console.error('[NetraFlow bootstrap] Renderer load failed', code, description);
    app.exit(1);
  });
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  const syncTheme = () => {
    const theme = getBootstrapTheme();
    window.setBackgroundColor(BOOTSTRAP_BACKGROUND_COLORS[theme]);
    window.webContents.send('sandbox-bootstrap:theme-changed', theme);
  };
  nativeTheme.on('updated', syncTheme);
  window.once('closed', () => {
    clearTimeout(firstFrameTimeout);
    ipcMain.removeListener('bootstrap-first-frame-ready', handleFirstFrameReady);
    nativeTheme.removeListener('updated', syncTheme);
    if (bootstrapWindow === window) bootstrapWindow = null;
  });
  window.on('close', (event) => {
    if (transitionStarted) event.preventDefault();
  });
  const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
  window.webContents.on('will-navigate', (event, targetUrl) => {
    try {
      if (path.resolve(fileURLToPath(targetUrl)) === path.resolve(indexPath)) return;
    } catch {
      // Fall through and block non-local navigation.
    }
    event.preventDefault();
  });
  void window.loadFile(indexPath);
};

ipcMain.handle('sandbox-bootstrap:quit', (event) => {
  if (transitionStarted || !bootstrapWindow || event.sender !== bootstrapWindow.webContents) return;
  app.exit(0);
});

ipcMain.handle('sandbox-bootstrap:consent', async (event) => {
  if (transitionStarted || !bootstrapWindow || event.sender !== bootstrapWindow.webContents) {
    return { ok: false, message: '兼容模式授权请求无效' };
  }

  try {
    writeLinuxAppImageUnsandboxedConsent();
  } catch {
    return { ok: false, message: '无法保存兼容模式授权，请重试或退出' };
  }

  transitionStarted = true;
  if (!requestLauncherConsentAcknowledgement()) {
    try {
      clearLinuxAppImageUnsandboxedConsent();
    } catch (error) {
      console.error('[NetraFlow bootstrap] Failed to roll back launcher consent', error);
    }
    transitionStarted = false;
    return { ok: false, message: '无法进入兼容模式，请重试或退出' };
  }

  setTimeout(() => app.exit(CONSENT_HANDOFF_EXIT_CODE), 50);
  return { ok: true };
});

app.whenReady().then(createBootstrapWindow);

app.on('window-all-closed', () => app.quit());
