export type HomeAssetStatMetric = 'netWorth' | 'totalAssets';
export type HomeAssetStatLabelMode = 'full' | 'short';

export type HomeAssetStatSettings = {
  homeAssetStatMetric: HomeAssetStatMetric;
  homeAssetStatLabelMode: HomeAssetStatLabelMode;
  homeAssetStatCompact: boolean;
};

export const DEFAULT_HOME_ASSET_STAT_SETTINGS: HomeAssetStatSettings = {
  homeAssetStatMetric: 'netWorth',
  homeAssetStatLabelMode: 'full',
  homeAssetStatCompact: false
};

export const isHomeAssetStatMetric = (
  value: unknown
): value is HomeAssetStatMetric => value === 'netWorth' || value === 'totalAssets';

export const isHomeAssetStatLabelMode = (
  value: unknown
): value is HomeAssetStatLabelMode => value === 'full' || value === 'short';

export const resolveHomeAssetStatLabel = (
  metric: HomeAssetStatMetric,
  labelMode: HomeAssetStatLabelMode
) => {
  if (metric === 'netWorth') {
    return labelMode === 'short' ? 'NW' : '净值';
  }

  return labelMode === 'short' ? 'TA' : '总资产';
};

export const resolveHomeAssetStatValue = (
  metric: HomeAssetStatMetric,
  values: {
    netWorth: number;
    totalAssets: number;
  }
) => (metric === 'totalAssets' ? values.totalAssets : values.netWorth);
