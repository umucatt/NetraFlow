import { useMemo } from 'react';

import type { Account, AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import type { ChartColorAssignmentMode } from '../../chartLogic';
import {
  deriveSelectedAccountChartData,
  deriveSelectedGroupChartData,
  deriveTotalChartData,
  type AssetChartSettings
} from './chartDataLogic';

export type ChartDataControllerOptions = {
  groups: AssetGroupWithAccounts[];
  history: HistoryRecord[];
  assetChartSettings: AssetChartSettings;
  colorAssignmentMode: ChartColorAssignmentMode;
  selectedGroupDetail?: AssetGroupWithAccounts;
  selectedAccountEntry?: Account;
};

export const useChartDataController = ({
  groups,
  history,
  assetChartSettings,
  colorAssignmentMode,
  selectedGroupDetail,
  selectedAccountEntry
}: ChartDataControllerOptions) => {
  const totalChartData = useMemo(
    () =>
      deriveTotalChartData({
        groups,
        history,
        settings: assetChartSettings,
        colorAssignmentMode
      }),
    [groups, history, assetChartSettings, colorAssignmentMode]
  );
  const selectedGroupChartData = useMemo(
    () =>
      deriveSelectedGroupChartData({
        group: selectedGroupDetail,
        history,
        settings: assetChartSettings,
        colorAssignmentMode
      }),
    [selectedGroupDetail, history, assetChartSettings, colorAssignmentMode]
  );
  const selectedAccountChartData = useMemo(
    () =>
      deriveSelectedAccountChartData({
        account: selectedAccountEntry,
        history,
        settings: assetChartSettings
      }),
    [selectedAccountEntry, history, assetChartSettings]
  );

  return {
    assetStructureData: totalChartData.structureData,
    homeGroupLegendColorByName: totalChartData.legendColorByName,
    assetTrendPoints: totalChartData.trendPoints,
    homeThumbnailTrendPoints: totalChartData.homeThumbnailTrendPoints,
    homeThumbnailTrendSettings: totalChartData.homeThumbnailTrendSettings,
    shouldShowL0Charts: totalChartData.shouldShowHomeCharts,
    selectedGroupDetailChartSettings: selectedGroupChartData.settings,
    selectedGroupDetailStructureData: selectedGroupChartData.structureData,
    selectedGroupDetailTrendData: selectedGroupChartData.trendData,
    selectedAccountChartSettings: selectedAccountChartData.settings,
    selectedAccountTrendPoints: selectedAccountChartData.trendPoints,
    selectedAccountPreviewTrendSettings: selectedAccountChartData.previewTrendSettings
  };
};
