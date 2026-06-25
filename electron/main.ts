import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron';
import fs from 'node:fs/promises';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  type PathLike
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanupDemoDirectory,
  createPersistenceEnvironmentRoots,
  preflightDemoDirectory
} from './persistenceEnvironment.js';
import { createPersistenceEnvironmentStoreController } from './persistenceEnvironmentStore.js';
import { createDefaultPersistenceDocument } from './persistenceContracts.js';
import {
  createPersistenceStore,
  defaultPersistenceFileAdapter,
  type PersistenceFileAdapter,
  type PersistenceStore
} from './persistenceFileStore.js';
import { registerPersistenceHandlers } from './persistenceIpc.js';
import { createProductInstanceCoordinator } from './productInstanceLock.js';
import { createCloseBeforeWindowCoordinator } from './closeBeforeWindowState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_NAME = 'NetraFlow';
const APP_USER_MODEL_ID = 'com.netraflow.app';
const DEV_APP_USER_MODEL_ID = 'com.netraflow.app.dev';
const USERDATA_DIR_NAME = 'userdata';
const RUNTIME_DIR_NAME = 'runtime';
const SESSION_DATA_DIR_NAME = 'sessionData';
const CACHE_DIR_NAME = 'cache';
const LOGS_DIR_NAME = 'logs';
const CRASH_DUMPS_DIR_NAME = 'crashDumps';
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
const forceClosingWindows = new WeakSet<BrowserWindow>();
const appendValidationDiagnostic = (
  event: string,
  details: Record<string, unknown> = {}
) => {
  const diagnosticsFile = process.env.NETRAFLOW_VALIDATION_DIAGNOSTICS_FILE;

  if (!diagnosticsFile) {
    return;
  }

  try {
    const resolvedDiagnosticsFile = path.resolve(diagnosticsFile);

    mkdirSync(path.dirname(resolvedDiagnosticsFile), { recursive: true });
    appendFileSync(
      resolvedDiagnosticsFile,
      `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        diagnosticEvent: event,
        ...details
      })}\n`,
      'utf8'
    );
  } catch (error) {
    console.error('[NetraFlow validation] Failed to write diagnostic event.', error);
  }
};

type ValidationPersistenceRole = 'real' | 'demo';

const getDiagnosticsPathText = (value: PathLike) =>
  typeof value === 'string'
    ? value
    : value instanceof URL
      ? fileURLToPath(value)
      : value.toString();

const normalizeDiagnosticsPath = (value: PathLike) =>
  path.resolve(getDiagnosticsPathText(value)).toLowerCase();

const createValidationPersistenceAdapter = (
  root: string,
  role: ValidationPersistenceRole
): PersistenceFileAdapter | undefined => {
  if (!process.env.NETRAFLOW_VALIDATION_DIAGNOSTICS_FILE) {
    return undefined;
  }

  const corePath = normalizeDiagnosticsPath(path.join(root, 'core.json'));
  const coreTmpPath = normalizeDiagnosticsPath(path.join(root, 'core.json.tmp'));
  let activeCoreCandidateCount = 0;
  let maxActiveCoreCandidateCount = 0;

  const writeCandidateMetric = (stage: string, filePath: PathLike) => {
    maxActiveCoreCandidateCount = Math.max(
      maxActiveCoreCandidateCount,
      activeCoreCandidateCount
    );
    appendValidationDiagnostic('persistence-core-candidate', {
      role,
      stage,
      filePath: getDiagnosticsPathText(filePath),
      activeCoreCandidateCount,
      maxActiveCoreCandidateCount
    });
  };

  return {
    ...defaultPersistenceFileAdapter,
    openSync(filePath, flags, mode) {
      const fd = defaultPersistenceFileAdapter.openSync(filePath, flags, mode);

      if (normalizeDiagnosticsPath(filePath) === coreTmpPath) {
        activeCoreCandidateCount += 1;
        writeCandidateMetric('created', filePath);
      }

      return fd;
    },
    renameSync(oldPath, newPath) {
      defaultPersistenceFileAdapter.renameSync(oldPath, newPath);

      if (
        normalizeDiagnosticsPath(oldPath) === coreTmpPath &&
        normalizeDiagnosticsPath(newPath) === corePath
      ) {
        activeCoreCandidateCount = Math.max(0, activeCoreCandidateCount - 1);
        appendValidationDiagnostic('persistence-core-replace', {
          role,
          oldPath: getDiagnosticsPathText(oldPath),
          newPath: getDiagnosticsPathText(newPath),
          activeCoreCandidateCount,
          maxActiveCoreCandidateCount
        });
      }
    },
    unlinkSync(filePath) {
      defaultPersistenceFileAdapter.unlinkSync(filePath);

      if (normalizeDiagnosticsPath(filePath) === coreTmpPath) {
        activeCoreCandidateCount = Math.max(0, activeCoreCandidateCount - 1);
        writeCandidateMetric('removed', filePath);
      }
    }
  };
};

