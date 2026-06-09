/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NETRAFLOW_CHART_PALETTE,
  PIE_SEGMENT_SEPARATOR_CONFIG,
  ARCHIVED_CHART_BADGE_LABEL,
  getArchivedChartTooltipLabel,
  getAdaptiveValueLabelIndexes,
  getChartAxisLabelIndexes,
  getChartValueLabelIndexes,
  getChartValueLabelLayout,
  getEffectiveCategoryChartSettings,
  getEffectiveAccountChartSettings,
  getLineChartYAxisScale,
  getNearestChangeDatePointIndex,
  resolveLinePointLabelLayout,
  getVisibleTrendMarkerIndexes,
  buildSteppedStackLayers,
  buildDisplayChartItems,
  createSteppedAreaPath,
  createSteppedHorizontalLinePath,
  createSteppedLinePath,
  createSteppedVerticalLinePath,
  getNiceYAxisScale,
  getChartRangeDateKeys,
  getZeroAnchoredStackedYAxisDomain,
  getZeroAnchoredStackedYAxisScale,
  normalizeChartPointValueMode,
  normalizeGlobalChartControlMode,
  syncCategoryChartSettingsFromGlobal,
  type BasicAccountChartSettings,
  type BasicCategoryChartSettings
} from '../chartLogic';

const rectsOverlap = (
  left: { left: number; top: number; right: number; bottom: number },
  right: { left: number; top: number; right: number; bottom: number }
) =>
  left.left < right.right &&
  left.right > right.left &&
  left.top < right.bottom &&
  left.bottom > right.top;

test('keeps the fixed NetraFlow chart palette order', () => {
  assert.deepEqual([...NETRAFLOW_CHART_PALETTE], [
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
  ]);
});

test('pie segments expose a restrained separator stroke configuration', () => {
  assert.equal(PIE_SEGMENT_SEPARATOR_CONFIG.stroke, 'var(--chart-separator)');
  assert.equal(PIE_SEGMENT_SEPARATOR_CONFIG.strokeLinecap, 'round');
  assert.equal(PIE_SEGMENT_SEPARATOR_CONFIG.strokeLinejoin, 'round');
  assert.equal(PIE_SEGMENT_SEPARATOR_CONFIG.paintOrder, 'stroke fill');
  assert.ok(PIE_SEGMENT_SEPARATOR_CONFIG.strokeOpacity < 0.75);
  assert.ok(PIE_SEGMENT_SEPARATOR_CONFIG.strokeWidth > 0);
  assert.ok(PIE_SEGMENT_SEPARATOR_CONFIG.strokeWidth < 0.5);
});

test('uses natural-day x-axis ranges ending at the selected date', () => {
  const endDate = new Date('2026-05-06T12:00:00');

  assert.equal(getChartRangeDateKeys('1m', endDate)[0], '2026-04-06');
  assert.equal(getChartRangeDateKeys('3m', endDate)[0], '2026-02-06');
  assert.equal(getChartRangeDateKeys('6m', endDate)[0], '2025-11-06');
  assert.equal(getChartRangeDateKeys('1y', endDate)[0], '2025-05-06');
  const sixMonthKeys = getChartRangeDateKeys('6m', endDate);
  assert.equal(sixMonthKeys[sixMonthKeys.length - 1], '2026-05-06');
});

test('collapses more than twelve chart items into the twelfth other segment', () => {
  const items = Array.from({ length: 14 }, (_, index) => ({
    id: `item-${index}`,
    label: `Item ${index}`,
    amount: 100 - index,
    order: index
  }));
  const displayItems = buildDisplayChartItems(items, 'share');

  assert.equal(displayItems.length, 12);
  assert.equal(displayItems[11].label, '其他');
  assert.equal(displayItems[11].color, '#6E9B8E');
  assert.deepEqual(displayItems[11].sourceIds, ['item-11', 'item-12', 'item-13']);
});

