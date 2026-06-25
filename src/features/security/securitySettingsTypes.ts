import type { ChartColorAssignmentMode } from '../../chartLogic';
import type {
  HomeAssetStatLabelMode,
  HomeAssetStatMetric
} from '../../homeAssetStats';
import type { SearchLogicMode } from '../../search/searchTypes';
export type PositiveNegativeColorMode = 'red-positive' | 'green-positive';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeStyle = 'default' | 'nyaa';
export type PagePositionMemoryMode = 'global' | 'covered-reset';
export type MainContentPosition = 'left' | 'right';
export type ResolvedTheme = 'light' | 'dark';

export type GlobalSettings = {
  positiveNegativeColorMode: PositiveNegativeColorMode;
  themeMode: ThemeMode;
  themeStyle: ThemeStyle;
  nyaaThemeUnlocked: boolean;
  mainContentPosition: MainContentPosition;
  pagePositionMemoryMode: PagePositionMemoryMode;
  searchLogicMode: SearchLogicMode;
  chartColorAssignmentMode: ChartColorAssignmentMode;
  homeAssetStatMetric: HomeAssetStatMetric;
  homeAssetStatLabelMode: HomeAssetStatLabelMode;
  homeAssetStatCompact: boolean;
  passwordProtectionEnabled: boolean;
  passwordHash: null;
  autoLockMinutes: number;
  forceSnapshotEncryption: boolean;
  snapshotEncryptionEnabled: boolean;
  snapshotPasswordHash: null;
};

export type PasswordEditorMode = 'setup' | 'edit' | null;
