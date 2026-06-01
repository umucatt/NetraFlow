/// <reference types="vite/client" />

declare module '*.svg?raw' {
  const content: string;
  export default content;
}

type ElectronWindowApi = {
  minimize: () => void;
  toggleMaximize: () => void;
  maximize: () => Promise<boolean>;
  unmaximize: () => Promise<boolean>;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  openExternalUrl?: (url: string) => Promise<void>;
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
  onNetraFlowLock?: (listener: () => void) => () => void;
  onMaximizedChange: (listener: (isMaximized: boolean) => void) => () => void;
};

type NfStorageMigrationResult = {
  migratedKeys: string[];
  skippedExistingKeys: string[];
  skippedNonWhitelistKeys: string[];
  skippedExampleKeys: string[];
};

type NfStorageBridge = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  key: (index: number) => string | null;
  length: () => number;
  getAllItems: () => Record<string, string>;
  migrateLegacyItems: (items: Record<string, string>) => NfStorageMigrationResult;
};

interface Window {
  appInfo?: {
    name: string;
    version?: string;
  };
  electronAPI: ElectronWindowApi;
  electronWindow?: ElectronWindowApi;
  netraflowStorage?: NfStorageBridge;
}
