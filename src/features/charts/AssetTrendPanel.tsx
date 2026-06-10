import {
  type FocusEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState
} from 'react';
import {
  buildSteppedLineSegments,
  createSteppedLinePath,
  getChartAxisLabelIndexes,
  getChartValueLabelIndexes,
  getLineChartYAxisScale,
  getNearestChangeDatePointIndex,
  resolveLinePointLabelLayout,
  getVisibleTrendMarkerIndexes,
  type ChartPointKind,
  type ChartPointValueMode,
  type ChartXAxisRange
} from '../../chartLogic';
import NfFloatingTooltip from '../../components/tooltip/NfFloatingTooltip';
import type { NfFloatingTooltipData } from '../../components/tooltip/nfTooltipTypes';
import ChartLegendList, { getInteractiveChartClassName, type ChartLegendItemData } from './ChartLegendList';
import { CHART_COLORS } from './chartColors';

export type TrendAssetDisplay = 'net' | 'positive' | 'positive-negative';

export type TrendChartPoint = {
  date: string;
  kind: ChartPointKind;
  net: number;
  positive: number;
  negative: number;
};

export type TrendChartSeries = {
  key: 'net' | 'positive' | 'negative';
  label: string;
  color: string;
  values: number[];
};

export type AssetTrendPanelSettings = {
  assetDisplay: TrendAssetDisplay;
  adaptiveYAxis: boolean;
  xAxisRange: ChartXAxisRange;
  pointValueMode: ChartPointValueMode;
};

type AssetTrendDetailPoint = {
  index: number;
  seriesKey: TrendChartSeries['key'];
};

type AssetTrendPanelProps = {
  points: TrendChartPoint[];
  settings: AssetTrendPanelSettings;
  formatMoney: (amount: number | null, maximumFractionDigits?: number) => string;
};