const createValidationPersistenceStore = (
  store: PersistenceStore,
  role: ValidationPersistenceRole
): PersistenceStore => ({
  ...store,
  writeCoreDocument: (document, options) => {
    appendValidationDiagnostic('persistence-core-write', {
      role,
      allowExternalCoreOverwrite: options?.allowExternalCoreOverwrite === true
    });
    const result = store.writeCoreDocument(document, options);

    appendValidationDiagnostic('persistence-core-write-result', {
      role,
      ok: result.ok,
      ...(!result.ok ? { code: result.code } : {})
    });

    return result;
  }
});

const createRuntimePersistenceStore = (
  root: string,
  role: ValidationPersistenceRole
): PersistenceStore => {
  const adapter = createValidationPersistenceAdapter(root, role);

  return createValidationPersistenceStore(
    createPersistenceStore({
      root,
      logger: console,
      ...(adapter ? { adapter } : {})
    }),
    role
  );
};
const closeBeforeWindows = createCloseBeforeWindowCoordinator({
  onStateChange: (event) => appendValidationDiagnostic('close-before-window-state', event)
});
let requestProductInstanceActivation = () => {
  pendingRendererLock = true;
};

app.setName(APP_NAME);

if (process.platform === 'win32') {
  app.setAppUserModelId(app.isPackaged ? APP_USER_MODEL_ID : DEV_APP_USER_MODEL_ID);
}

const isPortableBuild = () =>
  app.isPackaged &&
  (process.env.NETRAFLOW_PORTABLE === '1' ||
    existsSync(path.join(app.getAppPath(), 'portable.flag')) ||
    existsSync(path.join(process.resourcesPath, 'portable.flag')));

const getPackagedInstallRootPath = () => path.dirname(process.execPath);

const getPortableRootPath = () => path.dirname(process.execPath);

const getDevProjectRootPath = () => app.getAppPath();

const getAppInstallRootPath = () => {
  if (!app.isPackaged) {
    return getDevProjectRootPath();
  }

  return isPortableBuild() ? getPortableRootPath() : getPackagedInstallRootPath();
};

const appRoot = getAppInstallRootPath();

const getNfUserDataRootPath = () => {
  return persistenceRoots.realRoot;
};

const getNfRuntimeRootPath = () => {
  const overridePath = process.env.NETRAFLOW_RUNTIME_ROOT;

  if (overridePath) {
    return path.resolve(overridePath);
  }

  return path.join(getAppInstallRootPath(), RUNTIME_DIR_NAME);
};

const getNfRuntimeUserDataPath = () => getNfRuntimeRootPath();

const getNfSessionDataPath = () => path.join(getNfRuntimeRootPath(), SESSION_DATA_DIR_NAME);

const getNfCachePath = () => path.join(getNfRuntimeRootPath(), CACHE_DIR_NAME);

const getNfLogsPath = () => path.join(getNfRuntimeUserDataPath(), LOGS_DIR_NAME);

const getNfCrashDumpsPath = () => path.join(getNfRuntimeRootPath(), CRASH_DUMPS_DIR_NAME);

const productInstanceCoordinator = createProductInstanceCoordinator({
  onActivate: () => requestProductInstanceActivation(),
  logger: console
});

