import { useState } from 'react';

import { FlashNoteHostLayer } from '../flashNoteLayer';
import {
  AccountDetailPanel,
  AccountHistoryList
} from '../../features/account';
import {
  AssetTrendChart,
  GroupDetailChartDisplayPanel,
  TotalAssetChartDisplayPanel
} from '../../features/charts';
import DashboardPage from '../../features/dashboard/DashboardPage';
import { RollupImportPage } from '../../features/rollupImport';
import { SettingsPage } from '../../features/settings';

import type {
  AccountTrendPanelChartSettings,
  AccountTrendPanelProps,
  MainContentRendererProps
} from './mainContentTypes';

function AccountTrendPanel({
  points,
  settings,
  formatMoney
}: AccountTrendPanelProps) {
  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);
  const [isDetailMode, setIsDetailMode] = useState(false);
  const chartSettings: AccountTrendPanelChartSettings = {
    assetDisplay: 'net',
    adaptiveYAxis: settings.adaptiveYAxis,
    xAxisRange: settings.xAxisRange,
    pointValueMode: settings.pointValueMode
  };

  return (
    <section className="asset-chart-panel account-chart-panel">
      <header className="asset-chart-panel__header chart-visual-text">
        <div>
          <h2>账户趋势</h2>
        </div>
      </header>
      <AssetTrendChart
        points={points}
        settings={chartSettings}
        formatMoney={formatMoney}
        activeSeriesId={isDetailMode ? null : hoveredSeriesId}
        onSeriesHover={setHoveredSeriesId}
        detailMode={isDetailMode}
        onDetailModeChange={(enabled) => {
          setIsDetailMode(enabled);
          setHoveredSeriesId(null);
        }}
      />
    </section>
  );
}

export function MainContentRenderer({
  mode,
  dashboard,
  account,
  charts,
  settings,
  rollupImport,
  flashNote,
  security
}: MainContentRendererProps) {
  const renderDashboard = () => <DashboardPage {...dashboard.pageProps} />;

  const renderMainContent = () => {
    switch (mode) {
      case 'flash-note':
        return <FlashNoteHostLayer {...flashNote.hostProps} />;

      case 'rollup-import':
        return <RollupImportPage {...rollupImport.pageProps} />;

      case 'settings':
        return <SettingsPage {...settings.pageProps} />;

      case 'total-chart':
        return <TotalAssetChartDisplayPanel {...charts.total} />;

      case 'account-chart':
        if (!account.chart) {
          return renderDashboard();
        }

        return (
          <div className="asset-chart-page">
            <header className="asset-chart-page__header chart-visual-text">
              <div>
                <h1>{account.chart.title}</h1>
              </div>
              <div className="asset-chart-page__totals">
                <span>当前余额</span>
                <strong>{account.chart.formatMoney(account.chart.currentAmount)}</strong>
              </div>
            </header>

            <AccountTrendPanel
              points={account.chart.points}
              settings={account.chart.settings}
              formatMoney={account.chart.formatMoney}
            />
          </div>
        );

      case 'group-detail':
        if (!charts.groupDetail) {
          return renderDashboard();
        }

        return <GroupDetailChartDisplayPanel {...charts.groupDetail} />;

      case 'account-detail':
        if (!account.detail) {
          return renderDashboard();
        }

        return (
          <AccountDetailPanel
            {...account.detail.panelProps}
            chartPreview={(
              <AssetTrendChart
                {...account.detail.chartPreview.chartProps}
                compact
              />
            )}
            onOpenChart={account.detail.chartPreview.onOpenChart}
            historyList={(
              <AccountHistoryList
                {...account.detail.historyList}
              />
            )}
          />
        );

      case 'dashboard':
      default:
        return renderDashboard();
    }
  };

  return (
    <>
      {renderMainContent()}

      {security.isSettingsPageDisabled ? (
        <div className="example-mode-disabled-panel__banner">示例模式下不可用</div>
      ) : null}
    </>
  );
}
