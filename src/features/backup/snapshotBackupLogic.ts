import {
  AUTO_BACKUP_SETTINGS_STORAGE_KEY,
  BACKUP_RECORDS_STORAGE_KEY,
  FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY,
  LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY,
  LAST_BACKUP_STORAGE_KEY,
  SNAPSHOT_IMPORT_RECORDS_STORAGE_KEY
} from '../../app/storageKeys';
import { nfStorage } from '../../app/nfStorage';
import { DAY_MS, getValidTimestamp } from '../../app/dateUtils';
import type {
  Account,
  AppData,
  AssetGroup,
  AutoBackupSettings,
  BackupCycle,
  BackupCycleUnit,
  BackupMethod,
  BackupRecord,
  HistoryRecord,
  SnapshotImportRecord
} from '../../app/types';
import {
  createEncryptedJsonExportText,
  createJsonPayloadExportText
} from '../../app/jsonIntegrity';
import { encryptSnapshotPayload } from '../../security/snapshotCrypto';

export const DEFAULT_AUTO_BACKUP_SETTINGS: AutoBackupSettings = {
  enabled: false,
  cycle: {
    value: 7,
    unit: 'day'
  },
  directory: ''
};

export const SNAPSHOT_INCOMPLETE_ERROR_MESSAGE = '快照文件格式不完整，无法导入';

type BackupPayloadOptions = {
  productName: string;
  backupAt: string;
  backupRecord: BackupRecord;
  nextBackupRecords: BackupRecord[];
  autoBackupSettings: AutoBackupSettings;
  groups: AssetGroup[];
  accounts: Account[];
  history: HistoryRecord[];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getStringField = (value: Record<string, unknown>, fieldNames: string[]) => {
  for (const fieldName of fieldNames) {
    const fieldValue = value[fieldName];

    if (typeof fieldValue === 'string') {
      return fieldValue;
    }
  }

  return undefined;
};

const getNumberField = (value: Record<string, unknown>, fieldNames: string[]) => {
  for (const fieldName of fieldNames) {
    const fieldValue = value[fieldName];

    if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) {
      return fieldValue;
    }
  }

  return undefined;
};

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const COMPARABLE_HISTORY_RECORD_KEYS = [
  'id',
  'accountId',
  'type',
  'groupName',
  'accountName',
  'beforeAmount',
  'afterAmount',
  'time',
  'relatedTime',
  'note',
  'source'
] as const satisfies readonly (keyof HistoryRecord)[];

export const createComparableHistoryRecordText = (record: HistoryRecord) => {
  const comparableRecord = COMPARABLE_HISTORY_RECORD_KEYS.reduce<
    Partial<Record<keyof HistoryRecord, HistoryRecord[keyof HistoryRecord]>>
  >((snapshot, key) => {
    const value = record[key];

    if (value !== undefined) {
      snapshot[key] = value;
    }

    return snapshot;
  }, {});

  return JSON.stringify(comparableRecord);
};

export const countChangedHistoryRecords = (
  currentRecords: HistoryRecord[],
  importedRecords: HistoryRecord[],
  mergedRecords: HistoryRecord[] = importedRecords
) => {
  const currentRecordsById = new Map(currentRecords.map((record) => [record.id, record]));
  const nextRecordsById = new Map(mergedRecords.map((record) => [record.id, record]));
  const importedRecordsById = new Map(importedRecords.map((record) => [record.id, record]));
  const recordIds = new Set([
    ...currentRecordsById.keys(),
    ...importedRecordsById.keys(),
    ...nextRecordsById.keys()
  ]);

  return Array.from(recordIds).reduce((count, recordId) => {
    const currentRecord = currentRecordsById.get(recordId);
    const nextRecord = nextRecordsById.get(recordId) ?? importedRecordsById.get(recordId);

    if (!currentRecord || !nextRecord) {
      return count + 1;
    }

    return createComparableHistoryRecordText(currentRecord) ===
      createComparableHistoryRecordText(nextRecord)
      ? count
      : count + 1;
  }, 0);
};

export const createSnapshotRestoreData = ({
  currentData,
  importedAccountData,
  importedHistory,
  snapshotFields
}: {
  currentData: AppData;
  importedAccountData: Pick<AppData, 'groups' | 'accounts'>;
  importedHistory: HistoryRecord[];
  snapshotFields: {
    groups: unknown;
    accounts: unknown;
    history: unknown;
  };
}) => {
  if (
    !Array.isArray(snapshotFields.groups) ||
    !Array.isArray(snapshotFields.accounts) ||
    !Array.isArray(snapshotFields.history)
  ) {
    throw new Error(SNAPSHOT_INCOMPLETE_ERROR_MESSAGE);
  }

  const nextData: AppData = {
    groups: importedAccountData.groups,
    accounts: importedAccountData.accounts,
    history: importedHistory
  };

  return {
    nextData,
    historyRecordCount: importedHistory.length,
    changedHistoryRecordCount: countChangedHistoryRecords(
      currentData.history,
      importedHistory,
      nextData.history
    )
  };
};