type AssetTrendChartProps = AssetTrendPanelProps & {
  compact?: boolean;
  activeSeriesId?: string | null;
  onSeriesHover?: (id: string | null) => void;
  detailMode?: boolean;
  onDetailModeChange?: (enabled: boolean) => void;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getMouseTooltipData = (
  event: MouseEvent<SVGElement>,
  content: string
): NfFloatingTooltipData => ({
  content,
  x: event.clientX,
  y: event.clientY
});

const getFocusTooltipData = (
  event: FocusEvent<SVGElement>,
  content: string
): NfFloatingTooltipData => {
  const bounds = event.currentTarget.getBoundingClientRect();

  return {
    content,
    x: bounds.left + bounds.width / 2,
    y: bounds.top
  };
};

const getTrendSeries = (
  points: TrendChartPoint[],
  display: TrendAssetDisplay
): TrendChartSeries[] => {
  if (display === 'net') {
    return [
      {
        key: 'net',
        label: '净资产',
        color: CHART_COLORS.netLine,
        values: points.map((point) => point.net)
      }
    ];
  }

  if (display === 'positive') {
    return [
      {
        key: 'positive',
        label: '正资产',
        color: CHART_COLORS.positiveLine,
        values: points.map((point) => point.positive)
      }
    ];
  }

  const positiveNegativeSeries: TrendChartSeries[] = [
    {
      key: 'positive',
      label: '正资产',
      color: CHART_COLORS.positiveLine,
      values: points.map((point) => point.positive)
    },
    {
      key: 'negative',
      label: '负资产',
      color: CHART_COLORS.negativeLine,
      values: points.map((point) => point.negative)
    }
  ];

  return positiveNegativeSeries.filter((series) =>
    series.values.some((value) => value !== 0)
  );
};

const getTrendBoundaryMessage = (
  points: TrendChartPoint[],
  display: TrendAssetDisplay
) => {
  if (points.length < 2) {
    return '暂无足够数据';
  }

  if (display === 'net' && points.every((point) => point.net === 0)) {
    return '净资产为 0';
  }

  if (display === 'positive' && points.every((point) => point.positive === 0)) {
    return '正资产为 0';
  }

  if (
    display === 'positive-negative' &&
    points.every((point) => point.positive === 0 && point.negative === 0)
  ) {
    return '正负资产均为 0';
  }

  return null;
};

const getAxisLabelIndexes = (count: number, range: ChartXAxisRange, width: number) => {
  return getChartAxisLabelIndexes(count, range, width);
};

const getValueLabelIndexes = (
  series: TrendChartSeries,
  mode: ChartPointValueMode,
  width: number
) => {
  return getChartValueLabelIndexes(series.values, mode, width);
};

const estimatePointValueLabelWidth = (text: string) =>
  Math.max(54, Math.ceil(text.length * 6.2 + 6));

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

export function AssetTrendChart({
  points,
  settings,
  formatMoney,
  compact = false,
  activeSeriesId,
  onSeriesHover,
  detailMode = false,
  onDetailModeChange
}: AssetTrendChartProps) {
  const [containerRef, measuredWidth] = useMeasuredWidth<HTMLDivElement>();
  const [detailPoint, setDetailPoint] = useState<AssetTrendDetailPoint | null>(null);
  const [chartTooltip, setChartTooltip] = useState<NfFloatingTooltipData | null>(null);
  const message = getTrendBoundaryMessage(points, settings.assetDisplay);
  const visibleSeries = getTrendSeries(points, settings.assetDisplay);
  const densityWidth = measuredWidth || (compact ? 220 : 620);
  const isDetailMode = !compact && detailMode;
  const chartActiveSeriesId = isDetailMode ? null : activeSeriesId;

  useEffect(() => {
    setDetailPoint(null);
    setChartTooltip(null);
  }, [isDetailMode, points, settings.assetDisplay]);

  if (message || visibleSeries.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`asset-trend-chart${compact ? ' is-compact' : ''} is-empty`}
      >
        <span className="chart-visual-text">{message ?? '暂无足够数据'}</span>
      </div>
    );
  }

  const viewWidth = compact ? 240 : 640;
  const compactTargetHeight = 96;
  const viewHeight = compact
    ? (viewWidth * compactTargetHeight) / Math.max(densityWidth, 1)
    : 280;
  const padding = compact
    ? {
        top: viewHeight * 0.25,
        right: 18,
        bottom: viewHeight * 0.25,
        left: 18
      }
    : { top: 28, right: 32, bottom: 46, left: 56 };
  const plotWidth = viewWidth - padding.left - padding.right;
  const plotHeight = viewHeight - padding.top - padding.bottom;
  const values = visibleSeries.flatMap((series) => series.values);
  const yScale = getLineChartYAxisScale(values, {
    rangeMode: settings.adaptiveYAxis ? 'dynamic' : 'baseline',
    targetTickCount: compact ? 4 : 5
  });
  const [yMin, yMax] = yScale.domain;

  const getX = (index: number) =>
    padding.left + (points.length === 1 ? 0 : (index / (points.length - 1)) * plotWidth);
  const getY = (value: number) =>
    padding.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;
  const axisLabelIndexes = compact
    ? []
    : getAxisLabelIndexes(points.length, settings.xAxisRange, densityWidth);
  const yAxisLabels = compact ? [] : yScale.ticks;
  const trendStrokeWidth = compact
    ? densityWidth < 180
      ? 2.8
      : 3.15
    : visibleSeries.length > 1
      ? 2.25
      : 2.5;
  const trendPointRadius = 3.25;
  const visibleLineSegments = visibleSeries.flatMap((series) =>
    buildSteppedLineSegments(series.values, getX, getY)
  );
  const visiblePointObstacles = visibleSeries.flatMap((series) =>
    series.values.map((value, index) => ({
      x: getX(index),
      y: getY(value)
    }))
  );
  const valueLabelIndexesBySeries = new Map<TrendChartSeries['key'], number[]>();
  const markerIndexesBySeries = new Map<TrendChartSeries['key'], number[]>();
  const valueLabelLayouts = new Map<
    string,
    ReturnType<typeof resolveLinePointLabelLayout>
  >();
  const placedLabelRects: ReturnType<typeof resolveLinePointLabelLayout>['bounds'][] = [];

  visibleSeries.forEach((series) => {
    const valueLabelIndexes = compact
      ? []
      : getValueLabelIndexes(series, settings.pointValueMode, densityWidth);
    const markerIndexes = compact
      ? []
      : getVisibleTrendMarkerIndexes(valueLabelIndexes, series.values.length);

    valueLabelIndexesBySeries.set(series.key, valueLabelIndexes);
    markerIndexesBySeries.set(series.key, markerIndexes);

    valueLabelIndexes.forEach((index) => {
      const value = series.values[index];
      const labelText = formatMoney(value);
      const labelLayout = resolveLinePointLabelLayout({
        pointX: getX(index),
        pointY: getY(value),
        plotLeft: padding.left,
        plotTop: padding.top,
        plotWidth,
        plotHeight,
        preferBelow: series.key === 'negative' || value < 0,
        labelWidth: estimatePointValueLabelWidth(labelText),
        pointRadius: trendPointRadius,
        lineSegments: visibleLineSegments,
        pointObstacles: visiblePointObstacles,
        placedLabelRects,
        allowHide: settings.pointValueMode === 'adaptive',
        isEndPoint: index === series.values.length - 1
      });

      valueLabelLayouts.set(`${series.key}-${index}`, labelLayout);
      if (!labelLayout.hidden) {
        placedLabelRects.push(labelLayout.bounds);
      }
    });
  });

  const updateDetailPointFromMouse = (event: MouseEvent<SVGSVGElement>) => {
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
      setDetailPoint(null);
      return;
    }

    const nearestIndex = getNearestChangeDatePointIndex(points, cursorX, getX);

    if (nearestIndex < 0) {
      setDetailPoint(null);
      return;
    }

    const nearestSeries = visibleSeries.reduce((bestSeries, series) => {
      const currentDistance = Math.abs(getY(series.values[nearestIndex] ?? 0) - cursorY);
      const bestDistance = Math.abs(getY(bestSeries.values[nearestIndex] ?? 0) - cursorY);

      return currentDistance < bestDistance ? series : bestSeries;
    }, visibleSeries[0] as TrendChartSeries);

    setDetailPoint({
      index: nearestIndex,
      seriesKey: nearestSeries.key
    });
  };

  const toggleDetailMode = () => {
    if (compact) {
      return;
    }

    onSeriesHover?.(null);
    setDetailPoint(null);
    onDetailModeChange?.(!isDetailMode);
  };

  const detailSeries = detailPoint
    ? visibleSeries.find((series) => series.key === detailPoint.seriesKey)
    : null;
  const detailValue =
    detailPoint && detailSeries ? detailSeries.values[detailPoint.index] ?? 0 : 0;
  const detailX = detailPoint ? getX(detailPoint.index) : 0;
  const detailY = detailPoint ? getY(detailValue) : 0;
  const detailBubbleWidth = 116;
  const detailBubbleX = detailPoint
    ? clampNumber(
        detailX + (detailX > viewWidth - detailBubbleWidth - 14 ? -detailBubbleWidth - 10 : 10),
        padding.left,
        viewWidth - detailBubbleWidth - 4
      )
    : 0;
  const detailBubbleY = detailPoint
    ? clampNumber(detailY - 30, padding.top + 4, padding.top + plotHeight - 28)
    : 0;

  return (
    <div ref={containerRef} className={`asset-trend-chart${compact ? ' is-compact' : ''}`}>
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        role="img"
        aria-hidden={compact ? true : undefined}
        onDoubleClick={toggleDetailMode}
        onMouseMove={isDetailMode ? updateDetailPointFromMouse : undefined}
        onMouseLeave={() => {
          setDetailPoint(null);
          setChartTooltip(null);
          if (!isDetailMode) {
            onSeriesHover?.(null);
          }
        }}
      >
        {!compact ? (
          <>
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + plotHeight}
              stroke="var(--chart-axis-line)"
            />
            <line
              x1={padding.left}
              y1={padding.top + plotHeight}
              x2={padding.left + plotWidth}
              y2={padding.top + plotHeight}
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
                key={points[index].date}
                x={getX(index)}
                y={viewHeight - 14}
                textAnchor="middle"
                fill="var(--chart-axis-text)"
                fontSize="10"
                className="chart-svg-text"
              >
                {points[index].date.slice(5)}
              </text>
            ))}
          </>
        ) : null}

        {visibleSeries.map((series) => {
          const path = createSteppedLinePath(series.values, getX, getY);
          const valueLabelIndexes = valueLabelIndexesBySeries.get(series.key) ?? [];
          const markerIndexes = markerIndexesBySeries.get(series.key) ?? [];
          const strokeColor = compact
            ? series.key === 'net'
              ? CHART_COLORS.compactNetLine
              : CHART_COLORS.compactTrendLine
            : series.color;
          const isActive = chartActiveSeriesId === series.key;
          const isDimmed = Boolean(chartActiveSeriesId && chartActiveSeriesId !== series.key);

          return (
            <g key={series.key}>
              <path
                d={path}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isActive ? trendStrokeWidth + 0.7 : trendStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={isDimmed ? 0.24 : 1}
                className={getInteractiveChartClassName('chart-series-line', series.key, chartActiveSeriesId)}
                onMouseEnter={() => {
                  if (!isDetailMode) {
                    onSeriesHover?.(series.key);
                  }
                }}
                onMouseLeave={() => {
                  if (!isDetailMode) {
                    onSeriesHover?.(null);
                  }
                }}
              />
              {!compact ? (
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="stroke"
                  onMouseEnter={() => {
                    if (!isDetailMode) {
                      onSeriesHover?.(series.key);
                    }
                  }}
                  onMouseLeave={() => {
                    if (!isDetailMode) {
                      onSeriesHover?.(null);
                    }
                  }}
                />
              ) : null}
              {markerIndexes.map((index) => {
                const value = series.values[index];
                const tooltipLabel = `${points[index].date} \u00b7 ${series.label} ${formatMoney(value)}`;

                return (
                  <circle
                    key={`${series.key}-${points[index].date}`}
                    cx={getX(index)}
                    cy={getY(value)}
                    r={isActive ? trendPointRadius + 0.7 : trendPointRadius}
                    fill="var(--chart-point-fill)"
                    stroke={series.color}
                    strokeWidth="1.5"
                    opacity={isDimmed ? 0.35 : 1}
                    aria-label={tooltipLabel}
                    className={getInteractiveChartClassName('chart-shape', series.key, chartActiveSeriesId)}
                    onMouseEnter={(event) => {
                      if (!isDetailMode) {
                        onSeriesHover?.(series.key);
                      }
                      setChartTooltip(getMouseTooltipData(event, tooltipLabel));
                    }}
                    onMouseMove={(event) => {
                      setChartTooltip(getMouseTooltipData(event, tooltipLabel));
                    }}
                    onMouseLeave={() => {
                      if (!isDetailMode) {
                        onSeriesHover?.(null);
                      }
                      setChartTooltip(null);
                    }}
                    onFocus={(event) => {
                      if (!isDetailMode) {
                        onSeriesHover?.(series.key);
                      }
                      setChartTooltip(getFocusTooltipData(event, tooltipLabel));
                    }}
                    onBlur={() => {
                      if (!isDetailMode) {
                        onSeriesHover?.(null);
                      }
                      setChartTooltip(null);
                    }}
                  />
                );
              })}
              {valueLabelIndexes.map((index) => {
                const value = series.values[index];
                const labelText = formatMoney(value);
                const labelLayout =
                  valueLabelLayouts.get(`${series.key}-${index}`) ??
                  resolveLinePointLabelLayout({
                    pointX: getX(index),
                    pointY: getY(value),
                    plotLeft: padding.left,
                    plotTop: padding.top,
                    plotWidth,
                    plotHeight,
                    preferBelow: series.key === 'negative' || value < 0,
                    labelWidth: estimatePointValueLabelWidth(labelText),
                    pointRadius: trendPointRadius,
                    lineSegments: visibleLineSegments,
                    pointObstacles: visiblePointObstacles,
                    allowHide: settings.pointValueMode === 'adaptive',
                    isEndPoint: index === series.values.length - 1
                  });

                if (labelLayout.hidden) {
                  return null;
                }

                return (
                  <text
                    key={`${series.key}-value-${points[index].date}`}
                    x={labelLayout.x}
                    y={labelLayout.y}
                    textAnchor={labelLayout.textAnchor}
                    dominantBaseline={labelLayout.dominantBaseline}
                    fill={series.color}
                    fontSize="10"
                    fontWeight="700"
                    className="chart-svg-text chart-value-label"
                  >
                    {labelText}
                  </text>
                );
              })}
            </g>
          );
        })}
        {isDetailMode && detailPoint && detailSeries ? (
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
              stroke={detailSeries.color}
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
              {points[detailPoint.index].date}
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
              {detailSeries.label} {formatMoney(detailValue)}
            </text>
          </g>
        ) : null}
      </svg>
      <NfFloatingTooltip tooltip={chartTooltip} />
    </div>
  );
}

function AssetTrendPanel({ points, settings, formatMoney }: AssetTrendPanelProps) {
  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);
  const [isDetailMode, setIsDetailMode] = useState(false);
  const series = getTrendSeries(points, settings.assetDisplay);
  const lastIndex = Math.max(0, points.length - 1);
  const legendItems: ChartLegendItemData[] = series.map((item) => ({
    id: item.key,
    label: item.label,
    color: item.color,
    value: formatMoney(item.values[lastIndex] ?? 0),
    swatch: 'line'
  }));

  return (
    <section className="asset-chart-panel">
      <header className="asset-chart-panel__header chart-visual-text">
        <div>
          <h2>资产趋势</h2>
        </div>
      </header>
      <AssetTrendChart
        points={points}
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
        emptyMessage="暂无资产趋势"
        activeId={isDetailMode ? null : hoveredSeriesId}
        onActiveIdChange={isDetailMode ? undefined : setHoveredSeriesId}
      />
    </section>
  );
}

export default AssetTrendPanel;
