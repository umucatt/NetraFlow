import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell } from 'electron';
import fs from 'node:fs/promises';
import { appendFileSync, existsSync, mkdirSync, type PathLike } from 'node:fs';
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
import { createAppShutdownState } from './appShutdownState.js';
import {
  installMacosApplicationMenu,
  type MacosApplicationMenuController
} from './macosApplicationMenu.js';
import { createMacosAboutPanelOptions } from './macosAboutPanel.js';
import { createStorageLayout } from './storageLayout.js';
import { getAppIconPath, getPlatformWindowOptions } from './windowPlatformOptions.js';
import {
  createManagedDataDeletionPlan,
  createSingleRunCleanupCoordinator,
  type ManagedDataDeletionTarget
} from './localDataCleanup.js';
import { clearLinuxAppImageUnsandboxedConsent } from './linuxAppImagePreferences.js';
import { isLinuxAppImageRuntime } from './linuxAppImageRuntime.js';
import { createPersistencePaths } from './persistencePaths.js';
import {
  canShowNormalAppWindow,
  shouldDeferNormalAppFirstShow,
  shouldWaitForStableRendererFrame
} from './normalAppFirstFramePolicy.js';
import {
  createStartupThemeSnapshot,
  normalizeThemeBootstrapSettings,
  type ResolvedTheme
} from './startupTheme.js';
import {
  recoverInterruptedSnapshotTransaction,
  runPersistenceSnapshotTransaction
} from './persistenceSnapshotTransaction.js';
import { writeInitializedPersistenceSnapshotDocuments } from './initializedPersistenceSnapshot.js';
import {
  createResetTransaction,
  createRuntimePendingMarker,
  invalidateAndDeleteUserdata,
  isolateAndDeleteRuntime,
  runStartupDeletePreflight
} from './destructiveResetLifecycle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_NAME = 'NetraFlow';
const APP_USER_MODEL_ID = 'com.netraflow.app';
const DEV_APP_USER_MODEL_ID = 'com.netraflow.app.dev';
const BILIBILI_PROFILE_URL = 'https://space.bilibili.com/1738773145';
const GITHUB_RELEASES_URL = 'https://github.com/umucatt/NetraFlow/releases';
const ALLOWED_GITHUB_RELEASES_HOSTS = new Set(['github.com', 'www.github.com']);
const JSON_INTEGRITY_ALGORITHM = 'SHA-256';
const processStartTime = process.hrtime.bigint();
let resetLogToFile = true;
const writeResetLifecycleLog = (event: string, details: Record<string, unknown> = {}) => {
  const elapsedMs = Number(process.hrtime.bigint() - processStartTime) / 1_000_000;
  const payload = { event, elapsedMs: elapsedMs.toFixed(1), ...details };
  appendValidationDiagnostic(event, { elapsedMs: elapsedMs.toFixed(1), ...details });
  if (!resetLogToFile) {
    console.error('[NetraFlow reset]', payload);
    return;
  }
  console.info('[NetraFlow reset]', payload);
};
let mainWindow: BrowserWindow | null = null;
let pendingRendererLock = process.argv.includes('--lock');
let pendingWindowActivation = false;
let mainWindowFirstFrameReady = !shouldDeferNormalAppFirstShow(process.platform, app.isPackaged);
const forceClosingWindows = new WeakSet<BrowserWindow>();
let macosApplicationMenu: MacosApplicationMenuController | null = null;
let rendererIsReadyForApplicationMenu = false;
let rendererCanLockFromApplicationMenu = false;
let macosMenuLockRequestInProgress = false;
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
const appShutdownState = createAppShutdownState();
const isDestructiveShutdown = () =>
  appShutdownState.getIntent() === 'destructive-shutdown';
const isAppQuitInProgress = () => appShutdownState.isAppQuitInProgress();
const refreshMacosApplicationMenu = () => {
  macosApplicationMenu?.refresh();
};
const resetRendererApplicationMenuState = () => {
  rendererIsReadyForApplicationMenu = false;
  rendererCanLockFromApplicationMenu = false;
  macosMenuLockRequestInProgress = false;
  refreshMacosApplicationMenu();
};
const isMacosApplicationMenuWindowReady = () =>
  Boolean(
    mainWindow &&
      !mainWindow.isDestroyed() &&
      rendererIsReadyForApplicationMenu &&
      !isDestructiveShutdown() &&
      !isAppQuitInProgress()
  );
