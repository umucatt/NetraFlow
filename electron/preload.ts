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

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('electronWindow', electronAPI);
