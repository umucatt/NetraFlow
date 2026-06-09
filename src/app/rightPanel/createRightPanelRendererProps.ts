import type { Account, AccountPointer, AssetGroupWithAccounts, HistoryRecord } from '../types';
import type {
  AccountDetailChartSettings,
  AssetChartSettings,
  CategoryDetailChartSettings
} from '../../features/charts';

import type {
  RightPanelMode,
  RightPanelRendererProps
} from './rightPanelTypes';

type SearchProps = RightPanelRendererProps['search'];
type AccountChartSettingsProps = NonNullable<
  RightPanelRendererProps['account']['chartSettings']
>;
type TotalChartProps = RightPanelRendererProps['totalChart'];
type GroupDetailProps = NonNullable<RightPanelRendererProps['groupDetail']>;
type SnapshotProps = RightPanelRendererProps['history']['snapshot'];

type CreateRightPanelModeOptions = {
  isSearchOpen: boolean;
  isRollupImportOpen: boolean;
  isDangerActionsOpen: boolean;
  hasSelectedAccountDetail: boolean;
  isAccountChartsOpen: boolean;
  isHistoryOpen: boolean;
  isHistoryBackupView: boolean;
  isArchivedAccountsOpen: boolean;
  isTotalChartsOpen: boolean;
  hasSelectedGroupDetail: boolean;
  isGlobalSettingsOpen: boolean;
};

export const getRightPanelMode = ({
  isSearchOpen,
  isRollupImportOpen,
  isDangerActionsOpen,
  hasSelectedAccountDetail,
  isAccountChartsOpen,
  isHistoryOpen,
  isHistoryBackupView,
  isArchivedAccountsOpen,
  isTotalChartsOpen,
  hasSelectedGroupDetail,
  isGlobalSettingsOpen
}: CreateRightPanelModeOptions): RightPanelMode =>
  isSearchOpen
    ? 'search'
    : isRollupImportOpen
      ? 'rollup-import'
      : isDangerActionsOpen && hasSelectedAccountDetail
        ? 'account-danger'
        : isAccountChartsOpen && hasSelectedAccountDetail
          ? 'account-chart-settings'
          : hasSelectedAccountDetail
            ? 'account-actions'
            : isHistoryOpen && isHistoryBackupView
              ? 'snapshot'
              : isHistoryOpen
                ? 'history'
                : isArchivedAccountsOpen
                  ? 'archived'
                  : isTotalChartsOpen
                    ? 'chart-settings'
                    : hasSelectedGroupDetail
                      ? 'group-detail'
                      : isGlobalSettingsOpen
                        ? 'settings'
                        : 'home';

export type CreateRightPanelRendererPropsOptions = {
  mode: RightPanelMode;
  search: {
    hasQuery: boolean;
    focusedResult: SearchProps['focusedResult'];
    sortedHistory: HistoryRecord[];
    onOpenResult: SearchProps['onOpenResult'];
    onCloseSearch: SearchProps['onCloseSearch'];
    formatMoney: SearchProps['formatMoney'];
    formatShortTime: SearchProps['formatShortTime'];
    getAmountChange: SearchProps['getAmountChange'];
    getAccountNatureLabel: SearchProps['getAccountNatureLabel'];
  };
  account: {
    selectedAccount: AccountPointer;
    selectedAccountEntry: Account | undefined;
    actions: RightPanelRendererProps['account']['actions'];
    dangerActions: RightPanelRendererProps['account']['dangerActions'];
    assetChartSettings: AssetChartSettings;
    selectedAccountChartSettings: AccountChartSettingsProps['settings'];
    onUpdateLocalAccountDetailChartSettings: (
      accountId: string,
      updater: (currentSettings: AccountDetailChartSettings) => AccountDetailChartSettings
    ) => void;
    onBackToAccountDetail: () => void;
  };
  history: {
    onOpenBackupPanel: () => void;
    backupRecordCount: number;
    latestBackupLabel: string;
    accountCount: number;
    historyCount: number;
    incrementalRecordValue: string;
    autoBackupDraft: SnapshotProps['autoBackupDraft'];
    autoBackupCycleValueInput: string;
    autoSnapshotCycleInputRef: SnapshotProps['autoSnapshotCycleInputRef'];
    latestAutoBackupAt: string;
    isExampleMode: boolean;
    hasAutoBackupDraftChanges: boolean;
    canSaveAutoBackupSettings: boolean;
    onExportBackup: () => void;
    onImportBackup: () => void;
    onAutoBackupEnabledChange: SnapshotProps['onAutoBackupEnabledChange'];
    onAutoBackupCycleValueChange: SnapshotProps['onAutoBackupCycleValueChange'];
    onAutoBackupCycleValueInputReset: SnapshotProps['onAutoBackupCycleValueInputReset'];
    onAdjustAutoBackupCycleValue: SnapshotProps['onAdjustAutoBackupCycleValue'];
    onAutoBackupCycleUnitChange: SnapshotProps['onAutoBackupCycleUnitChange'];
    onSelectAutoBackupDirectory: () => void;
    onSaveAutoBackupDraft: () => void;
  };
  archived: {
    accountCount: number;
    onBackToOverview: () => void;
  };
  totalChart: {
    assetChartSettings: AssetChartSettings;
    onUpdateAssetChartSettings: (
      updater: (currentSettings: AssetChartSettings) => AssetChartSettings
    ) => void;
    onBackToOverview: () => void;
  };
  groupDetail: {
    selectedGroupDetail: AssetGroupWithAccounts | undefined;
    nameDraft: string;
    namePlaceholder?: string;
    statsDraft: boolean;
    error: string;
    chartSettings: GroupDetailProps['chartSettings'];
    isLockedByGlobal: boolean;
    onNameDraftChange: (value: string) => void;
    onStatsDraftChange: (value: boolean) => void;
    onSaveInfo: () => void;
    onUpdateChartSettings: (
      updater: (currentSettings: CategoryDetailChartSettings) => CategoryDetailChartSettings
    ) => void;
    onBackToOverview: () => void;
  };
  settings: RightPanelRendererProps['settings'];
  rollupImport: RightPanelRendererProps['rollupImport'];
  home: RightPanelRendererProps['home'];
};