const isMacosApplicationMenuLockEnabled = () =>
  isMacosApplicationMenuWindowReady() &&
  rendererCanLockFromApplicationMenu &&
  !macosMenuLockRequestInProgress;
let requestProductInstanceActivation = () => {
  pendingWindowActivation = true;
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

const storageLayout = createStorageLayout({
  platform: process.platform,
  isPackaged: app.isPackaged,
  isPortable: isPortableBuild(),
  execPath: process.execPath,
  appPath: app.getAppPath(),
  defaultUserDataPath: app.getPath('userData'),
  overrides: {
    persistenceRoot: process.env.NETRAFLOW_PERSISTENCE_EXE_DIR,
    userdata: process.env.NETRAFLOW_USERDATA_ROOT,
    runtime: process.env.NETRAFLOW_RUNTIME_ROOT,
    demo: process.env.NETRAFLOW_DEMO_ROOT
  }
});

const productInstanceCoordinator = createProductInstanceCoordinator({
  onActivate: () => requestProductInstanceActivation(),
  getState: () => isDestructiveShutdown() ? 'resetting' : 'active',
  logger: console
});

const gotProductInstanceLock = await productInstanceCoordinator.acquire();

if (!gotProductInstanceLock) {
  app.exit(0);
}

await runStartupDeletePreflight(storageLayout, writeResetLifecycleLog);

const persistenceRoots = createPersistenceEnvironmentRoots(storageLayout);

recoverInterruptedSnapshotTransaction(createPersistencePaths(persistenceRoots.realRoot));

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

  const invalidNonCore = [settings, state, security].find(
    (result) => result.ok && !('locked' in result) && result.degraded === true
  );

  if (invalidNonCore && invalidNonCore.ok && !('locked' in invalidNonCore)) {
    return createLifecycleError(
      invalidNonCore.code ?? 'PERSISTENCE_READ_INVALID',
      'A persistence document exists but is invalid.'
    );
  }

  const anyDocumentExists = core.exists || settings.exists || state.exists || security.exists;
  if (anyDocumentExists && (!core.exists || !state.exists)) {
    return createLifecycleError(
      'PERSISTENCE_SNAPSHOT_INCOMPLETE',
      'The persistence snapshot is incomplete.'
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
      coreProtection,
      documentExists: {
        core: core.exists,
        settings: settings.exists,
        state: state.exists,
        security: security.exists
      },
      documentStatus: {
        core: core.exists ? 'valid' : 'missing',
        settings: settings.exists ? 'valid' : 'missing',
        state: state.exists ? 'valid' : 'missing',
        security: security.exists ? 'valid' : 'missing'
      }
    }
  };
};

