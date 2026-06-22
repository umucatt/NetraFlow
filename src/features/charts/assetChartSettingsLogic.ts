import {
  isChartXAxisRange,
  normalizeChartPointValueMode,
  normalizeGlobalChartControlMode
} from '../../chartLogic';
import { isPlainObject } from '../../app/objectUtils';
import type {
  AccountDetailChartSettings,
  AssetChartSettings,
  CategoryDetailChartSettings
} from './chartDataLogic';
import type { StructureAssetDisplay } from './AssetAllocationPanel';
import type { TrendAssetDisplay } from './AssetTrendPanel';

export const DEFAULT_ASSET_CHART_SETTINGS: AssetChartSettings = {
  l0: {
    showStructure: true,
    showTrend: true,
    xAxisRange: '6m'
  },
  globalChartControlMode: 'peer',
  structure: {
    assetDisplay: 'both',
    showDebtMultiple: true
  },
  trend: {
    assetDisplay: 'net',
    adaptiveYAxis: true,
    xAxisRange: '6m',
    pointValueMode: 'adaptive'
  },
  categoryVisibility: {
    showStructure: true,
    showTrend: true
  },
  globalCategoryDetail: {
    xAxisRange: '6m',
    pointValueMode: 'adaptive'
  },
  categoryDetailById: {},
  accountDetailById: {}
};

const isStructureAssetDisplay = (value: unknown): value is StructureAssetDisplay =>
  value === 'positive' || value === 'negative' || value === 'both';

const isTrendAssetDisplay = (value: unknown): value is TrendAssetDisplay =>
  value === 'net' || value === 'positive' || value === 'positive-negative';

const isTrendXAxisRange = isChartXAxisRange;

export const normalizeCategoryDetailChartSettings = (
  value: unknown,
  fallback: CategoryDetailChartSettings = DEFAULT_ASSET_CHART_SETTINGS.globalCategoryDetail
): CategoryDetailChartSettings => {
  const rawSettings = isPlainObject(value) ? value : {};

  return {
    xAxisRange: isTrendXAxisRange(rawSettings.xAxisRange)
      ? rawSettings.xAxisRange
      : fallback.xAxisRange,
    pointValueMode: normalizeChartPointValueMode(
      rawSettings.pointValueMode,
      fallback.pointValueMode
    )
  };
};

export const normalizeAccountDetailChartSettings = (
  value: unknown,
  fallback: AccountDetailChartSettings
): AccountDetailChartSettings => {
  const rawSettings = isPlainObject(value) ? value : {};

  return {
    adaptiveYAxis:
      typeof rawSettings.adaptiveYAxis === 'boolean'
        ? rawSettings.adaptiveYAxis
        : fallback.adaptiveYAxis,
    xAxisRange: isTrendXAxisRange(rawSettings.xAxisRange)
      ? rawSettings.xAxisRange
      : fallback.xAxisRange,
    pointValueMode: normalizeChartPointValueMode(
      rawSettings.pointValueMode,
      fallback.pointValueMode
    )
  };
};

