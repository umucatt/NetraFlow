type IpcRendererEvent = unknown;
type IpcRendererLike = {
  send: (channel: string, ...args: unknown[]) => void;
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  sendSync: (channel: string, ...args: unknown[]) => unknown;
  on: (
    channel: string,
    listener: (event: IpcRendererEvent, ...args: any[]) => void
  ) => void;
  removeListener: (
    channel: string,
    listener: (event: IpcRendererEvent, ...args: any[]) => void
  ) => void;
};

const { contextBridge, ipcRenderer } = require('electron') as {
  contextBridge: { exposeInMainWorld: (key: string, api: unknown) => void };
  ipcRenderer: IpcRendererLike;
};

type PersistenceErrorCode =
  | 'PERSISTENCE_CORE_LOCKED'
  | 'PERSISTENCE_CORE_UNLOCK_FAILED'
  | 'PERSISTENCE_CRYPTO_SESSION_UNAVAILABLE'
  | 'PERSISTENCE_SNAPSHOT_ENCRYPT_FAILED'
  | 'PERSISTENCE_SNAPSHOT_DECRYPT_FAILED'
  | 'PERSISTENCE_CORE_EXTERNAL_MODIFIED'
  | 'PERSISTENCE_SHUTTING_DOWN'
  | 'PERSISTENCE_READ_FAILED'
  | 'PERSISTENCE_READ_INVALID'
  | 'PERSISTENCE_SCHEMA_INVALID'
  | 'PERSISTENCE_TEMP_CLEANUP_FAILED'
  | 'PERSISTENCE_TEMP_CREATE_FAILED'
  | 'PERSISTENCE_TEMP_WRITE_FAILED'
  | 'PERSISTENCE_TEMP_SYNC_FAILED'
  | 'PERSISTENCE_TEMP_VERIFY_FAILED'
  | 'PERSISTENCE_REPLACE_FAILED'
  | 'PERSISTENCE_FINAL_VERIFY_FAILED'
  | 'DEMO_LIFECYCLE_UNAVAILABLE'
  | 'DEMO_ALREADY_ACTIVE'
  | 'DEMO_PATH_UNSAFE'
  | 'DEMO_CLEANUP_FAILED'
  | 'DEMO_DIRECTORY_NOT_WRITABLE'
  | 'DEMO_DOCUMENT_SCHEMA_INVALID'
  | 'DEMO_NOT_ACTIVE'
  | 'DEMO_CORE_MISSING'
  | 'DEMO_CORE_LOCKED';

type PersistenceErrorResponse = {
  ok: false;
  code: PersistenceErrorCode;
  message: string;
};

type PersistenceWriteResponse = { ok: true } | PersistenceErrorResponse;

type CoreWriteOptions = {
  allowExternalCoreOverwrite?: boolean;
};

const isPersistenceErrorResponse = (value: unknown): value is PersistenceErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  'ok' in value &&
  (value as { ok?: unknown }).ok === false &&
  typeof (value as { code?: unknown }).code === 'string';

const throwPersistenceError = (response: PersistenceErrorResponse): never => {
  const error = new Error(response.message) as Error & { code: PersistenceErrorCode };
  error.name = 'NetraFlowPersistenceError';
  error.code = response.code;

  throw error;
};

const unwrapPersistenceResponse = <T>(response: T | PersistenceErrorResponse): T => {
  if (isPersistenceErrorResponse(response)) {
    throwPersistenceError(response);
  }

  return response as T;
};

const unwrapPersistenceWriteResponse = (response: PersistenceWriteResponse) => {
  if (isPersistenceErrorResponse(response)) {
    throwPersistenceError(response);
  }
};

const isLinuxAppImage =
  process.platform === 'linux' && process.env.NF_PACKAGE_KIND === 'appimage';
const isSandboxConsentBootstrap =
  isLinuxAppImage &&
  (process.argv.includes('--nf-sandbox-consent-bootstrap') ||
    (process.argv.includes('--no-sandbox') &&
      process.env.NF_UNSANDBOXED_AUTHORIZED !== '1')) &&
  process.env.NF_BOOTSTRAP_COMPLETE !== '1';
const isUnsandboxedAppImage = isLinuxAppImage && process.argv.includes('--no-sandbox');

contextBridge.exposeInMainWorld('appInfo', {
  name: 'NetraFlow',
  platform: process.platform,
  packageKind: isLinuxAppImage ? 'appimage' : 'other',
  sandboxConsentBootstrap: isSandboxConsentBootstrap,
  chromiumSandboxEnabled: !isUnsandboxedAppImage,
  initialTheme: (() => {
    const value = process.argv.find((argument) => argument.startsWith('--nf-initial-theme='))
      ?.slice('--nf-initial-theme='.length);
    return value === 'dark' ? 'dark' : value === 'light' ? 'light' : undefined;
  })(),
  initialThemeStyle: (() => {
    const value = process.argv.find((argument) =>
      argument.startsWith('--nf-initial-theme-style=')
    )?.slice('--nf-initial-theme-style='.length);
    return value === 'default' ? 'default' : value === 'nyaa' ? 'nyaa' : undefined;
  })()
});

