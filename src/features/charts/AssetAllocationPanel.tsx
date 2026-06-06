import { useState } from 'react';
import {
  getArchivedChartTooltipLabel,
  NETRAFLOW_CHART_PALETTE,
  PIE_SEGMENT_SEPARATOR_CONFIG
} from '../../chartLogic';
import ChartLegendList, { getInteractiveChartClassName, type ChartLegendItemData } from './ChartLegendList';
import { CHART_COLORS } from './chartColors';
import type { AssetStructureChartData, ChartSegment } from './assetStructureData';

export type StructureAssetDisplay = 'positive' | 'negative' | 'both';

export type AssetAllocationPanelSettings = {
  assetDisplay: StructureAssetDisplay;
  showDebtMultiple: boolean;
};

type AssetAllocationPanelProps = {
  data: AssetStructureChartData;
  settings: AssetAllocationPanelSettings;
  formatMoney: (amount: number | null, maximumFractionDigits?: number) => string;
  formatPercent: (numerator: number, denominator: number) => string;
};

type SegmentGraphicProps = {
  segments: ChartSegment[];
  total: number;
  cx: number;
  cy: number;
  activeSegmentId?: string | null;
  onSegmentHover?: (id: string | null) => void;
  formatMoney: (amount: number | null, maximumFractionDigits?: number) => string;
};

const getDebtMultipleLabel = (debtRatio: number) =>
  Number.isFinite(debtRatio) && debtRatio >= 2 ? `≥${Math.floor(debtRatio)}×` : '';

const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
};

const describePieSlice = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z'
  ].join(' ');
};

const describeDonutSegment = (
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) => {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
    'Z'
  ].join(' ');
};

export function PieSegments({
  segments,
  total,
  cx,
  cy,
  radius,
  activeSegmentId,
  onSegmentHover,
  formatMoney
}: SegmentGraphicProps & { radius: number }) {
  if (total <= 0 || segments.length === 0) {
    return <circle cx={cx} cy={cy} r={radius} fill={CHART_COLORS.empty} opacity="0.55" />;
  }

  if (segments.length === 1) {
    const segment = segments[0];

    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={segment.color}
        className={getInteractiveChartClassName('chart-shape', segment.id, activeSegmentId)}
        onMouseEnter={() => onSegmentHover?.(segment.id)}
        onMouseLeave={() => onSegmentHover?.(null)}
      >
        <title>
          {`${getArchivedChartTooltipLabel(segment.label, segment.archived)} · ${formatMoney(segment.amount)}`}
        </title>
      </circle>
    );
  }

  let currentAngle = 0;

  return (
    <>
      {segments.map((segment) => {
        const startAngle = currentAngle;
        const endAngle = currentAngle + (segment.amount / total) * 360;
        currentAngle = endAngle;

        return (
          <path
            key={segment.id}
            d={describePieSlice(cx, cy, radius, startAngle, endAngle)}
            fill={segment.color}
            {...PIE_SEGMENT_SEPARATOR_CONFIG}
            className={getInteractiveChartClassName('chart-shape', segment.id, activeSegmentId)}
            onMouseEnter={() => onSegmentHover?.(segment.id)}
            onMouseLeave={() => onSegmentHover?.(null)}
          >
            <title>
              {`${getArchivedChartTooltipLabel(segment.label, segment.archived)} · ${formatMoney(segment.amount)}`}
            </title>
          </path>
        );
      })}
    </>
  );
}

function DonutSegments({
  segments,
  total,
  cx,
  cy,
  innerRadius,
  outerRadius,
  activeSegmentId,
  onSegmentHover,
  formatMoney
}: SegmentGraphicProps & { innerRadius: number; outerRadius: number }) {
  if (total <= 0 || segments.length === 0) {
    return null;
  }

  if (segments.length === 1) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={(innerRadius + outerRadius) / 2}
        fill="none"
        stroke={segments[0].color}
        strokeWidth={outerRadius - innerRadius}
        className={getInteractiveChartClassName('chart-shape', segments[0].id, activeSegmentId)}
        onMouseEnter={() => onSegmentHover?.(segments[0].id)}
        onMouseLeave={() => onSegmentHover?.(null)}
      >
        <title>
          {`${getArchivedChartTooltipLabel(segments[0].label, segments[0].archived)} · ${formatMoney(segments[0].amount)}`}
        </title>
      </circle>
    );
  }

  let currentAngle = 0;

  return (
    <>
      {segments.map((segment) => {
        const startAngle = currentAngle;
        const endAngle = currentAngle + (segment.amount / total) * 360;
        currentAngle = endAngle;

        return (
          <path
            key={segment.id}
            d={describeDonutSegment(cx, cy, innerRadius, outerRadius, startAngle, endAngle)}
            fill={segment.color}
            {...PIE_SEGMENT_SEPARATOR_CONFIG}
            className={getInteractiveChartClassName('chart-shape', segment.id, activeSegmentId)}
            onMouseEnter={() => onSegmentHover?.(segment.id)}
            onMouseLeave={() => onSegmentHover?.(null)}
          >
            <title>
              {`${getArchivedChartTooltipLabel(segment.label, segment.archived)} · ${formatMoney(segment.amount)}`}
            </title>
          </path>
        );
      })}
    </>
  );
}

