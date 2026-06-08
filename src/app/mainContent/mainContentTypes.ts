import type { ComponentProps } from 'react';

import type { HistoryRecord } from '../types';
import type { FlashNoteHostLayer } from '../flashNoteLayer';
import type { AccountHistoryRecordGroup } from '../../features/account/AccountHistoryGroup';
import type { AccountHistorySharedProps } from '../../features/account/AccountHistoryItem';
import type AccountDetailPanel from '../../features/account/AccountDetailPanel';
import type {
  AssetTrendChart,
  GroupDetailChartDisplayPanel,
  TotalAssetChartDisplayPanel
} from '../../features/charts';
import type {
  AccountDetailChartSettings,
  AssetChartSettings,
  ChartMoneyFormatter
} from '../../features/charts';
import type DashboardPage from '../../features/dashboard/DashboardPage';
import type { RollupImportPageProps } from '../../features/rollupImport';
import type { SettingsPageProps } from '../../features/settings/settingsPageTypes';

export type MainContentMode =
  | 'flash-note'
  | 'rollup-import'
  | 'settings'
  | 'total-chart'
  | 'account-chart'
  | 'group-detail'
  | 'account-detail'
  | 'dashboard';

export type DashboardMainContentPropsGroup = {
  pageProps: ComponentProps<typeof DashboardPage>;
};

export type AccountHistoryListMainContentPropsGroup =
  AccountHistorySharedProps<HistoryRecord> & {
    groups: Array<AccountHistoryRecordGroup<HistoryRecord>>;
    expandedDates: string[];
    onToggleDate: (dateValue: string) => void;
  };

export type AccountDetailMainContentPropsGroup = {
  panelProps: Omit<
    ComponentProps<typeof AccountDetailPanel>,
    'chartPreview' | 'historyList' | 'onOpenChart'
  >;
  chartPreview: {
    chartProps: Omit<ComponentProps<typeof AssetTrendChart>, 'compact'>;
    onOpenChart: () => void;
  };
  historyList: AccountHistoryListMainContentPropsGroup;
};

export type AccountChartMainContentPropsGroup = {
  title: string;
  currentAmount: number;
  points: ComponentProps<typeof AssetTrendChart>['points'];
  settings: AccountDetailChartSettings;
  formatMoney: ChartMoneyFormatter;
};

export type AccountMainContentPropsGroup = {
  detail: AccountDetailMainContentPropsGroup | null;
  chart: AccountChartMainContentPropsGroup | null;
};

export type ChartMainContentPropsGroup = {
  total: ComponentProps<typeof TotalAssetChartDisplayPanel>;
  groupDetail: ComponentProps<typeof GroupDetailChartDisplayPanel> | null;
};

export type SettingsMainContentPropsGroup = {
  pageProps: SettingsPageProps;
};

export type RollupImportMainContentPropsGroup = {
  pageProps: RollupImportPageProps;
};

export type FlashNoteMainContentPropsGroup = {
  hostProps: ComponentProps<typeof FlashNoteHostLayer>;
};

export type MainContentSecurityPropsGroup = {
  isSettingsPageDisabled: boolean;
};

export type AccountTrendPanelProps = Pick<
  AccountChartMainContentPropsGroup,
  'points' | 'settings' | 'formatMoney'
>;

export type AccountTrendPanelChartSettings = AssetChartSettings['trend'];

export type MainContentRendererProps = {
  mode: MainContentMode;
  dashboard: DashboardMainContentPropsGroup;
  account: AccountMainContentPropsGroup;
  charts: ChartMainContentPropsGroup;
  settings: SettingsMainContentPropsGroup;
  rollupImport: RollupImportMainContentPropsGroup;
  flashNote: FlashNoteMainContentPropsGroup;
  security: MainContentSecurityPropsGroup;
};
