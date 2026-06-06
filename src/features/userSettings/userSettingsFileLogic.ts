import {
  USER_SETTINGS_FILE_TYPE,
  USER_SETTINGS_FILE_VERSION
} from '../../app/storageKeys';
import {
  isChartColorAssignmentMode,
  type ChartColorAssignmentMode
} from '../../chartLogic';
import {
  isHomeAssetStatLabelMode,
  isHomeAssetStatMetric,
  type HomeAssetStatLabelMode,
  type HomeAssetStatMetric
} from '../../homeAssetStats';
import type {
  GlobalSettings,
  PagePositionMemoryMode,
  PositiveNegativeColorMode,
  ThemeMode,
  ThemeStyle
} from '../security/securitySettingsTypes';

type UserSettingsGlobalFields = Pick<
  GlobalSettings,
  | 'themeMode'
  | 'positiveNegativeColorMode'
  | 'pagePositionMemoryMode'
  | 'searchLogicMode'
  | 'chartColorAssignmentMode'
  | 'homeAssetStatMetric'
  | 'homeAssetStatLabelMode'
  | 'homeAssetStatCompact'
>;

export type UserSettingsExportPayload<TAssetChartSettings> = {
  type: typeof USER_SETTINGS_FILE_TYPE;
  version: typeof USER_SETTINGS_FILE_VERSION;
  exportedAt: string;
  settings: UserSettingsGlobalFields & {
    themeStyle: ThemeStyle;
    assetChartSettings: TAssetChartSettings;
  };
};

export type ImportedUserSettings<TAssetChartSettings> = {
  globalSettings: GlobalSettings;
  assetChartSettings?: TAssetChartSettings;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

const isPositiveNegativeColorMode = (
  value: unknown
): value is PositiveNegativeColorMode =>
  value === 'red-positive' || value === 'green-positive';

const isPagePositionMemoryMode = (
  value: unknown
): value is PagePositionMemoryMode =>
  value === 'global' || value === 'covered-reset';

const isSearchLogicMode = (value: unknown): value is GlobalSettings['searchLogicMode'] =>
  value === 'strict' || value === 'infer';

const isThemeStyle = (value: unknown): value is ThemeStyle =>
  value === 'default' || value === 'nyaa';

export const getUserSettingsFileName = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `netraflow-settings-${year}${month}${day}-${hour}${minute}${second}.netraflow-settings.json`;
};

export const createUserSettingsExportPayload = <TAssetChartSettings>({
  globalSettings,
  effectiveThemeStyle,
  assetChartSettings,
  normalizeAssetChartSettings,
  exportedAt
}: {
  globalSettings: GlobalSettings;
  effectiveThemeStyle: ThemeStyle;
  assetChartSettings: TAssetChartSettings;
  normalizeAssetChartSettings: (value: unknown) => TAssetChartSettings;
  exportedAt: Date;
}): UserSettingsExportPayload<TAssetChartSettings> => ({
  type: USER_SETTINGS_FILE_TYPE,
  version: USER_SETTINGS_FILE_VERSION,
  exportedAt: exportedAt.toISOString(),
  settings: {
    themeMode: globalSettings.themeMode,
    positiveNegativeColorMode: globalSettings.positiveNegativeColorMode,
    pagePositionMemoryMode: globalSettings.pagePositionMemoryMode,
    searchLogicMode: globalSettings.searchLogicMode,
    chartColorAssignmentMode:
      globalSettings.chartColorAssignmentMode as ChartColorAssignmentMode,
    homeAssetStatMetric: globalSettings.homeAssetStatMetric as HomeAssetStatMetric,
    homeAssetStatLabelMode:
      globalSettings.homeAssetStatLabelMode as HomeAssetStatLabelMode,
    homeAssetStatCompact: globalSettings.homeAssetStatCompact,
    themeStyle: effectiveThemeStyle,
    assetChartSettings: normalizeAssetChartSettings(assetChartSettings)
  }
});

export const readImportedUserSettings = <TAssetChartSettings>({
  value,
  currentGlobalSettings,
  normalizeAssetChartSettings
}: {
  value: unknown;
  currentGlobalSettings: GlobalSettings;
  normalizeAssetChartSettings: (value: unknown) => TAssetChartSettings;
}): ImportedUserSettings<TAssetChartSettings> => {
  if (
    !isPlainObject(value) ||
    value.type !== USER_SETTINGS_FILE_TYPE ||
    value.version !== USER_SETTINGS_FILE_VERSION
  ) {
    throw new Error('Invalid user settings file.');
  }

  if (!isPlainObject(value.settings)) {
    throw new Error('Invalid user settings payload.');
  }

  const importedSettings = value.settings;
  const nextSettings: GlobalSettings = {
    ...currentGlobalSettings,
    themeMode: isThemeMode(importedSettings.themeMode)
      ? importedSettings.themeMode
      : currentGlobalSettings.themeMode,
    positiveNegativeColorMode: isPositiveNegativeColorMode(
      importedSettings.positiveNegativeColorMode
    )
      ? importedSettings.positiveNegativeColorMode
      : currentGlobalSettings.positiveNegativeColorMode,
    searchLogicMode: isSearchLogicMode(importedSettings.searchLogicMode)
      ? importedSettings.searchLogicMode
      : currentGlobalSettings.searchLogicMode,
    pagePositionMemoryMode: isPagePositionMemoryMode(
      importedSettings.pagePositionMemoryMode
    )
      ? importedSettings.pagePositionMemoryMode
      : currentGlobalSettings.pagePositionMemoryMode,
    chartColorAssignmentMode: isChartColorAssignmentMode(
      importedSettings.chartColorAssignmentMode
    )
      ? importedSettings.chartColorAssignmentMode
      : currentGlobalSettings.chartColorAssignmentMode,
    homeAssetStatMetric: isHomeAssetStatMetric(importedSettings.homeAssetStatMetric)
      ? importedSettings.homeAssetStatMetric
      : currentGlobalSettings.homeAssetStatMetric,
    homeAssetStatLabelMode: isHomeAssetStatLabelMode(
      importedSettings.homeAssetStatLabelMode
    )
      ? importedSettings.homeAssetStatLabelMode
      : currentGlobalSettings.homeAssetStatLabelMode,
    homeAssetStatCompact:
      typeof importedSettings.homeAssetStatCompact === 'boolean'
        ? importedSettings.homeAssetStatCompact
        : currentGlobalSettings.homeAssetStatCompact,
    themeStyle: isThemeStyle(importedSettings.themeStyle)
      ? importedSettings.themeStyle
      : currentGlobalSettings.themeStyle,
    nyaaThemeUnlocked: currentGlobalSettings.nyaaThemeUnlocked
  };

  return {
    globalSettings: nextSettings,
    assetChartSettings:
      importedSettings.assetChartSettings === undefined
        ? undefined
        : normalizeAssetChartSettings(importedSettings.assetChartSettings)
  };
};
