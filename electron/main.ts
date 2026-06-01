import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs/promises';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_NAME = 'NetraFlow';
const LEGACY_PORTABLE_USER_DATA_DIR_NAME = 'userData';
const LEGACY_LOCAL_STORAGE_DIR_NAME = 'Local Storage';
const USERDATA_DIR_NAME = 'userdata';
const RUNTIME_DIR_NAME = 'runtime';
const LOGS_DIR_NAME = 'logs';
const NF_STORAGE_FILE_NAME = 'storage.json';
const NF_STORAGE_WHITELIST_KEYS = [
  'asset-overview-groups',
  'asset-overview-accounts',
  'asset-overview-history',
  'lastBackupAt',
  'lastBackupHistoryCount',
  'backupRecords',
  'autoBackupSettings',
  'assetChartSettings',
  'netraflowGlobalSettings',
  'netraflowFirstWelcomeState',
  'netraflowRollupImportHashes',
  'netraflow_backup_before_migration',
  'accounts',
  'accountTypes',
  'historyRecords',
  'archivedAccounts',
  'deletedRecords'
] as const;
const USER_DATA_JSON_STORAGE_KEYS = new Set([
  'asset-overview-groups',
  'asset-overview-accounts',
  'asset-overview-history',
  'backupRecords'
]);
const BILIBILI_PROFILE_URL = 'https://space.bilibili.com/1738773145';
const GITHUB_RELEASES_URL = 'https://github.com/umucatt/NetraFlow/releases';
const ALLOWED_GITHUB_RELEASES_HOSTS = new Set(['github.com', 'www.github.com']);
let mainWindow: BrowserWindow | null = null;
let pendingRendererLock = process.argv.includes('--lock');

app.setName(APP_NAME);

if (process.platform === 'win32') {
  app.setAppUserModelId('com.netraflow.app');
}

const isPortableBuild = () =>
  app.isPackaged &&
  (process.env.NETRAFLOW_PORTABLE === '1' ||
    existsSync(path.join(process.resourcesPath, 'app', 'portable.flag')) ||
    existsSync(path.join(process.resourcesPath, 'portable.flag')));

const getLegacyPortableUserDataPath = () =>
  path.join(path.dirname(process.execPath), LEGACY_PORTABLE_USER_DATA_DIR_NAME);

const isSamePath = (left: string, right: string) =>
  path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();

const isNfStorageKey = (key: string) =>
  (NF_STORAGE_WHITELIST_KEYS as readonly string[]).includes(key);

const getPackagedInstallRootPath = () => path.dirname(process.execPath);

const getPortableRootPath = () => path.dirname(process.execPath);

const getAppInstallRootPath = () => {
  if (!app.isPackaged) {
    return path.join(app.getPath('appData'), APP_NAME);
  }

  return isPortableBuild() ? getPortableRootPath() : getPackagedInstallRootPath();
};

const getNfUserDataRootPath = () => {
  const overridePath = process.env.NETRAFLOW_USERDATA_ROOT;

  if (overridePath) {
    return path.resolve(overridePath);
  }

  return path.join(getAppInstallRootPath(), USERDATA_DIR_NAME);
};

const getNfRuntimeRootPath = () => {
  const overridePath = process.env.NETRAFLOW_RUNTIME_ROOT;

  if (overridePath) {
    return path.resolve(overridePath);
  }

  return path.join(getAppInstallRootPath(), RUNTIME_DIR_NAME);
};

const getNfStorageDirectoryPath = () => getNfUserDataRootPath();

const getNfStorageFilePath = () =>
  path.join(getNfStorageDirectoryPath(), NF_STORAGE_FILE_NAME);

const getNfRuntimeUserDataPath = () => getNfRuntimeRootPath();

const getNfLogsPath = () => path.join(getNfRuntimeUserDataPath(), LOGS_DIR_NAME);

const valueContainsExampleData = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value.startsWith('example-');
  }

  if (Array.isArray(value)) {
    return value.some(valueContainsExampleData);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(valueContainsExampleData);
  }

  return false;
};

const isExampleStorageEntry = (key: string, value: string) => {
  if (!USER_DATA_JSON_STORAGE_KEYS.has(key)) {
    return false;
  }

  try {
    return valueContainsExampleData(JSON.parse(value));
  } catch {
    return false;
  }
};

const sanitizeNfStorageItems = (value: unknown) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string>>((items, [key, itemValue]) => {
    if (isNfStorageKey(key) && typeof itemValue === 'string') {
      items[key] = itemValue;
    }

    return items;
  }, {});
};

