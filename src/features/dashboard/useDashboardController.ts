import { useMemo } from 'react';

import type { AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import type { HomeAssetStatSettings } from '../../homeAssetStats';
import {
  decorateAssetOverviewGroups,
  deriveAssetOverviewGroupTotals
} from '../overview/assetOverviewLogic';
import {
  deriveDashboardStats,
  filterHistoryForExistingDashboardAccounts,
  deriveHomeAssetStatDisplay,
  deriveRecentNetWorthChange
} from './dashboardStatsLogic';

export type DashboardControllerOptions = {
  groups: AssetGroupWithAccounts[];
  history: HistoryRecord[];
  homeAssetStatSettings: HomeAssetStatSettings;
};

export const useDashboardController = ({
  groups,
  history,
  homeAssetStatSettings
}: DashboardControllerOptions) => {
  const accountGroupTotals = useMemo(
    () => deriveAssetOverviewGroupTotals(groups),
    [groups]
  );
  const dashboardStats = useMemo(
    () => deriveDashboardStats(accountGroupTotals),
    [accountGroupTotals]
  );
  const accountGroups = useMemo(
    () => decorateAssetOverviewGroups(accountGroupTotals, dashboardStats.totalAssets),
    [accountGroupTotals, dashboardStats.totalAssets]
  );
  const homeAssetStat = useMemo(
    () => deriveHomeAssetStatDisplay(dashboardStats, homeAssetStatSettings),
    [dashboardStats, homeAssetStatSettings]
  );
  const existingAccountHistory = useMemo(
    () => filterHistoryForExistingDashboardAccounts(groups, history),
    [groups, history]
  );
  const recentNetWorthChange = useMemo(
    () => deriveRecentNetWorthChange(existingAccountHistory),
    [existingAccountHistory]
  );
  const accountCount = useMemo(
    () => groups.reduce((count, group) => count + group.accounts.length, 0),
    [groups]
  );

  return {
    accountGroups,
    dashboardStats,
    homeAssetStat,
    recentNetWorthChange,
    accountCount
  };
};
