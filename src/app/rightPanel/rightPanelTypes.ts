import type { ComponentProps, ReactNode, RefObject } from 'react';

import type SearchPreviewPanel from '../../components/search/SearchPreviewPanel';
import type {
  AccountActionsPanelProps,
  AccountDangerActionsPanelProps
} from '../../features/account';
import type AccountChartSettingsPanel from '../../features/account/AccountChartSettingsPanel';
import type {
  AssetChartSettings,
  CategoryDetailChartSettings,
  TotalAssetChartSettings
} from '../../features/charts';
import type ChartSettingsPanel from '../../features/charts/ChartSettingsPanel';
import type { RollupImportActionsPanelProps } from '../../features/rollupImport';
import type { SettingsNavigationPanelProps } from '../../features/settings/settingsPageTypes';
import type { AutoBackupSettings, BackupCycleUnit } from '../types';

export type RightPanelMode =
  | 'search'
  | 'rollup-import'
  | 'account-danger'
  | 'account-chart-settings'
  | 'account-actions'
  | 'snapshot'
  | 'history'
  | 'archived'
  | 'chart-settings'
  | 'group-detail'
  | 'settings'
  | 'home';

export type SearchRightPanelProps = ComponentProps<typeof SearchPreviewPanel>;

export type AccountChartRightPanelProps = Omit<
  ComponentProps<typeof AccountChartSettingsPanel>,
  'renderSegmentedControl'
>;

export type TotalChartRightPanelProps = Omit<
  ComponentProps<typeof ChartSettingsPanel>,
  'renderSegmentedControl'
>;

export type SnapshotSummaryItem = {
  label: string;
  value: string;
};

export type SnapshotRightPanelProps = {
  summaryItems: SnapshotSummaryItem[];
  autoBackupDraft: AutoBackupSettings;
  autoBackupCycleValueInput: string;
  autoSnapshotCycleInputRef: RefObject<HTMLInputElement | null>;
  latestAutoBackupAt: string;
  isExampleMode: boolean;
  hasAutoBackupDraftChanges: boolean;
  canSaveAutoBackupSettings: boolean;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onAutoBackupEnabledChange: (enabled: boolean) => void;
  onAutoBackupCycleValueChange: (value: string) => void;
  onAutoBackupCycleValueInputReset: (value: string) => void;
  onAdjustAutoBackupCycleValue: (direction: 1 | -1) => void;
  onAutoBackupCycleUnitChange: (unit: BackupCycleUnit) => void;
  onSelectAutoBackupDirectory: () => void;
  onSaveAutoBackupDraft: () => void;
};

export type HistoryRightPanelProps = {
  onOpenBackupPanel: () => void;
};

export type ArchivedRightPanelProps = {
  accountCount: number;
  onBackToOverview: () => void;
};

export type RollupImportRightPanelProps = {
  title: string | null;
  actionsClassName: string;
  actionsPanelProps: RollupImportActionsPanelProps;
};

export type HomeRightPanelProps = {
  isExampleMode: boolean;
  renderFlashIcon: () => ReactNode;
  onOpenQuickSingleEntry: () => void;
  onOpenFlashNote: () => void;
  onOpenRollupImport: () => void;
  onOpenSearch: () => void;
  onOpenAddAccount: () => void;
  onOpenHistoryPanel: () => void;
  onOpenGlobalSettings: () => void;
  onOpenExampleDataSettings: () => void;
};

export type GroupDetailRightPanelProps = {
  nameDraft: string;
  namePlaceholder?: string;
  statsDraft: boolean;
  error: string;
  chartSettings: CategoryDetailChartSettings;
  isLockedByGlobal: boolean;
  onNameDraftChange: (value: string) => void;
  onStatsDraftChange: (value: boolean) => void;
  onSaveInfo: () => void;
  onUpdateChartSettings: (
    updater: (currentSettings: CategoryDetailChartSettings) => CategoryDetailChartSettings
  ) => void;
  onBackToOverview: () => void;
};

export type RightPanelRendererProps = {
  mode: RightPanelMode;
  search: SearchRightPanelProps;
  account: {
    actions: AccountActionsPanelProps | null;
    dangerActions: AccountDangerActionsPanelProps | null;
    chartSettings: AccountChartRightPanelProps | null;
  };
  history: {
    actions: HistoryRightPanelProps;
    snapshot: SnapshotRightPanelProps;
  };
  archived: ArchivedRightPanelProps;
  totalChart: TotalChartRightPanelProps;
  groupDetail: GroupDetailRightPanelProps | null;
  settings: SettingsNavigationPanelProps;
  rollupImport: RollupImportRightPanelProps;
  home: HomeRightPanelProps;
};

export type TotalChartSettingsUpdater = (
  updater: (currentSettings: TotalAssetChartSettings) => TotalAssetChartSettings
) => void;

export type AssetChartSettingsUpdater = (
  updater: (currentSettings: AssetChartSettings) => AssetChartSettings
) => void;
