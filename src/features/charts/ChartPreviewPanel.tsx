import { AssetStructureGraphic } from './AssetAllocationPanel';
import { AssetTrendChart } from './AssetTrendPanel';
import type { AssetStructureChartData } from './assetStructureData';
import type { AssetChartSettings } from './chartDataLogic';
import type { TrendChartPoint } from './assetTrendData';
import type { ChartMoneyFormatter } from './chartViewTypes';

type ChartPreviewPanelProps = {
  shouldShowCharts: boolean;
  showStructure: boolean;
  showTrend: boolean;
  structureData: AssetStructureChartData;
  showDebtMultiple: boolean;
  trendPoints: TrendChartPoint[];
  trendSettings: AssetChartSettings['trend'];
  formatMoney: ChartMoneyFormatter;
  onOpenCharts: () => void;
};

function ChartPreviewPanel({
  shouldShowCharts,
  showStructure,
  showTrend,
  structureData,
  showDebtMultiple,
  trendPoints,
  trendSettings,
  formatMoney,
  onOpenCharts
}: ChartPreviewPanelProps) {
  if (!shouldShowCharts) {
    return null;
  }

  return (
    <div className="l0-chart-strip">
      {showStructure ? (
        <button
          type="button"
          aria-label="打开总资产图表"
          className="l0-chart-button l0-chart-button--structure"
          onClick={onOpenCharts}
        >
          <AssetStructureGraphic
            data={structureData}
            display="both"
            compact
            showDebtMultiple={showDebtMultiple}
            formatMoney={formatMoney}
          />
        </button>
      ) : null}
      {showTrend ? (
        <button
          type="button"
          aria-label="打开总资产趋势图"
          className="l0-chart-button l0-chart-button--trend"
          onClick={onOpenCharts}
        >
          <AssetTrendChart
            points={trendPoints}
            settings={trendSettings}
            formatMoney={formatMoney}
            compact
          />
        </button>
      ) : null}
    </div>
  );
}

export default ChartPreviewPanel;