const gotProductInstanceLock = await productInstanceCoordinator.acquire();

if (!gotProductInstanceLock) {
  app.exit(0);
}

const persistenceRoots = createPersistenceEnvironmentRoots({
  root: process.env.NETRAFLOW_PERSISTENCE_EXE_DIR
    ? path.resolve(process.env.NETRAFLOW_PERSISTENCE_EXE_DIR)
    : appRoot,
  realRoot: process.env.NETRAFLOW_USERDATA_ROOT
    ? path.resolve(process.env.NETRAFLOW_USERDATA_ROOT)
    : undefined,
  demoRoot: process.env.NETRAFLOW_DEMO_ROOT
    ? path.resolve(process.env.NETRAFLOW_DEMO_ROOT)
    : undefined
});

const startupDemoCleanupResult = cleanupDemoDirectory(persistenceRoots);

if (!startupDemoCleanupResult.ok) {
  console.warn('[NetraFlow demo] Failed to clean stale demo environment on startup.', {
    code: startupDemoCleanupResult.code
  });
}

const realPersistenceStore = createRuntimePersistenceStore(persistenceRoots.realRoot, 'real');

const demoPersistenceStore = createRuntimePersistenceStore(persistenceRoots.demoRoot, 'demo');

const persistenceEnvironmentStore = createPersistenceEnvironmentStoreController({
  realStore: realPersistenceStore,
  demoStore: demoPersistenceStore
});

const persistenceStore = persistenceEnvironmentStore.store;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createLifecycleError = (code: string, message: string) => ({
  ok: false as const,
  code,
  message
});

const readPersistenceSnapshotFromStore = (store: PersistenceStore) => {
  const core = store.readCoreDocument();

  if (!core.ok) {
    return createLifecycleError(core.code, core.message);
  }

  const settings = store.readSettingsDocument();

  if (!settings.ok) {
    return createLifecycleError(settings.code, settings.message);
  }

  if ('locked' in settings) {
    return createLifecycleError(
      'PERSISTENCE_SCHEMA_INVALID',
      'Settings document is unexpectedly locked.'
    );
  }

  const state = store.readStateDocument();

  if (!state.ok) {
    return createLifecycleError(state.code, state.message);
  }

  if ('locked' in state) {
    return createLifecycleError(
      'PERSISTENCE_SCHEMA_INVALID',
      'State document is unexpectedly locked.'
    );
  }

  const security = store.readSecurityDocument();

  if (!security.ok) {
    return createLifecycleError(security.code, security.message);
  }

  if ('locked' in security) {
    return createLifecycleError(
      'PERSISTENCE_SCHEMA_INVALID',
      'Security document is unexpectedly locked.'
    );
  }

  const coreProtection =
    'locked' in core
      ? {
          enabled: true,
          locked: true,
          ...(core.integrityWarning ? { integrityWarning: core.integrityWarning } : {})
        }
      : {
          enabled: core.encrypted === true,
          locked: false,
          ...(core.integrityWarning ? { integrityWarning: core.integrityWarning } : {})
        };

  return {
    ok: true as const,
    snapshot: {
      core: 'locked' in core ? createDefaultPersistenceDocument('core') : core.document,
      settings: settings.document,
      state: state.document,
      security: security.document,
      coreProtection
    }
  };
};

const writeDemoPersistenceDocuments = (documents: unknown) => {
  if (!isPlainObject(documents)) {
    return createLifecycleError(
      'DEMO_DOCUMENT_SCHEMA_INVALID',
      'Demo persistence documents are invalid.'
    );
  }

  const writes = [
    demoPersistenceStore.writeCoreDocument(documents.core),
    demoPersistenceStore.writeSettingsDocument(documents.settings),
    demoPersistenceStore.writeStateDocument(documents.state),
    demoPersistenceStore.writeSecurityDocument(documents.security)
  ];
  const failedWrite = writes.find((result) => !result.ok);

  if (failedWrite && !failedWrite.ok) {
    return createLifecycleError(failedWrite.code, failedWrite.message);
  }

  return { ok: true as const };
};

