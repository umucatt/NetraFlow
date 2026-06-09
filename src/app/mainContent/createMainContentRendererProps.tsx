import type { DragEvent, PointerEvent } from 'react';

import { canDeleteAssetGroup } from '../accountData';
import type { Account, AccountPointer, AssetGroupWithAccounts, HistoryRecord } from '../types';
import { NfSortIcon, NfWindowCloseIcon } from '../../assets/icons';
import NfSvgIcon from '../../components/NfSvgIcon';

import type {
  MainContentMode,
  MainContentRendererProps
} from './mainContentTypes';

type DashboardPageProps = MainContentRendererProps['dashboard']['pageProps'];
type DashboardOverviewProps = DashboardPageProps['overview'];
type AccountDetailProps = NonNullable<MainContentRendererProps['account']['detail']>;
type AccountChartProps = NonNullable<MainContentRendererProps['account']['chart']>;
type GroupDetailChartProps = NonNullable<MainContentRendererProps['charts']['groupDetail']>;
type FlashNoteHostProps = MainContentRendererProps['flashNote']['hostProps'];

type CreateMainContentModeOptions = {
  isFlashNoteOpen: boolean;
  isRollupImportOpen: boolean;
  isGlobalSettingsOpen: boolean;
  isTotalChartsOpen: boolean;
  isAccountChartsOpen: boolean;
  hasSelectedAccountDetail: boolean;
  hasSelectedGroupDetail: boolean;
};

export const getMainContentMode = ({
  isFlashNoteOpen,
  isRollupImportOpen,
  isGlobalSettingsOpen,
  isTotalChartsOpen,
  isAccountChartsOpen,
  hasSelectedAccountDetail,
  hasSelectedGroupDetail
}: CreateMainContentModeOptions): MainContentMode =>
  isFlashNoteOpen
    ? 'flash-note'
    : isRollupImportOpen
      ? 'rollup-import'
      : isGlobalSettingsOpen
        ? 'settings'
        : isTotalChartsOpen
          ? 'total-chart'
          : isAccountChartsOpen && hasSelectedAccountDetail
            ? 'account-chart'
            : hasSelectedGroupDetail
              ? 'group-detail'
              : hasSelectedAccountDetail
                ? 'account-detail'
                : 'dashboard';

