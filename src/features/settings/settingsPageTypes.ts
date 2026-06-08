import type { ChangeEvent, PointerEvent, RefObject } from 'react';
import type {
  AssetChartSettings,
  CategoryDetailChartSettings,
  HomeThumbnailChartSettings
} from '../charts';
import type { ExampleTemplateDefinition, ExampleTemplateId } from '../../exampleData';
import type { GlobalSettings } from '../security/securitySettingsTypes';

export type GlobalSettingsSection =
  | 'appearance'
  | 'charts'
  | 'search'
  | 'backup'
  | 'security'
  | 'about';

export type SettingsNavItem = {
  id: GlobalSettingsSection;
  label: string;
};

export type SettingsResetAction = 'settings' | 'history' | 'all';

export type SettingsPageProps = {
  section: GlobalSettingsSection;
  globalSettings: GlobalSettings;
  assetChartSettings: AssetChartSettings;
  userSettingsFileInputRef: RefObject<HTMLInputElement | null>;
  exampleTemplates: ExampleTemplateDefinition[];
  selectedExampleTemplateId: ExampleTemplateId;
  isExampleMode: boolean;
  appVersion: string;
  productIconPath: string;
  productNameZh: string;
  productNameEn: string;
  isCatPetted: boolean;
  autoLockMinutesInput: string;
  onPositiveNegativeColorModeChange: (value: string) => void;
  onHomeAssetStatMetricChange: (value: string) => void;
  onHomeAssetStatLabelModeChange: (value: string) => void;
  onHomeAssetStatCompactChange: (value: string) => void;
  onThemeModeChange: (value: string) => void;
  onThemeStyleChange: (value: string) => void;
  onMainContentPositionChange: (value: string) => void;
  onPagePositionMemoryModeChange: (value: string) => void;
  onChartColorAssignmentModeChange: (value: string) => void;
  onGlobalChartControlModeChange: (value: string) => void;
  onUpdateAssetChartSettings: (
    createNextSettings: (currentSettings: AssetChartSettings) => AssetChartSettings
  ) => void;
  onUpdateHomeThumbnailChartSettings: (
    createNextSettings: (currentSettings: HomeThumbnailChartSettings) => HomeThumbnailChartSettings
  ) => void;
  onUpdateGlobalCategoryDetailChartSettings: (
    createNextSettings: (
      currentSettings: CategoryDetailChartSettings
    ) => CategoryDetailChartSettings
  ) => void;
  onSearchLogicModeChange: (value: string) => void;
  onPasswordProtectionChange: (value: string) => void;
  onOpenPasswordEditor: () => void;
  onAutoLockMinutesInputChange: (value: string) => void;
  onResetInvalidAutoLockMinutesInput: () => void;
  onSnapshotEncryptionChange: (value: string) => void;
  onOpenSnapshotPasswordEditor: () => void;
  onImportUserSettings: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportUserSettings: () => void;
  onOpenBackupPanel: () => void;
  onSelectExampleTemplate: (templateId: ExampleTemplateId) => void;
  onEnterOrSwitchExampleMode: () => void;
  onExitExampleMode: () => void;
  onOpenResetConfirmation: (action: SettingsResetAction) => void;
  onOpenBilibili: () => void;
  onOpenGithubReleases: () => void;
  onTriggerEasterEgg: () => void;
  onStartVersionLongPress: (event: PointerEvent<HTMLElement>) => void;
  onClearVersionLongPress: () => void;
};

export type SettingsNavigationPanelProps = {
  selectedSection: GlobalSettingsSection;
  onSelectSection: (section: GlobalSettingsSection) => void;
  onClose: () => void;
};
