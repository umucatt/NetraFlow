import {
  DEFAULT_GLOBAL_SETTINGS,
  isMainContentPosition,
  isPagePositionMemoryMode,
  isPositiveNegativeColorMode,
  isSearchLogicMode,
  isThemeMode,
  isThemeStyle,
  normalizeAutoLockMinutes
} from '../globalSettings/globalSettingsLogic';
import {
  DEFAULT_FIRST_WELCOME_STATE,
  normalizeFirstWelcomeState
} from '../firstWelcome/firstWelcomeStateLogic';
import { getValidTimestamp } from '../dateUtils';
import { isChartColorAssignmentMode } from '../../chartLogic';
import { DEFAULT_HOME_ASSET_STAT_SETTINGS, isHomeAssetStatLabelMode, isHomeAssetStatMetric } from '../../homeAssetStats';
import {
  DEFAULT_ASSET_CHART_SETTINGS,
  normalizeAssetChartSettings
} from '../../features/charts/assetChartSettingsLogic';
import {
  DEFAULT_AUTO_BACKUP_SETTINGS,
  normalizeAutoBackupSettings,
  normalizeBackupRecords,
  normalizeSnapshotImportRecords
} from '../../features/backup/snapshotBackupLogic';
import type {
  CoreDocument,
  NonSecurityGlobalSettings,
  SecurityDocument,
  SettingsDocument,
  StateDocument
} from './persistenceDocuments';
import { PERSISTENCE_SCHEMA_VERSION } from './persistenceDocuments';

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const createDefaultCoreDocument = (): CoreDocument => ({
  schemaVersion: PERSISTENCE_SCHEMA_VERSION,
  groups: [],
  accounts: [],
  history: []
});

export const createDefaultNonSecurityGlobalSettings = (): NonSecurityGlobalSettings => ({
  positiveNegativeColorMode: DEFAULT_GLOBAL_SETTINGS.positiveNegativeColorMode,
  themeMode: DEFAULT_GLOBAL_SETTINGS.themeMode,
  themeStyle: DEFAULT_GLOBAL_SETTINGS.themeStyle,
  mainContentPosition: DEFAULT_GLOBAL_SETTINGS.mainContentPosition,
  pagePositionMemoryMode: DEFAULT_GLOBAL_SETTINGS.pagePositionMemoryMode,
  searchLogicMode: DEFAULT_GLOBAL_SETTINGS.searchLogicMode,
  chartColorAssignmentMode: DEFAULT_GLOBAL_SETTINGS.chartColorAssignmentMode,
  ...DEFAULT_HOME_ASSET_STAT_SETTINGS
});

export const normalizeNonSecurityGlobalSettings = (
  value: unknown
): NonSecurityGlobalSettings => {
  const raw = isRecord(value) ? value : {};
  const defaults = createDefaultNonSecurityGlobalSettings();

  return {
    positiveNegativeColorMode: isPositiveNegativeColorMode(raw.positiveNegativeColorMode)
      ? raw.positiveNegativeColorMode
      : defaults.positiveNegativeColorMode,
    themeMode: isThemeMode(raw.themeMode) ? raw.themeMode : defaults.themeMode,
    themeStyle: isThemeStyle(raw.themeStyle) ? raw.themeStyle : defaults.themeStyle,
    mainContentPosition: isMainContentPosition(raw.mainContentPosition)
      ? raw.mainContentPosition
      : defaults.mainContentPosition,
    pagePositionMemoryMode: isPagePositionMemoryMode(raw.pagePositionMemoryMode)
      ? raw.pagePositionMemoryMode
      : defaults.pagePositionMemoryMode,
    searchLogicMode: isSearchLogicMode(raw.searchLogicMode)
      ? raw.searchLogicMode
      : defaults.searchLogicMode,
    chartColorAssignmentMode: isChartColorAssignmentMode(raw.chartColorAssignmentMode)
      ? raw.chartColorAssignmentMode
      : defaults.chartColorAssignmentMode,
    homeAssetStatMetric: isHomeAssetStatMetric(raw.homeAssetStatMetric)
      ? raw.homeAssetStatMetric
      : defaults.homeAssetStatMetric,
    homeAssetStatLabelMode: isHomeAssetStatLabelMode(raw.homeAssetStatLabelMode)
      ? raw.homeAssetStatLabelMode
      : defaults.homeAssetStatLabelMode,
    homeAssetStatCompact:
      typeof raw.homeAssetStatCompact === 'boolean'
        ? raw.homeAssetStatCompact
        : defaults.homeAssetStatCompact
  };
};

export const createDefaultSettingsDocument = (): SettingsDocument => ({
  schemaVersion: PERSISTENCE_SCHEMA_VERSION,
  autoBackup: cloneJson(DEFAULT_AUTO_BACKUP_SETTINGS),
  assetChart: cloneJson(DEFAULT_ASSET_CHART_SETTINGS),
  global: createDefaultNonSecurityGlobalSettings()
});