export type CreateMainContentRendererPropsOptions = {
  mode: MainContentMode;
  dashboard: {
    homeAssetStat: DashboardPageProps['homeAssetStat'];
    recentNetWorthChange: DashboardPageProps['recentNetWorthChange'];
    shouldShowL0Charts: boolean;
    showStructure: boolean;
    showTrend: boolean;
    structureData: DashboardPageProps['chartPreview']['structureData'];
    showDebtMultiple: boolean;
    trendPoints: DashboardPageProps['chartPreview']['trendPoints'];
    trendSettings: DashboardPageProps['chartPreview']['trendSettings'];
    groups: DashboardOverviewProps['groups'];
    accounts: Account[];
    expandedGroupIds: string[];
    isGroupEditMode: boolean;
    draggingGroupId: string;
    groupDropIndicator: DashboardOverviewProps['groupDropIndicator'];
    legendColorByName: DashboardOverviewProps['legendColorByName'];
    productIconPath: string;
    productNameZh: string;
    productNameEn: string;
    productTagline: string;
    formatHomeMoneyAmount: DashboardPageProps['formatHomeMoneyAmount'];
    formatChartMoney: DashboardPageProps['formatChartMoney'];
    onGroupClick: DashboardOverviewProps['onGroupClick'];
    onOpenAccount: DashboardOverviewProps['onOpenAccount'];
    onDeleteGroup: DashboardOverviewProps['onDeleteGroup'];
    onGroupPointerDown: (
      event: PointerEvent<HTMLButtonElement>,
      groupId: string
    ) => void;
    onGroupPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
    onGroupPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
    onGroupPointerLeave: (event: PointerEvent<HTMLButtonElement>) => void;
    onGroupPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
    onGroupDragStart: (event: DragEvent<HTMLElement>, groupId: string) => void;
    onGroupDragOver: (event: DragEvent<HTMLElement>, groupId: string) => void;
    onGroupDragLeave: (event: DragEvent<HTMLElement>, groupId: string) => void;
    onGroupDrop: (event: DragEvent<HTMLElement>, groupId: string) => void;
    onGroupDragEnd: () => void;
    onOpenTotalCharts: () => void;
    onOpenSearch: () => void;
    onOpenArchivedAccounts: () => void;
    onOpenHistory: () => void;
    onOpenAddAccount: () => void;
  };
  account: {
    selectedAccount: AccountPointer;
    selectedGroup: AssetGroupWithAccounts | undefined;
    selectedAccountEntry: Account | undefined;
    selectedAccountHistory: AccountDetailProps['panelProps']['historyRecords'];
    selectedAccountTrendPoints: AccountDetailProps['chartPreview']['chartProps']['points'];
    selectedAccountPreviewTrendSettings: AccountDetailProps['chartPreview']['chartProps']['settings'];
    selectedAccountHistoryByDate: AccountDetailProps['historyList']['groups'];
    expandedDetailDates: string[];
    accountHistoryRecordListProps: Omit<
      AccountDetailProps['historyList'],
      'groups' | 'expandedDates' | 'onToggleDate'
    >;
    selectedAccountTitle: string;
    selectedAccountChartSettings: AccountChartProps['settings'];
    formatMoney: AccountDetailProps['panelProps']['formatMoney'];
    formatChartMoney: AccountChartProps['formatMoney'];
    onOpenChart: () => void;
    onToggleDate: (dateValue: string) => void;
  };
  charts: {
    totalAssets: number;
    structureData: MainContentRendererProps['charts']['total']['structureData'];
    trendPoints: MainContentRendererProps['charts']['total']['trendPoints'];
    assetChartSettings: MainContentRendererProps['charts']['total']['settings'];
    selectedGroupDetail: AssetGroupWithAccounts | undefined;
    selectedGroupDetailStructureData: GroupDetailChartProps['structureData'] | null;
    selectedGroupDetailTrendData: GroupDetailChartProps['trendData'] | null;
    selectedGroupDetailChartSettings: GroupDetailChartProps['settings'];
    categoryVisibility: GroupDetailChartProps['visibility'];
    formatMoney: MainContentRendererProps['charts']['total']['formatMoney'];
  };
  settings: MainContentRendererProps['settings'];
  rollupImport: MainContentRendererProps['rollupImport'];
  flashNote: {
    isOpen: boolean;
    pageProps: FlashNoteHostProps['page']['pageProps'];
    isExitConfirmOpen: boolean;
    onCancelExit: () => void;
    onConfirmExit: () => void;
    isReturnDateConfirmOpen: boolean;
    onCancelReturnDate: () => void;
    onConfirmReturnDate: () => void;
  };
  security: MainContentRendererProps['security'];
};

