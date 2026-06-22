import { getValidTimestamp } from '../dateUtils';
import type {
  Account,
  AccountTypeNature,
  AssetGroup,
  BackupMethod,
  HistoryRecord
} from '../types';
import { isPasswordHash } from '../../security/passwordHash';
import {
  normalizeSettingsDocument,
  normalizeRollupImportHashes,
  normalizeStateDocument,
  normalizeSecurityDocument
} from './persistenceDefaults';
import { normalizeAssetChartSettings } from '../../features/charts/assetChartSettingsLogic';
import { normalizeAutoBackupSettings } from '../../features/backup/snapshotBackupLogic';
import {
  CORE_DOCUMENT_KEYS,
  EXCLUDED_PERSISTENCE_FIELDS,
  PERSISTENCE_SCHEMA_VERSION,
  SECURITY_DOCUMENT_KEYS,
  SETTINGS_DOCUMENT_KEYS,
  STATE_DOCUMENT_KEYS,
  type CoreDocument,
  type SecurityDocument,
  type SettingsDocument,
  type StateDocument
} from './persistenceDocuments';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const allowedKeys = new Set(keys);

  return Object.keys(value).every((key) => allowedKeys.has(key)) &&
    keys.every((key) => hasOwn(value, key));
};

const hasNoExcludedFields = (value: Record<string, unknown>) =>
  EXCLUDED_PERSISTENCE_FIELDS.every((field) => !hasOwn(value, field));

const isOptionalString = (value: unknown) => value === undefined || typeof value === 'string';

const isOptionalBoolean = (value: unknown) =>
  value === undefined || typeof value === 'boolean';

const isFiniteNumberOrNull = (value: unknown) =>
  value === null || (typeof value === 'number' && Number.isFinite(value));

const isValidTime = (value: unknown) =>
  typeof value === 'string' && getValidTimestamp(value) !== null;

const isOptionalValidTime = (value: unknown) =>
  value === undefined || isValidTime(value);

const isAccountTypeNature = (value: unknown): value is AccountTypeNature =>
  value === 'asset' || value === 'receivable' || value === 'liability';

const isBackupMethod = (value: unknown): value is BackupMethod =>
  value === 'manual' || value === 'auto';

const isCoreGroup = (value: unknown): value is AssetGroup => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isAccountTypeNature(value.nature) &&
    typeof value.includeInStats === 'boolean' &&
    typeof value.sortOrder === 'number' &&
    Number.isFinite(value.sortOrder)
  );
};

const isCoreAccount = (value: unknown): value is Account => {
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

const isHistorySource = (value: unknown) =>
  value === undefined || value === 'flash-note' || value === 'rollup';

const isCoreHistoryRecord = (value: unknown): value is HistoryRecord => {
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
    isHistorySource(value.source)
  );
};

export const isCoreDocument = (value: unknown): value is CoreDocument => {
  if (!isRecord(value) || !hasOnlyKeys(value, CORE_DOCUMENT_KEYS)) {
    return false;
  }

  return (
    value.schemaVersion === PERSISTENCE_SCHEMA_VERSION &&
    Array.isArray(value.groups) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.history) &&
    value.groups.every(isCoreGroup) &&
    value.accounts.every(isCoreAccount) &&
    value.history.every(isCoreHistoryRecord)
  );
};

const matchesNormalized = <T>(value: T, normalize: (value: unknown) => T) =>
  JSON.stringify(value) === JSON.stringify(normalize(value));

const isBackupRecord = (value: unknown) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    isValidTime(value.backedUpAt) &&
    typeof value.historyCount === 'number' &&
    Number.isInteger(value.historyCount) &&
    value.historyCount >= 0 &&
    typeof value.incrementCount === 'number' &&
    Number.isInteger(value.incrementCount) &&
    value.incrementCount >= 0 &&
    isBackupMethod(value.method)
  );
};

const isSnapshotImportRecord = (value: unknown) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    isValidTime(value.importedAt) &&
    (value.snapshotCreatedAt === null || isValidTime(value.snapshotCreatedAt)) &&
    typeof value.historyRecordCount === 'number' &&
    Number.isInteger(value.historyRecordCount) &&
    value.historyRecordCount >= 0 &&
    typeof value.changedHistoryRecordCount === 'number' &&
    Number.isInteger(value.changedHistoryRecordCount) &&
    value.changedHistoryRecordCount >= 0
  );
};