test('created-order colors do not immediately reuse a deleted earlier color', () => {
  const displayItems = buildDisplayChartItems(
    [
      { id: 'current-a', label: 'Current A', amount: 10, order: 2 },
      { id: 'current-b', label: 'Current B', amount: 8, order: 3 }
    ],
    'createdAt',
    {
      registry: [
        { id: 'deleted-first', label: 'Deleted first', order: 1 },
        { id: 'current-a', label: 'Current A', order: 2 },
        { id: 'current-b', label: 'Current B', order: 3 }
      ]
    }
  );

  assert.equal(displayItems[0].color, '#59A14F');
  assert.equal(displayItems[1].color, '#D9756B');
});

test('share-order colors are assigned from one stable sorting point', () => {
  const displayItems = buildDisplayChartItems(
    [
      { id: 'small', label: 'Small', amount: 10, order: 1 },
      { id: 'large', label: 'Large', amount: 90, order: 2 }
    ],
    'share'
  );

  assert.equal(displayItems[0].id, 'large');
  assert.equal(displayItems[0].color, '#4E79A7');
  assert.equal(displayItems[1].id, 'small');
  assert.equal(displayItems[1].color, '#59A14F');
});

test('creates stepped line and area paths without diagonal interpolation', () => {
  const linePath = createSteppedLinePath(
    [10, 20, 15],
    (index) => index * 10,
    (value) => 100 - value
  );
  const areaPath = createSteppedAreaPath(
    [10, 20],
    [0, 5],
    (index) => index * 10,
    (value) => 100 - value
  );

  assert.equal(linePath, 'M 0 90 H 10 V 80 H 20 V 85');
  assert.equal(areaPath, 'M 0 90 H 10 V 80 L 10 95 V 100 H 0 Z');
});

test('creates stepped helper paths with separate horizontal and vertical segments', () => {
  const horizontalPath = createSteppedHorizontalLinePath(
    [10, 20, 20, 15],
    (index) => index * 10,
    (value) => 100 - value
  );
  const verticalPath = createSteppedVerticalLinePath(
    [10, 20, 20, 15],
    (index) => index * 10,
    (value) => 100 - value
  );

  assert.equal(horizontalPath, 'M 0 90 H 10 M 10 80 H 20 M 20 80 H 30');
  assert.equal(verticalPath, 'M 10 90 V 80 M 30 80 V 85');
});

test('builds stepped stack layers with cumulative lower and upper bounds', () => {
  const layers = buildSteppedStackLayers([
    { id: 'cash', values: [10, 12, 12] },
    { id: 'wallet', values: [5, 5, 9] },
    { id: 'fund', values: [0, 3, 4] }
  ]);

  assert.deepEqual(layers.map((layer) => layer.series.id), ['cash', 'wallet', 'fund']);
  assert.deepEqual(layers[0].lowerValues, [0, 0, 0]);
  assert.deepEqual(layers[0].upperValues, [10, 12, 12]);
  assert.deepEqual(layers[1].lowerValues, [10, 12, 12]);
  assert.deepEqual(layers[1].upperValues, [15, 17, 21]);
  assert.deepEqual(layers[2].lowerValues, [15, 17, 21]);
  assert.deepEqual(layers[2].upperValues, [15, 20, 25]);
});

test('builds liability stack layers downward without converting signs', () => {
  const layers = buildSteppedStackLayers([
    { id: 'card', values: [-10, -12, -12] },
    { id: 'loan', values: [-5, -5, -9] }
  ]);

  assert.deepEqual(layers[0].lowerValues, [0, 0, 0]);
  assert.deepEqual(layers[0].upperValues, [-10, -12, -12]);
  assert.deepEqual(layers[1].lowerValues, [-10, -12, -12]);
  assert.deepEqual(layers[1].upperValues, [-15, -17, -21]);
});

test('anchors stacked area y domains at zero by account type direction', () => {
  assert.deepEqual(getZeroAnchoredStackedYAxisDomain([10, 15, 8], 'positive'), [0, 15]);
  assert.deepEqual(getZeroAnchoredStackedYAxisDomain([-10, -15, -8], 'negative'), [-15, 0]);
});

test('normalizes legacy show-all point labels to adaptive mode', () => {
  assert.equal(normalizeChartPointValueMode('all'), 'adaptive');
  assert.equal(normalizeChartPointValueMode('adaptive'), 'adaptive');
  assert.equal(normalizeChartPointValueMode('minmax'), 'minmax');
  assert.equal(normalizeChartPointValueMode('none'), 'none');
  assert.equal(normalizeChartPointValueMode('showAll'), 'adaptive');
});