const readStorageJson = (key: string) => {
  const raw = nfStorage.getItem(key);

  if (raw === null) {
    return { parsed: false, value: undefined, raw };
  }

  try {
    return { parsed: true, value: JSON.parse(raw) as unknown, raw };
  } catch (error) {
    console.warn(`[NetraFlow storage] Failed to parse storage key "${key}".`, error);

    return { parsed: false, value: undefined, raw };
  }
};

const isBackupCycleUnit = (value: unknown): value is BackupCycleUnit =>
  value === 'day' || value === 'week' || value === 'month';

const normalizeBackupCycle = (value: unknown): BackupCycle => {
  if (!isPlainObject(value)) {
    return { ...DEFAULT_AUTO_BACKUP_SETTINGS.cycle };
  }

  const rawValue = value.value;
  const rawUnit = value.unit;
  const cycleValue =
    typeof rawValue === 'number' && Number.isFinite(rawValue)
      ? Math.max(1, Math.floor(rawValue))
      : DEFAULT_AUTO_BACKUP_SETTINGS.cycle.value;

  return {
    value: cycleValue,
    unit: isBackupCycleUnit(rawUnit) ? rawUnit : DEFAULT_AUTO_BACKUP_SETTINGS.cycle.unit
  };
};

const isBackupMethod = (value: unknown): value is BackupMethod =>
  value === 'manual' || value === 'auto';

export const normalizeBackupRecords = (value: unknown): BackupRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((record): BackupRecord[] => {
      if (!isPlainObject(record)) {
        return [];
      }

      const backedUpAt =
        getStringField(record, ['backedUpAt', 'backupAt', 'exportedAt', 'time']) ?? '';

      if (getValidTimestamp(backedUpAt) === null) {
        return [];
      }

      const rawHistoryCount = getNumberField(record, ['historyCount', 'backupHistoryCount']);
      const rawIncrementCount = getNumberField(record, [
        'incrementCount',
        'incrementalCount',
        'deltaCount'
      ]);

      return [
        {
          id: getStringField(record, ['id', 'recordId']) ?? createId('backup-record'),
          backedUpAt,
          historyCount:
            rawHistoryCount === undefined ? 0 : Math.max(0, Math.floor(rawHistoryCount)),
          incrementCount:
            rawIncrementCount === undefined ? 0 : Math.max(0, Math.floor(rawIncrementCount)),
          method: isBackupMethod(record.method) ? record.method : 'manual'
        }
      ];
    })
    .sort((left, right) => {
      const leftTime = getValidTimestamp(left.backedUpAt) ?? 0;
      const rightTime = getValidTimestamp(right.backedUpAt) ?? 0;

      return rightTime - leftTime;
    });
};

export const mergeBackupRecords = (
  currentRecords: BackupRecord[],
  importedRecords: BackupRecord[]
) => {
  const recordsById = new Map<string, BackupRecord>();

  currentRecords.forEach((record) => recordsById.set(record.id, record));
  importedRecords.forEach((record) => {
    const existingRecord = recordsById.get(record.id);
    recordsById.set(record.id, existingRecord ? { ...existingRecord, ...record } : record);
  });

  return Array.from(recordsById.values()).sort((left, right) => {
    const leftTime = getValidTimestamp(left.backedUpAt) ?? 0;
    const rightTime = getValidTimestamp(right.backedUpAt) ?? 0;

    return rightTime - leftTime;
  });
};

export const normalizeSnapshotImportRecords = (
  value: unknown
): SnapshotImportRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((record): SnapshotImportRecord[] => {
      if (!isPlainObject(record)) {
        return [];
      }

      const importedAt = getStringField(record, ['importedAt', 'time']) ?? '';

      if (getValidTimestamp(importedAt) === null) {
        return [];
      }

      const rawSnapshotCreatedAt =
        getStringField(record, ['snapshotCreatedAt', 'createdAt', 'backupAt']) ?? null;
      const snapshotCreatedAt =
        rawSnapshotCreatedAt !== null && getValidTimestamp(rawSnapshotCreatedAt) !== null
          ? rawSnapshotCreatedAt
          : null;
      const rawHistoryRecordCount = getNumberField(record, [
        'historyRecordCount',
        'historyCount'
      ]);
      const rawChangedHistoryRecordCount = getNumberField(record, [
        'changedHistoryRecordCount',
        'changedCount'
      ]);

      return [
        {
          id: getStringField(record, ['id', 'recordId']) ?? createId('snapshot-import-record'),
          importedAt,
          snapshotCreatedAt,
          historyRecordCount:
            rawHistoryRecordCount === undefined
              ? 0
              : Math.max(0, Math.floor(rawHistoryRecordCount)),
          changedHistoryRecordCount:
            rawChangedHistoryRecordCount === undefined
              ? 0
              : Math.max(0, Math.floor(rawChangedHistoryRecordCount))
        }
      ];
    })
    .sort((left, right) => {
      const leftTime = getValidTimestamp(left.importedAt) ?? 0;
      const rightTime = getValidTimestamp(right.importedAt) ?? 0;

      return rightTime - leftTime;
    });
};

