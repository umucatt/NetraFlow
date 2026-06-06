import { isPositiveNature, toStoredAmountByNature } from '../../app/accountNature';
import type { Account, AssetGroupWithAccounts } from '../../app/types';

export type AssetOverviewGroupBase = AssetGroupWithAccounts & {
  activeAccounts: Account[];
  total: number;
};

export type AssetOverviewAccount = Account & {
  percentageLabel: string;
};

export type AssetOverviewGroup = Omit<AssetOverviewGroupBase, 'activeAccounts'> & {
  activeAccounts: AssetOverviewAccount[];
  percentageLabel: string;
  percentageColor: string;
  isEmpty: boolean;
};

export const EXCLUDED_STATS_LABEL = '未计入';

export const formatOverviewPercentage = (amount: number, denominator: number) => {
  if (denominator === 0) {
    return '0%';
  }

  return `${((Math.abs(amount) / Math.abs(denominator)) * 100).toFixed(1)}%`;
};

export const getOverviewPercentageColor = (
  nature: AssetGroupWithAccounts['nature'],
  includeInStats: boolean
) => {
  if (!includeInStats) {
    return 'var(--text-muted)';
  }

  return nature === 'liability' ? '#15803d' : '#9a6b2f';
};

export const deriveAssetOverviewGroupTotals = (
  groups: AssetGroupWithAccounts[]
): AssetOverviewGroupBase[] =>
  groups.map((group) => {
    const activeAccounts = group.accounts.filter((account) => !account.archived);
    const total = toStoredAmountByNature(
      group.nature,
      activeAccounts.reduce((sum, account) => sum + account.amount, 0)
    );

    return {
      ...group,
      activeAccounts,
      total
    };
  });

export const decorateAssetOverviewGroups = (
  groups: AssetOverviewGroupBase[],
  positiveStatsTotal: number
): AssetOverviewGroup[] =>
  groups.map((group) => {
    const percentageColor = getOverviewPercentageColor(group.nature, group.includeInStats);
    const percentageLabel = group.includeInStats
      ? formatOverviewPercentage(group.total, positiveStatsTotal)
      : EXCLUDED_STATS_LABEL;

    return {
      ...group,
      activeAccounts: group.activeAccounts.map((account) => ({
        ...account,
        percentageLabel: group.includeInStats
          ? formatOverviewPercentage(account.amount, group.total)
          : EXCLUDED_STATS_LABEL
      })),
      percentageLabel,
      percentageColor,
      isEmpty: group.activeAccounts.length === 0
    };
  });

export const deriveAssetOverviewGroups = (
  groups: AssetGroupWithAccounts[],
  positiveStatsTotal: number
) => decorateAssetOverviewGroups(deriveAssetOverviewGroupTotals(groups), positiveStatsTotal);

export const getPositiveStatsBaseTotal = (groups: AssetOverviewGroupBase[]) =>
  groups.reduce(
    (sum, group) =>
      group.includeInStats && isPositiveNature(group.nature)
        ? sum + Math.abs(group.total)
        : sum,
    0
  );