test('archived chart labels keep the original account name with a weak badge label', () => {
  assert.equal(ARCHIVED_CHART_BADGE_LABEL, '已归档');
  assert.equal(getArchivedChartTooltipLabel('储蓄卡', true), '储蓄卡（已归档）');
  assert.equal(getArchivedChartTooltipLabel('储蓄卡', false), '储蓄卡');
});

test('adaptive value labels prioritize extrema and avoid dense runs', () => {
  const values = Array.from({ length: 31 }, (_, index) => 50 + index);
  values[4] = 160;
  values[24] = 12;

  const indexes = getAdaptiveValueLabelIndexes(values, 720);

  assert.ok(indexes.includes(4));
  assert.ok(indexes.includes(24));
  indexes.slice(1).forEach((index, position) => {
    assert.ok(index - indexes[position] >= 2);
  });
});

test('adaptive value labels do not force nearby high and low labels together', () => {
  const values = [80, 160, 12, 120, 116, 112, 108, 104, 100, 96, 92, 88];
  const indexes = getAdaptiveValueLabelIndexes(values, 520);

  assert.ok(indexes.includes(1));
  assert.equal(indexes.includes(2), false);
  indexes.slice(1).forEach((index, position) => {
    assert.ok(index - indexes[position] >= 2);
  });
});

test('point label modes no longer expose all-label behavior', () => {
  const values = [10, 12, 30, 18, 6, 20, 24, 15];

  assert.deepEqual(getChartValueLabelIndexes(values, 'none', 640), []);
  assert.deepEqual(getChartValueLabelIndexes(values, 'minmax', 640), [2, 4]);
  assert.ok(getChartValueLabelIndexes(values, 'adaptive', 640).includes(2));
  assert.ok(getChartValueLabelIndexes(values, 'adaptive', 640).includes(4));
});

test('trend markers are generated only for visible value-label points', () => {
  assert.deepEqual(getVisibleTrendMarkerIndexes([], 8), []);
  assert.deepEqual(getVisibleTrendMarkerIndexes([2, 4, 4, -1, 99], 8), [2, 4]);
  assert.deepEqual(
    getVisibleTrendMarkerIndexes(getChartValueLabelIndexes([10, 30, 12, 16, 5], 'minmax', 640), 5),
    [1, 4]
  );
});

test('chart value labels choose safe positions near plot edges', () => {
  const plot = { plotLeft: 20, plotTop: 20, plotWidth: 260, plotHeight: 210 };
  const topLeft = getChartValueLabelLayout({
    ...plot,
    pointX: 22,
    pointY: 24,
    labelWidth: 64
  });
  const rightEdge = getChartValueLabelLayout({
    ...plot,
    pointX: 278,
    pointY: 120,
    labelWidth: 64
  });
  const bottomEdge = getChartValueLabelLayout({
    ...plot,
    pointX: 140,
    pointY: 228,
    preferBelow: true,
    labelWidth: 64
  });

  assert.equal(topLeft.textAnchor, 'start');
  assert.ok(topLeft.x >= plot.plotLeft);
  assert.ok(topLeft.y > 24);
  assert.equal(rightEdge.textAnchor, 'end');
  assert.ok(rightEdge.x <= plot.plotLeft + plot.plotWidth);
  assert.equal(bottomEdge.textAnchor, 'middle');
  assert.ok(bottomEdge.y < 228);
  assert.ok(bottomEdge.y <= plot.plotTop + plot.plotHeight);
});

test('line point value labels prefer clear space above the point', () => {
  const layout = resolveLinePointLabelLayout({
    pointX: 100,
    pointY: 70,
    plotLeft: 0,
    plotTop: 0,
    plotWidth: 220,
    plotHeight: 140,
    labelWidth: 56,
    labelHeight: 12,
    lineSegments: [
      { x1: 60, y1: 118, x2: 140, y2: 118 }
    ]
  });

  assert.equal(layout.placement, 'above');
  assert.equal(layout.textAnchor, 'middle');
  assert.equal(layout.dominantBaseline, 'central');
  assert.ok(layout.bounds.bottom < 70);
});