export const createMainContentRendererProps = ({
  mode,
  dashboard,
  account,
  charts,
  settings,
  rollupImport,
  flashNote,
  security
}: CreateMainContentRendererPropsOptions): MainContentRendererProps => ({
  mode,
  dashboard: {
    pageProps: {
      homeAssetStat: dashboard.homeAssetStat,
      recentNetWorthChange: dashboard.recentNetWorthChange,
      chartPreview: {
        shouldShowCharts: dashboard.shouldShowL0Charts,
        showStructure: dashboard.showStructure,
        showTrend: dashboard.showTrend,
        structureData: dashboard.structureData,
        showDebtMultiple: dashboard.showDebtMultiple,
        trendPoints: dashboard.trendPoints,
        trendSettings: dashboard.trendSettings
      },
      overview: {
        groups: dashboard.groups,
        expandedGroupIds: dashboard.expandedGroupIds,
        isGroupEditMode: dashboard.isGroupEditMode,
        draggingGroupId: dashboard.draggingGroupId,
        groupDropIndicator: dashboard.groupDropIndicator,
        legendColorByName: dashboard.legendColorByName,
        productIconPath: dashboard.productIconPath,
        productNameZh: dashboard.productNameZh,
        productNameEn: dashboard.productNameEn,
        productTagline: dashboard.productTagline,
        sortIcon: (
          <NfSvgIcon svg={NfSortIcon} className="account-sort-icon" decorative />
        ),
        deleteIcon: (
          <NfSvgIcon
            svg={NfWindowCloseIcon}
            className="account-type-delete-icon"
            decorative
          />
        ),
        formatMoney: dashboard.formatHomeMoneyAmount,
        canDeleteGroup: (groupId) => canDeleteAssetGroup(groupId, dashboard.accounts),
        onGroupClick: dashboard.onGroupClick,
        onOpenAccount: dashboard.onOpenAccount,
        onDeleteGroup: dashboard.onDeleteGroup,
        onGroupPointerDown: dashboard.onGroupPointerDown,
        onGroupPointerMove: dashboard.onGroupPointerMove,
        onGroupPointerUp: dashboard.onGroupPointerUp,
        onGroupPointerLeave: dashboard.onGroupPointerLeave,
        onGroupPointerCancel: dashboard.onGroupPointerCancel,
        onGroupDragStart: dashboard.onGroupDragStart,
        onGroupDragOver: dashboard.onGroupDragOver,
        onGroupDragLeave: dashboard.onGroupDragLeave,
        onGroupDrop: dashboard.onGroupDrop,
        onGroupDragEnd: dashboard.onGroupDragEnd
      },
      formatHomeMoneyAmount: dashboard.formatHomeMoneyAmount,
      formatChartMoney: dashboard.formatChartMoney,
      onOpenTotalCharts: dashboard.onOpenTotalCharts,
      onOpenSearch: dashboard.onOpenSearch,
      onOpenArchivedAccounts: dashboard.onOpenArchivedAccounts,
      onOpenHistory: dashboard.onOpenHistory,
      onOpenAddAccount: dashboard.onOpenAddAccount
    }
  },
  account: {
    detail: account.selectedAccount && account.selectedAccountEntry
      ? {
          panelProps: {
            groupName:
              account.selectedGroup?.name ?? account.selectedAccount.groupName ?? '',
            account: account.selectedAccountEntry,
            currentAmount: account.selectedAccountEntry.amount,
            historyRecords: account.selectedAccountHistory,
            formatMoney: account.formatMoney
          },
          chartPreview: {
            chartProps: {
              points: account.selectedAccountTrendPoints,
              settings: account.selectedAccountPreviewTrendSettings,
              formatMoney: account.formatChartMoney
            },
            onOpenChart: account.onOpenChart
          },
          historyList: {
            groups: account.selectedAccountHistoryByDate,
            expandedDates: account.expandedDetailDates,
            onToggleDate: account.onToggleDate,
            ...account.accountHistoryRecordListProps
          }
        }
      : null,
    chart: account.selectedAccount && account.selectedAccountEntry
      ? {
          title: account.selectedAccountTitle,
          currentAmount: account.selectedAccountEntry.amount,
          points: account.selectedAccountTrendPoints,
          settings: account.selectedAccountChartSettings,
          formatMoney: account.formatChartMoney
        }
      : null
  },
  charts: {
    total: {
      totalAssets: charts.totalAssets,
      structureData: charts.structureData,
      trendPoints: charts.trendPoints,
      settings: charts.assetChartSettings,
      formatMoney: charts.formatMoney
    },
    groupDetail:
      charts.selectedGroupDetail &&
      charts.selectedGroupDetailStructureData &&
      charts.selectedGroupDetailTrendData
        ? {
            groupName: charts.selectedGroupDetail.name,
            structureData: charts.selectedGroupDetailStructureData,
            trendData: charts.selectedGroupDetailTrendData,
            settings: charts.selectedGroupDetailChartSettings,
            visibility: charts.categoryVisibility,
            formatMoney: charts.formatMoney
          }
        : null
  },
  settings,
  rollupImport,
  flashNote: {
    hostProps: {
      page: {
        isOpen: flashNote.isOpen,
        pageProps: flashNote.pageProps
      },
      exitConfirm: {
        isOpen: flashNote.isExitConfirmOpen,
        onCancel: flashNote.onCancelExit,
        onConfirm: flashNote.onConfirmExit
      },
      returnDateConfirm: {
        isOpen: flashNote.isReturnDateConfirmOpen,
        onCancel: flashNote.onCancelReturnDate,
        onConfirm: flashNote.onConfirmReturnDate
      }
    }
  },
  security
});