export const mergeSnapshotImportRecords = (
  currentRecords: SnapshotImportRecord[],
  nextRecord: SnapshotImportRecord
) => normalizeSnapshotImportRecords([nextRecord, ...currentRecords]);

export const loadBackupRecords = () => {
  const storedRecords = readStorageJson(BACKUP_RECORDS_STORAGE_KEY);

  return storedRecords.parsed ? normalizeBackupRecords(storedRecords.value) : [];
};

export const saveBackupRecords = (records: BackupRecord[]) => {
  nfStorage.setItem(
    BACKUP_RECORDS_STORAGE_KEY,
    JSON.stringify(normalizeBackupRecords(records))
  );
};

export const loadSnapshotImportRecords = () => {
  const storedRecords = readStorageJson(SNAPSHOT_IMPORT_RECORDS_STORAGE_KEY);

  return storedRecords.parsed ? normalizeSnapshotImportRecords(storedRecords.value) : [];
};

export const saveSnapshotImportRecords = (records: SnapshotImportRecord[]) => {
  nfStorage.setItem(
    SNAPSHOT_IMPORT_RECORDS_STORAGE_KEY,
    JSON.stringify(normalizeSnapshotImportRecords(records))
  );
};

export const getBackupCycleDays = (cycle: BackupCycle) => {
  const unitMultiplier = cycle.unit === 'month' ? 30 : cycle.unit === 'week' ? 7 : 1;

  return Math.max(1, Math.floor(cycle.value)) * unitMultiplier;
};

const getLocalCalendarDayIndex = (date: Date) =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);

const formatPreviousAutoBackupDayLabel = (elapsedDays: number) => {
  if (elapsedDays <= 0) {
    return '今天';
  }

  if (elapsedDays === 1) {
    return '昨天';
  }

  return `${elapsedDays} 天前`;
};

const formatNextAutoBackupDayLabel = (remainingDays: number) => {
  if (remainingDays <= 0) {
    return '下次启动';
  }

  if (remainingDays === 1) {
    return '明天';
  }

  return `${remainingDays} 天后`;
};

export const getAutoSnapshotProgressState = (
  lastAutoBackupAt: string,
  cycle: BackupCycle,
  now: Date | number = Date.now()
) => {
  const cycleDays = getBackupCycleDays(cycle);
  const nowDate = typeof now === 'number' ? new Date(now) : now;
  const todayIndex = getLocalCalendarDayIndex(nowDate);
  const lastAutoBackupTimestamp = getValidTimestamp(lastAutoBackupAt);

  if (lastAutoBackupTimestamp === null) {
    return {
      progressPercent: 0,
      previousLabel: '暂未进行',
      nextLabel: formatNextAutoBackupDayLabel(cycleDays)
    };
  }

  const lastAutoBackupDayIndex = getLocalCalendarDayIndex(
    new Date(lastAutoBackupTimestamp)
  );
  const elapsedDays = Math.max(0, todayIndex - lastAutoBackupDayIndex);

  return {
    progressPercent: Math.min(100, (elapsedDays / cycleDays) * 100),
    previousLabel: formatPreviousAutoBackupDayLabel(elapsedDays),
    nextLabel: formatNextAutoBackupDayLabel(cycleDays - elapsedDays)
  };
};

export const isAutoBackupCycleDue = (
  lastAutoBackupAt: string,
  cycle: BackupCycle,
  now: Date | number = Date.now()
) => {
  const lastAutoBackupTimestamp = getValidTimestamp(lastAutoBackupAt);

  if (lastAutoBackupTimestamp === null) {
    return true;
  }

  const nowDate = typeof now === 'number' ? new Date(now) : now;
  const elapsedDays = Math.max(
    0,
    getLocalCalendarDayIndex(nowDate) -
      getLocalCalendarDayIndex(new Date(lastAutoBackupTimestamp))
  );

  return elapsedDays >= getBackupCycleDays(cycle);
};

export const markAutoBackupDueOnce = () => {
  nfStorage.setItem(FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY, 'true');
};

export const consumeAutoBackupDueOnce = () => {
  const shouldForceDue =
    nfStorage.getItem(FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY) === 'true';

  nfStorage.removeItem(FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY);

  return shouldForceDue;
};

