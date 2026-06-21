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
  writeJsonFile?: (payload: {
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

type NfStorageErrorCode =
  | 'INVALID_BATCH'
  | 'TEMP_CLEANUP_FAILED'
  | 'TEMP_CREATE_FAILED'
  | 'TEMP_WRITE_FAILED'
  | 'TEMP_SYNC_FAILED'
  | 'TEMP_VERIFY_FAILED'
  | 'PREVIOUS_PREPARE_FAILED'
  | 'FINAL_REPLACE_FAILED'
  | 'FINAL_VERIFY_FAILED'
  | 'FINAL_VERIFY_FAILED_RECOVERED'
  | 'FINAL_VERIFY_FAILED_RECOVERY_FAILED'
  | 'STORAGE_READ_FAILED'
  | 'STORAGE_READ_INVALID'
  | 'STORAGE_SCHEMA_INVALID'
  | 'STORAGE_SCHEMA_UNSUPPORTED'
  | 'STORAGE_SCHEMA_FUTURE'
  | 'STORAGE_RECOVERY_REQUIRED'
  | 'STORAGE_RECOVERY_FAILED'
  | 'STORAGE_UNRECOVERABLE';

type NfStorageBridgeError = Error & {
  code: NfStorageErrorCode;
};

type NfStorageBridge = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  setItems: (items: Record<string, string>) => void;
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