const commitInitializedPersistenceSnapshot = (documents: unknown) => {
  if (!isPlainObject(documents) || !isPlainObject(documents.state)) {
    return createLifecycleError(
      'PERSISTENCE_SCHEMA_INVALID',
      'Initialized persistence snapshot is invalid.'
    );
  }

  const firstWelcome = isPlainObject(documents.state.firstWelcome)
    ? documents.state.firstWelcome
    : null;
  if (firstWelcome?.completed !== true || firstWelcome.pendingAfterClearAll === true) {
    return createLifecycleError(
      'PERSISTENCE_SCHEMA_INVALID',
      'Initialized persistence snapshot must complete first welcome.'
    );
  }

  const store = persistenceEnvironmentStore.getCurrentStore();
  const previousCore = store.readCoreDocument();
  const previousState = store.readStateDocument();

  if (!previousCore.ok || !previousState.ok || 'locked' in previousState) {
    return createLifecycleError(
      'PERSISTENCE_READ_FAILED',
      'Could not capture the previous persistence snapshot.'
    );
  }

  const writeResult = runPersistenceSnapshotTransaction(
    store.paths,
    () => writeInitializedPersistenceSnapshotDocuments(store, {
      core: documents.core,
      state: documents.state
    }),
    (result) => result.ok
  );
  if (!writeResult.ok) {
    return writeResult;
  }

  const snapshot = readPersistenceSnapshotFromStore(store);
  if (!snapshot.ok) {
    if (previousState.exists) {
      store.writeStateDocument(previousState.document);
    }
    if (previousCore.exists && !('locked' in previousCore)) {
      store.writeCoreDocument(previousCore.document, { allowExternalCoreOverwrite: true });
    }
    return snapshot;
  }

  return snapshot;
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

const getInitialWindowTheme = () => {
  const settings = readThemeBootstrapSettings();
  return createStartupThemeSnapshot(settings, getSystemThemeForBootstrap());
};

const configureRuntimeUserDataPath = () => {
  mkdirSync(storageLayout.userdata, { recursive: true });
  mkdirSync(storageLayout.runtime, { recursive: true });
  mkdirSync(storageLayout.sessionData, { recursive: true });
  mkdirSync(storageLayout.cache, { recursive: true });
  mkdirSync(storageLayout.logs, { recursive: true });
  mkdirSync(storageLayout.crashDumps, { recursive: true });
  app.setPath('userData', storageLayout.runtime);
  app.setPath('sessionData', storageLayout.sessionData);
  app.setPath('cache', storageLayout.cache);
  app.setPath('crashDumps', storageLayout.crashDumps);
  app.setAppLogsPath(storageLayout.logs);
};

configureRuntimeUserDataPath();

const writeValidationPathDiagnostics = () => {
  appendValidationDiagnostic('resolved-paths', {
    resolvedUserdataRoot: storageLayout.userdata,
    resolvedRuntimeRoot: storageLayout.runtime,
    resolvedDemoRoot: storageLayout.demo,
    electronUserDataPath: app.getPath('userData'),
    electronSessionDataPath: app.getPath('sessionData'),
    electronCachePath: storageLayout.cache
  });
};

writeValidationPathDiagnostics();
registerPersistenceHandlers(persistenceStore, {
  readSnapshot: () => readPersistenceSnapshotFromStore(persistenceStore),
  commitInitializedSnapshot: commitInitializedPersistenceSnapshot,
  enterDemoEnvironment: enterDemoPersistenceEnvironment,
  exitDemoEnvironment: exitDemoPersistenceEnvironment,
  promoteDemoCoreToRealEnvironment: promoteDemoCoreToRealPersistenceEnvironment
}, {
  isBlocked: isDestructiveShutdown
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

const writeStartupStage = (stage: string) => {
  const elapsedMs = Number(process.hrtime.bigint() - processStartTime) / 1_000_000;
  appendValidationDiagnostic('startup-stage', {
    stage,
    elapsedMs: elapsedMs.toFixed(1)
  });
  writePackagedMainLog(`startup-stage ${stage}`, { elapsedMs: elapsedMs.toFixed(1) });
};

writeStartupStage('process-start');

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
      iconPath: app.isPackaged
        ? process.execPath
        : getAppIconPath({
            platform: process.platform,
            appResourceRoot: app.getAppPath()
          }),
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

const activateMainWindow = (targetWindow: BrowserWindow) => {
  if (!mainWindowFirstFrameReady) {
    pendingWindowActivation = true;
    return;
  }

  if (targetWindow.isMinimized()) {
    targetWindow.restore();
  }

  targetWindow.show();
  targetWindow.focus();
};

const requestWindowActivation = () => {
  if (isDestructiveShutdown() || isAppQuitInProgress()) {
    return;
  }

  const targetWindow = mainWindow ?? BrowserWindow.getAllWindows()[0] ?? null;

  if (!targetWindow) {
    pendingWindowActivation = true;
    return;
  }

  activateMainWindow(targetWindow);
};

const requestRendererLock = () => {
  if (isDestructiveShutdown() || isAppQuitInProgress()) {
    return;
  }

  const targetWindow = mainWindow ?? BrowserWindow.getAllWindows()[0] ?? null;

  if (!targetWindow) {
    pendingRendererLock = true;
    pendingWindowActivation = true;
    return;
  }

  if (!mainWindowFirstFrameReady) {
    pendingRendererLock = true;
    pendingWindowActivation = true;
    return;
  }

  sendRendererLock(targetWindow);
};

const requestMacosApplicationMenuLock = () => {
  if (!isMacosApplicationMenuLockEnabled()) {
    return;
  }

  macosMenuLockRequestInProgress = true;
  refreshMacosApplicationMenu();
  requestRendererLock();
};

const requestMacosApplicationMenuSettings = () => {
  if (!isMacosApplicationMenuWindowReady() || !mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('netraflow-open-settings');
};

requestProductInstanceActivation = requestWindowActivation;

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  void productInstanceCoordinator.notifyExisting();
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (argv.includes('--lock')) {
      requestRendererLock();
      return;
    }

    requestWindowActivation();
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

  appShutdownState.requestWindowClose();
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
  appShutdownState.cancelCloseRequest();
  refreshMacosApplicationMenu();
});

ipcMain.on('app:lock-menu-state', (event, state: unknown) => {
  const targetWindow = getEventWindow(event);

  if (
    targetWindow !== mainWindow ||
    !state ||
    typeof state !== 'object' ||
    !('canLock' in state) ||
    typeof state.canLock !== 'boolean'
  ) {
    return;
  }

  rendererIsReadyForApplicationMenu = true;
  rendererCanLockFromApplicationMenu = state.canLock;

  if (!state.canLock) {
    macosMenuLockRequestInProgress = false;
  }

  refreshMacosApplicationMenu();
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
  const errorMessage = await shell.openPath(storageLayout.userdata);

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

const pendingJsonWrites = new Set<Promise<void>>();

const waitForPendingJsonWrites = async () => {
  await Promise.allSettled(Array.from(pendingJsonWrites));
};

const isAllowedJsonExportFileName = (fileName: string) =>
  /^netraflow-(?:snapshot|backup)-\d{8}-\d{4}(?:\.encrypted)?\.json$/.test(fileName) ||
  /^netraflow-settings-\d{8}-\d{6}\.netraflow-settings\.json$/.test(fileName);

const handleJsonWriteFile = async (_event: Electron.IpcMainInvokeEvent, request: unknown) => {
  if (isDestructiveShutdown()) {
    throw new Error('NetraFlow is clearing local data and shutting down.');
  }

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

  const writePromise = atomicWriteJsonFile(targetPath, content);
  pendingJsonWrites.add(writePromise);

  try {
    await writePromise;
  } finally {
    pendingJsonWrites.delete(writePromise);
  }

  return { filePath: targetPath };
};

ipcMain.handle('backup:write-file', handleJsonWriteFile);
ipcMain.handle('json:write-file', handleJsonWriteFile);

ipcMain.handle('app:clear-linux-appimage-sandbox-consent', (event) => {
  const targetWindow = getEventWindow(event);

  if (!isLinuxAppImageRuntime() || !targetWindow || targetWindow !== mainWindow) {
    throw new Error('Sandbox consent clear request is unavailable.');
  }

  clearLinuxAppImageUnsandboxedConsent();
});

type DestructiveCleanupRequest = {
  targetWindow: BrowserWindow;
  targetSession: Electron.Session;
  deletionPlan: readonly ManagedDataDeletionTarget[];
};

let clearingPageReady: (() => void) | null = null;
ipcMain.on('app:clearing-page-ready', (event) => {
  if (event.sender === mainWindow?.webContents && clearingPageReady) {
    const resolveReady = clearingPageReady;
    clearingPageReady = null;
    if (process.env.NETRAFLOW_E2E_CLEAR_ALL === '1') {
      void event.sender.executeJavaScript(`(() => {
        const page = document.querySelector('.destructive-clearing-page');
        const dots = document.querySelector('.destructive-clearing-page__dots');
        const rootStyle = getComputedStyle(document.documentElement);
        const pageStyle = page ? getComputedStyle(page) : null;
        return {
          text: page?.textContent,
          hasAppShell: Boolean(document.querySelector('.app-shell')),
          hasSidebar: Boolean(document.querySelector('.settings-navigation-panel')),
          hasDots: Boolean(dots),
          dotsAnimation: dots ? getComputedStyle(dots, '::after').animationName : '',
          theme: document.documentElement.dataset.theme,
          resolvedTheme: document.documentElement.dataset.resolvedTheme,
          themeStyle: document.documentElement.dataset.themeStyle,
          appBackground: rootStyle.getPropertyValue('--app-bg').trim(),
          mainText: rootStyle.getPropertyValue('--text-main').trim(),
          pageBackgroundImage: pageStyle?.backgroundImage,
          pageBackgroundColor: pageStyle?.backgroundColor,
          pageColor: pageStyle?.color
        };
      })()`, true).then(
        (result) => appendValidationDiagnostic('electron-clear-all-e2e-page', result as Record<string, unknown>),
        (error) => appendValidationDiagnostic('electron-clear-all-e2e-failed', { error: String(error) })
      ).finally(resolveReady);
      return;
    }
    resolveReady();
  }
});

const destructiveCleanupCoordinator = createSingleRunCleanupCoordinator(
  async ({
    targetWindow,
    targetSession,
    deletionPlan
  }: DestructiveCleanupRequest) => {
    appShutdownState.beginDestructiveShutdown();
    writeResetLifecycleLog('clear-all-confirmed');
    writeResetLifecycleLog('clearing-entered');
    writeResetLifecycleLog('persistence-generation-invalidated');
    pendingRendererLock = false;
    pendingWindowActivation = false;
    resetRendererApplicationMenuState();

    realPersistenceStore.lockCoreDocument();
    demoPersistenceStore.lockCoreDocument();

    await waitForPendingJsonWrites();
    writeResetLifecycleLog('pending-writes-drained');

    await new Promise<void>((resolve) => {
      clearingPageReady = resolve;
      targetWindow.webContents.send('netraflow-enter-clearing-page');
    });
    writeResetLifecycleLog('clearing-page-shown');

    if (isLinuxAppImageRuntime()) {
      try {
        clearLinuxAppImageUnsandboxedConsent();
      } catch (error) {
        console.error('[NetraFlow cleanup] Failed to clear launcher preferences.', error);
      }
    }

    const transaction = createResetTransaction(storageLayout);
    try {
      await targetSession.closeAllConnections();
      await targetSession.clearData();
      await targetSession.clearCache();
      writeResetLifecycleLog('runtime-session-cleared');
      const demoTarget = deletionPlan.find((entry) => entry.kind === 'demo');
      if (demoTarget) await fs.rm(demoTarget.path, { recursive: true, force: true, maxRetries: 4, retryDelay: 40 });
      await invalidateAndDeleteUserdata(transaction, writeResetLifecycleLog);
      await createRuntimePendingMarker(transaction, writeResetLifecycleLog);
    } catch (error) {
      console.error('[NetraFlow cleanup] Managed local data cleanup failed.', error);
      return;
    }

    resetLogToFile = false;
    forceClosingWindows.add(targetWindow);
    targetWindow.destroy();
    writeResetLifecycleLog('clearing-window-destroyed');
    await isolateAndDeleteRuntime(transaction, writeResetLifecycleLog);
    app.releaseSingleInstanceLock();
    await productInstanceCoordinator.release().catch((error) => console.error(error));
    writeResetLifecycleLog('reset-process-exit');
    app.exit(0);
  }
);

ipcMain.handle('app:clear-all-local-data-and-quit', (event) => {
  const targetWindow = getEventWindow(event);

  if (!targetWindow || targetWindow !== mainWindow) {
    throw new Error('Destructive cleanup request did not originate from the main window.');
  }

  const deletionPlan = createManagedDataDeletionPlan({
    layout: storageLayout,
    platform: process.platform,
    appPath: app.getAppPath(),
    execPath: process.execPath,
    homePath: app.getPath('home')
  });

  return destructiveCleanupCoordinator.request({
    targetWindow,
    targetSession: targetWindow.webContents.session,
    deletionPlan
  });
});

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
  const initialTheme = getInitialWindowTheme();
  const deferInitialShow = shouldDeferNormalAppFirstShow(process.platform, app.isPackaged);
  const waitForStableRendererFrame = shouldWaitForStableRendererFrame(
    process.platform,
    app.isPackaged
  );
  mainWindowFirstFrameReady = !deferInitialShow;

  const createdWindow = new BrowserWindow({
    title: APP_NAME,
    width: 960,
    height: 640,
    backgroundColor: initialTheme.backgroundColor,
    ...(deferInitialShow ? { show: false } : {}),
    minWidth: 720,
    minHeight: 480,
    autoHideMenuBar: process.platform !== 'darwin',
    ...getPlatformWindowOptions({
      platform: process.platform,
      appResourceRoot: app.getAppPath()
    }),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: deferInitialShow
        ? [
            `--nf-initial-theme=${initialTheme.resolvedTheme}`,
            `--nf-initial-theme-style=${initialTheme.themeStyle}`
          ]
        : []
    }
  });
  writeStartupStage('window-created');
  mainWindow = createdWindow;
  resetRendererApplicationMenuState();

  if (process.env.NETRAFLOW_E2E_CLEAR_ALL === '1') {
    createdWindow.webContents.once('did-finish-load', () => {
      void createdWindow.webContents.executeJavaScript(`(async () => {
        const waitFor = async (predicate, timeoutMs = 15000) => {
          const deadline = performance.now() + timeoutMs;
          while (performance.now() < deadline) {
            const value = predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
          throw new Error('E2E DOM condition timed out');
        };
        const button = async (label) => waitFor(() => Array.from(document.querySelectorAll('button')).find((entry) => entry.textContent?.trim() === label));
        (await button('全局设置')).click();
        (await button('数据与备份')).click();
        (await button('清除所有')).click();
        const dialog = await waitFor(() => document.querySelector('[role="dialog"]'));
        const code = dialog.querySelector('.reset-confirmation-code')?.textContent?.trim();
        const input = dialog.querySelector('input');
        if (!code || !input) throw new Error('Reset confirmation controls are missing');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, code);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        (await button('确认执行')).click();
        const page = await waitFor(() => document.querySelector('.destructive-clearing-page'));
        const rootStyle = getComputedStyle(document.documentElement);
        const pageStyle = getComputedStyle(page);
        return {
          text: page.textContent,
          hasAppShell: Boolean(document.querySelector('.app-shell')),
          hasSidebar: Boolean(document.querySelector('.settings-navigation-panel')),
          hasDots: Boolean(document.querySelector('.destructive-clearing-page__dots')),
          dotsAnimation: getComputedStyle(document.querySelector('.destructive-clearing-page__dots'), '::after').animationName,
          theme: document.documentElement.dataset.theme,
          resolvedTheme: document.documentElement.dataset.resolvedTheme,
          themeStyle: document.documentElement.dataset.themeStyle,
          appBackground: rootStyle.getPropertyValue('--app-bg').trim(),
          mainText: rootStyle.getPropertyValue('--text-main').trim(),
          pageBackgroundImage: pageStyle.backgroundImage,
          pageBackgroundColor: pageStyle.backgroundColor,
          pageColor: pageStyle.color
        };
      })()`, true).then(
        (result) => appendValidationDiagnostic('electron-clear-all-e2e-page', result as Record<string, unknown>),
        (error) => appendValidationDiagnostic('electron-clear-all-e2e-failed', { error: String(error) })
      );
    });
  }

  if (deferInitialShow) {
    let pageLoaded = false;
    let rendererReady = false;
    let didShow = false;
    const showWhenReady = () => {
      const canShowWindow = canShowNormalAppWindow(
        pageLoaded,
        rendererReady,
        waitForStableRendererFrame
      );
      if (canShowWindow && !didShow && !createdWindow.isDestroyed()) {
        didShow = true;
        mainWindowFirstFrameReady = true;
        createdWindow.show();
        writeStartupStage('window-shown');
        if (pendingWindowActivation) {
          pendingWindowActivation = false;
          createdWindow.focus();
        }
        if (pendingRendererLock) {
          pendingRendererLock = false;
          createdWindow.webContents.send('netraflow-lock');
        }
      }
    };
    const handleFirstFrameReady = (event: Electron.IpcMainEvent) => {
      if (event.sender !== createdWindow.webContents || rendererReady) return;
      writeStartupStage('first-frame-ready-sent');
      rendererReady = true;
      writeStartupStage('first-frame-ready-received');
      showWhenReady();
    };
    const handleStartupStateResolved = (event: Electron.IpcMainEvent, state: unknown) => {
      if (
        event.sender === createdWindow.webContents &&
        (state === 'onboarding' || state === 'locked' || state === 'application')
      ) {
        writeStartupStage('startup-state-resolved');
        ipcMain.removeListener('normal-app-startup-state-resolved', handleStartupStateResolved);
      }
    };
    if (waitForStableRendererFrame) {
      ipcMain.on('normal-app-first-frame-ready', handleFirstFrameReady);
    }
    ipcMain.on('normal-app-startup-state-resolved', handleStartupStateResolved);
    createdWindow.webContents.once('did-finish-load', () => {
      writeStartupStage('renderer-did-finish-load');
      pageLoaded = true;
      showWhenReady();
    });
    const firstFrameTimeout = setTimeout(() => {
      if (didShow || createdWindow.isDestroyed()) return;
      writePackagedMainLog('Renderer first frame readiness timed out');
      app.exit(1);
    }, 15_000);
    createdWindow.webContents.once('render-process-gone', (_event, details) => {
      if (didShow) return;
      writePackagedMainLog('Renderer exited before first frame', { reason: details.reason });
      app.exit(1);
    });
    createdWindow.once('closed', () => {
      clearTimeout(firstFrameTimeout);
      ipcMain.removeListener('normal-app-first-frame-ready', handleFirstFrameReady);
      ipcMain.removeListener('normal-app-startup-state-resolved', handleStartupStateResolved);
    });
  }

  if (process.platform !== 'darwin') {
    createdWindow.setMenu(null);
  }
  createdWindow.on('close', (event) => {
    if (forceClosingWindows.has(createdWindow)) {
      forceClosingWindows.delete(createdWindow);
      return;
    }

    if (closeBeforeWindows.handleWindowClose(createdWindow, event)) {
      return;
    }

    appShutdownState.requestWindowClose();
    closeBeforeWindows.requestRendererCloseApproval(createdWindow);
  });
  createdWindow.on('closed', () => {
    const shouldResumeAppQuit = appShutdownState.handleWindowClosed();

    closeBeforeWindows.deleteWindow(createdWindow);
    mainWindow = null;
    mainWindowFirstFrameReady = !shouldDeferNormalAppFirstShow(
      process.platform,
      app.isPackaged
    );
    resetRendererApplicationMenuState();

    if (shouldResumeAppQuit) {
      setTimeout(() => {
        app.quit();
      }, 0);
    }
  });
  createdWindow.webContents.on('did-start-loading', () => {
    resetRendererApplicationMenuState();
  });
  createdWindow.webContents.on('did-finish-load', () => {
    if (!pendingRendererLock || !mainWindow || !mainWindowFirstFrameReady) {
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
    writeStartupStage('renderer-load-start');
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
    writeStartupStage('app-ready');
    const macosMenuPreferredLanguages =
      process.platform === 'darwin' ? app.getPreferredSystemLanguages() : [];
    const macosMenuFallbackLanguages =
      process.platform === 'darwin' ? [app.getLocale(), app.getSystemLocale()] : [];

    if (process.platform === 'darwin') {
      app.setAboutPanelOptions(createMacosAboutPanelOptions(app.getName(), app.getVersion()));
    }

    macosApplicationMenu = installMacosApplicationMenu({
      platform: process.platform,
      appName: APP_NAME,
      menu: Menu,
      onOpenSettings: requestMacosApplicationMenuSettings,
      onLock: requestMacosApplicationMenuLock,
      isWindowReady: isMacosApplicationMenuWindowReady,
      isLockEnabled: isMacosApplicationMenuLockEnabled,
      getPreferredLanguages: () => macosMenuPreferredLanguages,
      getFallbackLanguages: () => macosMenuFallbackLanguages
    });
    registerWindowsUserTasks();
    createWindow();

    app.on('activate', () => {
      if (
        !isDestructiveShutdown() &&
        !isAppQuitInProgress() &&
        BrowserWindow.getAllWindows().length === 0
      ) {
        createWindow();
      }
    });
  });
}

let didRunQuitDemoCleanup = false;

const cleanupDemoOnAppQuit = () => {
  if (isDestructiveShutdown()) {
    return;
  }

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

app.on('before-quit', (event) => {
  if (process.platform !== 'darwin') {
    return;
  }

  const targetWindow = mainWindow;
  const appQuitRequest = appShutdownState.requestAppQuit(Boolean(targetWindow));
  refreshMacosApplicationMenu();

  if (appQuitRequest === 'continue-quit') {
    return;
  }

  event.preventDefault();

  if (appQuitRequest === 'start-close-approval' && targetWindow) {
    closeBeforeWindows.requestRendererCloseApproval(targetWindow);
  }
});
app.on('will-quit', () => {
  cleanupDemoOnAppQuit();
  void productInstanceCoordinator.release();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
