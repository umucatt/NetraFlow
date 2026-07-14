import { stripRuntimeAccountsFromGroups } from '../accountData';
import type {
  AppData,
  AutoBackupSettings,
  BackupRecord,
  SnapshotImportRecord
} from '../types';
import { normalizeGlobalSettings } from '../globalSettings/globalSettingsLogic';
import type { AssetChartSettings } from '../../features/charts';
import type { GlobalSettings } from '../../features/security/securitySettingsTypes';
import {
  createDefaultCoreDocument,
  createDefaultSecurityDocument,
  createDefaultSettingsDocument,
  createDefaultStateDocument,
  normalizeSecurityDocument,
  normalizeSettingsDocument,
  normalizeStateDocument
} from './persistenceDefaults';
import {
  PERSISTENCE_SCHEMA_VERSION,
  type CoreDocument,
  type SecurityDocument,
  type SettingsDocument,
  type StateDocument
} from './persistenceDocuments';
import {
  isCoreDocument,
  isSecurityDocument,
  isSettingsDocument,
  isStateDocument
} from './persistenceValidation';

type PersistenceReadResult =
  | {
      ok: true;
      exists: boolean;
      document: unknown;
      encrypted?: boolean;
      integrityWarning?: string;
      integrityFailure?: 'internal' | 'continuity';
      degraded?: boolean;
      code?: string;
    }
  | {
      ok: true;
      exists: boolean;
      locked: true;
      encrypted: true;
      integrityWarning?: string;
      integrityFailure?: 'internal';
    }
  | { ok: false; code: string; message: string };

type PersistenceBridge = NonNullable<Window['netraflowPersistence']>;

export type CoreWriteOptions = {
  allowExternalCoreOverwrite?: boolean;
};

export type RuntimePersistenceSnapshot = {
  core: CoreDocument;
  settings: SettingsDocument;
  state: StateDocument;
  security: SecurityDocument;
  coreProtection: {
    enabled: boolean;
    locked: boolean;
    integrityWarning?: string;
    integrityFailure?: 'internal' | 'continuity';
  };
  documentExists: {
    core: boolean;
    settings: boolean;
    state: boolean;
    security: boolean;
  };
  documentStatus?: {
    core: 'missing' | 'valid' | 'invalid';
    settings: 'missing' | 'valid' | 'invalid';
    state: 'missing' | 'valid' | 'invalid';
    security: 'missing' | 'valid' | 'invalid';
  };
};

export type RuntimePersistenceEnvironmentTransition = {
  snapshot: RuntimePersistenceSnapshot;
  cleanup?: unknown;
};

export type RuntimeBackupState = {
  lastBackupAt: string;
  lastBackupHistoryCount: number;
  backupRecords: BackupRecord[];
  snapshotImportRecords: SnapshotImportRecord[];
  forceAutoBackupDueOnce: boolean;
};

const getBridge = (): PersistenceBridge | undefined =>
  typeof window === 'undefined' ? undefined : window.netraflowPersistence;

const ensureReadResult = (value: unknown): PersistenceReadResult => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof (value as { ok?: unknown }).ok === 'boolean'
  ) {
    return value as PersistenceReadResult;
  }

  throw new Error('NetraFlow persistence bridge returned an invalid read result.');
};

const readDocument = <T>({
  kind,
  fallback,
  read,
  isDocument
}: {
  kind: 'core' | 'settings' | 'state' | 'security';
  fallback: () => T;
  read?: () => unknown;
  isDocument: (value: unknown) => value is T;
}): T => {
  if (!read) {
    return fallback();
  }

  const result = ensureReadResult(read());

  if (!result.ok) {
    throw new Error(`Failed to read ${kind} document: ${result.code}`);
  }

  if ('locked' in result) {
    throw new Error(`Failed to read ${kind} document: PERSISTENCE_CORE_LOCKED`);
  }

  if (!isDocument(result.document)) {
    throw new Error(`Invalid ${kind} document returned by persistence bridge.`);
  }

  return result.document;
};

const requireBridge = () => {
  const bridge = getBridge();

  if (!bridge) {
    throw new Error('NetraFlow persistence bridge is not available.');
  }

  return bridge;
};

