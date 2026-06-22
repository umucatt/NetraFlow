export const PERSISTENCE_SCHEMA_VERSION = 1 as const;

export type PersistenceDocumentKind = 'core' | 'settings' | 'state' | 'security';

export type PasswordHash = {
  algorithm: 'PBKDF2-HMAC-SHA-256';
  iterations: 600000;
  salt: string;
  hash: string;
};

export type CoreDocument = {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  groups: unknown[];
  accounts: unknown[];
  history: unknown[];
};

export type SettingsDocument = {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  autoBackup: {
    enabled: boolean;
    cycle: {
      value: number;
      unit: 'day' | 'week' | 'month';
    };
    directory: string;
  };
  assetChart: Record<string, unknown>;
  global: {
    positiveNegativeColorMode: 'red-positive' | 'green-positive';
    themeMode: 'light' | 'dark' | 'system';
    themeStyle: 'default' | 'nyaa';
    mainContentPosition: 'left' | 'right';
    pagePositionMemoryMode: 'global' | 'covered-reset';
    searchLogicMode: 'strict' | 'infer';
    chartColorAssignmentMode: 'createdAt' | 'share';
    homeAssetStatMetric: 'netWorth' | 'totalAssets';
    homeAssetStatLabelMode: 'full' | 'short';
    homeAssetStatCompact: boolean;
  };
};

export type StateDocument = {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  backup: {
    lastBackupAt?: string;
    lastBackupHistoryCount?: number;
    records: unknown[];
    importRecords: unknown[];
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidTime = (value: unknown) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

const isOptionalValidTime = (value: unknown) => value === undefined || isValidTime(value);

const isOptionalString = (value: unknown) => value === undefined || typeof value === 'string';

const isOptionalBoolean = (value: unknown) =>
  value === undefined || typeof value === 'boolean';

const isFiniteNumberOrNull = (value: unknown) =>
  value === null || (typeof value === 'number' && Number.isFinite(value));

const isPasswordHash = (value: unknown): value is PasswordHash => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.algorithm === 'PBKDF2-HMAC-SHA-256' &&
    value.iterations === 600000 &&
    typeof value.salt === 'string' &&
    value.salt.length > 0 &&
    typeof value.hash === 'string' &&
    value.hash.length > 0
  );
};

const isCoreGroup = (value: unknown) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.nature === 'asset' || value.nature === 'receivable' || value.nature === 'liability') &&
    typeof value.includeInStats === 'boolean' &&
    typeof value.sortOrder === 'number' &&
    Number.isFinite(value.sortOrder)
  );
};

const isCoreAccount = (value: unknown) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.groupId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    isValidTime(value.createdAt) &&
    isOptionalString(value.alias) &&
    isOptionalBoolean(value.archived) &&
    isOptionalValidTime(value.archivedAt)
  );
};

const isCoreHistoryRecord = (value: unknown) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.accountId === 'string' &&
    typeof value.type === 'string' &&
    typeof value.groupName === 'string' &&
    typeof value.accountName === 'string' &&
    isFiniteNumberOrNull(value.beforeAmount) &&
    isFiniteNumberOrNull(value.afterAmount) &&
    isValidTime(value.time) &&
    isOptionalValidTime(value.relatedTime) &&
    isOptionalString(value.note) &&
    (value.source === undefined || value.source === 'flash-note' || value.source === 'rollup')
  );
};

export const createDefaultCoreDocument = (): CoreDocument => ({
  schemaVersion: PERSISTENCE_SCHEMA_VERSION,
  groups: [],
  accounts: [],
  history: []
});

const defaultAssetChart = () => ({
  l0: { showStructure: true, showTrend: true, xAxisRange: '6m' },
  globalChartControlMode: 'peer',
  structure: { assetDisplay: 'both', showDebtMultiple: true },
  trend: {
    assetDisplay: 'net',
    adaptiveYAxis: true,
    xAxisRange: '6m',
    pointValueMode: 'adaptive'
  },
  categoryVisibility: { showStructure: true, showTrend: true },
  globalCategoryDetail: { xAxisRange: '6m', pointValueMode: 'adaptive' },
  categoryDetailById: {},
  accountDetailById: {}
});

export const createDefaultSettingsDocument = (): SettingsDocument => ({
  schemaVersion: PERSISTENCE_SCHEMA_VERSION,
  autoBackup: {
    enabled: false,
    cycle: { value: 7, unit: 'day' },
    directory: ''
  },
  assetChart: defaultAssetChart(),
  global: {
    positiveNegativeColorMode: 'red-positive',
    themeMode: 'system',
    themeStyle: 'default',
    mainContentPosition: 'left',
    pagePositionMemoryMode: 'global',
    searchLogicMode: 'infer',
    chartColorAssignmentMode: 'createdAt',
    homeAssetStatMetric: 'netWorth',
    homeAssetStatLabelMode: 'full',
    homeAssetStatCompact: false
  }
});