function DebtRatioRing({
  ratio,
  cx,
  cy,
  radius,
  strokeWidth
}: {
  ratio: number;
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const safeRatio = Number.isFinite(ratio) ? Math.max(0, ratio) : 0;
  const baseRatio = Math.min(safeRatio, 1);
  const overlayRatio = safeRatio > 1 ? Math.min(safeRatio - 1, 1) : 0;

  return (
    <>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={CHART_COLORS.empty}
        strokeWidth={strokeWidth}
        opacity="0.42"
      />
      {baseRatio > 0 ? (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={NETRAFLOW_CHART_PALETTE[2]}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference * baseRatio} ${circumference}`}
          strokeLinecap={baseRatio >= 1 ? 'butt' : 'round'}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ) : null}
      {overlayRatio > 0 ? (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={CHART_COLORS.liabilityOverlay}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference * overlayRatio} ${circumference}`}
          strokeLinecap={overlayRatio >= 1 ? 'butt' : 'round'}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ) : null}
    </>
  );
}

const getStructureCenterMessage = (
  data: AssetStructureChartData,
  display: StructureAssetDisplay
) => {
  if (display === 'positive' && data.positiveTotal === 0) {
    return '正资产为 0';
  }

  if (display === 'negative' && data.negativeTotal === 0) {
    return '负资产为 0';
  }

  if (display === 'both') {
    if (data.positiveTotal === 0 && data.negativeTotal === 0) {
      return '暂无资产结构';
    }

    if (data.positiveTotal === 0 && data.negativeTotal > 0) {
      return '正资产为 0';
    }
  }

  return '';
};

export function AssetStructureGraphic({
  data,
  display,
  compact = false,
  showDebtMultiple = true,
  activeSegmentId,
  onSegmentHover,
  formatMoney
}: {
  data: AssetStructureChartData;
  display: StructureAssetDisplay;
  compact?: boolean;
  showDebtMultiple?: boolean;
  activeSegmentId?: string | null;
  onSegmentHover?: (id: string | null) => void;
  formatMoney: (amount: number | null, maximumFractionDigits?: number) => string;
}) {
  const centerMessage = compact ? '' : getStructureCenterMessage(data, display);
  const debtMultipleLabel =
    display === 'both' && data.positiveTotal > 0 && showDebtMultiple
      ? getDebtMultipleLabel(data.debtRatio)
      : '';
  const shouldRenderDebtRing =
    display === 'both' && data.positiveTotal > 0 && data.negativeTotal > 0;
  const shouldRenderNegativeOnlyRing =
    display === 'both' && data.positiveTotal === 0 && data.negativeTotal > 0;
  const effectiveDisplay =
    display === 'both' && data.negativeTotal === 0 && data.positiveTotal > 0
      ? 'positive'
      : display;

  return (
    <div className={`asset-structure-graphic${compact ? ' is-compact' : ''}`}>
      <svg viewBox="0 0 120 120" role="img" aria-hidden={compact ? true : undefined}>
        <circle cx="60" cy="60" r="36" fill="var(--chart-center-bg)" />
        {effectiveDisplay === 'positive' ? (
          <PieSegments
            segments={data.positiveSegments}
            total={data.positiveTotal}
            cx={60}
            cy={60}
            radius={compact ? 33 : 34}
            activeSegmentId={activeSegmentId}
            onSegmentHover={onSegmentHover}
            formatMoney={formatMoney}
          />
        ) : null}
        {effectiveDisplay === 'negative' ? (
          <PieSegments
            segments={data.negativeSegments}
            total={data.negativeTotal}
            cx={60}
            cy={60}
            radius={compact ? 33 : 34}
            activeSegmentId={activeSegmentId}
            onSegmentHover={onSegmentHover}
            formatMoney={formatMoney}
          />
        ) : null}
        {effectiveDisplay === 'both' ? (
          <>
            <PieSegments
              segments={data.positiveSegments}
              total={data.positiveTotal}
              cx={60}
              cy={60}
              radius={32}
              activeSegmentId={activeSegmentId}
              onSegmentHover={onSegmentHover}
              formatMoney={formatMoney}
            />
            {shouldRenderDebtRing ? (
              <DebtRatioRing
                ratio={data.debtRatio}
                cx={60}
                cy={60}
                radius={compact ? 45 : 47}
                strokeWidth={compact ? 7 : 9}
              />
            ) : null}
            {shouldRenderNegativeOnlyRing ? (
              <DonutSegments
                segments={data.negativeSegments}
                total={data.negativeTotal}
                cx={60}
                cy={60}
                innerRadius={42}
                outerRadius={52}
                activeSegmentId={activeSegmentId}
                onSegmentHover={onSegmentHover}
                formatMoney={formatMoney}
              />
            ) : null}
          </>
        ) : null}
        {centerMessage ? (
          <text
            x="60"
            y="62"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--chart-axis-text)"
            fontSize="8.5"
            fontWeight="700"
            className="chart-svg-text"
          >
            {centerMessage}
          </text>
        ) : null}
      </svg>

      {debtMultipleLabel ? (
        <span className="asset-structure-graphic__multiple chart-visual-text">
          {debtMultipleLabel}
        </span>
      ) : null}
    </div>
  );
}