export const normalizeSettingsDocument = (value: unknown): SettingsDocument => {
  if (!isRecord(value)) {
    return createDefaultSettingsDocument();
  }

  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    autoBackup: normalizeAutoBackupSettings(value.autoBackup),
    assetChart: normalizeAssetChartSettings(value.assetChart),
    global: normalizeNonSecurityGlobalSettings(value.global)
  };
};

const normalizeOptionalTime = (value: unknown) =>
  typeof value === 'string' && getValidTimestamp(value) !== null ? value : undefined;

const normalizeOptionalCount = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : undefined;

export const normalizeRollupImportHashes = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string'))).slice(-80)
    : [];

export const createDefaultStateDocument = (): StateDocument => ({
  schemaVersion: PERSISTENCE_SCHEMA_VERSION,
  backup: {
    records: [],
    importRecords: []
  },
  rollupImportHashes: [],
  firstWelcome: { ...DEFAULT_FIRST_WELCOME_STATE },
  personalization: {},
  coreProtection: {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION
  }
});

const normalizeCoreFileFingerprint = (value: unknown) => {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    value.algorithm !== 'SHA-256' ||
    typeof value.value !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(value.value) ||
    typeof value.size !== 'number' ||
    !Number.isInteger(value.size) ||
    value.size < 0
  ) {
    return undefined;
  }

  return {
    algorithm: 'SHA-256' as const,
    value: value.value.toLowerCase(),
    size: value.size
  };
};

const normalizeCoreProtectionState = (value: unknown): StateDocument['coreProtection'] => {
  if (!isRecord(value)) {
    return createDefaultStateDocument().coreProtection;
  }

  const lastConfirmedFingerprint = normalizeCoreFileFingerprint(value.lastConfirmedFingerprint);
  const acknowledgedInternalIntegrityFailureFingerprint = normalizeCoreFileFingerprint(
    value.acknowledgedInternalIntegrityFailureFingerprint
  );

  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    ...(lastConfirmedFingerprint ? { lastConfirmedFingerprint } : {}),
    ...(acknowledgedInternalIntegrityFailureFingerprint
      ? { acknowledgedInternalIntegrityFailureFingerprint }
      : {})
  };
};

export const normalizeStateDocument = (value: unknown): StateDocument => {
  if (!isRecord(value)) {
    return createDefaultStateDocument();
  }

  const rawBackup = isRecord(value.backup) ? value.backup : {};
  const firstWelcome = normalizeFirstWelcomeState(value.firstWelcome);
  const personalization = isRecord(value.personalization) ? value.personalization : {};

  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    backup: {
      ...(normalizeOptionalTime(rawBackup.lastBackupAt)
        ? { lastBackupAt: normalizeOptionalTime(rawBackup.lastBackupAt) }
        : {}),
      ...(normalizeOptionalCount(rawBackup.lastBackupHistoryCount) !== undefined
        ? { lastBackupHistoryCount: normalizeOptionalCount(rawBackup.lastBackupHistoryCount) }
        : {}),
      records: normalizeBackupRecords(rawBackup.records),
      importRecords: normalizeSnapshotImportRecords(rawBackup.importRecords),
      ...(rawBackup.forceAutoBackupDueOnce === true ? { forceAutoBackupDueOnce: true } : {})
    },
    rollupImportHashes: normalizeRollupImportHashes(value.rollupImportHashes),
    firstWelcome,
    personalization: {
      ...(personalization.nyaaThemeUnlocked === true ? { nyaaThemeUnlocked: true } : {})
    },
    coreProtection: normalizeCoreProtectionState(value.coreProtection)
  };
};

export const createDefaultSecurityDocument = (): SecurityDocument => ({
  schemaVersion: PERSISTENCE_SCHEMA_VERSION,
  appAccess: {
    autoLockMinutes: DEFAULT_GLOBAL_SETTINGS.autoLockMinutes
  },
  snapshotEncryption: {
    enabled: false,
    forceEnabled: true
  }
});

export const normalizeSecurityDocument = (value: unknown): SecurityDocument => {
  if (!isRecord(value)) {
    return createDefaultSecurityDocument();
  }

  const rawAppAccess = isRecord(value.appAccess) ? value.appAccess : {};
  const rawSnapshotEncryption = isRecord(value.snapshotEncryption)
    ? value.snapshotEncryption
    : {};

  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    appAccess: {
      autoLockMinutes: normalizeAutoLockMinutes(rawAppAccess.autoLockMinutes)
    },
    snapshotEncryption: {
      enabled: rawSnapshotEncryption.enabled === true,
      forceEnabled:
        typeof rawSnapshotEncryption.forceEnabled === 'boolean'
          ? rawSnapshotEncryption.forceEnabled
          : true
    }
  };
};