export const createDefaultStateDocument = (): StateDocument => ({
  schemaVersion: PERSISTENCE_SCHEMA_VERSION,
  backup: {
    records: [],
    importRecords: []
  },
  rollupImportHashes: [],
  firstWelcome: {},
  personalization: {}
});

export const createDefaultSecurityDocument = (): SecurityDocument => ({
  schemaVersion: PERSISTENCE_SCHEMA_VERSION,
  appAccess: {
    enabled: false,
    autoLockMinutes: 10,
    passwordHash: null
  },
  snapshotEncryption: {
    enabled: false,
    passwordHash: null
  }
});

const normalizeAutoBackup = (value: unknown): SettingsDocument['autoBackup'] => {
  const defaults = createDefaultSettingsDocument().autoBackup;

  if (!isRecord(value)) {
    return defaults;
  }

  const cycle = isRecord(value.cycle) ? value.cycle : {};
  const rawCycleValue = cycle.value;

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
    cycle: {
      value:
        typeof rawCycleValue === 'number' && Number.isFinite(rawCycleValue)
          ? Math.max(1, Math.floor(rawCycleValue))
          : defaults.cycle.value,
      unit:
        cycle.unit === 'day' || cycle.unit === 'week' || cycle.unit === 'month'
          ? cycle.unit
          : defaults.cycle.unit
    },
    directory: typeof value.directory === 'string' ? value.directory : defaults.directory
  };
};

export const normalizeSettingsDocument = (value: unknown): SettingsDocument => {
  const defaults = createDefaultSettingsDocument();
  const raw = isRecord(value) ? value : {};
  const global = isRecord(raw.global) ? raw.global : {};

  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    autoBackup: normalizeAutoBackup(raw.autoBackup),
    assetChart: isRecord(raw.assetChart) ? raw.assetChart : defaultAssetChart(),
    global: {
      positiveNegativeColorMode:
        global.positiveNegativeColorMode === 'green-positive'
          ? 'green-positive'
          : defaults.global.positiveNegativeColorMode,
      themeMode:
        global.themeMode === 'light' || global.themeMode === 'dark' || global.themeMode === 'system'
          ? global.themeMode
          : defaults.global.themeMode,
      themeStyle:
        global.themeStyle === 'default' || global.themeStyle === 'nyaa'
          ? global.themeStyle
          : defaults.global.themeStyle,
      mainContentPosition:
        global.mainContentPosition === 'right'
          ? 'right'
          : defaults.global.mainContentPosition,
      pagePositionMemoryMode:
        global.pagePositionMemoryMode === 'covered-reset'
          ? 'covered-reset'
          : defaults.global.pagePositionMemoryMode,
      searchLogicMode:
        global.searchLogicMode === 'strict' ? 'strict' : defaults.global.searchLogicMode,
      chartColorAssignmentMode:
        global.chartColorAssignmentMode === 'share'
          ? 'share'
          : defaults.global.chartColorAssignmentMode,
      homeAssetStatMetric:
        global.homeAssetStatMetric === 'totalAssets'
          ? 'totalAssets'
          : defaults.global.homeAssetStatMetric,
      homeAssetStatLabelMode:
        global.homeAssetStatLabelMode === 'short'
          ? 'short'
          : defaults.global.homeAssetStatLabelMode,
      homeAssetStatCompact:
        typeof global.homeAssetStatCompact === 'boolean'
          ? global.homeAssetStatCompact
          : defaults.global.homeAssetStatCompact
    }
  };
};

export const normalizeStateDocument = (value: unknown): StateDocument => {
  if (!isRecord(value)) {
    return createDefaultStateDocument();
  }

  const backup = isRecord(value.backup) ? value.backup : {};
  const firstWelcome = isRecord(value.firstWelcome) ? value.firstWelcome : {};
  const personalization = isRecord(value.personalization) ? value.personalization : {};
  const lastBackupAt = backup.lastBackupAt;
  const hashes = Array.isArray(value.rollupImportHashes)
    ? Array.from(new Set(value.rollupImportHashes.filter((item) => typeof item === 'string'))).slice(-80)
    : [];

  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    backup: {
      ...(typeof lastBackupAt === 'string' && isValidTime(lastBackupAt)
        ? { lastBackupAt }
        : {}),
      ...(typeof backup.lastBackupHistoryCount === 'number' &&
      Number.isFinite(backup.lastBackupHistoryCount)
        ? { lastBackupHistoryCount: Math.max(0, Math.floor(backup.lastBackupHistoryCount)) }
        : {}),
      records: Array.isArray(backup.records) ? backup.records : [],
      importRecords: Array.isArray(backup.importRecords) ? backup.importRecords : [],
      ...(backup.forceAutoBackupDueOnce === true ? { forceAutoBackupDueOnce: true } : {})
    },
    rollupImportHashes: hashes,
    firstWelcome: {
      ...(typeof firstWelcome.completed === 'boolean'
        ? { completed: firstWelcome.completed }
        : {}),
      ...(typeof firstWelcome.pendingAfterClearAll === 'boolean'
        ? { pendingAfterClearAll: firstWelcome.pendingAfterClearAll }
        : {})
    },
    personalization: {
      ...(personalization.nyaaThemeUnlocked === true ? { nyaaThemeUnlocked: true } : {})
    }
  };
};

