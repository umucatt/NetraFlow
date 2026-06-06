import type { ChartColorAssignmentMode } from '../../chartLogic';
import type {
  HomeAssetStatLabelMode,
  HomeAssetStatMetric
} from '../../homeAssetStats';
import type { SearchLogicMode } from '../../search/searchTypes';
import type { PasswordHash } from '../../security/passwordHash';

export type PositiveNegativeColorMode = 'red-positive' | 'green-positive';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeStyle = 'default' | 'nyaa';
export type PagePositionMemoryMode = 'global' | 'covered-reset';
export type ResolvedTheme = 'light' | 'dark';

export type GlobalSettings = {
  positiveNegativeColorMode: PositiveNegativeColorMode;
  themeMode: ThemeMode;
  themeStyle: ThemeStyle;
  nyaaThemeUnlocked: boolean;
  pagePositionMemoryMode: PagePositionMemoryMode;
  searchLogicMode: SearchLogicMode;
  chartColorAssignmentMode: ChartColorAssignmentMode;
  homeAssetStatMetric: HomeAssetStatMetric;
  homeAssetStatLabelMode: HomeAssetStatLabelMode;
  homeAssetStatCompact: boolean;
  passwordProtectionEnabled: boolean;
  passwordHash: PasswordHash | null;
  autoLockMinutes: number;
  snapshotEncryptionEnabled: boolean;
  snapshotPasswordHash: PasswordHash | null;
};

export type PasswordEditorMode = 'setup' | 'edit' | null;
export type SnapshotPasswordEditorMode = 'setup' | 'edit' | null;
export type SnapshotPasswordField = 'new' | 'confirm';
