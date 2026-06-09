export const GROUPS_STORAGE_KEY = 'asset-overview-groups';

export const ACCOUNTS_STORAGE_KEY = 'asset-overview-accounts';

export const HISTORY_STORAGE_KEY = 'asset-overview-history';

export const LAST_BACKUP_STORAGE_KEY = 'lastBackupAt';

export const LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY = 'lastBackupHistoryCount';

export const BACKUP_RECORDS_STORAGE_KEY = 'backupRecords';

export const SNAPSHOT_IMPORT_RECORDS_STORAGE_KEY = 'snapshotImportRecords';

export const AUTO_BACKUP_SETTINGS_STORAGE_KEY = 'autoBackupSettings';

export const FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY = 'forceAutoBackupDueOnce';

export const CHART_SETTINGS_STORAGE_KEY = 'assetChartSettings';

export const GLOBAL_SETTINGS_STORAGE_KEY = 'netraflowGlobalSettings';

export const FIRST_WELCOME_STORAGE_KEY = 'netraflowFirstWelcomeState';

export const ROLLUP_IMPORT_HASHES_STORAGE_KEY = 'netraflowRollupImportHashes';

export const USER_SETTINGS_FILE_TYPE = 'netraflow-user-settings';

export const USER_SETTINGS_FILE_VERSION = 1;

export const MIGRATION_BACKUP_STORAGE_KEY = 'netraflow_backup_before_migration';

export const LEGACY_ACCOUNTS_STORAGE_KEY = 'accounts';

export const LEGACY_ACCOUNT_TYPES_STORAGE_KEY = 'accountTypes';

export const LEGACY_HISTORY_STORAGE_KEY = 'historyRecords';

export const LEGACY_ARCHIVED_ACCOUNTS_STORAGE_KEY = 'archivedAccounts';

export const LEGACY_DELETED_RECORDS_STORAGE_KEY = 'deletedRecords';

export const NF_STORAGE_WHITELIST_KEYS = [
  GROUPS_STORAGE_KEY,
  ACCOUNTS_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  LAST_BACKUP_STORAGE_KEY,
  LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY,
  BACKUP_RECORDS_STORAGE_KEY,
  SNAPSHOT_IMPORT_RECORDS_STORAGE_KEY,
  AUTO_BACKUP_SETTINGS_STORAGE_KEY,
  FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY,
  CHART_SETTINGS_STORAGE_KEY,
  GLOBAL_SETTINGS_STORAGE_KEY,
  FIRST_WELCOME_STORAGE_KEY,
  ROLLUP_IMPORT_HASHES_STORAGE_KEY,
  MIGRATION_BACKUP_STORAGE_KEY,
  LEGACY_ACCOUNTS_STORAGE_KEY,
  LEGACY_ACCOUNT_TYPES_STORAGE_KEY,
  LEGACY_HISTORY_STORAGE_KEY,
  LEGACY_ARCHIVED_ACCOUNTS_STORAGE_KEY,
  LEGACY_DELETED_RECORDS_STORAGE_KEY
] as const;

export type NfStorageKey = (typeof NF_STORAGE_WHITELIST_KEYS)[number];

export const isNfStorageKey = (key: string): key is NfStorageKey =>
  (NF_STORAGE_WHITELIST_KEYS as readonly string[]).includes(key);