test('line point value labels strongly avoid the right-edge terminal stepped line', () => {
  const lineY = 92;
  const pointY = 106;
  const lineSafeGap = 8;
  const pointSafeTop = pointY - 3 - 6;
  const layout = resolveLinePointLabelLayout({
    pointX: 606,
    pointY,
    plotLeft: 56,
    plotTop: 28,
    plotWidth: 552,
    plotHeight: 206,
    labelWidth: 64,
    labelHeight: 14,
    lineSegments: [
      { x1: 520, y1: lineY, x2: 606, y2: lineY },
      { x1: 606, y1: lineY, x2: 606, y2: pointY }
    ],
    pointRadius: 3,
    isEndPoint: true
  });

  assert.ok(layout.placement === 'above' || layout.placement === 'left-above');
  assert.equal(layout.dominantBaseline, 'central');
  assert.ok(layout.bounds.right <= 608 - 2);
  assert.ok(layout.x < 606);
  assert.ok(layout.bounds.bottom + lineSafeGap <= lineY);
  assert.ok(layout.bounds.bottom <= pointSafeTop);
});

test('line point value labels keep right-edge end labels above or left of the point', () => {
  const layout = resolveLinePointLabelLayout({
    pointX: 214,
    pointY: 70,
    plotLeft: 0,
    plotTop: 0,
    plotWidth: 220,
    plotHeight: 140,
    labelWidth: 70,
    labelHeight: 12,
    isEndPoint: true
  });

  assert.ok(layout.placement === 'above' || layout.placement === 'left-above');
  assert.ok(layout.bounds.bottom < 70);
  assert.ok(layout.bounds.right <= 220);
  assert.ok(layout.x < 214);
});

test('line point value labels stay inside top and side plot edges', () => {
  const basePlot = {
    plotLeft: 0,
    plotTop: 0,
    plotWidth: 220,
    plotHeight: 140,
    labelWidth: 56,
    labelHeight: 12
  };
  const nearTop = resolveLinePointLabelLayout({
    ...basePlot,
    pointX: 100,
    pointY: 8
  });
  const nearRight = resolveLinePointLabelLayout({
    ...basePlot,
    pointX: 214,
    pointY: 70
  });
  const nearLeft = resolveLinePointLabelLayout({
    ...basePlot,
    pointX: 6,
    pointY: 70
  });

  assert.ok(nearTop.bounds.top >= basePlot.plotTop);
  assert.ok(nearTop.bounds.top > 8);
  assert.ok(nearRight.bounds.right <= basePlot.plotLeft + basePlot.plotWidth);
  assert.ok(nearRight.x < 214);
  assert.ok(nearLeft.bounds.left >= basePlot.plotLeft);
  assert.ok(nearLeft.x > 6);
});

test('line point value labels avoid nearby line segments when another side is clear', () => {
  const lineY = 54;
  const layout = resolveLinePointLabelLayout({
    pointX: 100,
    pointY: 70,
    plotLeft: 0,
    plotTop: 0,
    plotWidth: 220,
    plotHeight: 140,
    labelWidth: 56,
    labelHeight: 12,
    lineSegments: [
      { x1: 68, y1: lineY, x2: 132, y2: lineY }
    ]
  });

  assert.ok(layout.bounds.bottom + 8 <= lineY || layout.bounds.top - 8 >= lineY);
});

test('line point value labels keep an expanded safety gap from line segments', () => {
  const lineY = 64;
  const lineSafeGap = 8;
  const layout = resolveLinePointLabelLayout({
    pointX: 100,
    pointY: 70,
    plotLeft: 0,
    plotTop: 0,
    plotWidth: 220,
    plotHeight: 140,
    labelWidth: 56,
    labelHeight: 12,
    lineSegments: [
      { x1: 60, y1: lineY, x2: 140, y2: lineY }
    ]
  });

  assert.ok(
    layout.bounds.bottom + lineSafeGap <= lineY ||
      layout.bounds.top - lineSafeGap >= lineY ||
      layout.bounds.right + lineSafeGap <= 60 ||
      layout.bounds.left - lineSafeGap >= 140
  );
});