export const normalizeAssetChartSettings = (value: unknown): AssetChartSettings => {
  if (!isPlainObject(value)) {
    return DEFAULT_ASSET_CHART_SETTINGS;
  }

  const rawTotalAsset = isPlainObject(value.totalAsset) ? value.totalAsset : {};
  const rawL0 = isPlainObject(value.homeThumbnail)
    ? value.homeThumbnail
    : isPlainObject(value.l0)
      ? value.l0
      : {};
  const rawStructure = isPlainObject(rawTotalAsset.structure)
    ? rawTotalAsset.structure
    : isPlainObject(value.structure)
      ? value.structure
      : {};
  const rawTrend = isPlainObject(rawTotalAsset.trend)
    ? rawTotalAsset.trend
    : isPlainObject(value.trend)
      ? value.trend
      : {};
  const rawCategoryVisibility = isPlainObject(value.categoryVisibility)
    ? value.categoryVisibility
    : isPlainObject(value.categoryDetail)
      ? value.categoryDetail
      : {};
  const rawGlobalCategoryDetail = isPlainObject(value.globalCategoryDetail)
    ? value.globalCategoryDetail
    : isPlainObject(value.globalCategoryChartSettings)
      ? value.globalCategoryChartSettings
      : isPlainObject(value.categoryDetail)
        ? value.categoryDetail
        : {};
  const rawCategoryDetailById = isPlainObject(value.categoryDetailById)
    ? value.categoryDetailById
    : isPlainObject(value.categoryChartSettingsById)
      ? value.categoryChartSettingsById
      : {};
  const rawAccountDetailById = isPlainObject(value.accountDetailById)
    ? value.accountDetailById
    : isPlainObject(value.accountChartSettingsById)
      ? value.accountChartSettingsById
      : {};
  const legacyLocked =
    value.locked === true ||
    value.globalChartLocked === true ||
    value.globalChartControlLocked === true;
  const rawControlMode = isPlainObject(value.globalChartControl)
    ? value.globalChartControl.mode
    : value.globalChartControlMode;
  const globalChartControlMode = legacyLocked
    ? 'locked'
    : normalizeGlobalChartControlMode(
        rawControlMode,
        DEFAULT_ASSET_CHART_SETTINGS.globalChartControlMode
      );
  const globalCategoryDetail = normalizeCategoryDetailChartSettings(
    rawGlobalCategoryDetail,
    DEFAULT_ASSET_CHART_SETTINGS.globalCategoryDetail
  );
  const categoryDetailById = Object.fromEntries(
    Object.entries(rawCategoryDetailById).map(([categoryId, settings]) => [
      categoryId,
      normalizeCategoryDetailChartSettings(settings, globalCategoryDetail)
    ])
  );
  const trend = {
    assetDisplay: isTrendAssetDisplay(rawTrend.assetDisplay)
      ? rawTrend.assetDisplay
      : DEFAULT_ASSET_CHART_SETTINGS.trend.assetDisplay,
    adaptiveYAxis:
      typeof rawTrend.adaptiveYAxis === 'boolean'
        ? rawTrend.adaptiveYAxis
        : DEFAULT_ASSET_CHART_SETTINGS.trend.adaptiveYAxis,
    xAxisRange: isTrendXAxisRange(rawTrend.xAxisRange)
      ? rawTrend.xAxisRange
      : DEFAULT_ASSET_CHART_SETTINGS.trend.xAxisRange,
    pointValueMode: normalizeChartPointValueMode(
      rawTrend.pointValueMode,
      DEFAULT_ASSET_CHART_SETTINGS.trend.pointValueMode
    )
  };
  const globalAccountDetail = {
    adaptiveYAxis: trend.adaptiveYAxis,
    xAxisRange: trend.xAxisRange,
    pointValueMode: trend.pointValueMode
  };
  const accountDetailById = Object.fromEntries(
    Object.entries(rawAccountDetailById).map(([accountId, settings]) => [
      accountId,
      normalizeAccountDetailChartSettings(settings, globalAccountDetail)
    ])
  );

  return {
    l0: {
      showStructure:
        typeof rawL0.showStructure === 'boolean'
          ? rawL0.showStructure
          : DEFAULT_ASSET_CHART_SETTINGS.l0.showStructure,
      showTrend:
        typeof rawL0.showTrend === 'boolean'
          ? rawL0.showTrend
          : DEFAULT_ASSET_CHART_SETTINGS.l0.showTrend,
      xAxisRange: isTrendXAxisRange(rawL0.xAxisRange)
        ? rawL0.xAxisRange
        : isTrendXAxisRange(rawTrend.xAxisRange)
          ? rawTrend.xAxisRange
          : DEFAULT_ASSET_CHART_SETTINGS.l0.xAxisRange
    },
    globalChartControlMode,
    structure: {
      assetDisplay: isStructureAssetDisplay(rawStructure.assetDisplay)
        ? rawStructure.assetDisplay
        : DEFAULT_ASSET_CHART_SETTINGS.structure.assetDisplay,
      showDebtMultiple:
        typeof rawStructure.showDebtMultiple === 'boolean'
          ? rawStructure.showDebtMultiple
          : DEFAULT_ASSET_CHART_SETTINGS.structure.showDebtMultiple
    },
    trend,
    categoryVisibility: {
      showStructure:
        typeof rawCategoryVisibility.showStructure === 'boolean'
          ? rawCategoryVisibility.showStructure
          : DEFAULT_ASSET_CHART_SETTINGS.categoryVisibility.showStructure,
      showTrend:
        typeof rawCategoryVisibility.showTrend === 'boolean'
          ? rawCategoryVisibility.showTrend
          : DEFAULT_ASSET_CHART_SETTINGS.categoryVisibility.showTrend
    },
    globalCategoryDetail,
    categoryDetailById,
    accountDetailById
  };
};