const ensurePersistenceSnapshot = (value: unknown): RuntimePersistenceSnapshot => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('core' in value) ||
    !('settings' in value) ||
    !('state' in value) ||
    !('security' in value)
  ) {
    throw new Error('NetraFlow persistence bridge returned an invalid snapshot.');
  }

  const snapshot = value as Record<string, unknown>;
  const documentStatus =
    typeof snapshot.documentStatus === 'object' && snapshot.documentStatus !== null
      ? snapshot.documentStatus as RuntimePersistenceSnapshot['documentStatus']
      : undefined;

  if (documentStatus && Object.values(documentStatus).some((status) => status === 'invalid')) {
    throw new Error('Failed to read persistence snapshot: PERSISTENCE_SNAPSHOT_INVALID');
  }

  if (!isCoreDocument(snapshot.core)) {
    throw new Error('Invalid core document returned by persistence bridge.');
  }

  if (!isSettingsDocument(snapshot.settings)) {
    throw new Error('Invalid settings document returned by persistence bridge.');
  }

  if (!isStateDocument(snapshot.state)) {
    throw new Error('Invalid state document returned by persistence bridge.');
  }

  if (!isSecurityDocument(snapshot.security)) {
    throw new Error('Invalid security document returned by persistence bridge.');
  }

  return {
    core: snapshot.core,
    settings: snapshot.settings,
    state: snapshot.state,
    security: snapshot.security,
    coreProtection:
      typeof snapshot.coreProtection === 'object' && snapshot.coreProtection !== null
        ? snapshot.coreProtection as RuntimePersistenceSnapshot['coreProtection']
        : { enabled: false, locked: false },
    documentExists:
      typeof snapshot.documentExists === 'object' && snapshot.documentExists !== null
        ? {
            core: (snapshot.documentExists as Record<string, unknown>).core === true,
            settings: (snapshot.documentExists as Record<string, unknown>).settings === true,
            state: (snapshot.documentExists as Record<string, unknown>).state === true,
            security: (snapshot.documentExists as Record<string, unknown>).security === true
          }
        : { core: true, settings: true, state: true, security: true },
    ...(documentStatus ? { documentStatus } : {})
  };
};

export const isExternalCoreModificationError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if (
    'code' in error &&
    (error as { code?: unknown }).code === 'PERSISTENCE_CORE_EXTERNAL_MODIFIED'
  ) {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : 'message' in error
        ? String((error as { message?: unknown }).message)
        : '';

  return message.includes('Core document was modified outside NetraFlow');
};

const ensureEnvironmentTransition = (
  value: unknown
): RuntimePersistenceEnvironmentTransition => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('ok' in value) ||
    (value as { ok?: unknown }).ok !== true ||
    !('snapshot' in value)
  ) {
    throw new Error('NetraFlow persistence bridge returned an invalid environment transition.');
  }

  return {
    snapshot: ensurePersistenceSnapshot((value as { snapshot: unknown }).snapshot),
    cleanup: (value as { cleanup?: unknown }).cleanup
  };
};

export const readRuntimePersistenceSnapshot = (): RuntimePersistenceSnapshot => {
  const bridge = getBridge();
  if (bridge?.readSnapshot) {
    const result = bridge.readSnapshot();

    if (
      typeof result !== 'object' ||
      result === null ||
      !('ok' in result) ||
      (result as { ok?: unknown }).ok !== true ||
      !('snapshot' in result)
    ) {
      throw new Error('Failed to read persistence snapshot: PERSISTENCE_SNAPSHOT_INVALID');
    }

    return ensurePersistenceSnapshot((result as { snapshot: unknown }).snapshot);
  }

  const coreResult = bridge?.readCoreDocument
    ? ensureReadResult(bridge.readCoreDocument())
    : {
        ok: true as const,
        exists: false,
        document: createDefaultCoreDocument()
      };

  if (!coreResult.ok) {
    throw new Error(`Failed to read core document: ${coreResult.code}`);
  }

  const coreProtection =
    'locked' in coreResult
      ? {
          enabled: true,
          locked: true,
          ...(coreResult.integrityWarning
            ? { integrityWarning: coreResult.integrityWarning }
            : {}),
          ...(coreResult.integrityFailure
            ? { integrityFailure: coreResult.integrityFailure }
            : {})
        }
      : {
          enabled: coreResult.encrypted === true,
          locked: false,
          ...(coreResult.integrityWarning
            ? { integrityWarning: coreResult.integrityWarning }
            : {}),
          ...(coreResult.integrityFailure
            ? { integrityFailure: coreResult.integrityFailure }
            : {})
        };

  const core = 'locked' in coreResult ? createDefaultCoreDocument() : coreResult.document;

  if (!isCoreDocument(core)) {
    throw new Error('Invalid core document returned by persistence bridge.');
  }

  const settingsResult = bridge?.readSettingsDocument
    ? ensureReadResult(bridge.readSettingsDocument())
    : { ok: true as const, exists: false, document: createDefaultSettingsDocument() };
  const stateResult = bridge?.readStateDocument
    ? ensureReadResult(bridge.readStateDocument())
    : { ok: true as const, exists: false, document: createDefaultStateDocument() };
  const securityResult = bridge?.readSecurityDocument
    ? ensureReadResult(bridge.readSecurityDocument())
    : { ok: true as const, exists: false, document: createDefaultSecurityDocument() };

  const readResolvedDocument = <T>(
    kind: 'settings' | 'state' | 'security',
    result: PersistenceReadResult,
    isDocument: (value: unknown) => value is T
  ) => {
    if (!result.ok) throw new Error(`Failed to read ${kind} document: ${result.code}`);
    if ('locked' in result || !isDocument(result.document)) {
      throw new Error(`Invalid ${kind} document returned by persistence bridge.`);
    }
    return result.document;
  };

  return {
    core,
    settings: readResolvedDocument('settings', settingsResult, isSettingsDocument),
    state: readResolvedDocument('state', stateResult, isStateDocument),
    security: readResolvedDocument('security', securityResult, isSecurityDocument),
    coreProtection,
    documentExists: {
      core: coreResult.exists,
      settings: settingsResult.ok && settingsResult.exists,
      state: stateResult.ok && stateResult.exists,
      security: securityResult.ok && securityResult.exists
    }
  };
};