const readNfStorageItems = () => {
  const storageFilePath = getNfStorageFilePath();

  if (!existsSync(storageFilePath)) {
    return {};
  }

  try {
    return sanitizeNfStorageItems(JSON.parse(readFileSync(storageFilePath, 'utf8')));
  } catch (error) {
    console.warn('[NetraFlow storage] Failed to read storage file.', error);
    return {};
  }
};

const writeNfStorageItems = (items: Record<string, string>) => {
  const storageFilePath = getNfStorageFilePath();
  const storageDirectoryPath = path.dirname(storageFilePath);
  const tempStorageFilePath = `${storageFilePath}.tmp`;

  mkdirSync(storageDirectoryPath, { recursive: true });
  writeFileSync(
    tempStorageFilePath,
    `${JSON.stringify(sanitizeNfStorageItems(items), null, 2)}\n`,
    'utf8'
  );
  renameSync(tempStorageFilePath, storageFilePath);
};

const getSortedNfStorageKeys = () => {
  const items = readNfStorageItems();

  return NF_STORAGE_WHITELIST_KEYS.filter((key) => Object.hasOwn(items, key));
};

const migrateLegacyItemsToNfStorage = (legacyItems: unknown) => {
  const currentItems = readNfStorageItems();
  const migratedKeys: string[] = [];
  const skippedExistingKeys: string[] = [];
  const skippedNonWhitelistKeys: string[] = [];
  const skippedExampleKeys: string[] = [];

  if (typeof legacyItems !== 'object' || legacyItems === null || Array.isArray(legacyItems)) {
    return { migratedKeys, skippedExistingKeys, skippedNonWhitelistKeys, skippedExampleKeys };
  }

  const nextItems = { ...currentItems };

  Object.entries(legacyItems).forEach(([key, value]) => {
    if (!isNfStorageKey(key)) {
      skippedNonWhitelistKeys.push(key);
      return;
    }

    if (typeof value !== 'string') {
      return;
    }

    if (Object.hasOwn(currentItems, key)) {
      skippedExistingKeys.push(key);
      return;
    }

    if (isExampleStorageEntry(key, value)) {
      skippedExampleKeys.push(key);
      return;
    }

    nextItems[key] = value;
    migratedKeys.push(key);
  });

  if (migratedKeys.length > 0) {
    writeNfStorageItems(nextItems);
  }

  return { migratedKeys, skippedExistingKeys, skippedNonWhitelistKeys, skippedExampleKeys };
};

const registerNfStorageHandlers = () => {
  ipcMain.on('nf-storage:get-item', (event, key: unknown) => {
    event.returnValue = typeof key === 'string' && isNfStorageKey(key)
      ? readNfStorageItems()[key] ?? null
      : null;
  });

  ipcMain.on('nf-storage:set-item', (event, key: unknown, value: unknown) => {
    if (typeof key === 'string' && isNfStorageKey(key) && typeof value === 'string') {
      const items = readNfStorageItems();
      items[key] = value;
      writeNfStorageItems(items);
    }

    event.returnValue = null;
  });

  ipcMain.on('nf-storage:remove-item', (event, key: unknown) => {
    if (typeof key === 'string' && isNfStorageKey(key)) {
      const items = readNfStorageItems();

      if (Object.hasOwn(items, key)) {
        delete items[key];
        writeNfStorageItems(items);
      }
    }

    event.returnValue = null;
  });

  ipcMain.on('nf-storage:key', (event, index: unknown) => {
    event.returnValue =
      typeof index === 'number' && Number.isInteger(index) && index >= 0
        ? getSortedNfStorageKeys()[index] ?? null
        : null;
  });

  ipcMain.on('nf-storage:length', (event) => {
    event.returnValue = getSortedNfStorageKeys().length;
  });

  ipcMain.on('nf-storage:get-all-items', (event) => {
    event.returnValue = readNfStorageItems();
  });

  ipcMain.on('nf-storage:migrate-legacy-items', (event, legacyItems: unknown) => {
    event.returnValue = migrateLegacyItemsToNfStorage(legacyItems);
  });
};

const hasLegacyLocalStorageEntry = (directoryPath: string) =>
  existsSync(path.join(directoryPath, LEGACY_LOCAL_STORAGE_DIR_NAME));

