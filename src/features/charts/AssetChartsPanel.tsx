import type { ReactNode } from 'react';

type AssetChartsPanelProps = {
  title: ReactNode;
  totalLabel: ReactNode;
  totalValue: ReactNode;
  allocationContent: ReactNode;
  trendContent: ReactNode;
};

function AssetChartsPanel({
  title,
  totalLabel,
  totalValue,
  allocationContent,
  trendContent
}: AssetChartsPanelProps) {
  return (
    <div className="asset-chart-page">
      <header className="asset-chart-page__header chart-visual-text">
        <div>
          <h1>{title}</h1>
        </div>
        <div className="asset-chart-page__totals">
          <span>{totalLabel}</span>
          <strong>{totalValue}</strong>
        </div>
      </header>
      {allocationContent}
      {trendContent}
    </div>
  );
}

export default AssetChartsPanel;
