import {
  type MouseEvent,
  useEffect,
  useRef,
  useState
} from 'react';

import { isPositiveNature } from '../../app/accountNature';
import {
  buildSteppedStackLayers,
  createSteppedAreaPath,
  createSteppedHorizontalLinePath,
  createSteppedVerticalLinePath,
  getArchivedChartTooltipLabel,
  getChartAxisLabelIndexes,
  getChartValueLabelIndexes,
  getChartValueLabelLayout,
  getNearestChangeDatePointIndex,
  getZeroAnchoredStackedYAxisScale
} from '../../chartLogic';
import AssetAllocationPanel, { AccountStructureGraphic } from './AssetAllocationPanel';
import AssetChartsPanel from './AssetChartsPanel';
import AssetTrendPanel from './AssetTrendPanel';
import ChartLegendList, {
  getInteractiveChartClassName,
  type ChartLegendItemData
} from './ChartLegendList';
import { CHART_COLORS } from './chartColors';
import {
  formatChartNumber,
  formatChartPercent
} from './chartFormatters';
import type {
  ChartMoneyFormatter,
  ChartPercentFormatter,
  GroupDetailChartViewData,
  TotalAssetChartViewData
} from './chartViewTypes';
import type { CategoryDetailChartSettings } from './chartDataLogic';
import type { GroupDetailStructureData } from './groupDetailStructureData';
import type { GroupDetailTrendData } from './groupDetailTrendData';

type TotalAssetChartDisplayPanelProps = TotalAssetChartViewData & {
  formatMoney?: ChartMoneyFormatter;
  formatPercent?: ChartPercentFormatter;
};

type GroupDetailChartDisplayPanelProps = GroupDetailChartViewData & {
  formatMoney?: ChartMoneyFormatter;
  formatPercent?: ChartPercentFormatter;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getAxisLabelIndexes = (
  count: number,
  range: CategoryDetailChartSettings['xAxisRange'],
  width: number
) => getChartAxisLabelIndexes(count, range, width);

const getValueLabelIndexes = (
  values: number[],
  mode: CategoryDetailChartSettings['pointValueMode'],
  width: number
) => getChartValueLabelIndexes(values, mode, width);

const useMeasuredWidth = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const updateWidth = () => setWidth(element.getBoundingClientRect().width);
    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
};

function ChartDisabledEmptyState() {
  return (
    <section className="asset-chart-panel">
      <p className="asset-chart-empty chart-visual-text">图表已关闭</p>
    </section>
  );
}

export function TotalAssetChartDisplayPanel({
  totalAssets,
  structureData,
  trendPoints,
  settings,
  formatMoney = formatChartNumber,
  formatPercent = formatChartPercent
}: TotalAssetChartDisplayPanelProps) {
  return (
    <AssetChartsPanel
      title="总资产图表"
      totalLabel="净资产"
      totalValue={formatMoney(totalAssets)}
      allocationContent={(
        <AssetAllocationPanel
          data={structureData}
          settings={settings.structure}
          formatMoney={formatMoney}
          formatPercent={formatPercent}
        />
      )}
      trendContent={(
        <AssetTrendPanel
          points={trendPoints}
          settings={settings.trend}
          formatMoney={formatMoney}
        />
      )}
    />
  );
}

function GroupDetailStructurePanel({
  data,
  formatMoney,
  formatPercent
}: {
  data: GroupDetailStructureData;
  formatMoney: ChartMoneyFormatter;
  formatPercent: ChartPercentFormatter;
}) {
  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);
  const legendRows = data.segments.map((segment) => ({
    ...segment,
    percent: formatPercent(segment.amount, data.total)
  }));
  const legendItems: ChartLegendItemData[] = legendRows.map((segment) => ({
    id: segment.id,
    label: segment.label,
    color: segment.color,
    value: formatMoney(segment.amount),
    detail: segment.percent,
    archived: segment.archived
  }));

  return (
    <section className="asset-chart-panel">
      <header className="asset-chart-panel__header chart-visual-text">
        <div>
          <h2>账户占比</h2>
        </div>
      </header>

      <div className="asset-structure-detail asset-structure-detail--account-share">
        <AccountStructureGraphic
          segments={data.segments}
          total={data.total}
          activeSegmentId={hoveredSeriesId}
          onSegmentHover={setHoveredSeriesId}
          formatMoney={formatMoney}
          emptyLabel="暂无占比"
        />
        <ChartLegendList
          items={legendItems}
          emptyMessage="暂无账户占比"
          activeId={hoveredSeriesId}
          onActiveIdChange={setHoveredSeriesId}
        />
      </div>
    </section>
  );
}