export const shouldRunStartupAutoBackupCycle = (
  lastAutoBackupAt: string,
  cycle: BackupCycle,
  forceDueOnce: boolean,
  now: Date | number = Date.now()
) => forceDueOnce || isAutoBackupCycleDue(lastAutoBackupAt, cycle, now);

export const hasBackupRecordMissingIncrementCount = () => {
  const storedRecords = readStorageJson(BACKUP_RECORDS_STORAGE_KEY);

  return (
    storedRecords.parsed &&
    Array.isArray(storedRecords.value) &&
    storedRecords.value.some(
      (record) => isPlainObject(record) && !('incrementCount' in record)
    )
  );
};

export const loadLastBackupAt = () => {
  const value = nfStorage.getItem(LAST_BACKUP_STORAGE_KEY);

  return getValidTimestamp(value) === null ? '' : value ?? '';
};

export const saveLastBackupAt = (time: string) => {
  nfStorage.setItem(LAST_BACKUP_STORAGE_KEY, time);
};

export const clearLastBackupAt = () => {
  nfStorage.removeItem(LAST_BACKUP_STORAGE_KEY);
};

const getStoredNumber = (key: string) => {
  const storedValue = readStorageJson(key);
  const value = storedValue.parsed ? storedValue.value : storedValue.raw;
  const numberValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  return Number.isFinite(numberValue) ? numberValue : null;
};

export const loadLastBackupHistoryCount = (currentHistoryCount: number) => {
  const storedCount = getStoredNumber(LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY);

  if (storedCount !== null) {
    return Math.max(0, Math.floor(storedCount));
  }

  const latestBackupRecord = loadBackupRecords()[0];

  if (latestBackupRecord) {
    return latestBackupRecord.historyCount;
  }

  return loadLastBackupAt() ? currentHistoryCount : 0;
};

export const saveLastBackupHistoryCount = (count: number) => {
  nfStorage.setItem(
    LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY,
    JSON.stringify(Math.max(0, Math.floor(count)))
  );
};

export const normalizeAutoBackupSettings = (value: unknown): AutoBackupSettings => {
  if (!isPlainObject(value)) {
    return DEFAULT_AUTO_BACKUP_SETTINGS;
  }

  return {
    enabled:
      typeof value.enabled === 'boolean'
        ? value.enabled
        : DEFAULT_AUTO_BACKUP_SETTINGS.enabled,
    cycle: normalizeBackupCycle(value.cycle),
    directory:
      typeof value.directory === 'string'
        ? value.directory
        : DEFAULT_AUTO_BACKUP_SETTINGS.directory
  };
};

export const loadAutoBackupSettings = () => {
  const storedSettings = readStorageJson(AUTO_BACKUP_SETTINGS_STORAGE_KEY);

  return storedSettings.parsed
    ? normalizeAutoBackupSettings(storedSettings.value)
    : DEFAULT_AUTO_BACKUP_SETTINGS;
};

export const saveAutoBackupSettings = (settings: AutoBackupSettings) => {
  nfStorage.setItem(
    AUTO_BACKUP_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalizeAutoBackupSettings(settings))
  );
};

const areBackupCyclesEqual = (left: BackupCycle, right: BackupCycle) =>
  left.value === right.value && left.unit === right.unit;

export const areAutoBackupSettingsEqual = (
  left: AutoBackupSettings,
  right: AutoBackupSettings
) =>
  left.enabled === right.enabled &&
  left.directory === right.directory &&
  areBackupCyclesEqual(left.cycle, right.cycle);

export const getBackupMethodLabel = (method: BackupMethod) =>
  method === 'auto' ? '自动快照' : '手动快照';

export const formatBackupFileTimestamp = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}-${hour}${minute}`;
};

export const getBackupFileName = (backupAt: string, encrypted: boolean) =>
  `netraflow-snapshot-${formatBackupFileTimestamp(new Date(backupAt))}${
    encrypted ? '.encrypted' : ''
  }.json`;

export const createBackupPayload = ({
  productName,
  backupAt,
  backupRecord,
  nextBackupRecords,
  autoBackupSettings,
  groups,
  accounts,
  history
}: BackupPayloadOptions) => ({
  app: productName,
  schemaVersion: 1,
  exportedAt: backupAt,
  lastBackupAt: backupAt,
  lastBackupHistoryCount: backupRecord.historyCount,
  backupRecords: nextBackupRecords,
  autoBackupSettings,
  groups,
  accounts,
  history
});

export const createBackupFileContent = async (
  backupPayload: unknown,
  snapshotPassword: string | null
) => {
  if (!snapshotPassword) {
    return createJsonPayloadExportText(backupPayload);
  }

  const encryptedSnapshot = await encryptSnapshotPayload(backupPayload, snapshotPassword);

  return createEncryptedJsonExportText(encryptedSnapshot);
};