export const commitInitializedPersistenceSnapshot = ({
  core,
  state
}: {
  core: CoreDocument;
  state: StateDocument;
}): RuntimePersistenceSnapshot => {
  if (!isCoreDocument(core) || !isStateDocument(state)) {
    throw new Error('Initialized persistence snapshot failed renderer validation.');
  }

  const bridge = requireBridge();
  if (!bridge.commitInitializedSnapshot) {
    throw new Error('Initialized persistence snapshot bridge is not available.');
  }

  const result = bridge.commitInitializedSnapshot({ core, state });
  if (
    typeof result !== 'object' ||
    result === null ||
    !('ok' in result) ||
    (result as { ok?: unknown }).ok !== true ||
    !('snapshot' in result)
  ) {
    throw new Error('Failed to commit initialized persistence snapshot.');
  }

  return ensurePersistenceSnapshot((result as { snapshot: unknown }).snapshot);
};

export const readCoreDocument = (): CoreDocument => {
  const bridge = getBridge();

  return readDocument({
    kind: 'core',
    fallback: createDefaultCoreDocument,
    read: bridge?.readCoreDocument,
    isDocument: isCoreDocument
  });
};

export const createCoreDocumentFromAppData = ({
  groups,
  accounts,
  history
}: AppData): CoreDocument => ({
  schemaVersion: PERSISTENCE_SCHEMA_VERSION,
  groups: stripRuntimeAccountsFromGroups(groups),
  accounts,
  history
});

export const createAppDataFromCoreDocument = ({
  groups,
  accounts,
  history
}: CoreDocument): AppData => ({
  groups,
  accounts,
  history
});

export const createRuntimeGlobalSettings = (
  settings: SettingsDocument,
  state: StateDocument,
  security: SecurityDocument,
  coreProtection: RuntimePersistenceSnapshot['coreProtection'] = {
    enabled: false,
    locked: false
  }
): GlobalSettings =>
  normalizeGlobalSettings({
    ...settings.global,
    nyaaThemeUnlocked: state.personalization.nyaaThemeUnlocked === true,
    passwordProtectionEnabled: coreProtection.enabled,
    passwordHash: null,
    autoLockMinutes: security.appAccess.autoLockMinutes,
    forceSnapshotEncryption: security.snapshotEncryption.forceEnabled,
    snapshotEncryptionEnabled: security.snapshotEncryption.enabled,
    snapshotPasswordHash: null
  });