export const normalizeSecurityDocument = (value: unknown): SecurityDocument => {
  if (!isRecord(value)) {
    return createDefaultSecurityDocument();
  }

  const appAccess = isRecord(value.appAccess) ? value.appAccess : {};
  const snapshotEncryption = isRecord(value.snapshotEncryption) ? value.snapshotEncryption : {};
  const appHash = isPasswordHash(appAccess.passwordHash) ? appAccess.passwordHash : null;
  const snapshotHash = isPasswordHash(snapshotEncryption.passwordHash)
    ? snapshotEncryption.passwordHash
    : null;
  const rawAutoLockMinutes = appAccess.autoLockMinutes;
  const autoLockMinutes =
    typeof rawAutoLockMinutes === 'number' && Number.isFinite(rawAutoLockMinutes) && rawAutoLockMinutes >= 1
      ? Math.floor(rawAutoLockMinutes)
      : 10;

  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    appAccess: {
      enabled: appAccess.enabled === true && appHash !== null,
      autoLockMinutes,
      passwordHash: appHash
    },
    snapshotEncryption: {
      enabled: snapshotEncryption.enabled === true && snapshotHash !== null,
      passwordHash: snapshotHash
    }
  };
};

export const isCoreDocument = (value: unknown): value is CoreDocument =>
  isRecord(value) &&
  value.schemaVersion === PERSISTENCE_SCHEMA_VERSION &&
  Array.isArray(value.groups) &&
  Array.isArray(value.accounts) &&
  Array.isArray(value.history) &&
  value.groups.every(isCoreGroup) &&
  value.accounts.every(isCoreAccount) &&
  value.history.every(isCoreHistoryRecord) &&
  Object.keys(value).every((key) =>
    key === 'schemaVersion' || key === 'groups' || key === 'accounts' || key === 'history'
  );

const matchesNormalized = <T>(value: T, normalize: (value: unknown) => T) =>
  JSON.stringify(value) === JSON.stringify(normalize(value));

export const isSettingsDocument = (value: unknown): value is SettingsDocument =>
  isRecord(value) &&
  value.schemaVersion === PERSISTENCE_SCHEMA_VERSION &&
  isRecord(value.autoBackup) &&
  isRecord(value.assetChart) &&
  isRecord(value.global) &&
  !Object.hasOwn(value.global, 'passwordHash') &&
  !Object.hasOwn(value.global, 'passwordProtectionEnabled') &&
  matchesNormalized(value, normalizeSettingsDocument);

export const isStateDocument = (value: unknown): value is StateDocument =>
  isRecord(value) &&
  value.schemaVersion === PERSISTENCE_SCHEMA_VERSION &&
  isRecord(value.backup) &&
  Array.isArray(value.backup.records) &&
  Array.isArray(value.backup.importRecords) &&
  Array.isArray(value.rollupImportHashes) &&
  value.rollupImportHashes.every((item) => typeof item === 'string') &&
  isRecord(value.firstWelcome) &&
  isRecord(value.personalization) &&
  !Object.hasOwn(value, 'groups') &&
  !Object.hasOwn(value, 'accounts') &&
  !Object.hasOwn(value, 'history') &&
  !Object.hasOwn(value, 'passwordHash') &&
  matchesNormalized(value, normalizeStateDocument);

export const isSecurityDocument = (value: unknown): value is SecurityDocument =>
  isRecord(value) &&
  value.schemaVersion === PERSISTENCE_SCHEMA_VERSION &&
  isRecord(value.appAccess) &&
  isRecord(value.snapshotEncryption) &&
  matchesNormalized(value, normalizeSecurityDocument) &&
  !Object.hasOwn(value, 'themeMode') &&
  !Object.hasOwn(value, 'assetChart');

export const normalizePersistenceDocument = (
  kind: PersistenceDocumentKind,
  value: unknown
): PersistenceDocument => {
  if (kind === 'core') {
    return isCoreDocument(value) ? value : createDefaultCoreDocument();
  }

  if (kind === 'settings') {
    return normalizeSettingsDocument(value);
  }

  if (kind === 'state') {
    return normalizeStateDocument(value);
  }

  return normalizeSecurityDocument(value);
};

export const isPersistenceDocument = (
  kind: PersistenceDocumentKind,
  value: unknown
): value is PersistenceDocument => {
  if (kind === 'core') {
    return isCoreDocument(value);
  }

  if (kind === 'settings') {
    return isSettingsDocument(value);
  }

  if (kind === 'state') {
    return isStateDocument(value);
  }

  return isSecurityDocument(value);
};

export const createDefaultPersistenceDocument = (
  kind: PersistenceDocumentKind
): PersistenceDocument => {
  if (kind === 'core') {
    return createDefaultCoreDocument();
  }

  if (kind === 'settings') {
    return createDefaultSettingsDocument();
  }

  if (kind === 'state') {
    return createDefaultStateDocument();
  }

  return createDefaultSecurityDocument();
};