if (isSandboxConsentBootstrap) {
  type BootstrapTheme = 'light' | 'dark';
  const themeArgument = process.argv.find((argument) => argument.startsWith('--nf-bootstrap-theme='));
  const themeValue = themeArgument?.slice('--nf-bootstrap-theme='.length);
  const initialTheme: BootstrapTheme = themeValue === 'dark' ? 'dark' : 'light';
  contextBridge.exposeInMainWorld('sandboxBootstrap', {
    initialTheme,
    onThemeChanged: (listener: (theme: BootstrapTheme) => void) => {
      const handleThemeChanged = (_event: IpcRendererEvent, theme: unknown) => {
        if (theme === 'light' || theme === 'dark') listener(theme);
      };
      ipcRenderer.on('sandbox-bootstrap:theme-changed', handleThemeChanged);
      return () => ipcRenderer.removeListener('sandbox-bootstrap:theme-changed', handleThemeChanged);
    },
    quit: () => ipcRenderer.invoke('sandbox-bootstrap:quit') as Promise<void>,
    consent: () => ipcRenderer.invoke('sandbox-bootstrap:consent') as Promise<{
      ok: boolean;
      message?: string;
    }>,
    firstFrameReady: () => ipcRenderer.send('bootstrap-first-frame-ready')
  });
} else {

const electronAPI = {
  normalAppStartupStateResolved: (state: string) =>
    ipcRenderer.send('normal-app-startup-state-resolved', state),
  normalAppFirstFrameReady: () => ipcRenderer.send('normal-app-first-frame-ready'),
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  maximize: () => ipcRenderer.invoke('window:maximize') as Promise<boolean>,
  unmaximize: () => ipcRenderer.invoke('window:unmaximize') as Promise<boolean>,
  close: () => ipcRenderer.send('window:close'),
  allowClose: () => ipcRenderer.send('window:allow-close'),
  cancelCloseRequest: () => ipcRenderer.send('window:cancel-close-request'),
  forceClose: () => ipcRenderer.send('window:force-close'),
  clearAllLocalDataAndQuit: () =>
    ipcRenderer.invoke('app:clear-all-local-data-and-quit') as Promise<void>,
  notifyClearingPageReady: () => ipcRenderer.send('app:clearing-page-ready'),
  onEnterClearingPage: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('netraflow-enter-clearing-page', listener);
    return () => ipcRenderer.removeListener('netraflow-enter-clearing-page', listener);
  },
  clearLinuxAppImageSandboxConsent: () =>
    ipcRenderer.invoke('app:clear-linux-appimage-sandbox-consent') as Promise<void>,
  isMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke('app:open-external-url', url) as Promise<void>,
  openUserDataDirectory: () =>
    ipcRenderer.invoke('app:open-userdata-directory') as Promise<void>,
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory') as Promise<string>,
  writeSnapshotFile: (payload: { directory: string; fileName: string; content: string }) =>
    ipcRenderer.invoke('json:write-file', payload) as Promise<{ filePath: string }>,
  writeBackupFile: (payload: { directory: string; fileName: string; content: string }) =>
    ipcRenderer.invoke('json:write-file', payload) as Promise<{ filePath: string }>,
  writeJsonFile: (payload: { directory: string; fileName: string; content: string }) =>
    ipcRenderer.invoke('json:write-file', payload) as Promise<{ filePath: string }>,
  onNetraFlowLock: (listener: () => void) => {
    const handleNetraFlowLock = () => {
      listener();
    };

    ipcRenderer.on('netraflow-lock', handleNetraFlowLock);

    return () => {
      ipcRenderer.removeListener('netraflow-lock', handleNetraFlowLock);
    };
  },
  onNetraFlowOpenSettings: (listener: () => void) => {
    const handleNetraFlowOpenSettings = () => {
      listener();
    };

    ipcRenderer.on('netraflow-open-settings', handleNetraFlowOpenSettings);

    return () => {
      ipcRenderer.removeListener('netraflow-open-settings', handleNetraFlowOpenSettings);
    };
  },
  setLockMenuState: (state: {
    rendererReady: boolean;
    applicationLockAllowed: boolean;
    passwordProtectionEnabled: boolean;
    isLocked: boolean;
    isUnlocking: boolean;
  }) => {
    ipcRenderer.send('app:lock-menu-state', state);
  },
  completeLockRequest: () => {
    ipcRenderer.send('app:lock-request-complete');
  },
  onCloseRequest: (listener: () => void) => {
    const handleCloseRequest = () => {
      listener();
    };

    ipcRenderer.on('app:close-request', handleCloseRequest);

    return () => {
      ipcRenderer.removeListener('app:close-request', handleCloseRequest);
    };
  },
  onMaximizedChange: (listener: (isMaximized: boolean) => void) => {
    const handleMaximizedChange = (_event: IpcRendererEvent, isMaximized: boolean) => {
      listener(isMaximized);
    };

    ipcRenderer.on('window:maximized-changed', handleMaximizedChange);

    return () => {
      ipcRenderer.removeListener('window:maximized-changed', handleMaximizedChange);
    };
  }
};

