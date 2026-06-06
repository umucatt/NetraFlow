import type { Account, AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import {
  getEffectiveAccountChartSettings,
  getEffectiveCategoryChartSettings,
  type BasicAccountChartSettings,
  type BasicCategoryChartSettings,
  type ChartColorAssignmentMode,
  type ChartPointValueMode,
  type ChartXAxisRange,
  type GlobalChartControlMode
} from '../../chartLogic';
import { deriveAccountTrendPoints } from './accountTrendData';
import {
  deriveAssetStructureData,
  type AssetStructureChartData
} from './assetStructureData';
import {
  deriveAssetTrendPoints,
  type TrendChartPoint
} from './assetTrendData';
import type { StructureAssetDisplay } from './AssetAllocationPanel';
import type { TrendAssetDisplay } from './AssetTrendPanel';
import {
  deriveGroupDetailStructureData,
  type GroupDetailStructureData
} from './groupDetailStructureData';
import {
  deriveGroupDetailTrendData,
  type GroupDetailTrendData
} from './groupDetailTrendData';

export type TrendXAxisRange = ChartXAxisRange;
export type TrendPointValueMode = ChartPointValueMode;

export type HomeThumbnailChartSettings = {
  showStructure: boolean;
  showTrend: boolean;
  xAxisRange: TrendXAxisRange;
};

export type CategoryChartVisibility = {
  showStructure: boolean;
  showTrend: boolean;
};

export type CategoryDetailChartSettings = BasicCategoryChartSettings & {
  xAxisRange: TrendXAxisRange;
  pointValueMode: TrendPointValueMode;
};

export type AccountDetailChartSettings = BasicAccountChartSettings & {
  adaptiveYAxis: boolean;
  xAxisRange: TrendXAxisRange;
  pointValueMode: TrendPointValueMode;
};

export type AssetChartSettings = {
  l0: HomeThumbnailChartSettings;
  globalChartControlMode: GlobalChartControlMode;
  structure: {
    assetDisplay: StructureAssetDisplay;
    showDebtMultiple: boolean;
  };
  trend: {
    assetDisplay: TrendAssetDisplay;
    adaptiveYAxis: boolean;
    xAxisRange: TrendXAxisRange;
    pointValueMode: TrendPointValueMode;
  };
  categoryVisibility: CategoryChartVisibility;
  globalCategoryDetail: CategoryDetailChartSettings;
  categoryDetailById: Record<string, CategoryDetailChartSettings>;
  accountDetailById: Record<string, AccountDetailChartSettings>;
};

export type SelectedGroupChartData = {
  settings: CategoryDetailChartSettings;
  structureData: GroupDetailStructureData | null;
  trendData: GroupDetailTrendData | null;
};

export type SelectedAccountChartData = {
  settings: AccountDetailChartSettings;
  trendPoints: TrendChartPoint[];
  previewTrendSettings: AssetChartSettings['trend'];
};

export const getGlobalAccountDetailChartSettings = (
  trendSettings: AssetChartSettings['trend']
): AccountDetailChartSettings => ({
  adaptiveYAxis: trendSettings.adaptiveYAxis,
  xAxisRange: trendSettings.xAxisRange,
  pointValueMode: trendSettings.pointValueMode
});

export const getAccountPreviewTrendSettings = (
  settings: AccountDetailChartSettings
): AssetChartSettings['trend'] => ({
  assetDisplay: 'net',
  adaptiveYAxis: settings.adaptiveYAxis,
  xAxisRange: settings.xAxisRange,
  pointValueMode: settings.pointValueMode
});

export const shouldShowHomeCharts = (settings: AssetChartSettings) =>
  settings.l0.showStructure || settings.l0.showTrend;

export const getHomeThumbnailTrendSettings = (
  settings: AssetChartSettings
): AssetChartSettings['trend'] => ({
  ...settings.trend,
  xAxisRange: settings.l0.xAxisRange
});

export const deriveChartLegendColorByName = (data: AssetStructureChartData) => {
  const colorByName = new Map<string, string>();

  [...data.positiveSegments, ...data.negativeSegments].forEach((segment) => {
    (segment.sourceIds ?? [segment.label]).forEach((sourceId) =>
      colorByName.set(sourceId, segment.color)
    );
  });

  return colorByName;
};

export const deriveSelectedGroupChartSettings = (
  settings: AssetChartSettings,
  group: AssetGroupWithAccounts | undefined
) =>
  group
    ? getEffectiveCategoryChartSettings(
        settings.globalChartControlMode,
        settings.globalCategoryDetail,
        settings.categoryDetailById,
        group.id
      )
    : settings.globalCategoryDetail;

export const deriveSelectedGroupChartData = ({
  group,
  history,
  settings,
  colorAssignmentMode
}: {
  group: AssetGroupWithAccounts | undefined;
  history: HistoryRecord[];
  settings: AssetChartSettings;
  colorAssignmentMode: ChartColorAssignmentMode;
}): SelectedGroupChartData => {
  const groupSettings = deriveSelectedGroupChartSettings(settings, group);

  return {
    settings: groupSettings,
    structureData: group
      ? deriveGroupDetailStructureData(group, history, colorAssignmentMode)
      : null,
    trendData: group
      ? deriveGroupDetailTrendData(group, history, groupSettings, colorAssignmentMode)
      : null
  };
};

export const deriveSelectedAccountChartSettings = (
  settings: AssetChartSettings,
  account: Account | undefined
) => {
  const globalAccountDetail = getGlobalAccountDetailChartSettings(settings.trend);

  return account
    ? getEffectiveAccountChartSettings(
        settings.globalChartControlMode,
        globalAccountDetail,
        settings.accountDetailById,
        account.id
      )
    : globalAccountDetail;
};

export const deriveSelectedAccountChartData = ({
  account,
  history,
  settings
}: {
  account: Account | undefined;
  history: HistoryRecord[];
  settings: AssetChartSettings;
}): SelectedAccountChartData => {
  const accountSettings = deriveSelectedAccountChartSettings(settings, account);

  return {
    settings: accountSettings,
    trendPoints: account ? deriveAccountTrendPoints(account, history, accountSettings) : [],
    previewTrendSettings: getAccountPreviewTrendSettings(accountSettings)
  };
};

export const deriveTotalChartData = ({
  groups,
  history,
  settings,
  colorAssignmentMode
}: {
  groups: AssetGroupWithAccounts[];
  history: HistoryRecord[];
  settings: AssetChartSettings;
  colorAssignmentMode: ChartColorAssignmentMode;
}) => {
  const structureData = deriveAssetStructureData(groups, history, colorAssignmentMode);
  const trendPoints = deriveAssetTrendPoints(groups, history, settings.trend);
  const homeThumbnailTrendSettings = getHomeThumbnailTrendSettings(settings);

  return {
    structureData,
    trendPoints,
    homeThumbnailTrendPoints: deriveAssetTrendPoints(
      groups,
      history,
      homeThumbnailTrendSettings
    ),
    homeThumbnailTrendSettings,
    legendColorByName: deriveChartLegendColorByName(structureData),
    shouldShowHomeCharts: shouldShowHomeCharts(settings)
  };
};
