import { getHistoryDateKey, getHistoryTimestamp, getRelativeDateLabel } from '../../app/dateUtils';
import { isPositiveNature } from '../../app/accountNature';
import type { AccountTypeNature, AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import {
  resolveHomeAssetStatLabel,
  resolveHomeAssetStatValue,
  type HomeAssetStatSettings
} from '../../homeAssetStats';

export type DashboardStatsGroup = {
  includeInStats: boolean;
  nature: AccountTypeNature;
  total: number;
};

export type DashboardStats = {
  netWorth: number;
  totalAssets: number;
};

export type HomeAssetStatDisplay = {
  label: string;
  value: number;
  compact: boolean;
};

export type RecentNetWorthChange = {
  date: string;
  amount: number;
  relativeLabel: string;
} | null;

export const getDashboardStatAmount = (nature: AccountTypeNature, amount: number) =>
  nature === 'liability' ? -Math.abs(amount) : Math.abs(amount);

export const deriveDashboardStats = (groups: DashboardStatsGroup[]): DashboardStats => {
  const positiveStatsTotal = groups.reduce(
    (sum, group) =>
      group.includeInStats && isPositiveNature(group.nature)
        ? sum + Math.abs(group.total)
        : sum,
    0
  );
  const netWorth = groups.reduce(
    (sum, group) =>
      group.includeInStats ? sum + getDashboardStatAmount(group.nature, group.total) : sum,
    0
  );

  return {
    netWorth,
    totalAssets: positiveStatsTotal
  };
};

export const deriveHomeAssetStatDisplay = (
  stats: DashboardStats,
  settings: HomeAssetStatSettings
): HomeAssetStatDisplay => ({
  label: resolveHomeAssetStatLabel(settings.homeAssetStatMetric, settings.homeAssetStatLabelMode),
  value: resolveHomeAssetStatValue(settings.homeAssetStatMetric, stats),
  compact: settings.homeAssetStatCompact
});

export const filterHistoryForExistingDashboardAccounts = (
  groups: AssetGroupWithAccounts[],
  history: HistoryRecord[]
) => {
  const accountIds = new Set(
    groups.flatMap((group) => group.accounts.map((account) => account.id))
  );

  return history.filter((record) => accountIds.has(record.accountId));
};

const getHistoryNetWorthDelta = (record: HistoryRecord) =>
  (record.afterAmount ?? 0) - (record.beforeAmount ?? 0);

export const deriveRecentNetWorthChange = (
  history: HistoryRecord[]
): RecentNetWorthChange => {
  const validRecords = history
    .map((record) => ({
      record,
      timestamp: getHistoryTimestamp(record),
      date: getHistoryDateKey(record.time)
    }))
    .filter((entry): entry is { record: HistoryRecord; timestamp: number; date: string } =>
      entry.timestamp > 0 && Boolean(entry.date)
    );

  if (validRecords.length === 0) {
    return null;
  }

  const latestDate = validRecords.reduce((latest, entry) =>
    entry.timestamp > latest.timestamp ? entry : latest
  ).date;
  const amount = validRecords
    .filter((entry) => entry.date === latestDate)
    .reduce((sum, entry) => sum + getHistoryNetWorthDelta(entry.record), 0);

  return {
    date: latestDate,
    amount,
    relativeLabel: getRelativeDateLabel(latestDate)
  };
};
