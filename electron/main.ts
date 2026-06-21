import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron';
import fs from 'node:fs/promises';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readNfStorageFile,
  writeNfStorageFile,
  type NfStorageItems,
  type StorageReadResult,
  type StorageWriteResult
} from './storageFile.js';
import {
  setNfStorageBatchItems,
  type NfStorageBatchErrorCode
} from './nfStorageBatch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_NAME = 'NetraFlow';
const APP_USER_MODEL_ID = 'com.netraflow.app';
const DEV_APP_USER_MODEL_ID = 'com.netraflow.app.dev';
const LEGACY_PORTABLE_USER_DATA_DIR_NAME = 'userData';
const LEGACY_LOCAL_STORAGE_DIR_NAME = 'Local Storage';
const USERDATA_DIR_NAME = 'userdata';
const RUNTIME_DIR_NAME = 'runtime';
const SESSION_DATA_DIR_NAME = 'sessionData';
const CACHE_DIR_NAME = 'cache';
const LOGS_DIR_NAME = 'logs';
const CRASH_DUMPS_DIR_NAME = 'crashDumps';
const NF_STORAGE_FILE_NAME = 'storage.json';
const GLOBAL_SETTINGS_STORAGE_KEY = 'netraflowGlobalSettings';
const NF_STORAGE_WHITELIST_KEYS = [
  'asset-overview-groups',
  'asset-overview-accounts',
  'asset-overview-history',
  'lastBackupAt',
  'lastBackupHistoryCount',
  'backupRecords',
  'snapshotImportRecords',
  'autoBackupSettings',
  'forceAutoBackupDueOnce',
  'assetChartSettings',
  GLOBAL_SETTINGS_STORAGE_KEY,
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
const JSON_INTEGRITY_ALGORITHM = 'SHA-256';
type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';
type ThemeStyle = 'default' | 'nyaa';
type ThemeBootstrapSettings = {
  themeMode: ThemeMode;
  themeStyle: ThemeStyle;
  nyaaThemeUnlocked: boolean;
};
const DEFAULT_THEME_MODE: ThemeMode = 'system';
const DEFAULT_THEME_STYLE: ThemeStyle = 'default';
const THEME_BOOTSTRAP_BACKGROUND_COLORS: Record<
  ThemeStyle,
  Record<ResolvedTheme, string>
> = {
  default: {
    light: '#f6f3ea',
    dark: '#171a1f'
  },
  nyaa: {
    light: '#fff6fa',
    dark: '#18141b'
  }
};
let mainWindow: BrowserWindow | null = null;
let pendingRendererLock = process.argv.includes('--lock');

app.setName(APP_NAME);

if (process.platform === 'win32') {
  app.setAppUserModelId(app.isPackaged ? APP_USER_MODEL_ID : DEV_APP_USER_MODEL_ID);
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

const getDevProjectRootPath = () => app.getAppPath();

const getAppInstallRootPath = () => {
  if (!app.isPackaged) {
    return getDevProjectRootPath();
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

const getNfSessionDataPath = () => path.join(getNfRuntimeRootPath(), SESSION_DATA_DIR_NAME);

const getNfCachePath = () => path.join(getNfRuntimeRootPath(), CACHE_DIR_NAME);

const getNfLogsPath = () => path.join(getNfRuntimeUserDataPath(), LOGS_DIR_NAME);

const getNfCrashDumpsPath = () => path.join(getNfRuntimeRootPath(), CRASH_DUMPS_DIR_NAME);

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

const readNfStorageItems = () => {
  return readNfStorageFile({
    storageFilePath: getNfStorageFilePath(),
    whitelistKeys: NF_STORAGE_WHITELIST_KEYS,
    logger: console
  });
};

const writeNfStorageItems = (items: Record<string, unknown>) => {
  return writeNfStorageFile({
    storageFilePath: getNfStorageFilePath(),
    whitelistKeys: NF_STORAGE_WHITELIST_KEYS,
    items,
    logger: console
  });
};

type NfStorageBridgeErrorResult = {
  ok: false;
  code: NfStorageBatchErrorCode;
  message: string;
};

const createBridgeErrorResult = (
  code: NfStorageBatchErrorCode,
  message: string
): NfStorageBridgeErrorResult => ({ ok: false, code, message });

const getReadErrorResult = (
  result: Extract<StorageReadResult, { ok: false }>
): NfStorageBridgeErrorResult => createBridgeErrorResult(result.code, result.message);

const getWriteErrorResult = (
  result: Extract<StorageWriteResult, { ok: false }>
): NfStorageBridgeErrorResult => createBridgeErrorResult(result.code, result.message);

const isNfStorageBridgeErrorResult = (
  value: unknown
): value is NfStorageBridgeErrorResult =>
  typeof value === 'object' &&
  value !== null &&
  'ok' in value &&
  (value as { ok?: unknown }).ok === false;

const getReadItemsOrBridgeError = (): NfStorageItems | NfStorageBridgeErrorResult => {
  const result = readNfStorageItems();

  if (!result.ok) {
    return getReadErrorResult(result);
  }

  return result.items as NfStorageItems;
};

const getSortedNfStorageKeys = (items: NfStorageItems | {}) =>
  NF_STORAGE_WHITELIST_KEYS.filter((key) => Object.hasOwn(items, key));

const logStorageReadError = (context: string, result: StorageReadResult) => {
  if (result.ok) {
    return;
  }

  console.warn(`[NetraFlow storage] ${context}`, {
    code: result.code,
    message: result.message
  });
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

const isThemeStyle = (value: unknown): value is ThemeStyle =>
  value === 'default' || value === 'nyaa';

const normalizeThemeBootstrapSettings = (value: unknown): ThemeBootstrapSettings => {
  if (!isPlainObject(value)) {
    return {
      themeMode: DEFAULT_THEME_MODE,
      themeStyle: DEFAULT_THEME_STYLE,
      nyaaThemeUnlocked: false
    };
  }

  const nyaaThemeUnlocked = value.nyaaThemeUnlocked === true;

  return {
    themeMode: isThemeMode(value.themeMode) ? value.themeMode : DEFAULT_THEME_MODE,
    themeStyle:
      nyaaThemeUnlocked && isThemeStyle(value.themeStyle)
        ? value.themeStyle
        : DEFAULT_THEME_STYLE,
    nyaaThemeUnlocked
  };
};

const readThemeBootstrapSettings = () => {
  const itemsResult = readNfStorageItems();

  if (!itemsResult.ok) {
    logStorageReadError('Failed to read storage for theme bootstrap.', itemsResult);

    return normalizeThemeBootstrapSettings(null);
  }

  const storedSettings = (itemsResult.items as NfStorageItems)[GLOBAL_SETTINGS_STORAGE_KEY];

  if (!storedSettings) {
    return normalizeThemeBootstrapSettings(null);
  }

  try {
    return normalizeThemeBootstrapSettings(JSON.parse(storedSettings));
  } catch (error) {
    console.warn('[NetraFlow theme] Failed to read global theme settings.', error);
    return normalizeThemeBootstrapSettings(null);
  }
};

const getSystemThemeForBootstrap = (): ResolvedTheme => {
  try {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  } catch (error) {
    console.warn('[NetraFlow theme] Failed to resolve native theme.', error);
    return 'light';
  }
};

const resolveThemeForBootstrap = (themeMode: ThemeMode): ResolvedTheme =>
  themeMode === 'system' ? getSystemThemeForBootstrap() : themeMode;

const getThemeBootstrapBackgroundColor = (
  resolvedTheme: ResolvedTheme,
  themeStyle: ThemeStyle
) => THEME_BOOTSTRAP_BACKGROUND_COLORS[themeStyle][resolvedTheme];

const getBrowserWindowBackgroundColor = () => {
  const settings = readThemeBootstrapSettings();
  const resolvedTheme = resolveThemeForBootstrap(settings.themeMode);

  return getThemeBootstrapBackgroundColor(resolvedTheme, settings.themeStyle);
};

const migrateLegacyItemsToNfStorage = (legacyItems: unknown) => {
  const currentItemsResult = readNfStorageItems();
  const migratedKeys: string[] = [];
  const skippedExistingKeys: string[] = [];
  const skippedNonWhitelistKeys: string[] = [];
  const skippedExampleKeys: string[] = [];

  if (!currentItemsResult.ok) {
    return getReadErrorResult(currentItemsResult);
  }

  if (typeof legacyItems !== 'object' || legacyItems === null || Array.isArray(legacyItems)) {
    return { migratedKeys, skippedExistingKeys, skippedNonWhitelistKeys, skippedExampleKeys };
  }

  const currentItems = currentItemsResult.items as NfStorageItems;
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
    const writeResult = writeNfStorageItems(nextItems);

    if (!writeResult.ok) {
      return getWriteErrorResult(writeResult);
    }
  }

  return { migratedKeys, skippedExistingKeys, skippedNonWhitelistKeys, skippedExampleKeys };
};

const registerNfStorageHandlers = () => {
  ipcMain.on('nf-storage:get-item', (event, key: unknown) => {
    if (typeof key !== 'string' || !isNfStorageKey(key)) {
      event.returnValue = null;
      return;
    }

    const items = getReadItemsOrBridgeError();

    event.returnValue = isNfStorageBridgeErrorResult(items) ? items : items[key] ?? null;
  });

  ipcMain.on('nf-storage:set-item', (event, key: unknown, value: unknown) => {
    if (typeof key === 'string' && isNfStorageKey(key) && typeof value === 'string') {
      const items = getReadItemsOrBridgeError();

      if (isNfStorageBridgeErrorResult(items)) {
        event.returnValue = items;
        return;
      }

      items[key] = value;
      const writeResult = writeNfStorageItems(items);

      if (!writeResult.ok) {
        event.returnValue = getWriteErrorResult(writeResult);
        return;
      }
    }

    event.returnValue = { ok: true };
  });

  ipcMain.on('nf-storage:set-items', (event, items: unknown) => {
    event.returnValue = setNfStorageBatchItems(items, {
      whitelistKeys: NF_STORAGE_WHITELIST_KEYS,
      readItems: readNfStorageItems,
      writeItems: writeNfStorageItems
    });
  });

  ipcMain.on('nf-storage:remove-item', (event, key: unknown) => {
    if (typeof key === 'string' && isNfStorageKey(key)) {
      const items = getReadItemsOrBridgeError();

      if (isNfStorageBridgeErrorResult(items)) {
        event.returnValue = items;
        return;
      }

      if (Object.hasOwn(items, key)) {
        delete items[key];
        const writeResult = writeNfStorageItems(items);

        if (!writeResult.ok) {
          event.returnValue = getWriteErrorResult(writeResult);
          return;
        }
      }
    }

    event.returnValue = { ok: true };
  });

  ipcMain.on('nf-storage:key', (event, index: unknown) => {
    const items = getReadItemsOrBridgeError();

    if (isNfStorageBridgeErrorResult(items)) {
      event.returnValue = items;
      return;
    }

    event.returnValue =
      typeof index === 'number' && Number.isInteger(index) && index >= 0
        ? getSortedNfStorageKeys(items)[index] ?? null
        : null;
  });

  ipcMain.on('nf-storage:length', (event) => {
    const items = getReadItemsOrBridgeError();

    event.returnValue = isNfStorageBridgeErrorResult(items)
      ? items
      : getSortedNfStorageKeys(items).length;
  });

  ipcMain.on('nf-storage:get-all-items', (event) => {
    event.returnValue = getReadItemsOrBridgeError();
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
  const userDataRootPath = getNfUserDataRootPath();
  const runtimeUserDataPath = getNfRuntimeUserDataPath();
  const sessionDataPath = getNfSessionDataPath();
  const cachePath = getNfCachePath();
  const logsPath = getNfLogsPath();
  const crashDumpsPath = getNfCrashDumpsPath();

  if (app.isPackaged) {
    stageLegacyLocalStorageIfNeeded(runtimeUserDataPath);
  }

  mkdirSync(userDataRootPath, { recursive: true });
  mkdirSync(runtimeUserDataPath, { recursive: true });
  mkdirSync(sessionDataPath, { recursive: true });
  mkdirSync(cachePath, { recursive: true });
  mkdirSync(logsPath, { recursive: true });
  mkdirSync(crashDumpsPath, { recursive: true });
  app.setPath('userData', runtimeUserDataPath);
  app.setPath('sessionData', sessionDataPath);
  app.setPath('cache', cachePath);
  app.setPath('crashDumps', crashDumpsPath);
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

const getAppResourceRootPath = () =>
  app.isPackaged ? path.join(process.resourcesPath, 'app') : app.getAppPath();

const getAppIconPath = () => path.join(getAppResourceRootPath(), 'public/icons/netraflow.ico');

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

  const lockArguments = app.isPackaged ? '--lock' : `"${app.getAppPath()}" --lock`;

  app.setUserTasks([
    {
      program: process.execPath,
      arguments: lockArguments,
      iconPath: app.isPackaged ? process.execPath : getAppIconPath(),
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

const bytesToHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const sha256Hex = async (text: string) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('SHA-256 crypto is unavailable.');
  }

  const digest = await globalThis.crypto.subtle.digest(
    JSON_INTEGRITY_ALGORITHM,
    new TextEncoder().encode(text)
  );

  return bytesToHex(digest);
};

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getIntegrityContentKey = (value: Record<string, unknown>) => {
  const hasPayload = Object.hasOwn(value, 'payload');
  const hasEncrypted = Object.hasOwn(value, 'encrypted');

  if (hasPayload && hasEncrypted) {
    return null;
  }

  if (hasPayload) {
    return 'payload';
  }

  if (hasEncrypted) {
    return 'encrypted';
  }

  return undefined;
};

const verifyJsonWriteContent = async (content: string) => {
  const parsed = JSON.parse(content) as unknown;
  const minifiedText = JSON.stringify(parsed);

  if (content !== minifiedText) {
    throw new Error('JSON export payload must be minified.');
  }

  if (!isJsonObject(parsed)) {
    throw new Error('JSON export payload must be an integrity wrapper.');
  }

  const contentKey = getIntegrityContentKey(parsed);

  if (contentKey === null) {
    throw new Error('JSON export wrapper cannot contain both payload and encrypted content.');
  }

  if (contentKey === undefined) {
    throw new Error('JSON export wrapper is missing payload or encrypted content.');
  }

  const integrity = parsed.integrity;

  if (!isJsonObject(integrity)) {
    throw new Error('JSON export wrapper is missing integrity metadata.');
  }

  if (
    integrity.algorithm !== JSON_INTEGRITY_ALGORITHM ||
    typeof integrity.hash !== 'string' ||
    integrity.hash.length === 0
  ) {
    throw new Error('JSON export wrapper has invalid integrity metadata.');
  }

  const actualHash = await sha256Hex(JSON.stringify(parsed[contentKey]));

  if (actualHash !== integrity.hash) {
    throw new Error('JSON export integrity check failed.');
  }
};

const atomicWriteJsonFile = async (targetPath: string, content: string) => {
  const targetDirectory = path.dirname(targetPath);
  const targetFileName = path.basename(targetPath);
  const tempPath = path.join(
    targetDirectory,
    `.${targetFileName}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  let tempFileCreated = false;

  try {
    await fs.mkdir(targetDirectory, { recursive: true });
    await fs.writeFile(tempPath, content, { encoding: 'utf8', flag: 'wx' });
    tempFileCreated = true;

    const readBackContent = await fs.readFile(tempPath, 'utf8');
    await verifyJsonWriteContent(readBackContent);
    await fs.rename(tempPath, targetPath);
    tempFileCreated = false;
  } catch (error) {
    if (tempFileCreated) {
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        console.warn('[NetraFlow snapshot] Failed to delete temporary export file.', {
          tempPath,
          error: cleanupError
        });
      }
    }

    throw error;
  }
};

const isAllowedJsonExportFileName = (fileName: string) =>
  /^netraflow-(?:snapshot|backup)-\d{8}-\d{4}(?:\.encrypted)?\.json$/.test(fileName) ||
  /^netraflow-settings-\d{8}-\d{6}\.netraflow-settings\.json$/.test(fileName);

const handleJsonWriteFile = async (_event: Electron.IpcMainInvokeEvent, request: unknown) => {
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

  if (!isAllowedJsonExportFileName(fileName)) {
    throw new Error('Invalid JSON export file name.');
  }

  const resolvedDirectory = path.resolve(directory);
  const targetPath = path.join(resolvedDirectory, path.basename(fileName));

  await atomicWriteJsonFile(targetPath, content);

  return { filePath: targetPath };
};

ipcMain.handle('backup:write-file', handleJsonWriteFile);
ipcMain.handle('json:write-file', handleJsonWriteFile);

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  const createdWindow = new BrowserWindow({
    title: APP_NAME,
    icon: getAppIconPath(),
    width: 960,
    height: 640,
    backgroundColor: getBrowserWindowBackgroundColor(),
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
