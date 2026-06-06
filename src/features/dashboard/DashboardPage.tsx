import type { ReactNode } from 'react';

import ChartPreviewPanel from '../charts/ChartPreviewPanel';
import type { AssetStructureChartData } from '../charts/assetStructureData';
import type { AssetChartSettings } from '../charts/chartDataLogic';
import type { TrendChartPoint } from '../charts/assetTrendData';
import type { ChartMoneyFormatter } from '../charts/chartViewTypes';
import AssetOverviewPage, {
  type AssetOverviewPageProps
} from '../overview/AssetOverviewPage';
import DashboardSummaryCards from './DashboardSummaryCards';
import type {
  HomeAssetStatDisplay,
  RecentNetWorthChange
} from './dashboardStatsLogic';

type HomeMoneyFormatter = (
  amount: number | null,
  options?: { compact?: boolean }
) => string;

type DashboardPageProps = {
  homeAssetStat: HomeAssetStatDisplay;
  recentNetWorthChange: RecentNetWorthChange;
  chartPreview: {
    shouldShowCharts: boolean;
    showStructure: boolean;
    showTrend: boolean;
    structureData: AssetStructureChartData;
    showDebtMultiple: boolean;
    trendPoints: TrendChartPoint[];
    trendSettings: AssetChartSettings['trend'];
  };
  overview: AssetOverviewPageProps;
  formatHomeMoneyAmount: HomeMoneyFormatter;
  formatChartMoney: ChartMoneyFormatter;
  onOpenTotalCharts: () => void;
  onOpenSearch: () => void;
  onOpenArchivedAccounts: () => void;
  onOpenHistory: () => void;
  onOpenAddAccount: () => void;
  hiddenTopActions?: ReactNode;
};

function DashboardPage({
  homeAssetStat,
  recentNetWorthChange,
  chartPreview,
  overview,
  formatHomeMoneyAmount,
  formatChartMoney,
  onOpenTotalCharts,
  onOpenSearch,
  onOpenArchivedAccounts,
  onOpenHistory,
  onOpenAddAccount,
  hiddenTopActions
}: DashboardPageProps) {
  return (
    <>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'flex-start',
          marginBottom: 32
        }}
      >
        <div>
          <DashboardSummaryCards
            homeAssetStat={homeAssetStat}
            recentNetWorthChange={recentNetWorthChange}
            formatHomeMoneyAmount={formatHomeMoneyAmount}
            formatChangeAmount={formatChartMoney}
          />
        </div>
        <ChartPreviewPanel
          shouldShowCharts={chartPreview.shouldShowCharts}
          showStructure={chartPreview.showStructure}
          showTrend={chartPreview.showTrend}
          structureData={chartPreview.structureData}
          showDebtMultiple={chartPreview.showDebtMultiple}
          trendPoints={chartPreview.trendPoints}
          trendSettings={chartPreview.trendSettings}
          formatMoney={formatChartMoney}
          onOpenCharts={onOpenTotalCharts}
        />
        <div style={{ display: 'none', gap: 8, alignItems: 'center' }}>
          {hiddenTopActions ?? (
            <>
              <button
                type="button"
                aria-label="打开全局搜索"
                onClick={onOpenSearch}
                className="top-icon-button"
              >
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M10.7 18.4a7.7 7.7 0 1 1 0-15.4 7.7 7.7 0 0 1 0 15.4zM16.3 16.3L21 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="打开已归档账户"
                onClick={onOpenArchivedAccounts}
                className="top-icon-button"
              >
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 7h16M6 10.5v7.5h12v-7.5M10 13h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="打开历史记录"
                onClick={onOpenHistory}
                className="top-icon-button"
              >
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 7h14M5 12h14M5 17h9"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="添加账户"
                onClick={onOpenAddAccount}
                className="top-icon-button"
              >
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </header>

      <AssetOverviewPage {...overview} />
    </>
  );
}

export default DashboardPage;