export const createSettingsDocumentFromRuntime = ({
  autoBackupSettings,
  assetChartSettings,
  globalSettings
}: {
  autoBackupSettings: AutoBackupSettings;
  assetChartSettings: AssetChartSettings;
  globalSettings: GlobalSettings;
}): SettingsDocument =>
  normalizeSettingsDocument({
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    autoBackup: autoBackupSettings,
    assetChart: assetChartSettings,
    global: {
      positiveNegativeColorMode: globalSettings.positiveNegativeColorMode,
      themeMode: globalSettings.themeMode,
      themeStyle: globalSettings.themeStyle,
      mainContentPosition: globalSettings.mainContentPosition,
      pagePositionMemoryMode: globalSettings.pagePositionMemoryMode,
      searchLogicMode: globalSettings.searchLogicMode,
      chartColorAssignmentMode: globalSettings.chartColorAssignmentMode,
      homeAssetStatMetric: globalSettings.homeAssetStatMetric,
      homeAssetStatLabelMode: globalSettings.homeAssetStatLabelMode,
      homeAssetStatCompact: globalSettings.homeAssetStatCompact
    }
  });

export const createSecurityDocumentFromRuntime = (
  globalSettings: GlobalSettings
): SecurityDocument =>
  normalizeSecurityDocument({
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    appAccess: {
      autoLockMinutes: globalSettings.autoLockMinutes
    },
    snapshotEncryption: {
      enabled: globalSettings.snapshotEncryptionEnabled,
      forceEnabled: globalSettings.forceSnapshotEncryption
    }
  });

export const getRuntimeBackupState = (
  state: StateDocument,
  currentHistoryCount: number
): RuntimeBackupState => {
  const lastBackupAt = state.backup.lastBackupAt ?? '';
  const fallbackHistoryCount = lastBackupAt ? currentHistoryCount : 0;
  const lastBackupHistoryCount =
    state.backup.lastBackupHistoryCount ??
    state.backup.records[0]?.historyCount ??
    fallbackHistoryCount;

  return {
    lastBackupAt,
    lastBackupHistoryCount: Math.max(0, Math.floor(lastBackupHistoryCount)),
    backupRecords: state.backup.records,
    snapshotImportRecords: state.backup.importRecords,
    forceAutoBackupDueOnce: state.backup.forceAutoBackupDueOnce === true
  };
};

export const writeCoreDocument = (document: CoreDocument, options: CoreWriteOptions = {}) => {
  if (!isCoreDocument(document)) {
    throw new Error('Core document failed renderer validation.');
  }

  requireBridge().writeCoreDocument(document, options);
};

export const unlockCoreDocument = (password: string): RuntimePersistenceSnapshot => {
  const result = ensureReadResult(requireBridge().unlockCoreDocument(password));

  if (!result.ok) {
    throw new Error(`Failed to unlock core document: ${result.code}`);
  }

  if ('locked' in result || !isCoreDocument(result.document)) {
    throw new Error('Failed to unlock core document: PERSISTENCE_CORE_LOCKED');
  }

  const current = readRuntimePersistenceSnapshot();

  return {
    ...current,
    core: result.document,
    coreProtection: {
      enabled: true,
      locked: false,
      ...(result.integrityWarning ? { integrityWarning: result.integrityWarning } : {}),
      ...(result.integrityFailure ? { integrityFailure: result.integrityFailure } : {})
    }
  };
};

export const enableCoreProtection = (
  document: CoreDocument,
  password: string,
  options: CoreWriteOptions = {}
) => {
  if (!isCoreDocument(document)) {
    throw new Error('Core document failed renderer validation.');
  }

  requireBridge().enableCoreProtection(document, password, options);
};

export const changeCorePassword = (
  document: CoreDocument,
  currentPassword: string,
  nextPassword: string,
  options: CoreWriteOptions = {}
) => {
  if (!isCoreDocument(document)) {
    throw new Error('Core document failed renderer validation.');
  }

  requireBridge().changeCorePassword(document, currentPassword, nextPassword, options);
};

export const disableCoreProtection = (
  document: CoreDocument,
  password: string,
  options: CoreWriteOptions = {}
) => {
  if (!isCoreDocument(document)) {
    throw new Error('Core document failed renderer validation.');
  }

  requireBridge().disableCoreProtection(document, password, options);
};

export const lockCoreDocument = () => {
  requireBridge().lockCoreDocument();
};

export const acknowledgeCoreIntegrityIssue = () => {
  requireBridge().acknowledgeCoreIntegrityIssue?.();
};

const throwPersistenceBridgeError = (
  result: unknown,
  fallbackCode: string,
  fallbackMessage: string
): never => {
  const code =
    typeof result === 'object' && result !== null && 'code' in result
      ? String((result as { code?: unknown }).code)
      : fallbackCode;
  const message =
    typeof result === 'object' && result !== null && 'message' in result &&
    typeof (result as { message?: unknown }).message === 'string'
      ? (result as { message: string }).message
      : fallbackMessage;
  const error = new Error(message) as Error & { code: string };

  error.code = code;
  throw error;
};