const enterDemoPersistenceEnvironment = (documents: unknown) => {
  if (persistenceEnvironmentStore.getEnvironment() !== 'real') {
    return createLifecycleError(
      'DEMO_ALREADY_ACTIVE',
      'Demo environment is already active.'
    );
  }

  const preflight = preflightDemoDirectory(persistenceRoots);

  if (!preflight.ok) {
    return createLifecycleError(preflight.code, preflight.message);
  }

  const writeResult = writeDemoPersistenceDocuments(documents);

  if (!writeResult.ok) {
    cleanupDemoDirectory(persistenceRoots);
    return writeResult;
  }

  const readResult = readPersistenceSnapshotFromStore(demoPersistenceStore);

  if (!readResult.ok) {
    cleanupDemoDirectory(persistenceRoots);
    return readResult;
  }

  persistenceEnvironmentStore.setEnvironment('demo');

  return readResult;
};

const exitDemoPersistenceEnvironment = () => {
  persistenceEnvironmentStore.setEnvironment('real');

  const readResult = readPersistenceSnapshotFromStore(realPersistenceStore);
  const cleanup = cleanupDemoDirectory(persistenceRoots);

  if (!readResult.ok) {
    return readResult;
  }

  return {
    ...readResult,
    cleanup
  };
};

const promoteDemoCoreToRealPersistenceEnvironment = () => {
  const promotion = persistenceEnvironmentStore.promoteDemoCoreToReal();

  if (!promotion.ok) {
    return createLifecycleError(promotion.code, promotion.message);
  }

  const readResult = readPersistenceSnapshotFromStore(realPersistenceStore);

  if (!readResult.ok) {
    return readResult;
  }

  const cleanup = cleanupDemoDirectory(persistenceRoots);

  if (!cleanup.ok) {
    console.warn('[NetraFlow demo] Failed to clean promoted demo environment.', {
      code: cleanup.code
    });
  }

  return {
    ...readResult,
    cleanup
  };
};

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
  const settingsResult = persistenceStore.readSettingsDocument();
  const stateResult = persistenceStore.readStateDocument();
  const settings =
    settingsResult.ok && !('locked' in settingsResult) && isPlainObject(settingsResult.document)
      ? settingsResult.document as Record<string, unknown>
      : {};
  const state =
    stateResult.ok && !('locked' in stateResult) && isPlainObject(stateResult.document)
      ? stateResult.document as Record<string, unknown>
      : {};
  const globalSettings = isPlainObject(settings.global)
    ? settings.global as Record<string, unknown>
    : {};
  const personalization = isPlainObject(state.personalization)
    ? state.personalization as Record<string, unknown>
    : {};

  return normalizeThemeBootstrapSettings({
    ...globalSettings,
    nyaaThemeUnlocked: personalization.nyaaThemeUnlocked
  });
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

const configureRuntimeUserDataPath = () => {
  const userDataRootPath = getNfUserDataRootPath();
  const runtimeUserDataPath = getNfRuntimeUserDataPath();
  const sessionDataPath = getNfSessionDataPath();
  const cachePath = getNfCachePath();
  const logsPath = getNfLogsPath();
  const crashDumpsPath = getNfCrashDumpsPath();

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

const writeValidationPathDiagnostics = () => {
  appendValidationDiagnostic('resolved-paths', {
    resolvedUserdataRoot: persistenceRoots.realRoot,
    resolvedRuntimeRoot: getNfRuntimeRootPath(),
    resolvedDemoRoot: persistenceRoots.demoRoot,
    electronUserDataPath: app.getPath('userData'),
    electronSessionDataPath: app.getPath('sessionData'),
    electronCachePath: getNfCachePath()
  });
};

writeValidationPathDiagnostics();
registerPersistenceHandlers(persistenceStore, {
  enterDemoEnvironment: enterDemoPersistenceEnvironment,
  exitDemoEnvironment: exitDemoPersistenceEnvironment,
  promoteDemoCoreToRealEnvironment: promoteDemoCoreToRealPersistenceEnvironment
});

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

const getAppResourceRootPath = () => app.getAppPath();

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
requestProductInstanceActivation = requestRendererLock;

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  void productInstanceCoordinator.notifyExisting();
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    pendingRendererLock = pendingRendererLock || argv.includes('--lock');
    requestRendererLock();
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
  const targetWindow = getEventWindow(event);

  if (!targetWindow) {
    return;
  }

  closeBeforeWindows.requestRendererCloseApproval(targetWindow);
});