test('line point value labels recheck collisions after edge clamping', () => {
  const lineY = 54;
  const layout = resolveLinePointLabelLayout({
    pointX: 216,
    pointY: 70,
    plotLeft: 0,
    plotTop: 0,
    plotWidth: 220,
    plotHeight: 140,
    labelWidth: 64,
    labelHeight: 12,
    lineSegments: [
      { x1: 128, y1: lineY, x2: 216, y2: lineY }
    ],
    isEndPoint: true
  });

  assert.ok(layout.bounds.right <= 220);
  assert.ok(layout.bounds.bottom + 8 <= lineY || layout.bounds.top - 8 >= lineY);
});

test('line point value labels avoid already placed labels', () => {
  const placedRect = { left: 72, top: 48, right: 128, bottom: 60 };
  const layout = resolveLinePointLabelLayout({
    pointX: 100,
    pointY: 70,
    plotLeft: 0,
    plotTop: 0,
    plotWidth: 220,
    plotHeight: 140,
    labelWidth: 56,
    labelHeight: 12,
    placedLabelRects: [placedRect]
  });

  assert.equal(rectsOverlap(layout.bounds, placedRect), false);
});

test('adaptive line point labels can hide when every candidate would press onto a line', () => {
  const blockingLines = Array.from({ length: 16 }, (_, index) => 8 + index * 8).map((y) => ({
    x1: 0,
    y1: y,
    x2: 220,
    y2: y
  }));
  const adaptiveLayout = resolveLinePointLabelLayout({
    pointX: 100,
    pointY: 70,
    plotLeft: 0,
    plotTop: 0,
    plotWidth: 220,
    plotHeight: 140,
    labelWidth: 56,
    labelHeight: 12,
    lineSegments: blockingLines,
    allowHide: true
  });
  const minMaxLayout = resolveLinePointLabelLayout({
    pointX: 100,
    pointY: 70,
    plotLeft: 0,
    plotTop: 0,
    plotWidth: 220,
    plotHeight: 140,
    labelWidth: 56,
    labelHeight: 12,
    lineSegments: blockingLines,
    allowHide: false
  });

  assert.equal(adaptiveLayout.hidden, true);
  assert.equal(minMaxLayout.hidden, undefined);
});

test('chart detail lookup only snaps to real change-date points', () => {
  const points = [
    { kind: 'change-date' as const },
    { kind: 'carry-forward' as const },
    { kind: 'carry-forward' as const },
    { kind: 'change-date' as const }
  ];

  assert.equal(
    getNearestChangeDatePointIndex(points, 8, (index) => index * 10),
    0
  );
  assert.equal(
    getNearestChangeDatePointIndex(points, 26, (index) => index * 10),
    3
  );
  assert.equal(
    getNearestChangeDatePointIndex([{ kind: 'carry-forward' as const }], 0, () => 0),
    -1
  );
});

test('x-axis label indexes are capped by width and range readability', () => {
  const smallSixMonthIndexes = getChartAxisLabelIndexes(180, '6m', 360);
  const largeYearIndexes = getChartAxisLabelIndexes(365, '1y', 1200);

  assert.ok(smallSixMonthIndexes.length <= 4);
  assert.ok(largeYearIndexes.length <= 8);
  assert.ok(largeYearIndexes.length > smallSixMonthIndexes.length);
});

test('stacked area y-axis scales use nice integer zero-anchored ticks', () => {
  const positiveScale = getZeroAnchoredStackedYAxisScale([183770], 'positive');
  const negativeScale = getZeroAnchoredStackedYAxisScale([-581150], 'negative');

  assert.deepEqual(positiveScale.domain, [0, 200000]);
  assert.deepEqual(positiveScale.ticks, [0, 50000, 100000, 150000, 200000]);
  assert.deepEqual(negativeScale.domain, [-600000, 0]);
  assert.deepEqual(negativeScale.ticks, [-600000, -450000, -300000, -150000, 0]);
});

test('nice y-axis ticks avoid arbitrary values and decimals', () => {
  const scale = getNiceYAxisScale([45238, 91885, 198472], { mode: 'positive' });

  assert.deepEqual(scale.domain, [0, 200000]);
  assert.deepEqual(scale.ticks, [0, 50000, 100000, 150000, 200000]);
  assert.ok(scale.ticks.every((tick) => Number.isInteger(tick)));
});

