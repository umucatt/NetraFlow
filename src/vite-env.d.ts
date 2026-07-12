/// <reference types="vite/client" />

declare module '*.svg?raw' {
  const content: string;
  export default content;
}

type DesktopPlatform = 'win32' | 'darwin' | 'linux';

type ElectronWindowApi = {
  normalAppFirstFrameReady?: () => void;
  minimize: () => void;
  toggleMaximize: () => void;
  maximize: () => Promise<boolean>;
  unmaximize: () => Promise<boolean>;
  close: () => void;
  allowClose?: () => void;
  cancelCloseRequest?: () => void;
  forceClose?: () => void;
  clearAllLocalDataAndQuit?: () => Promise<void>;
  clearLinuxAppImageSandboxConsent?: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  openExternalUrl?: (url: string) => Promise<void>;
  openUserDataDirectory?: () => Promise<void>;
  selectDirectory: () => Promise<string>;
  writeSnapshotFile: (payload: {
    directory: string;
    fileName: string;
    content: string;
  }) => Promise<{ filePath: string }>;
  writeBackupFile?: (payload: {
    directory: string;
    fileName: string;
    content: string;
  }) => Promise<{ filePath: string }>;
  writeJsonFile?: (payload: {
    directory: string;
    fileName: string;
    content: string;
  }) => Promise<{ filePath: string }>;
  onNetraFlowLock?: (listener: () => void) => () => void;
  onNetraFlowOpenSettings?: (listener: () => void) => () => void;
  setLockMenuState?: (state: { canLock: boolean }) => void;
  onCloseRequest?: (listener: () => void) => () => void;
  onMaximizedChange: (listener: (isMaximized: boolean) => void) => () => void;
};

type NetraFlowPersistenceBridge = {
  readCoreDocument: () => unknown;
  writeCoreDocument: (
    document: unknown,
    options?: { allowExternalCoreOverwrite?: boolean }
  ) => void;
  unlockCoreDocument: (password: string) => unknown;
  enableCoreProtection: (
    document: unknown,
    password: string,
    options?: { allowExternalCoreOverwrite?: boolean }
  ) => void;
  changeCorePassword: (
    document: unknown,
    currentPassword: string,
    nextPassword: string,
    options?: { allowExternalCoreOverwrite?: boolean }
  ) => void;
  disableCoreProtection: (
    document: unknown,
    password: string,
    options?: { allowExternalCoreOverwrite?: boolean }
  ) => void;
  lockCoreDocument: () => void;
  acknowledgeCoreIntegrityIssue?: () => void;
  encryptSnapshotDocument?: (document: unknown) => unknown;
  decryptSnapshotDocument?: (encrypted: unknown) => unknown;
  decryptSnapshotDocumentWithPassword?: (encrypted: unknown, password: string) => unknown;
  readSettingsDocument: () => unknown;
  writeSettingsDocument: (document: unknown) => void;
  readStateDocument: () => unknown;
  writeStateDocument: (document: unknown) => void;
  readSecurityDocument: () => unknown;
  writeSecurityDocument: (document: unknown) => void;
  enterDemoEnvironment?: (documents: unknown) => unknown;
  exitDemoEnvironment?: () => unknown;
  promoteDemoCoreToRealEnvironment?: () => unknown;
};

interface Window {
  appInfo?: {
    name: string;
    platform: DesktopPlatform;
    version?: string;
    packageKind?: 'appimage' | 'other';
    sandboxConsentBootstrap?: boolean;
    chromiumSandboxEnabled?: boolean;
    initialTheme?: 'light' | 'dark';
  };
  sandboxBootstrap?: {
    initialTheme: 'light' | 'dark';
    onThemeChanged: (listener: (theme: 'light' | 'dark') => void) => () => void;
    quit: () => Promise<void>;
    consent: () => Promise<{ ok: boolean; message?: string }>;
    firstFrameReady: () => void;
  };
  electronAPI: ElectronWindowApi;
  electronWindow?: ElectronWindowApi;
  netraflowPersistence?: NetraFlowPersistenceBridge;
}
