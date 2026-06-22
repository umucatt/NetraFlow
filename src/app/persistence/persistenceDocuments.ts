import type {
  Account,
  AssetGroup,
  AutoBackupSettings,
  BackupRecord,
  HistoryRecord,
  SnapshotImportRecord
} from '../types';
import type { AssetChartSettings } from '../../features/charts';
import type { PasswordHash } from '../../security/passwordHash';
import type {
  ChartColorAssignmentMode,
  HomeAssetStatLabelMode,
  HomeAssetStatMetric,
  MainContentPosition,
  PagePositionMemoryMode,
  PositiveNegativeColorMode,
  SearchLogicMode,
  ThemeMode,
  ThemeStyle
} from './persistenceSettingsTypes';

export const PERSISTENCE_SCHEMA_VERSION = 1;

// core: user business data and required relationship fields.
export type CoreDocument = {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  groups: AssetGroup[];
  accounts: Account[];
  history: HistoryRecord[];
};

export type NonSecurityGlobalSettings = {
  positiveNegativeColorMode: PositiveNegativeColorMode;
  themeMode: ThemeMode;
  themeStyle: ThemeStyle;
  mainContentPosition: MainContentPosition;
  pagePositionMemoryMode: PagePositionMemoryMode;
  searchLogicMode: SearchLogicMode;
  chartColorAssignmentMode: ChartColorAssignmentMode;
  homeAssetStatMetric: HomeAssetStatMetric;
  homeAssetStatLabelMode: HomeAssetStatLabelMode;
  homeAssetStatCompact: boolean;
};

// settings: normal user preferences that have recoverable defaults.
export type SettingsDocument = {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  autoBackup: AutoBackupSettings;
  assetChart: AssetChartSettings;
  global: NonSecurityGlobalSettings;
};

export type StateDocument = {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  backup: {
    lastBackupAt?: string;
    lastBackupHistoryCount?: number;
    records: BackupRecord[];
    importRecords: SnapshotImportRecord[];
    forceAutoBackupDueOnce?: true;
  };
  rollupImportHashes: string[];
  firstWelcome: {
    completed?: boolean;
    pendingAfterClearAll?: boolean;
  };
  personalization: {
    nyaaThemeUnlocked?: boolean;
  };
};

export type SecurityDocument = {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  appAccess: {
    enabled: boolean;
    autoLockMinutes: number;
    passwordHash: PasswordHash | null;
  };
  snapshotEncryption: {
    enabled: boolean;
    passwordHash: PasswordHash | null;
  };
};

export type PersistenceDocument =
  | CoreDocument
  | SettingsDocument
  | StateDocument
  | SecurityDocument;

export const PERSISTENCE_DOCUMENT_FILENAMES = [
  'core.json',
  'settings.json',
  'state.json',
  'security.json'
] as const;

export const CORE_DOCUMENT_KEYS = ['schemaVersion', 'groups', 'accounts', 'history'] as const;

export const SETTINGS_DOCUMENT_KEYS = [
  'schemaVersion',
  'autoBackup',
  'assetChart',
  'global'
] as const;

export const STATE_DOCUMENT_KEYS = [
  'schemaVersion',
  'backup',
  'rollupImportHashes',
  'firstWelcome',
  'personalization'
] as const;

export const SECURITY_DOCUMENT_KEYS = [
  'schemaVersion',
  'appAccess',
  'snapshotEncryption'
] as const;

export const EXCLUDED_PERSISTENCE_FIELDS = [
  'netraflow_backup_before_migration',
  'migrationBackup',
  'accounts',
  'accountTypes',
  'historyRecords',
  'archivedAccounts',
  'deletedRecords',
  'legacyKeys',
  'exampleData',
  'demoData',
  'testdatain',
  'logs',
  'cache',
  'sessionData',
  'crashDumps',
  'tmp',
  'previous',
  'passwordProtectionEnabled',
  'passwordHash',
  'autoLockMinutes',
  'snapshotEncryptionEnabled',
  'snapshotPasswordHash'
] as const;