ipcMain.on('window:allow-close', (event) => {
  const targetWindow = getEventWindow(event);

  if (!targetWindow) {
    return;
  }

  closeBeforeWindows.allowNextWindowClose(targetWindow);
});

ipcMain.on('window:cancel-close-request', (event) => {
  const targetWindow = getEventWindow(event);

  if (!targetWindow) {
    return;
  }

  closeBeforeWindows.cancelCloseRequest(targetWindow);
});

ipcMain.on('window:force-close', (event) => {
  const targetWindow = getEventWindow(event);

  if (!targetWindow) {
    return;
  }

  forceClosingWindows.add(targetWindow);
  targetWindow.close();
});

ipcMain.handle('window:is-maximized', (event) => getEventWindow(event)?.isMaximized() ?? false);

ipcMain.handle('app:open-external-url', async (_event, url: unknown) => {
  if (typeof url !== 'string' || !isAllowedExternalUrl(url)) {
    throw new Error('External URL is not allowed.');
  }

  await shell.openExternal(url);
});

ipcMain.handle('app:open-userdata-directory', async () => {
  const errorMessage = await shell.openPath(persistenceRoots.realRoot);

  if (errorMessage) {
    throw new Error(errorMessage);
  }
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

const isFileUrlForPath = (targetUrl: string, targetPath: string) => {
  try {
    return path.resolve(fileURLToPath(targetUrl)) === path.resolve(targetPath);
  } catch {
    return false;
  }
};

const isDevServerNavigation = (targetUrl: string, devServerUrl: string) => {
  try {
    return new URL(targetUrl).origin === new URL(devServerUrl).origin;
  } catch {
    return false;
  }
};

const isAllowedRendererNavigation = ({
  targetUrl,
  devServerUrl,
  packagedIndexPath,
  localIndexPath
}: {
  targetUrl: string;
  devServerUrl: string | undefined;
  packagedIndexPath: string;
  localIndexPath: string;
}) => {
  if (!app.isPackaged && devServerUrl) {
    return isDevServerNavigation(targetUrl, devServerUrl);
  }

  return isFileUrlForPath(targetUrl, app.isPackaged ? packagedIndexPath : localIndexPath);
};

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
      sandbox: true
    }
  });
  mainWindow = createdWindow;

  createdWindow.setMenu(null);
  createdWindow.on('close', (event) => {
    if (forceClosingWindows.has(createdWindow)) {
      forceClosingWindows.delete(createdWindow);
      return;
    }

    if (closeBeforeWindows.handleWindowClose(createdWindow, event)) {
      return;
    }

    closeBeforeWindows.requestRendererCloseApproval(createdWindow);
  });
  createdWindow.on('closed', () => {
    closeBeforeWindows.deleteWindow(createdWindow);
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
  const packagedIndexPath = path.join(app.getAppPath(), 'dist', 'index.html');
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

  createdWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  createdWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(false);
    }
  );
  createdWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (
      !isAllowedRendererNavigation({
        targetUrl,
        devServerUrl,
        packagedIndexPath,
        localIndexPath
      })
    ) {
      event.preventDefault();
    }
  });

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

let didRunQuitDemoCleanup = false;

const cleanupDemoOnAppQuit = () => {
  if (didRunQuitDemoCleanup) {
    return;
  }

  didRunQuitDemoCleanup = true;
  persistenceEnvironmentStore.setEnvironment('real');

  const cleanup = cleanupDemoDirectory(persistenceRoots);

  if (!cleanup.ok) {
    console.warn('[NetraFlow demo] Failed to clean demo environment on app quit.', {
      code: cleanup.code
    });
  }
};

app.on('before-quit', cleanupDemoOnAppQuit);
app.on('will-quit', () => {
  cleanupDemoOnAppQuit();
  void productInstanceCoordinator.release();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