const copyLegacyLocalStorageEntry = (sourcePath: string, targetPath: string) => {
  const sourceEntryPath = path.join(sourcePath, LEGACY_LOCAL_STORAGE_DIR_NAME);
  const targetEntryPath = path.join(targetPath, LEGACY_LOCAL_STORAGE_DIR_NAME);

  if (!existsSync(sourceEntryPath) || existsSync(targetEntryPath)) {
    return false;
  }

  try {
    mkdirSync(targetPath, { recursive: true });
    cpSync(sourceEntryPath, targetEntryPath, {
      recursive: true,
      force: false
    });

    return true;
  } catch (error) {
    console.warn('Failed to stage legacy NetraFlow localStorage for migration.', {
      sourcePath,
      targetPath,
      error
    });
    return false;
  }
};

const stageLegacyLocalStorageIfNeeded = (runtimeUserDataPath: string) => {
  if (hasLegacyLocalStorageEntry(runtimeUserDataPath)) {
    return;
  }

  const legacyUserDataPaths = [
    path.join(app.getPath('appData'), APP_NAME),
    path.join(app.getPath('appData'), APP_NAME.toLowerCase()),
    getLegacyPortableUserDataPath()
  ];

  for (const legacyUserDataPath of legacyUserDataPaths) {
    if (
      isSamePath(legacyUserDataPath, runtimeUserDataPath) ||
      !existsSync(legacyUserDataPath) ||
      !copyLegacyLocalStorageEntry(legacyUserDataPath, runtimeUserDataPath)
    ) {
      continue;
    }

    break;
  }
};

const configureRuntimeUserDataPath = () => {
  const runtimeUserDataPath = getNfRuntimeUserDataPath();
  const logsPath = getNfLogsPath();

  stageLegacyLocalStorageIfNeeded(runtimeUserDataPath);
  mkdirSync(runtimeUserDataPath, { recursive: true });
  mkdirSync(logsPath, { recursive: true });
  app.setPath('userData', runtimeUserDataPath);
  app.setAppLogsPath(logsPath);
};

configureRuntimeUserDataPath();
registerNfStorageHandlers();

