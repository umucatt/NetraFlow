import { getAccountDisplayMark } from '../accountMark';
import { formatHistoryRecordDate } from '../app/dateUtils';
import { roundToMoneyPrecision } from '../money';
import type {
  AccountTypeNature,
  BackupMethod,
  CreateSearchIndexOptions,
  HistoryType,
  SettingsSearchItem
} from './searchTypes';

export type SearchIndexConfig = {
  locale: string;
  currency: string;
  accountNatureLabels: Record<AccountTypeNature, string>;
  historyTypeLabels: Record<HistoryType, string>;
  backupMethodLabels: Record<BackupMethod, string>;
};

const isStringRecord = (value: unknown, keys: readonly string[]) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return keys.every((key) => typeof record[key] === 'string');
};

export const isSearchIndexConfig = (value: unknown): value is SearchIndexConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const config = value as Record<string, unknown>;

  return (
    typeof config.locale === 'string' &&
    config.locale.length > 0 &&
    typeof config.currency === 'string' &&
    config.currency.length > 0 &&
    isStringRecord(config.accountNatureLabels, ['asset', 'receivable', 'liability']) &&
    isStringRecord(config.historyTypeLabels, ['创建', '删除', '修改', '归档', '重新启用']) &&
    isStringRecord(config.backupMethodLabels, ['manual', 'auto'])
  );
};

const getValidTimestamp = (value: string) => {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
};

const formatPreciseBackupTime = (time: string) => {
  const timestamp = getValidTimestamp(time);

  if (timestamp === null) {
    return '时间未知';
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

export const createSearchIndexOptionsFromConfig = (
  config: SearchIndexConfig,
  settingsItems: SettingsSearchItem[]
): CreateSearchIndexOptions => {
  const moneyFormatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    maximumFractionDigits: 2
  });

  return {
    getAccountNatureLabel: (nature) => config.accountNatureLabels[nature],
    getHistoryTypeLabel: (type) => config.historyTypeLabels[type],
    getBackupMethodLabel: (method) => config.backupMethodLabels[method],
    getAccountMark: getAccountDisplayMark,
    getHistoryChangeLabel: (record) =>
      String((record.afterAmount ?? 0) - (record.beforeAmount ?? 0)),
    formatMoney: (amount) =>
      amount === null || !Number.isFinite(amount)
        ? '-'
        : moneyFormatter.format(roundToMoneyPrecision(amount)),
    formatShortTime: formatHistoryRecordDate,
    formatPreciseBackupTime,
    settingsItems
  };
};