test('line chart baseline y-axis always includes zero with nice ticks', () => {
  const positiveScale = getLineChartYAxisScale([931340, 1483860, 2352580], {
    rangeMode: 'baseline'
  });
  const negativeScale = getLineChartYAxisScale([-2352580, -1483860, -931340], {
    rangeMode: 'baseline'
  });

  assert.ok(positiveScale.domain[0] <= 0);
  assert.ok(positiveScale.domain[1] >= 2352580);
  assert.ok(positiveScale.ticks.includes(0));
  assert.ok(negativeScale.domain[0] <= -2352580);
  assert.ok(negativeScale.domain[1] >= 0);
  assert.ok(negativeScale.ticks.includes(0));
  assert.ok([...positiveScale.ticks, ...negativeScale.ticks].every((tick) => Number.isInteger(tick)));
});

test('line chart dynamic y-axis keeps zero for crossing and near-zero ranges', () => {
  const crossingScale = getLineChartYAxisScale([-100000, 50000, 200000], {
    rangeMode: 'dynamic'
  });
  const nearZeroPositiveScale = getLineChartYAxisScale([2000, 100000, 120000], {
    rangeMode: 'dynamic'
  });
  const nearZeroNegativeScale = getLineChartYAxisScale([-120000, -100000, -2000], {
    rangeMode: 'dynamic'
  });

  assert.ok(crossingScale.domain[0] <= 0);
  assert.ok(crossingScale.domain[1] >= 0);
  assert.ok(crossingScale.ticks.includes(0));
  assert.ok(nearZeroPositiveScale.domain[0] <= 0);
  assert.ok(nearZeroPositiveScale.ticks.includes(0));
  assert.ok(nearZeroNegativeScale.domain[1] >= 0);
  assert.ok(nearZeroNegativeScale.ticks.includes(0));
});

test('line chart dynamic y-axis uses local range for far-from-zero values', () => {
  const positiveScale = getLineChartYAxisScale([931340, 1483860, 2352580], {
    rangeMode: 'dynamic'
  });
  const negativeScale = getLineChartYAxisScale([-2352580, -1483860, -931340], {
    rangeMode: 'dynamic'
  });

  assert.ok(positiveScale.domain[0] > 0);
  assert.ok(positiveScale.domain[1] >= 2352580);
  assert.equal(positiveScale.ticks.includes(0), false);
  assert.ok(negativeScale.domain[1] < 0);
  assert.ok(negativeScale.domain[0] <= -2352580);
  assert.equal(negativeScale.ticks.includes(0), false);
  assert.ok([...positiveScale.ticks, ...negativeScale.ticks].every((tick) => Number.isInteger(tick)));
});

test('line chart y-axis handles empty and flat data with stable safe ranges', () => {
  const emptyScale = getLineChartYAxisScale([], { rangeMode: 'dynamic' });
  const flatDynamicScale = getLineChartYAxisScale([1000, 1000], {
    rangeMode: 'dynamic'
  });
  const flatBaselineScale = getLineChartYAxisScale([1000, 1000], {
    rangeMode: 'baseline'
  });

  assert.deepEqual(emptyScale.domain, [0, 1]);
  assert.deepEqual(emptyScale.ticks, [0, 1]);
  assert.ok(flatDynamicScale.domain[0] < 1000);
  assert.ok(flatDynamicScale.domain[1] > 1000);
  assert.equal(flatDynamicScale.ticks.includes(0), false);
  assert.ok(flatBaselineScale.domain[0] <= 0);
  assert.ok(flatBaselineScale.domain[1] > 1000);
  assert.ok(flatBaselineScale.ticks.includes(0));
  assert.ok(flatDynamicScale.ticks.every((tick) => Number.isInteger(tick)));
});

test('global chart control mode normalizes to peer or locked only', () => {
  assert.equal(normalizeGlobalChartControlMode('peer'), 'peer');
  assert.equal(normalizeGlobalChartControlMode('locked'), 'locked');
  assert.equal(normalizeGlobalChartControlMode('legacy'), 'peer');
  assert.equal(normalizeGlobalChartControlMode('legacy', 'locked'), 'locked');
});

