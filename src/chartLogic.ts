export const NETRAFLOW_CHART_PALETTE = [
  '#4E79A7',
  '#59A14F',
  '#D9756B',
  '#8E6BB1',
  '#4FA3A5',
  '#B88A3D',
  '#C06C84',
  '#7C9A4F',
  '#C47C3C',
  '#6F8FD6',
  '#A66A52',
  '#6E9B8E'
] as const;

export type ChartColorAssignmentMode = 'createdAt' | 'share';
export type ChartXAxisRange = '1m' | '3m' | '6m' | '1y';
export type ChartPointValueMode = 'adaptive' | 'minmax' | 'none';
export type GlobalChartControlMode = 'peer' | 'locked';
export type ChartPointKind = 'change-date' | 'carry-forward';

export type BasicCategoryChartSettings = {
  xAxisRange: ChartXAxisRange;
  pointValueMode: ChartPointValueMode;
};

export type BasicAccountChartSettings = BasicCategoryChartSettings & {
  adaptiveYAxis: boolean;
};

export type ChartColorItem = {
  id: string;
  label: string;
  amount: number;
  order: number;
};

export type DisplayChartItem = ChartColorItem & {
  color: string;
  sourceIds: string[];
};

export type StackedChartSeries = {
  values: number[];
};

export type StackedChartLayer<T extends StackedChartSeries> = {
  series: T;
  lowerValues: number[];
  upperValues: number[];
};

export type StackedYAxisDirection = 'positive' | 'negative';

export type NiceYAxisScale = {
  domain: [number, number];
  ticks: number[];
};

export type ChartValueLabelLayout = {
  x: number;
  y: number;
  textAnchor: 'start' | 'middle' | 'end';
};

export type ChartValueLabelLayoutOptions = {
  pointX: number;
  pointY: number;
  plotLeft: number;
  plotTop: number;
  plotWidth: number;
  plotHeight: number;
  preferBelow?: boolean;
  labelWidth?: number;
  labelHeight?: number;
  gap?: number;
  padding?: number;
};

export const isChartColorAssignmentMode = (
  value: unknown
): value is ChartColorAssignmentMode => value === 'createdAt' || value === 'share';

export const isChartXAxisRange = (value: unknown): value is ChartXAxisRange =>
  value === '1m' || value === '3m' || value === '6m' || value === '1y';

export const isChartPointValueMode = (value: unknown): value is ChartPointValueMode =>
  value === 'adaptive' || value === 'minmax' || value === 'none';

export const isGlobalChartControlMode = (
  value: unknown
): value is GlobalChartControlMode => value === 'peer' || value === 'locked';

export const normalizeChartPointValueMode = (
  value: unknown,
  fallback: ChartPointValueMode = 'adaptive'
): ChartPointValueMode => {
  if (value === 'all') {
    return 'adaptive';
  }

  return isChartPointValueMode(value) ? value : fallback;
};

export const normalizeGlobalChartControlMode = (
  value: unknown,
  fallback: GlobalChartControlMode = 'peer'
): GlobalChartControlMode => (isGlobalChartControlMode(value) ? value : fallback);

const DAY_MS = 24 * 60 * 60 * 1000;
const OTHER_LABEL = '其他';
const OTHER_COLOR = NETRAFLOW_CHART_PALETTE[NETRAFLOW_CHART_PALETTE.length - 1];
export const ARCHIVED_CHART_BADGE_LABEL = '已归档';
export const PIE_SEGMENT_SEPARATOR_CONFIG = {
  stroke: 'var(--chart-separator)',
  strokeWidth: 0.38,
  strokeOpacity: 0.68,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  paintOrder: 'stroke fill',
  vectorEffect: 'non-scaling-stroke'
} as const;

export const getArchivedChartTooltipLabel = (label: string, archived?: boolean) =>
  archived ? `${label}（${ARCHIVED_CHART_BADGE_LABEL}）` : label;

export const cloneCategoryChartSettings = <T extends BasicCategoryChartSettings>(
  settings: T
): T => ({ ...settings });