const getGroupDetailTrendBoundaryMessage = (data: GroupDetailTrendData) => {
  if (data.dates.length < 2 || data.series.length === 0) {
    return '暂无足够数据';
  }

  if (data.totals.every((value) => value === 0)) {
    return '当前趋势为 0';
  }

  return null;
};

function GroupDetailTrendChart({
  data,
  settings,
  formatMoney,
  activeSeriesId,
  onSeriesHover,
  detailMode = false,
  onDetailModeChange
}: {
  data: GroupDetailTrendData;
  settings: CategoryDetailChartSettings;
  formatMoney: ChartMoneyFormatter;
  activeSeriesId?: string | null;
  onSeriesHover?: (id: string | null) => void;
  detailMode?: boolean;
  onDetailModeChange?: (enabled: boolean) => void;
}) {
  const [containerRef, measuredWidth] = useMeasuredWidth<HTMLDivElement>();
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const message = getGroupDetailTrendBoundaryMessage(data);
  const densityWidth = measuredWidth || 620;
  const isDetailMode = detailMode;
  const chartActiveSeriesId = isDetailMode ? null : activeSeriesId;

  useEffect(() => {
    setDetailIndex(null);
  }, [isDetailMode, data.dates, data.pointKinds]);

  if (message) {
    return (
      <div ref={containerRef} className="asset-trend-chart is-empty">
        <span className="chart-visual-text">{message}</span>
      </div>
    );
  }

  const viewWidth = 640;
  const viewHeight = 300;
  const padding = { top: 28, right: 32, bottom: 46, left: 56 };
  const plotWidth = viewWidth - padding.left - padding.right;
  const plotHeight = viewHeight - padding.top - padding.bottom;
  const layers = buildSteppedStackLayers(data.series);
  const yScale = getZeroAnchoredStackedYAxisScale(
    data.totals,
    isPositiveNature(data.nature) ? 'positive' : 'negative'
  );
  const [yMin, yMax] = yScale.domain;

  const getX = (index: number) =>
    padding.left + (data.dates.length === 1 ? 0 : (index / (data.dates.length - 1)) * plotWidth);
  const getY = (value: number) =>
    padding.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;
  const getValueLabelLayout = (index: number, value: number) =>
    getChartValueLabelLayout({
      pointX: getX(index),
      pointY: getY(value),
      plotLeft: padding.left,
      plotTop: padding.top,
      plotWidth,
      plotHeight,
      preferBelow: value < 0,
      labelWidth: 70
    });
  const axisLabelIndexes = getAxisLabelIndexes(data.dates.length, settings.xAxisRange, densityWidth);
  const yAxisLabels = yScale.ticks;
  const valueLabelIndexes = getValueLabelIndexes(
    data.totals,
    settings.pointValueMode,
    densityWidth
  );
  const detailPointProxies = data.dates.map((_, index) => ({
    kind: data.pointKinds[index]
  }));
  const updateDetailIndexFromMouse = (event: MouseEvent<SVGSVGElement>) => {
    if (!isDetailMode) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const cursorX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * viewWidth;
    const cursorY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * viewHeight;

    if (
      cursorX < padding.left ||
      cursorX > padding.left + plotWidth ||
      cursorY < padding.top ||
      cursorY > padding.top + plotHeight
    ) {
      setDetailIndex(null);
      return;
    }

    const nearestIndex = getNearestChangeDatePointIndex(detailPointProxies, cursorX, getX);
    setDetailIndex(nearestIndex >= 0 ? nearestIndex : null);
  };
  const toggleDetailMode = () => {
    onSeriesHover?.(null);
    setDetailIndex(null);
    onDetailModeChange?.(!isDetailMode);
  };
  const detailValue = detailIndex === null ? 0 : data.totals[detailIndex] ?? 0;
  const detailX = detailIndex === null ? 0 : getX(detailIndex);
  const detailY = detailIndex === null ? 0 : getY(detailValue);
  const detailColor = CHART_COLORS.netLine;
  const detailBubbleWidth = 116;
  const detailBubbleX =
    detailIndex === null
      ? 0
      : clampNumber(
          detailX + (detailX > viewWidth - detailBubbleWidth - 14 ? -detailBubbleWidth - 10 : 10),
          padding.left,
          viewWidth - detailBubbleWidth - 4
        );
  const detailBubbleY =
    detailIndex === null
      ? 0
      : clampNumber(detailY - 30, padding.top + 4, padding.top + plotHeight - 28);

  return (
    <div ref={containerRef} className="asset-trend-chart">
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        role="img"
        onDoubleClick={toggleDetailMode}
        onMouseMove={isDetailMode ? updateDetailIndexFromMouse : undefined}
        onMouseLeave={() => {
          setDetailIndex(null);
          if (!isDetailMode) {
            onSeriesHover?.(null);
          }
        }}
      >
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotHeight}
          stroke="var(--chart-axis-line)"
        />
        <line
          x1={padding.left}
          y1={getY(0)}
          x2={padding.left + plotWidth}
          y2={getY(0)}
          stroke="var(--chart-axis-line)"
        />
        {yAxisLabels.map((value) => {
          const y = getY(value);

          return (
            <g key={value}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="var(--chart-grid-line)"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                fill="var(--chart-axis-text)"
                fontSize="10"
                className="chart-svg-text"
              >
                {formatMoney(value)}
              </text>
            </g>
          );
        })}
        {axisLabelIndexes.map((index) => (
          <text
            key={data.dates[index]}
            x={getX(index)}
            y={viewHeight - 14}
            textAnchor="middle"
            fill="var(--chart-axis-text)"
            fontSize="10"
            className="chart-svg-text"
          >
            {data.dates[index].slice(5)}
          </text>
        ))}
        {layers.map((layer) => {
          const isActive = chartActiveSeriesId === layer.series.id;
          const isDimmed = Boolean(chartActiveSeriesId && chartActiveSeriesId !== layer.series.id);
          const areaPath = createSteppedAreaPath(layer.upperValues, layer.lowerValues, getX, getY);
          const horizontalPath = createSteppedHorizontalLinePath(layer.upperValues, getX, getY);
          const verticalPath = createSteppedVerticalLinePath(layer.upperValues, getX, getY);

          return (
            <g key={layer.series.id}>
              <path
                d={areaPath}
                fill={layer.series.color}
                fillOpacity={isActive ? 0.56 : isDimmed ? 0.22 : 0.38}
                stroke="none"
                className={getInteractiveChartClassName(
                  'chart-shape chart-shape--stacked-area',
                  layer.series.id,
                  chartActiveSeriesId
                )}
                onMouseEnter={() => {
                  if (!isDetailMode) {
                    onSeriesHover?.(layer.series.id);
                  }
                }}
                onMouseLeave={() => {
                  if (!isDetailMode) {
                    onSeriesHover?.(null);
                  }
                }}
              >
                <title>{getArchivedChartTooltipLabel(layer.series.label, layer.series.archived)}</title>
              </path>
              <path
                d={horizontalPath}
                fill="none"
                stroke={layer.series.color}
                strokeWidth={isActive ? 2 : 1.35}
                strokeOpacity={isActive ? 0.92 : isDimmed ? 0.42 : 0.76}
                strokeLinecap="butt"
                pointerEvents="none"
                className={getInteractiveChartClassName(
                  'chart-series-line chart-series-line--stacked-boundary',
                  layer.series.id,
                  chartActiveSeriesId
                )}
              />
              <path
                d={verticalPath}
                fill="none"
                stroke={layer.series.color}
                strokeWidth={isActive ? 1.8 : 1.2}
                strokeOpacity={isActive ? 0.5 : isDimmed ? 0.16 : 0.3}
                strokeLinecap="butt"
                pointerEvents="none"
                className={getInteractiveChartClassName(
                  'chart-series-line chart-series-line--stacked-boundary',
                  layer.series.id,
                  chartActiveSeriesId
                )}
              />
            </g>
          );
        })}
        {valueLabelIndexes.map((index) => {
          const value = data.totals[index];
          const labelLayout = getValueLabelLayout(index, value);

          return (
            <text
              key={`group-total-value-${data.dates[index]}`}
              x={labelLayout.x}
              y={labelLayout.y}
              textAnchor={labelLayout.textAnchor}
              fill="var(--chart-axis-text)"
              fontSize="10"
              fontWeight="700"
              className="chart-svg-text chart-value-label"
            >
              {formatMoney(value)}
            </text>
          );
        })}
        {isDetailMode && detailIndex !== null ? (
          <g className="chart-detail-readout" pointerEvents="none">
            <line
              x1={padding.left}
              y1={detailY}
              x2={detailX}
              y2={detailY}
              className="chart-detail-readout__guide"
            />
            <line
              x1={detailX}
              y1={detailY}
              x2={detailX}
              y2={padding.top + plotHeight}
              className="chart-detail-readout__guide"
            />
            <circle
              cx={detailX}
              cy={detailY}
              r="4.1"
              fill="var(--chart-point-fill)"
              stroke={detailColor}
              strokeWidth="1.7"
            />
            <text
              x={padding.left - 8}
              y={clampNumber(detailY - 6, padding.top + 10, padding.top + plotHeight - 6)}
              textAnchor="end"
              className="chart-detail-readout__axis-label chart-svg-text"
            >
              {formatMoney(detailValue)}
            </text>
            <text
              x={detailX}
              y={padding.top + plotHeight + 28}
              textAnchor="middle"
              className="chart-detail-readout__axis-label chart-svg-text"
            >
              {data.dates[detailIndex]}
            </text>
            <rect
              x={detailBubbleX}
              y={detailBubbleY}
              width={detailBubbleWidth}
              height="24"
              rx="6"
              className="chart-detail-readout__bubble"
            />
            <text
              x={detailBubbleX + 8}
              y={detailBubbleY + 15.5}
              className="chart-detail-readout__bubble-text chart-svg-text"
            >
              合计 {formatMoney(detailValue)}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function GroupDetailTrendPanel({
  data,
  settings,
  formatMoney,
  formatPercent
}: {
  data: GroupDetailTrendData;
  settings: CategoryDetailChartSettings;
  formatMoney: ChartMoneyFormatter;
  formatPercent: ChartPercentFormatter;
}) {
  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);
  const [isDetailMode, setIsDetailMode] = useState(false);
  const lastIndex = Math.max(0, data.dates.length - 1);
  const latestTotal = Math.abs(data.totals[lastIndex] ?? 0);
  const legendItems: ChartLegendItemData[] = data.series.map((item) => {
    const latestValue = item.values[lastIndex] ?? 0;

    return {
      id: item.id,
      label: item.label,
      color: item.color,
      value: formatMoney(latestValue),
      detail: formatPercent(latestValue, latestTotal),
      archived: item.archived
    };
  });

  return (
    <section className="asset-chart-panel">
      <header className="asset-chart-panel__header chart-visual-text">
        <div>
          <h2>账户趋势</h2>
        </div>
      </header>
      <GroupDetailTrendChart
        data={data}
        settings={settings}
        formatMoney={formatMoney}
        activeSeriesId={isDetailMode ? null : hoveredSeriesId}
        onSeriesHover={setHoveredSeriesId}
        detailMode={isDetailMode}
        onDetailModeChange={(enabled) => {
          setIsDetailMode(enabled);
          setHoveredSeriesId(null);
        }}
      />
      <ChartLegendList
        items={legendItems}
        emptyMessage="暂无账户趋势"
        activeId={isDetailMode ? null : hoveredSeriesId}
        onActiveIdChange={isDetailMode ? undefined : setHoveredSeriesId}
      />
    </section>
  );
}

export function GroupDetailChartDisplayPanel({
  groupName,
  structureData,
  trendData,
  settings,
  visibility,
  formatMoney = formatChartNumber,
  formatPercent = formatChartPercent
}: GroupDetailChartDisplayPanelProps) {
  return (
    <div className="asset-chart-page">
      <header className="asset-chart-page__header chart-visual-text">
        <div>
          <h1>{groupName}</h1>
        </div>
        <div className="asset-chart-page__totals">
          <span>当前合计</span>
          <strong>{formatMoney(structureData.signedTotal)}</strong>
        </div>
      </header>
      {visibility.showStructure ? (
        <GroupDetailStructurePanel
          data={structureData}
          formatMoney={formatMoney}
          formatPercent={formatPercent}
        />
      ) : null}
      {visibility.showTrend ? (
        <GroupDetailTrendPanel
          data={trendData}
          settings={settings}
          formatMoney={formatMoney}
          formatPercent={formatPercent}
        />
      ) : null}
      {!visibility.showStructure && !visibility.showTrend ? <ChartDisabledEmptyState /> : null}
    </div>
  );
}