test('locked category chart settings read global settings without mutating local settings', () => {
  const globalSettings: BasicCategoryChartSettings = {
    xAxisRange: '1y',
    pointValueMode: 'adaptive'
  };
  const localSettings: BasicCategoryChartSettings = {
    xAxisRange: '1m',
    pointValueMode: 'none'
  };
  const settingsById: Record<string, BasicCategoryChartSettings> = { cash: localSettings };

  assert.equal(
    getEffectiveCategoryChartSettings('locked', globalSettings, settingsById, 'cash'),
    globalSettings
  );
  assert.deepEqual(settingsById, { cash: localSettings });
  assert.equal(
    getEffectiveCategoryChartSettings('peer', globalSettings, settingsById, 'cash'),
    localSettings
  );
});

test('account chart y-axis setting inherits global default until a local override exists', () => {
  const dynamicGlobalSettings: BasicAccountChartSettings = {
    adaptiveYAxis: true,
    xAxisRange: '6m',
    pointValueMode: 'adaptive'
  };
  const baselineGlobalSettings: BasicAccountChartSettings = {
    adaptiveYAxis: false,
    xAxisRange: '6m',
    pointValueMode: 'adaptive'
  };
  const accountSettingsById: Record<string, BasicAccountChartSettings> = {};

  assert.equal(
    getEffectiveAccountChartSettings(
      'peer',
      dynamicGlobalSettings,
      accountSettingsById,
      'cash'
    ).adaptiveYAxis,
    true
  );
  assert.equal(
    getEffectiveAccountChartSettings(
      'peer',
      baselineGlobalSettings,
      accountSettingsById,
      'cash'
    ).adaptiveYAxis,
    false
  );
});

test('account chart local y-axis override survives global default changes', () => {
  const globalSettings: BasicAccountChartSettings = {
    adaptiveYAxis: true,
    xAxisRange: '6m',
    pointValueMode: 'adaptive'
  };
  const localSettings: BasicAccountChartSettings = {
    adaptiveYAxis: false,
    xAxisRange: '1y',
    pointValueMode: 'none'
  };
  const accountSettingsById: Record<string, BasicAccountChartSettings> = {
    cash: localSettings
  };

  assert.equal(
    getEffectiveAccountChartSettings(
      'peer',
      globalSettings,
      accountSettingsById,
      'cash'
    ),
    localSettings
  );
  assert.equal(
    getEffectiveAccountChartSettings(
      'locked',
      globalSettings,
      accountSettingsById,
      'cash'
    ),
    globalSettings
  );
  assert.deepEqual(accountSettingsById, { cash: localSettings });
});

test('peer global category settings sync downward while local edits stay local', () => {
  const globalSettings: BasicCategoryChartSettings = {
    xAxisRange: '6m',
    pointValueMode: 'minmax'
  };
  const originalLocal: Record<string, BasicCategoryChartSettings> = {
    cash: { xAxisRange: '1m', pointValueMode: 'none' }
  };
  const synced = syncCategoryChartSettingsFromGlobal(
    'peer',
    ['cash', 'fund'],
    originalLocal,
    globalSettings
  );

  assert.deepEqual(synced, {
    cash: globalSettings,
    fund: globalSettings
  });
  assert.notEqual(synced.cash, globalSettings);
  assert.deepEqual(originalLocal.cash, { xAxisRange: '1m', pointValueMode: 'none' });

  const editedCash: BasicCategoryChartSettings = {
    ...synced.cash,
    pointValueMode: 'adaptive'
  };
  assert.deepEqual(globalSettings, { xAxisRange: '6m', pointValueMode: 'minmax' });
  assert.deepEqual(editedCash, { xAxisRange: '6m', pointValueMode: 'adaptive' });
});

test('locked global category settings sync preserves existing local settings', () => {
  const globalSettings: BasicCategoryChartSettings = {
    xAxisRange: '1y',
    pointValueMode: 'adaptive'
  };
  const localSettings: Record<string, BasicCategoryChartSettings> = {
    cash: { xAxisRange: '1m', pointValueMode: 'none' }
  };
  const synced = syncCategoryChartSettingsFromGlobal(
    'locked',
    ['cash', 'fund'],
    localSettings,
    globalSettings
  );

  assert.deepEqual(synced, localSettings);
  assert.notEqual(synced.cash, localSettings.cash);
});