export const getEffectiveCategoryChartSettings = <T extends BasicCategoryChartSettings>(
  controlMode: GlobalChartControlMode,
  globalCategoryChartSettings: T,
  categoryChartSettingsById: Record<string, T | undefined>,
  categoryId: string
): T => {
  if (controlMode === 'locked') {
    return globalCategoryChartSettings;
  }

  return categoryChartSettingsById[categoryId] ?? globalCategoryChartSettings;
};

export const syncCategoryChartSettingsFromGlobal = <T extends BasicCategoryChartSettings>(
  controlMode: GlobalChartControlMode,
  categoryIds: string[],
  currentSettingsById: Record<string, T | undefined>,
  globalCategoryChartSettings: T
): Record<string, T> => {
  if (controlMode === 'locked') {
    return Object.fromEntries(
      Object.entries(currentSettingsById)
        .filter((entry): entry is [string, T] => Boolean(entry[1]))
        .map(([id, settings]) => [id, cloneCategoryChartSettings(settings)])
    );
  }

  return Object.fromEntries(
    categoryIds.map((categoryId) => [
      categoryId,
      cloneCategoryChartSettings(globalCategoryChartSettings)
    ])
  );
};

export const getEffectiveAccountChartSettings = <T extends BasicAccountChartSettings>(
  controlMode: GlobalChartControlMode,
  globalAccountChartSettings: T,
  accountChartSettingsById: Record<string, T | undefined>,
  accountId: string
): T => {
  if (controlMode === 'locked') {
    return globalAccountChartSettings;
  }

  return accountChartSettingsById[accountId] ?? globalAccountChartSettings;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getDateTimestamp = (dateValue: string) => {
  const timestamp = new Date(`${dateValue}T00:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getChartRangeStartDate = (range: ChartXAxisRange, endDate = new Date()) => {
  const startDate = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );

  if (range === '1m') {
    startDate.setMonth(startDate.getMonth() - 1);
    return startDate;
  }

  if (range === '3m') {
    startDate.setMonth(startDate.getMonth() - 3);
    return startDate;
  }

  if (range === '1y') {
    startDate.setFullYear(startDate.getFullYear() - 1);
    return startDate;
  }

  startDate.setMonth(startDate.getMonth() - 6);
  return startDate;
};

export const getChartRangeDateKeys = (range: ChartXAxisRange, endDate = new Date()) => {
  const endKey = toDateInputValue(endDate);
  const startKey = toDateInputValue(getChartRangeStartDate(range, endDate));
  const endTimestamp = getDateTimestamp(endKey);
  const dateKeys: string[] = [];
  let cursor = getDateTimestamp(startKey);
  let guard = 0;

  while (cursor <= endTimestamp && guard < 420) {
    dateKeys.push(toDateInputValue(new Date(cursor)));
    cursor += DAY_MS;
    guard += 1;
  }

  return dateKeys;
};

export const getEvenlySpacedIndexes = (count: number, maxCount: number) => {
  if (count <= 0 || maxCount <= 0) {
    return [];
  }

  if (count <= maxCount) {
    return Array.from({ length: count }, (_, index) => index);
  }

  const indexes = new Set<number>();
  const lastIndex = count - 1;

  for (let index = 0; index < maxCount; index += 1) {
    indexes.add(Math.round((index * lastIndex) / (maxCount - 1)));
  }

  return Array.from(indexes).sort((left, right) => left - right);
};

export const getChartAxisLabelIndexes = (
  count: number,
  range: ChartXAxisRange,
  width: number
) => {
  const labelWidth =
    range === '1m' ? 72 : range === '3m' ? 88 : range === '6m' ? 108 : 118;
  const rangeLimit = range === '1m' ? 6 : range === '3m' ? 6 : range === '6m' ? 7 : 8;
  const widthLimit = width < 420 ? 4 : width < 620 ? 5 : width < 860 ? 7 : 9;
  const measuredLimit = width > 0 ? Math.floor(width / labelWidth) : rangeLimit;
  const maxCount = Math.max(2, Math.min(rangeLimit, widthLimit, measuredLimit));

  return getEvenlySpacedIndexes(count, maxCount);
};

const getReadableValueLabelCount = (width: number) => {
  if (width < 380) {
    return 2;
  }

  if (width < 560) {
    return 3;
  }

  if (width < 780) {
    return 4;
  }

  return 5;
};

const getValueLabelMinimumGap = (count: number, maxCount: number) =>
  Math.max(2, Math.ceil(count / Math.max(1, maxCount * 1.8)));

const getFirstExtremeIndex = (
  values: number[],
  compare: (current: number, candidate: number) => boolean
) => {
  if (values.length === 0) {
    return -1;
  }

  return values.reduce((bestIndex, value, index) => {
    const bestValue = values[bestIndex];
    return compare(value, bestValue) ? index : bestIndex;
  }, 0);
};

const canPlaceValueLabelIndex = (
  selectedIndexes: Set<number>,
  candidateIndex: number,
  minimumGap: number
) =>
  candidateIndex >= 0 &&
  !selectedIndexes.has(candidateIndex) &&
  Array.from(selectedIndexes).every(
    (selectedIndex) => Math.abs(selectedIndex - candidateIndex) >= minimumGap
  );

export const getMinMaxValueLabelIndexes = (values: number[], width: number) => {
  if (values.length === 0) {
    return [];
  }

  const selectedIndexes = new Set<number>();
  const maxIndex = getFirstExtremeIndex(values, (value, bestValue) => value > bestValue);
  const minIndex = getFirstExtremeIndex(values, (value, bestValue) => value < bestValue);
  const minimumGap = getValueLabelMinimumGap(values.length, getReadableValueLabelCount(width));

  selectedIndexes.add(maxIndex);

  if (canPlaceValueLabelIndex(selectedIndexes, minIndex, minimumGap)) {
    selectedIndexes.add(minIndex);
  }

  return Array.from(selectedIndexes).sort((left, right) => left - right);
};

export const getAdaptiveValueLabelIndexes = (values: number[], width: number) => {
  if (values.length === 0) {
    return [];
  }

  const maxCount = Math.min(values.length, getReadableValueLabelCount(width));
  const selectedIndexes = new Set<number>();
  const minimumGap = getValueLabelMinimumGap(values.length, maxCount);
  const maxIndex = getFirstExtremeIndex(values, (value, bestValue) => value > bestValue);
  const minIndex = getFirstExtremeIndex(values, (value, bestValue) => value < bestValue);
  const addIndex = (candidateIndex: number) => {
    if (selectedIndexes.size >= maxCount) {
      return;
    }

    if (
      selectedIndexes.size === 0 ||
      canPlaceValueLabelIndex(selectedIndexes, candidateIndex, minimumGap)
    ) {
      selectedIndexes.add(candidateIndex);
    }
  };

  addIndex(maxIndex);
  addIndex(minIndex);

  const extraIndexes = getEvenlySpacedIndexes(
    values.length,
    Math.min(values.length, Math.max(maxCount + 2, maxCount * 2))
  );

  extraIndexes.forEach(addIndex);

  return Array.from(selectedIndexes).sort((left, right) => left - right);
};

export const getChartValueLabelIndexes = (
  values: number[],
  mode: ChartPointValueMode,
  width: number
) => {
  if (mode === 'none') {
    return [];
  }

  if (mode === 'minmax') {
    return getMinMaxValueLabelIndexes(values, width);
  }

  return getAdaptiveValueLabelIndexes(values, width);
};

export const getVisibleTrendMarkerIndexes = (
  valueLabelIndexes: number[],
  pointCount: number
) =>
  Array.from(
    new Set(
      valueLabelIndexes.filter(
        (index) => Number.isInteger(index) && index >= 0 && index < pointCount
      )
    )
  ).sort((left, right) => left - right);

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const getChartValueLabelLayout = ({
  pointX,
  pointY,
  plotLeft,
  plotTop,
  plotWidth,
  plotHeight,
  preferBelow = false,
  labelWidth = 64,
  labelHeight = 12,
  gap = 10,
  padding = 2
}: ChartValueLabelLayoutOptions): ChartValueLabelLayout => {
  const plotRight = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;
  const canFitAbove = pointY - gap - labelHeight >= plotTop + padding;
  const canFitBelow = pointY + gap + labelHeight <= plotBottom - padding;
  const placeBelow = preferBelow ? canFitBelow || !canFitAbove : !canFitAbove && canFitBelow;
  const rawY = placeBelow ? pointY + gap + labelHeight * 0.75 : pointY - gap;
  const y = clampNumber(rawY, plotTop + labelHeight, plotBottom - padding);
  const halfLabelWidth = labelWidth / 2;

  if (pointX - halfLabelWidth < plotLeft + padding) {
    return {
      x: plotLeft + padding,
      y,
      textAnchor: 'start'
    };
  }

  if (pointX + halfLabelWidth > plotRight - padding) {
    return {
      x: plotRight - padding,
      y,
      textAnchor: 'end'
    };
  }

  return {
    x: clampNumber(pointX, plotLeft + padding, plotRight - padding),
    y,
    textAnchor: 'middle'
  };
};

export const getNearestChangeDatePointIndex = <T extends { kind?: ChartPointKind }>(
  points: T[],
  cursorX: number,
  getX: (index: number) => number
) => {
  let nearestIndex = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    if (point.kind !== 'change-date') {
      return;
    }

    const distance = Math.abs(getX(index) - cursorX);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
};

const NICE_TICK_FACTORS = [1, 1.5, 2, 2.5, 5, 10] as const;

const normalizeTickValue = (value: number) => {
  const roundedValue = Math.round(value);
  return Object.is(roundedValue, -0) ? 0 : roundedValue;
};

export const getNiceTickStep = (rawStep: number) => {
  if (!Number.isFinite(rawStep) || rawStep <= 1) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;

  for (const factor of NICE_TICK_FACTORS) {
    const step = Number((factor * magnitude).toPrecision(12));

    if (
      step >= rawStep &&
      step >= 1 &&
      Math.abs(step - Math.round(step)) < Number.EPSILON * 100
    ) {
      return Math.round(step);
    }
  }

  const fallbackStep = 10 * magnitude;
  return Math.max(1, Math.round(fallbackStep));
};

const buildTickRange = (start: number, end: number, step: number) => {
  const ticks: number[] = [];
  const maxGuard = 40;

  for (
    let value = start, guard = 0;
    value <= end + step / 2 && guard < maxGuard;
    value += step, guard += 1
  ) {
    ticks.push(normalizeTickValue(value));
  }

  return ticks;
};

const getFiniteValues = (values: number[]) => values.filter((value) => Number.isFinite(value));

export const getPositiveNiceYAxisScale = (
  values: number[],
  targetTickCount = 5
): NiceYAxisScale => {
  const finiteValues = getFiniteValues(values);
  const maxValue = Math.max(0, ...finiteValues);
  const step = getNiceTickStep(maxValue / Math.max(1, targetTickCount - 1));
  const upper = Math.max(step, Math.ceil(maxValue / step) * step);

  return {
    domain: [0, upper],
    ticks: buildTickRange(0, upper, step)
  };
};

export const getNegativeNiceYAxisScale = (
  values: number[],
  targetTickCount = 5
): NiceYAxisScale => {
  const finiteValues = getFiniteValues(values);
  const minValue = Math.min(0, ...finiteValues);
  const step = getNiceTickStep(Math.abs(minValue) / Math.max(1, targetTickCount - 1));
  const lower = Math.min(-step, Math.floor(minValue / step) * step);

  return {
    domain: [lower, 0],
    ticks: buildTickRange(lower, 0, step)
  };
};

export const getNiceYAxisScale = (
  values: number[],
  options: {
    includeZero?: boolean;
    mode?: 'auto' | 'positive' | 'negative' | 'mixed';
    targetTickCount?: number;
  } = {}
): NiceYAxisScale => {
  const finiteValues = getFiniteValues(values);
  const targetTickCount = options.targetTickCount ?? 5;

  if (finiteValues.length === 0) {
    return getPositiveNiceYAxisScale([0], targetTickCount);
  }

  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const mode =
    options.mode === 'auto' || options.mode === undefined
      ? rawMax <= 0
        ? 'negative'
        : rawMin >= 0
          ? 'positive'
          : 'mixed'
      : options.mode;

  if (mode === 'positive') {
    return getPositiveNiceYAxisScale(finiteValues, targetTickCount);
  }

  if (mode === 'negative') {
    return getNegativeNiceYAxisScale(finiteValues, targetTickCount);
  }

  const includeZero = options.includeZero ?? true;
  let minValue = includeZero ? Math.min(0, rawMin) : rawMin;
  let maxValue = includeZero ? Math.max(0, rawMax) : rawMax;

  if (minValue === maxValue) {
    const padding = Math.max(1, Math.abs(minValue) * 0.1);
    minValue -= padding;
    maxValue += padding;
  }

  const step = getNiceTickStep((maxValue - minValue) / Math.max(1, targetTickCount - 1));
  const lower = Math.floor(minValue / step) * step;
  const upper = Math.ceil(maxValue / step) * step;

  return {
    domain: [lower, upper],
    ticks: buildTickRange(lower, upper, step)
  };
};

export const getZeroAnchoredStackedYAxisScale = (
  totals: number[],
  direction: StackedYAxisDirection,
  targetTickCount = 5
): NiceYAxisScale =>
  direction === 'negative'
    ? getNegativeNiceYAxisScale(totals, targetTickCount)
    : getPositiveNiceYAxisScale(totals, targetTickCount);

const compareCreatedOrder = (left: ChartColorItem, right: ChartColorItem) =>
  left.order - right.order || left.label.localeCompare(right.label, 'zh-CN') || left.id.localeCompare(right.id);

export const getOrderedChartItems = (
  items: ChartColorItem[],
  mode: ChartColorAssignmentMode
) => {
  const nonZeroItems = items.filter((item) => Math.abs(item.amount) > 0);

  if (mode === 'share') {
    return [...nonZeroItems].sort(
      (left, right) => Math.abs(right.amount) - Math.abs(left.amount) || compareCreatedOrder(left, right)
    );
  }

  return [...nonZeroItems].sort(compareCreatedOrder);
};

const getRegistryEntries = (
  activeItems: ChartColorItem[],
  registry: Array<Pick<ChartColorItem, 'id' | 'order' | 'label'>> | undefined
) => {
  const entries = new Map<string, Pick<ChartColorItem, 'id' | 'order' | 'label'>>();

  registry?.forEach((item) => entries.set(item.id, item));
  activeItems.forEach((item) => {
    if (!entries.has(item.id)) {
      entries.set(item.id, item);
    }
  });

  return Array.from(entries.values()).sort(
    (left, right) =>
      left.order - right.order ||
      left.label.localeCompare(right.label, 'zh-CN') ||
      left.id.localeCompare(right.id)
  );
};

const resolveCreatedAtColors = (
  activeItems: ChartColorItem[],
  visibleItems: ChartColorItem[],
  registry: Array<Pick<ChartColorItem, 'id' | 'order' | 'label'>> | undefined,
  availableColorCount: number
) => {
  const visibleIds = new Set(visibleItems.map((item) => item.id));
  const activeIds = new Set(activeItems.map((item) => item.id));
  const colorMap = new Map<string, string>();
  const usedColorIndexes = new Set<number>();
  let cursor = 0;

  getRegistryEntries(activeItems, registry).forEach((entry) => {
    const preferredIndex = cursor % availableColorCount;

    if (visibleIds.has(entry.id)) {
      let colorIndex = preferredIndex;

      if (usedColorIndexes.size < availableColorCount && usedColorIndexes.has(colorIndex)) {
        for (let offset = 0; offset < availableColorCount; offset += 1) {
          const candidateIndex = (preferredIndex + offset) % availableColorCount;

          if (!usedColorIndexes.has(candidateIndex)) {
            colorIndex = candidateIndex;
            break;
          }
        }
      }

      colorMap.set(entry.id, NETRAFLOW_CHART_PALETTE[colorIndex]);
      usedColorIndexes.add(colorIndex);
    }

    if (activeIds.has(entry.id) || !visibleIds.has(entry.id)) {
      cursor += 1;
    }
  });

  visibleItems.forEach((item, index) => {
    if (!colorMap.has(item.id)) {
      colorMap.set(item.id, NETRAFLOW_CHART_PALETTE[index % availableColorCount]);
    }
  });

  return colorMap;
};

export const buildDisplayChartItems = (
  items: ChartColorItem[],
  mode: ChartColorAssignmentMode,
  options: {
    maxItems?: number;
    registry?: Array<Pick<ChartColorItem, 'id' | 'order' | 'label'>>;
    otherId?: string;
    otherLabel?: string;
  } = {}
): DisplayChartItem[] => {
  const maxItems = options.maxItems ?? NETRAFLOW_CHART_PALETTE.length;
  const orderedItems = getOrderedChartItems(items, mode);
  const hasOther = orderedItems.length > maxItems;
  const visibleLimit = hasOther ? Math.max(1, maxItems - 1) : maxItems;
  const visibleItems = orderedItems.slice(0, visibleLimit);
  const otherItems = orderedItems.slice(visibleLimit);
  const availableColorCount = hasOther
    ? Math.max(1, NETRAFLOW_CHART_PALETTE.length - 1)
    : NETRAFLOW_CHART_PALETTE.length;
  const createdAtColorMap =
    mode === 'createdAt'
      ? resolveCreatedAtColors(
          orderedItems,
          visibleItems,
          options.registry,
          availableColorCount
        )
      : null;

  const displayItems: DisplayChartItem[] = visibleItems.map((item, index) => ({
    ...item,
    color:
      mode === 'share'
        ? NETRAFLOW_CHART_PALETTE[index % availableColorCount]
        : createdAtColorMap?.get(item.id) ?? NETRAFLOW_CHART_PALETTE[index % availableColorCount],
    sourceIds: [item.id]
  }));

  if (hasOther) {
    displayItems.push({
      id: options.otherId ?? 'other',
      label: options.otherLabel ?? OTHER_LABEL,
      amount: otherItems.reduce((sum, item) => sum + Math.abs(item.amount), 0),
      order: Number.MAX_SAFE_INTEGER,
      color: OTHER_COLOR,
      sourceIds: otherItems.map((item) => item.id)
    });
  }

  return displayItems;
};

export const createSteppedLinePath = (
  values: number[],
  getX: (index: number) => number,
  getY: (value: number) => number
) => {
  if (values.length === 0) {
    return '';
  }

  const commands = [`M ${getX(0)} ${getY(values[0])}`];

  for (let index = 1; index < values.length; index += 1) {
    commands.push(`H ${getX(index)} V ${getY(values[index])}`);
  }

  return commands.join(' ');
};

export const createSteppedAreaPath = (
  topValues: number[],
  baseValues: number[],
  getX: (index: number) => number,
  getY: (value: number) => number
) => {
  if (topValues.length === 0 || topValues.length !== baseValues.length) {
    return '';
  }

  const commands = [`M ${getX(0)} ${getY(topValues[0])}`];

  for (let index = 1; index < topValues.length; index += 1) {
    commands.push(`H ${getX(index)} V ${getY(topValues[index])}`);
  }

  commands.push(`L ${getX(topValues.length - 1)} ${getY(baseValues[baseValues.length - 1])}`);

  for (let index = baseValues.length - 2; index >= 0; index -= 1) {
    commands.push(`V ${getY(baseValues[index])} H ${getX(index)}`);
  }

  commands.push('Z');
  return commands.join(' ');
};

export const buildSteppedStackLayers = <T extends StackedChartSeries>(
  series: T[]
): Array<StackedChartLayer<T>> => {
  const pointCount = series.reduce(
    (maxCount, item) => Math.max(maxCount, item.values.length),
    0
  );
  const cumulativeValues = Array.from({ length: pointCount }, () => 0);

  return series.map((item) => {
    const lowerValues = [...cumulativeValues];
    const upperValues = cumulativeValues.map((value, index) => {
      const nextValue = value + (item.values[index] ?? 0);
      cumulativeValues[index] = nextValue;
      return nextValue;
    });

    return {
      series: item,
      lowerValues,
      upperValues
    };
  });
};

export const getZeroAnchoredStackedYAxisDomain = (
  totals: number[],
  direction: StackedYAxisDirection
): [number, number] => {
  const finiteTotals = totals.filter((value) => Number.isFinite(value));

  if (finiteTotals.length === 0) {
    return [0, 0];
  }

  if (direction === 'negative') {
    return [Math.min(0, ...finiteTotals), 0];
  }

  return [0, Math.max(0, ...finiteTotals)];
};