export const createRightPanelRendererProps = ({
  mode,
  search,
  account,
  history,
  archived,
  totalChart,
  groupDetail,
  settings,
  rollupImport,
  home
}: CreateRightPanelRendererPropsOptions): RightPanelRendererProps => {
  const selectedAccountEntry = account.selectedAccountEntry;

  return {
    mode,
    search: {
      hasQuery: search.hasQuery,
      focusedResult: search.focusedResult,
      sortedHistory: search.sortedHistory,
      onOpenResult: search.onOpenResult,
      onCloseSearch: search.onCloseSearch,
      formatMoney: search.formatMoney,
      formatShortTime: search.formatShortTime,
      getAmountChange: search.getAmountChange,
      getAccountNatureLabel: search.getAccountNatureLabel
    },
    account: {
      actions: account.actions,
      dangerActions: account.dangerActions,
      chartSettings:
        account.selectedAccount && selectedAccountEntry
          ? {
              isLockedByGlobal:
                account.assetChartSettings.globalChartControlMode === 'locked',
              settings: account.selectedAccountChartSettings,
              onUpdateSettings: (updater) =>
                account.onUpdateLocalAccountDetailChartSettings(
                  selectedAccountEntry.id,
                  (currentSettings) => {
                    const nextSettings = updater(currentSettings);

                    return {
                      ...currentSettings,
                      adaptiveYAxis: nextSettings.adaptiveYAxis,
                      xAxisRange:
                        nextSettings.xAxisRange as AccountDetailChartSettings['xAxisRange'],
                      pointValueMode:
                        nextSettings.pointValueMode as AccountDetailChartSettings['pointValueMode']
                    };
                  }
                ),
              onBackToAccountDetail: account.onBackToAccountDetail
            }
          : null
    },
    history: {
      actions: {
        onOpenBackupPanel: history.onOpenBackupPanel
      },
      snapshot: {
        summaryItems: [
          {
            label: '上次快照',
            value:
              history.backupRecordCount === 0
                ? '从未备份'
                : history.latestBackupLabel
          },
          { label: '账户数量', value: `${history.accountCount}` },
          { label: '历史记录', value: `${history.historyCount}` },
          { label: '增量记录', value: history.incrementalRecordValue }
        ],
        autoBackupDraft: history.autoBackupDraft,
        autoBackupCycleValueInput: history.autoBackupCycleValueInput,
        autoSnapshotCycleInputRef: history.autoSnapshotCycleInputRef,
        latestAutoBackupAt: history.latestAutoBackupAt,
        isExampleMode: history.isExampleMode,
        hasAutoBackupDraftChanges: history.hasAutoBackupDraftChanges,
        canSaveAutoBackupSettings: history.canSaveAutoBackupSettings,
        onExportBackup: history.onExportBackup,
        onImportBackup: history.onImportBackup,
        onAutoBackupEnabledChange: history.onAutoBackupEnabledChange,
        onAutoBackupCycleValueChange: history.onAutoBackupCycleValueChange,
        onAutoBackupCycleValueInputReset: history.onAutoBackupCycleValueInputReset,
        onAdjustAutoBackupCycleValue: history.onAdjustAutoBackupCycleValue,
        onAutoBackupCycleUnitChange: history.onAutoBackupCycleUnitChange,
        onSelectAutoBackupDirectory: history.onSelectAutoBackupDirectory,
        onSaveAutoBackupDraft: history.onSaveAutoBackupDraft
      }
    },
    archived,
    totalChart: {
      isLockedByGlobal: totalChart.assetChartSettings.globalChartControlMode === 'locked',
      settings: totalChart.assetChartSettings,
      onUpdateSettings: (updater) =>
        totalChart.onUpdateAssetChartSettings((currentSettings) => {
          const nextSettings = updater(currentSettings);

          return {
            ...currentSettings,
            structure: nextSettings.structure,
            trend: {
              ...nextSettings.trend,
              xAxisRange:
                nextSettings.trend.xAxisRange as AssetChartSettings['trend']['xAxisRange'],
              pointValueMode:
                nextSettings.trend.pointValueMode as AssetChartSettings['trend']['pointValueMode']
            }
          };
        }),
      onBackToOverview: totalChart.onBackToOverview
    },
    groupDetail: groupDetail.selectedGroupDetail
      ? {
          nameDraft: groupDetail.nameDraft,
          namePlaceholder: groupDetail.namePlaceholder,
          statsDraft: groupDetail.statsDraft,
          error: groupDetail.error,
          chartSettings: groupDetail.chartSettings,
          isLockedByGlobal: groupDetail.isLockedByGlobal,
          onNameDraftChange: groupDetail.onNameDraftChange,
          onStatsDraftChange: groupDetail.onStatsDraftChange,
          onSaveInfo: groupDetail.onSaveInfo,
          onUpdateChartSettings: groupDetail.onUpdateChartSettings,
          onBackToOverview: groupDetail.onBackToOverview
        }
      : null,
    settings,
    rollupImport,
    home
  };
};
