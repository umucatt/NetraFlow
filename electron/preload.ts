import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

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

type NfStorageErrorResponse = {
  ok: false;
  code: NfStorageErrorCode;
  message: string;
};

type NfStorageWriteResponse = { ok: true } | NfStorageErrorResponse;

const isNfStorageErrorResponse = (value: unknown): value is NfStorageErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  'ok' in value &&
  (value as { ok?: unknown }).ok === false &&
  typeof (value as { code?: unknown }).code === 'string';

const throwNfStorageError = (response: NfStorageErrorResponse): never => {
  const error = new Error(response.message) as Error & { code: NfStorageErrorCode };
  error.name = 'NfStorageError';
  error.code = response.code;

  throw error;
};

const unwrapNfStorageResponse = <T>(response: T | NfStorageErrorResponse): T => {
  if (isNfStorageErrorResponse(response)) {
    throwNfStorageError(response);
  }

  return response as T;
};

const unwrapNfStorageWriteResponse = (response: NfStorageWriteResponse) => {
  if (isNfStorageErrorResponse(response)) {
    throwNfStorageError(response);
  }
};

contextBridge.exposeInMainWorld('appInfo', {
  name: 'NetraFlow'
});

const electronAPI = {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  maximize: () => ipcRenderer.invoke('window:maximize') as Promise<boolean>,
  unmaximize: () => ipcRenderer.invoke('window:unmaximize') as Promise<boolean>,
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke('app:open-external-url', url) as Promise<void>,
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

const netraflowStorage = {
  getItem: (key: string) =>
    unwrapNfStorageResponse(
      ipcRenderer.sendSync('nf-storage:get-item', key) as string | null | NfStorageErrorResponse
    ),
  setItem: (key: string, value: string) =>
    unwrapNfStorageWriteResponse(
      ipcRenderer.sendSync('nf-storage:set-item', key, value) as NfStorageWriteResponse
    ),
  setItems: (items: Record<string, string>) =>
    unwrapNfStorageWriteResponse(
      ipcRenderer.sendSync('nf-storage:set-items', items) as NfStorageWriteResponse
    ),
  removeItem: (key: string) =>
    unwrapNfStorageWriteResponse(
      ipcRenderer.sendSync('nf-storage:remove-item', key) as NfStorageWriteResponse
    ),
  key: (index: number) =>
    unwrapNfStorageResponse(
      ipcRenderer.sendSync('nf-storage:key', index) as string | null | NfStorageErrorResponse
    ),
  length: () =>
    unwrapNfStorageResponse(
      ipcRenderer.sendSync('nf-storage:length') as number | NfStorageErrorResponse
    ),
  getAllItems: () =>
    unwrapNfStorageResponse(
      ipcRenderer.sendSync('nf-storage:get-all-items') as
        | Record<string, string>
        | NfStorageErrorResponse
    ),
  migrateLegacyItems: (items: Record<string, string>) =>
    unwrapNfStorageResponse(
      ipcRenderer.sendSync('nf-storage:migrate-legacy-items', items) as
        | {
            migratedKeys: string[];
            skippedExistingKeys: string[];
            skippedNonWhitelistKeys: string[];
            skippedExampleKeys: string[];
          }
        | NfStorageErrorResponse
    )
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('electronWindow', electronAPI);
contextBridge.exposeInMainWorld('netraflowStorage', netraflowStorage);