const netraflowPersistence = {
  readSnapshot: () =>
    unwrapPersistenceResponse(ipcRenderer.sendSync('persistence:read-snapshot') as unknown),
  commitInitializedSnapshot: (documents: unknown) =>
    unwrapPersistenceResponse(
      ipcRenderer.sendSync('persistence:commit-initialized-snapshot', documents) as unknown
    ),
  readCoreDocument: () =>
    unwrapPersistenceResponse(ipcRenderer.sendSync('persistence:read-core') as unknown),
  writeCoreDocument: (document: unknown, options?: CoreWriteOptions) =>
    unwrapPersistenceWriteResponse(
      ipcRenderer.sendSync('persistence:write-core', {
        document,
        options
      }) as PersistenceWriteResponse
    ),
  unlockCoreDocument: (password: string) =>
    unwrapPersistenceResponse(
      ipcRenderer.sendSync('persistence:unlock-core', password) as unknown
    ),
  enableCoreProtection: (document: unknown, password: string, options?: CoreWriteOptions) =>
    unwrapPersistenceWriteResponse(
      ipcRenderer.sendSync('persistence:enable-core-protection', {
        document,
        password,
        options
      }) as PersistenceWriteResponse
    ),
  changeCorePassword: (
    document: unknown,
    currentPassword: string,
    nextPassword: string,
    options?: CoreWriteOptions
  ) =>
    unwrapPersistenceWriteResponse(
      ipcRenderer.sendSync('persistence:change-core-password', {
        document,
        currentPassword,
        nextPassword,
        options
      }) as PersistenceWriteResponse
    ),
  disableCoreProtection: (document: unknown, password: string, options?: CoreWriteOptions) =>
    unwrapPersistenceWriteResponse(
      ipcRenderer.sendSync('persistence:disable-core-protection', {
        document,
        password,
        options
      }) as PersistenceWriteResponse
    ),
  lockCoreDocument: () =>
    unwrapPersistenceWriteResponse(
      ipcRenderer.sendSync('persistence:lock-core') as PersistenceWriteResponse
    ),
  acknowledgeCoreIntegrityIssue: () =>
    unwrapPersistenceWriteResponse(
      ipcRenderer.sendSync(
        'persistence:acknowledge-core-integrity'
      ) as PersistenceWriteResponse
    ),
  encryptSnapshotDocument: (document: unknown) =>
    unwrapPersistenceResponse(
      ipcRenderer.sendSync('persistence:encrypt-snapshot', document) as unknown
    ),
  decryptSnapshotDocument: (encrypted: unknown) =>
    unwrapPersistenceResponse(
      ipcRenderer.sendSync('persistence:decrypt-snapshot', encrypted) as unknown
    ),
  decryptSnapshotDocumentWithPassword: (encrypted: unknown, password: string) =>
    unwrapPersistenceResponse(
      ipcRenderer.sendSync('persistence:decrypt-snapshot-with-password', {
        encrypted,
        password
      }) as unknown
    ),
  readSettingsDocument: () =>
    unwrapPersistenceResponse(ipcRenderer.sendSync('persistence:read-settings') as unknown),
  writeSettingsDocument: (document: unknown) =>
    unwrapPersistenceWriteResponse(
      ipcRenderer.sendSync('persistence:write-settings', document) as PersistenceWriteResponse
    ),
  readStateDocument: () =>
    unwrapPersistenceResponse(ipcRenderer.sendSync('persistence:read-state') as unknown),
  writeStateDocument: (document: unknown) =>
    unwrapPersistenceWriteResponse(
      ipcRenderer.sendSync('persistence:write-state', document) as PersistenceWriteResponse
    ),
  readSecurityDocument: () =>
    unwrapPersistenceResponse(ipcRenderer.sendSync('persistence:read-security') as unknown),
  writeSecurityDocument: (document: unknown) =>
    unwrapPersistenceWriteResponse(
      ipcRenderer.sendSync('persistence:write-security', document) as PersistenceWriteResponse
    ),
  enterDemoEnvironment: (documents: unknown) =>
    unwrapPersistenceResponse(
      ipcRenderer.sendSync('persistence:enter-demo', documents) as unknown
    ),
  exitDemoEnvironment: () =>
    unwrapPersistenceResponse(ipcRenderer.sendSync('persistence:exit-demo') as unknown),
  promoteDemoCoreToRealEnvironment: () =>
    unwrapPersistenceResponse(
      ipcRenderer.sendSync('persistence:promote-demo-core-to-real') as unknown
    )
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('electronWindow', electronAPI);
contextBridge.exposeInMainWorld('netraflowPersistence', netraflowPersistence);
}
