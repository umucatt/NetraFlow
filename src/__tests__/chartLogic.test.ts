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
  getNearestChangeDatePointIndex,
  getVisibleTrendMarkerIndexes,
  buildSteppedStackLayers,
  buildDisplayChartItems,
  createSteppedAreaPath,
  createSteppedLinePath,
  getNiceYAxisScale,
  getChartRangeDateKeys,
  getZeroAnchoredStackedYAxisDomain,
  getZeroAnchoredStackedYAxisScale,
  normalizeChartPointValueMode,
  normalizeGlobalChartControlMode,
  syncCategoryChartSettingsFromGlobal,
  type BasicCategoryChartSettings
} from '../chartLogic';

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
