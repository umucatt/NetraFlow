import { isChartColorAssignmentMode } from '../../chartLogic';
import {
  DEFAULT_HOME_ASSET_STAT_SETTINGS,
  isHomeAssetStatLabelMode,
  isHomeAssetStatMetric
} from '../../homeAssetStats';
import type { SearchLogicMode } from '../../search/searchTypes';
import { isPasswordHash } from '../../security/passwordHash';
import type {
  GlobalSettings,
  MainContentPosition,
  PagePositionMemoryMode,
  PositiveNegativeColorMode,
  ResolvedTheme,
  ThemeMode,
  ThemeStyle
} from '../../features/security/securitySettingsTypes';
import { isPlainObject } from '../objectUtils';

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  positiveNegativeColorMode: 'red-positive',
  themeMode: 'system',
  themeStyle: 'default',
  nyaaThemeUnlocked: false,
  mainContentPosition: 'left',
  pagePositionMemoryMode: 'global',
  searchLogicMode: 'infer',
  chartColorAssignmentMode: 'createdAt',
  ...DEFAULT_HOME_ASSET_STAT_SETTINGS,
  passwordProtectionEnabled: false,
  passwordHash: null,
  autoLockMinutes: 10,
  snapshotEncryptionEnabled: false,
  snapshotPasswordHash: null
};
export const isPositiveNegativeColorMode = (
  value: unknown
): value is PositiveNegativeColorMode =>
  value === 'red-positive' || value === 'green-positive';

export const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

export const isThemeStyle = (value: unknown): value is ThemeStyle =>
  value === 'default' || value === 'nyaa';

export const isPagePositionMemoryMode = (
  value: unknown
): value is PagePositionMemoryMode =>
  value === 'global' || value === 'covered-reset';

export const isMainContentPosition = (value: unknown): value is MainContentPosition =>
  value === 'left' || value === 'right';

export const isSearchLogicMode = (value: unknown): value is SearchLogicMode =>
  value === 'strict' || value === 'infer';

export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
};

export const resolveThemeMode = (
  themeMode: ThemeMode,
  systemTheme: ResolvedTheme
): ResolvedTheme => (themeMode === 'system' ? systemTheme : themeMode);

export const normalizeAutoLockMinutes = (value: unknown) => {
  const numericValue = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(numericValue) && numericValue >= 1
    ? Math.floor(numericValue)
    : DEFAULT_GLOBAL_SETTINGS.autoLockMinutes;
};

export const normalizeGlobalSettings = (value: unknown): GlobalSettings => {
  if (!isPlainObject(value)) {
    return DEFAULT_GLOBAL_SETTINGS;
  }

  const passwordHash = isPasswordHash(value.passwordHash) ? value.passwordHash : null;
  const snapshotPasswordHash = isPasswordHash(value.snapshotPasswordHash)
    ? value.snapshotPasswordHash
    : null;
  const nyaaThemeUnlocked = value.nyaaThemeUnlocked === true;

  return {
    positiveNegativeColorMode: isPositiveNegativeColorMode(value.positiveNegativeColorMode)
      ? value.positiveNegativeColorMode
      : DEFAULT_GLOBAL_SETTINGS.positiveNegativeColorMode,
    themeMode: isThemeMode(value.themeMode)
      ? value.themeMode
      : DEFAULT_GLOBAL_SETTINGS.themeMode,
    themeStyle:
      nyaaThemeUnlocked && isThemeStyle(value.themeStyle)
        ? value.themeStyle
        : DEFAULT_GLOBAL_SETTINGS.themeStyle,
    nyaaThemeUnlocked,
    mainContentPosition: isMainContentPosition(value.mainContentPosition)
      ? value.mainContentPosition
      : DEFAULT_GLOBAL_SETTINGS.mainContentPosition,
    pagePositionMemoryMode: isPagePositionMemoryMode(value.pagePositionMemoryMode)
      ? value.pagePositionMemoryMode
      : DEFAULT_GLOBAL_SETTINGS.pagePositionMemoryMode,
    searchLogicMode: isSearchLogicMode(value.searchLogicMode)
      ? value.searchLogicMode
      : DEFAULT_GLOBAL_SETTINGS.searchLogicMode,
    chartColorAssignmentMode: isChartColorAssignmentMode(value.chartColorAssignmentMode)
      ? value.chartColorAssignmentMode
      : DEFAULT_GLOBAL_SETTINGS.chartColorAssignmentMode,
    homeAssetStatMetric: isHomeAssetStatMetric(value.homeAssetStatMetric)
      ? value.homeAssetStatMetric
      : DEFAULT_GLOBAL_SETTINGS.homeAssetStatMetric,
    homeAssetStatLabelMode: isHomeAssetStatLabelMode(value.homeAssetStatLabelMode)
      ? value.homeAssetStatLabelMode
      : DEFAULT_GLOBAL_SETTINGS.homeAssetStatLabelMode,
    homeAssetStatCompact:
      typeof value.homeAssetStatCompact === 'boolean'
        ? value.homeAssetStatCompact
        : DEFAULT_GLOBAL_SETTINGS.homeAssetStatCompact,
    passwordProtectionEnabled: value.passwordProtectionEnabled === true && passwordHash !== null,
    passwordHash,
    autoLockMinutes: normalizeAutoLockMinutes(value.autoLockMinutes),
    snapshotEncryptionEnabled:
      value.snapshotEncryptionEnabled === true && snapshotPasswordHash !== null,
    snapshotPasswordHash
  };
};