export function AccountStructureGraphic({
  segments,
  total,
  activeSegmentId,
  onSegmentHover,
  formatMoney,
  emptyLabel = '暂无占比'
}: {
  segments: ChartSegment[];
  total: number;
  activeSegmentId?: string | null;
  onSegmentHover?: (id: string | null) => void;
  formatMoney: (amount: number | null, maximumFractionDigits?: number) => string;
  emptyLabel?: string;
}) {
  return (
    <div className="asset-structure-graphic asset-structure-graphic--account-share">
      <svg viewBox="0 0 120 120" role="img">
        <circle cx="60" cy="60" r="36" fill="var(--chart-center-bg)" />
        <PieSegments
          segments={segments}
          total={total}
          cx={60}
          cy={60}
          radius={34}
          activeSegmentId={activeSegmentId}
          onSegmentHover={onSegmentHover}
          formatMoney={formatMoney}
        />
        {total <= 0 ? (
          <text
            x="60"
            y="62"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--chart-axis-text)"
            fontSize="8.5"
            fontWeight="700"
            className="chart-svg-text"
          >
            {emptyLabel}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

const getStructureLegendRows = (
  data: AssetStructureChartData,
  display: StructureAssetDisplay,
  formatPercent: (numerator: number, denominator: number) => string
) => {
  if (display === 'positive') {
    return data.positiveSegments.map((segment) => ({
      ...segment,
      percent: formatPercent(segment.amount, data.positiveTotal)
    }));
  }

  if (display === 'negative') {
    return data.negativeSegments.map((segment) => ({
      ...segment,
      percent: formatPercent(segment.amount, data.negativeTotal)
    }));
  }

  return [
    ...data.positiveSegments.map((segment) => ({
      ...segment,
      percent: formatPercent(segment.amount, data.positiveTotal)
    })),
    ...data.negativeSegments.map((segment) => ({
      ...segment,
      percent: formatPercent(segment.amount, data.negativeTotal)
    }))
  ];
};

function AssetAllocationPanel({
  data,
  settings,
  formatMoney,
  formatPercent
}: AssetAllocationPanelProps) {
  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);
  const legendRows = getStructureLegendRows(data, settings.assetDisplay, formatPercent);
  const legendItems: ChartLegendItemData[] = legendRows.map((segment) => ({
    id: segment.id,
    label: segment.label,
    color: segment.color,
    value: formatMoney(segment.amount),
    detail: segment.percent,
    archived: segment.archived
  }));
  const debtRate =
    data.positiveTotal > 0
      ? `${(data.debtRatio * 100).toFixed(1)}%`
      : data.negativeTotal > 0
        ? '--'
        : '0%';

  return (
    <section className="asset-chart-panel">
      <header className="asset-chart-panel__header chart-visual-text">
        <div>
          <h2>资产占比</h2>
        </div>
        <div className="asset-chart-panel__stat">
          <span>负债率</span>
          <strong>{debtRate}</strong>
        </div>
      </header>

      <div className="asset-structure-detail">
        <AssetStructureGraphic
          data={data}
          display={settings.assetDisplay}
          showDebtMultiple={settings.showDebtMultiple}
          activeSegmentId={hoveredSeriesId}
          onSegmentHover={setHoveredSeriesId}
          formatMoney={formatMoney}
        />
        <ChartLegendList
          items={legendItems}
          emptyMessage="暂无资产结构"
          activeId={hoveredSeriesId}
          onActiveIdChange={setHoveredSeriesId}
        />
      </div>
    </section>
  );
}

export default AssetAllocationPanel;
