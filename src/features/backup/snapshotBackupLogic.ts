import {
  AUTO_BACKUP_SETTINGS_STORAGE_KEY,
  BACKUP_RECORDS_STORAGE_KEY,
  LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY,
  LAST_BACKUP_STORAGE_KEY
} from '../../app/storageKeys';
import { nfStorage } from '../../app/nfStorage';
import { getValidTimestamp } from '../../app/dateUtils';
import type {
  Account,
  AssetGroup,
  AutoBackupSettings,
  BackupCycle,
  BackupCycleUnit,
  BackupMethod,
  BackupRecord,
  HistoryRecord
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

export const getBackupCycleDays = (cycle: BackupCycle) => {
  const unitMultiplier = cycle.unit === 'month' ? 30 : cycle.unit === 'week' ? 7 : 1;

  return Math.max(1, Math.floor(cycle.value)) * unitMultiplier;
};

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
