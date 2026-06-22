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
      degraded?: boolean;
      code?: string;
    }
  | { ok: false; code: string; message: string };

type PersistenceBridge = NonNullable<Window['netraflowPersistence']>;

export type RuntimePersistenceSnapshot = {
  core: CoreDocument;
  settings: SettingsDocument;
  state: StateDocument;
  security: SecurityDocument;
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
    security: snapshot.security
  };
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

  return {
    core: readDocument({
      kind: 'core',
      fallback: createDefaultCoreDocument,
      read: bridge?.readCoreDocument,
      isDocument: isCoreDocument
    }),
    settings: readDocument({
      kind: 'settings',
      fallback: createDefaultSettingsDocument,
      read: bridge?.readSettingsDocument,
      isDocument: isSettingsDocument
    }),
    state: readDocument({
      kind: 'state',
      fallback: createDefaultStateDocument,
      read: bridge?.readStateDocument,
      isDocument: isStateDocument
    }),
    security: readDocument({
      kind: 'security',
      fallback: createDefaultSecurityDocument,
      read: bridge?.readSecurityDocument,
      isDocument: isSecurityDocument
    })
  };
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
  security: SecurityDocument
): GlobalSettings =>
  normalizeGlobalSettings({
    ...settings.global,
    nyaaThemeUnlocked: state.personalization.nyaaThemeUnlocked === true,
    passwordProtectionEnabled: security.appAccess.enabled,
    passwordHash: security.appAccess.passwordHash,
    autoLockMinutes: security.appAccess.autoLockMinutes,
    snapshotEncryptionEnabled: security.snapshotEncryption.enabled,
    snapshotPasswordHash: security.snapshotEncryption.passwordHash
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
      enabled: globalSettings.passwordProtectionEnabled,
      autoLockMinutes: globalSettings.autoLockMinutes,
      passwordHash: globalSettings.passwordHash
    },
    snapshotEncryption: {
      enabled: globalSettings.snapshotEncryptionEnabled,
      passwordHash: globalSettings.snapshotPasswordHash
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

export const writeCoreDocument = (document: CoreDocument) => {
  if (!isCoreDocument(document)) {
    throw new Error('Core document failed renderer validation.');
  }

  requireBridge().writeCoreDocument(document);
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