export const isSettingsDocument = (value: unknown): value is SettingsDocument => {
  if (!isRecord(value) || !hasOnlyKeys(value, SETTINGS_DOCUMENT_KEYS) || !hasNoExcludedFields(value)) {
    return false;
  }

  const rawGlobal = isRecord(value.global) ? value.global : null;

  return (
    value.schemaVersion === PERSISTENCE_SCHEMA_VERSION &&
    matchesNormalized(value.autoBackup, normalizeAutoBackupSettings) &&
    matchesNormalized(value.assetChart, normalizeAssetChartSettings) &&
    rawGlobal !== null &&
    !hasOwn(rawGlobal, 'passwordProtectionEnabled') &&
    !hasOwn(rawGlobal, 'passwordHash') &&
    !hasOwn(rawGlobal, 'autoLockMinutes') &&
    !hasOwn(rawGlobal, 'snapshotEncryptionEnabled') &&
    !hasOwn(rawGlobal, 'snapshotPasswordHash') &&
    !hasOwn(rawGlobal, 'nyaaThemeUnlocked') &&
    !hasOwn(rawGlobal, 'firstWelcome') &&
    matchesNormalized(value, normalizeSettingsDocument)
  );
};

export const isStateDocument = (value: unknown): value is StateDocument => {
  if (!isRecord(value) || !hasOnlyKeys(value, STATE_DOCUMENT_KEYS) || !hasNoExcludedFields(value)) {
    return false;
  }

  const backup = isRecord(value.backup) ? value.backup : null;

  return (
    value.schemaVersion === PERSISTENCE_SCHEMA_VERSION &&
    backup !== null &&
    (backup.lastBackupAt === undefined || isValidTime(backup.lastBackupAt)) &&
    (backup.lastBackupHistoryCount === undefined ||
      (typeof backup.lastBackupHistoryCount === 'number' &&
        Number.isInteger(backup.lastBackupHistoryCount) &&
        backup.lastBackupHistoryCount >= 0)) &&
    Array.isArray(backup.records) &&
    backup.records.every(isBackupRecord) &&
    Array.isArray(backup.importRecords) &&
    backup.importRecords.every(isSnapshotImportRecord) &&
    (backup.forceAutoBackupDueOnce === undefined || backup.forceAutoBackupDueOnce === true) &&
    Array.isArray(value.rollupImportHashes) &&
    value.rollupImportHashes.every((item) => typeof item === 'string') &&
    value.rollupImportHashes.length <= 80 &&
    matchesNormalized(value.rollupImportHashes, normalizeRollupImportHashes) &&
    isRecord(value.firstWelcome) &&
    isOptionalBoolean(value.firstWelcome.completed) &&
    isOptionalBoolean(value.firstWelcome.pendingAfterClearAll) &&
    isRecord(value.personalization) &&
    isOptionalBoolean(value.personalization.nyaaThemeUnlocked) &&
    !hasOwn(value, 'groups') &&
    !hasOwn(value, 'accounts') &&
    !hasOwn(value, 'history') &&
    !hasOwn(value, 'passwordHash')
  );
};

export const isSecurityDocument = (value: unknown): value is SecurityDocument => {
  if (!isRecord(value) || !hasOnlyKeys(value, SECURITY_DOCUMENT_KEYS) || !hasNoExcludedFields(value)) {
    return false;
  }

  const appAccess = isRecord(value.appAccess) ? value.appAccess : null;
  const snapshotEncryption = isRecord(value.snapshotEncryption)
    ? value.snapshotEncryption
    : null;

  return (
    value.schemaVersion === PERSISTENCE_SCHEMA_VERSION &&
    appAccess !== null &&
    typeof appAccess.enabled === 'boolean' &&
    typeof appAccess.autoLockMinutes === 'number' &&
    Number.isInteger(appAccess.autoLockMinutes) &&
    appAccess.autoLockMinutes >= 1 &&
    (appAccess.passwordHash === null || isPasswordHash(appAccess.passwordHash)) &&
    (!appAccess.enabled || appAccess.passwordHash !== null) &&
    snapshotEncryption !== null &&
    typeof snapshotEncryption.enabled === 'boolean' &&
    (snapshotEncryption.passwordHash === null ||
      isPasswordHash(snapshotEncryption.passwordHash)) &&
    (!snapshotEncryption.enabled || snapshotEncryption.passwordHash !== null) &&
    !hasOwn(value, 'themeMode') &&
    !hasOwn(value, 'assetChart') &&
    matchesNormalized(value, normalizeSecurityDocument)
  );
};

export const isExcludedPersistenceField = (fieldName: string) =>
  (EXCLUDED_PERSISTENCE_FIELDS as readonly string[]).includes(fieldName);