const writePackagedMainLog = (message: string, details: Record<string, unknown> = {}) => {
  if (!app.isPackaged) {
    return;
  }

  try {
    const logPath = path.join(app.getPath('logs'), 'main.log');
    const timestamp = new Date().toISOString();
    const payload = Object.entries(details)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');
    const entry = [`[${timestamp}] ${message}`, payload].filter(Boolean).join('\n');

    mkdirSync(path.dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${entry}\n\n`, 'utf8');
  } catch (error) {
    console.error('Failed to write packaged main log:', error);
  }
};

const getAppIconPath = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'app/public/icons/netraflow.ico')
    : path.join(process.cwd(), 'public/icons/netraflow.ico');

const isAllowedExternalUrl = (url: string) => {
  if (url === BILIBILI_PROFILE_URL) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);

    return (
      parsedUrl.protocol === 'https:' &&
      ALLOWED_GITHUB_RELEASES_HOSTS.has(parsedUrl.hostname.toLowerCase()) &&
      parsedUrl.pathname.replace(/\/$/, '') === '/umucatt/NetraFlow/releases' &&
      parsedUrl.search === '' &&
      parsedUrl.hash === ''
    );
  } catch {
    return false;
  }
};

const getEventWindow = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) =>
  BrowserWindow.fromWebContents(event.sender);

const registerWindowsUserTasks = () => {
  if (process.platform !== 'win32') {
    return;
  }

  app.setUserTasks([
    {
      program: process.execPath,
      arguments: '--lock',
      iconPath: process.execPath,
      iconIndex: 0,
      title: '锁定',
      description: '锁定 NetraFlow'
    }
  ]);
};

const sendRendererLock = (targetWindow: BrowserWindow) => {
  if (targetWindow.isMinimized()) {
    targetWindow.restore();
  }

  targetWindow.show();
  targetWindow.focus();

  if (targetWindow.webContents.isLoading()) {
    pendingRendererLock = true;
    return;
  }

  pendingRendererLock = false;
  targetWindow.webContents.send('netraflow-lock');
};

const requestRendererLock = () => {
  const targetWindow = mainWindow ?? BrowserWindow.getAllWindows()[0] ?? null;

  if (!targetWindow) {
    pendingRendererLock = true;
    return;
  }

  sendRendererLock(targetWindow);
};

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (argv.includes('--lock')) {
      requestRendererLock();
    }
  });
}

ipcMain.on('window:minimize', (event) => {
  getEventWindow(event)?.minimize();
});

ipcMain.on('window:toggle-maximize', (event) => {
  const mainWindow = getEventWindow(event);

  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window:maximize', (event) => {
  const mainWindow = getEventWindow(event);

  if (!mainWindow) {
    return false;
  }

  mainWindow.maximize();
  return mainWindow.isMaximized();
});

ipcMain.handle('window:unmaximize', (event) => {
  const mainWindow = getEventWindow(event);

  if (!mainWindow) {
    return false;
  }

  mainWindow.unmaximize();
  return mainWindow.isMaximized();
});

ipcMain.on('window:close', (event) => {
  getEventWindow(event)?.close();
});

ipcMain.handle('window:is-maximized', (event) => getEventWindow(event)?.isMaximized() ?? false);

ipcMain.handle('app:open-external-url', async (_event, url: unknown) => {
  if (typeof url !== 'string' || !isAllowedExternalUrl(url)) {
    throw new Error('External URL is not allowed.');
  }

  await shell.openExternal(url);
});

ipcMain.handle('dialog:select-directory', async (event) => {
  const mainWindow = getEventWindow(event);
  const options: Electron.OpenDialogOptions = {
    properties: ['openDirectory', 'createDirectory']
  };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

  return result.canceled ? '' : result.filePaths[0] ?? '';
});

ipcMain.handle('backup:write-file', async (_event, request: unknown) => {
  if (
    typeof request !== 'object' ||
    request === null ||
    !('directory' in request) ||
    !('fileName' in request) ||
    !('content' in request)
  ) {
    throw new Error('Invalid snapshot write request.');
  }

  const { directory, fileName, content } = request as {
    directory: unknown;
    fileName: unknown;
    content: unknown;
  };

  if (
    typeof directory !== 'string' ||
    typeof fileName !== 'string' ||
    typeof content !== 'string'
  ) {
    throw new Error('Invalid snapshot write payload.');
  }

  if (!/^netraflow-(?:snapshot|backup)-\d{8}-\d{4}(?:\.encrypted)?\.json$/.test(fileName)) {
    throw new Error('Invalid snapshot file name.');
  }

  const resolvedDirectory = path.resolve(directory);
  const targetPath = path.join(resolvedDirectory, path.basename(fileName));

  await fs.mkdir(resolvedDirectory, { recursive: true });
  await fs.writeFile(targetPath, content, 'utf8');

  return { filePath: targetPath };
});

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  const createdWindow = new BrowserWindow({
    title: APP_NAME,
    icon: getAppIconPath(),
    width: 960,
    height: 640,
    backgroundColor: '#181b20',
    minWidth: 720,
    minHeight: 480,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow = createdWindow;

  createdWindow.setMenu(null);
  createdWindow.on('closed', () => {
    mainWindow = null;
  });
  createdWindow.webContents.on('did-finish-load', () => {
    if (!pendingRendererLock || !mainWindow) {
      return;
    }

    setTimeout(() => {
      if (mainWindow) {
        sendRendererLock(mainWindow);
      }
    }, 100);
  });

  const sendMaximizedState = () => {
    createdWindow.webContents.send('window:maximized-changed', createdWindow.isMaximized());
  };

  createdWindow.on('maximize', sendMaximizedState);
  createdWindow.on('unmaximize', sendMaximizedState);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const packagedIndexPath = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
  const localIndexPath = path.join(__dirname, '../dist/index.html');
  const loadDiagnostics = {
    'app.isPackaged': app.isPackaged,
    'process.resourcesPath': process.resourcesPath,
    'app.getAppPath()': app.getAppPath(),
    __dirname,
    devServerUrl: devServerUrl ?? '',
    packagedIndexPath,
    'existsSync(packagedIndexPath)': existsSync(packagedIndexPath),
    localIndexPath,
    'existsSync(localIndexPath)': existsSync(localIndexPath)
  };
  const loadFileWithLogging = (targetPath: string, mode: 'packaged' | 'local') => {
    writePackagedMainLog('Loading renderer', {
      ...loadDiagnostics,
      finalAction: 'loadFile',
      finalMode: mode,
      finalTarget: targetPath
    });

    void createdWindow.loadFile(targetPath).catch((error) => {
      writePackagedMainLog('Renderer load failed', {
        finalAction: 'loadFile',
        finalMode: mode,
        finalTarget: targetPath,
        error: error instanceof Error ? error.stack ?? error.message : String(error)
      });
    });
  };

  if (app.isPackaged) {
    loadFileWithLogging(packagedIndexPath, 'packaged');
    return;
  }

  if (!app.isPackaged && devServerUrl) {
    createdWindow.loadURL(devServerUrl);
    return;
  }

  loadFileWithLogging(localIndexPath, 'local');
}

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    registerWindowsUserTasks();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
