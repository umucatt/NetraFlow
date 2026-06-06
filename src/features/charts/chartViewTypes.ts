import type { AssetStructureChartData } from './assetStructureData';
import type {
  AssetChartSettings,
  CategoryChartVisibility,
  CategoryDetailChartSettings
} from './chartDataLogic';
import type { TrendChartPoint } from './assetTrendData';
import type { GroupDetailStructureData } from './groupDetailStructureData';
import type { GroupDetailTrendData } from './groupDetailTrendData';

export type ChartMoneyFormatter = (
  amount: number | null,
  maximumFractionDigits?: number
) => string;

export type ChartPercentFormatter = (numerator: number, denominator: number) => string;

export type TotalAssetChartViewData = {
  totalAssets: number;
  structureData: AssetStructureChartData;
  trendPoints: TrendChartPoint[];
  settings: AssetChartSettings;
};

export type GroupDetailChartViewData = {
  groupName: string;
  structureData: GroupDetailStructureData;
  trendData: GroupDetailTrendData;
  settings: CategoryDetailChartSettings;
  visibility: CategoryChartVisibility;
};