export const encryptSnapshotDocumentWithCurrentSession = (document: unknown) => {
  const bridge = requireBridge();

  if (!bridge.encryptSnapshotDocument) {
    throw new Error('NetraFlow snapshot encryption bridge is not available.');
  }

  const result = bridge.encryptSnapshotDocument(document);

  if (
    typeof result !== 'object' ||
    result === null ||
    !('ok' in result) ||
    (result as { ok?: unknown }).ok !== true ||
    !('encrypted' in result)
  ) {
    throwPersistenceBridgeError(
      result,
      'PERSISTENCE_SNAPSHOT_ENCRYPT_FAILED',
      'Snapshot encryption failed.'
    );
  }

  return (result as { encrypted: unknown }).encrypted;
};

export const decryptSnapshotDocumentWithCurrentSession = (encrypted: unknown) => {
  const bridge = requireBridge();

  if (!bridge.decryptSnapshotDocument) {
    throw new Error('NetraFlow snapshot decryption bridge is not available.');
  }

  const result = bridge.decryptSnapshotDocument(encrypted);

  if (
    typeof result !== 'object' ||
    result === null ||
    !('ok' in result) ||
    (result as { ok?: unknown }).ok !== true ||
    !('document' in result)
  ) {
    throwPersistenceBridgeError(
      result,
      'PERSISTENCE_SNAPSHOT_DECRYPT_FAILED',
      'Unable to decrypt snapshot document.'
    );
  }

  return (result as { document: unknown }).document;
};

export const decryptSnapshotDocumentWithPassword = (
  encrypted: unknown,
  password: string
) => {
  const bridge = requireBridge();

  if (!bridge.decryptSnapshotDocumentWithPassword) {
    throw new Error('NetraFlow snapshot password decryption bridge is not available.');
  }

  const result = bridge.decryptSnapshotDocumentWithPassword(encrypted, password);

  if (
    typeof result !== 'object' ||
    result === null ||
    !('ok' in result) ||
    (result as { ok?: unknown }).ok !== true ||
    !('document' in result)
  ) {
    throwPersistenceBridgeError(
      result,
      'PERSISTENCE_SNAPSHOT_DECRYPT_FAILED',
      'Unable to decrypt snapshot document.'
    );
  }

  return (result as { document: unknown }).document;
};

export const writeSettingsDocument = (document: SettingsDocument) => {
  const normalized = normalizeSettingsDocument(document);

  if (!isSettingsDocument(normalized)) {
    throw new Error('Settings document failed renderer validation.');
  }

  requireBridge().writeSettingsDocument(normalized);
};

export const writeStateDocument = (document: StateDocument) => {
  const normalized = normalizeStateDocument(document);

  if (!isStateDocument(normalized)) {
    throw new Error('State document failed renderer validation.');
  }

  requireBridge().writeStateDocument(normalized);
};

export const writeSecurityDocument = (document: SecurityDocument) => {
  const normalized = normalizeSecurityDocument(document);

  if (!isSecurityDocument(normalized)) {
    throw new Error('Security document failed renderer validation.');
  }

  requireBridge().writeSecurityDocument(normalized);
};

export const enterDemoPersistenceEnvironment = (
  snapshot: RuntimePersistenceSnapshot
): RuntimePersistenceEnvironmentTransition => {
  const bridge = requireBridge();

  if (!bridge.enterDemoEnvironment) {
    throw new Error('NetraFlow demo persistence bridge is not available.');
  }

  return ensureEnvironmentTransition(bridge.enterDemoEnvironment(snapshot));
};

export const exitDemoPersistenceEnvironment = (): RuntimePersistenceEnvironmentTransition => {
  const bridge = requireBridge();

  if (!bridge.exitDemoEnvironment) {
    throw new Error('NetraFlow demo persistence bridge is not available.');
  }

  return ensureEnvironmentTransition(bridge.exitDemoEnvironment());
};

export const promoteDemoCoreToRealPersistenceEnvironment =
  (): RuntimePersistenceEnvironmentTransition => {
    const bridge = requireBridge();

    if (!bridge.promoteDemoCoreToRealEnvironment) {
      throw new Error('NetraFlow demo persistence bridge is not available.');
    }

    return ensureEnvironmentTransition(bridge.promoteDemoCoreToRealEnvironment());
  };
