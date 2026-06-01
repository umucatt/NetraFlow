import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

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
    ipcRenderer.invoke('backup:write-file', payload) as Promise<{ filePath: string }>,
  writeBackupFile: (payload: { directory: string; fileName: string; content: string }) =>
    ipcRenderer.invoke('backup:write-file', payload) as Promise<{ filePath: string }>,
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
  getItem: (key: string) => ipcRenderer.sendSync('nf-storage:get-item', key) as string | null,
  setItem: (key: string, value: string) =>
    ipcRenderer.sendSync('nf-storage:set-item', key, value) as void,
  removeItem: (key: string) => ipcRenderer.sendSync('nf-storage:remove-item', key) as void,
  key: (index: number) => ipcRenderer.sendSync('nf-storage:key', index) as string | null,
  length: () => ipcRenderer.sendSync('nf-storage:length') as number,
  getAllItems: () =>
    ipcRenderer.sendSync('nf-storage:get-all-items') as Record<string, string>,
  migrateLegacyItems: (items: Record<string, string>) =>
    ipcRenderer.sendSync('nf-storage:migrate-legacy-items', items) as {
      migratedKeys: string[];
      skippedExistingKeys: string[];
      skippedNonWhitelistKeys: string[];
      skippedExampleKeys: string[];
    }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('electronWindow', electronAPI);
contextBridge.exposeInMainWorld('netraflowStorage', netraflowStorage);
