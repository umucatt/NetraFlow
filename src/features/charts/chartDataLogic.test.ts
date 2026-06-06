/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import type { Account, AssetGroupWithAccounts } from '../../app/types';
import {
  deriveChartLegendColorByName,
  deriveSelectedAccountChartData,
  deriveSelectedGroupChartData,
  deriveTotalChartData,
  getHomeThumbnailTrendSettings,
  shouldShowHomeCharts,
  type AssetChartSettings
} from './chartDataLogic';

const SETTINGS: AssetChartSettings = {
  l0: {
    showStructure: true,
    showTrend: true,
    xAxisRange: '1m'
  },
  globalChartControlMode: 'peer',
  structure: {
    assetDisplay: 'both',
    showDebtMultiple: true
  },
  trend: {
    assetDisplay: 'net',
    adaptiveYAxis: true,
    xAxisRange: '6m',
    pointValueMode: 'adaptive'
  },
  categoryVisibility: {
    showStructure: true,
    showTrend: true
  },
  globalCategoryDetail: {
    xAxisRange: '6m',
    pointValueMode: 'adaptive'
  },
  categoryDetailById: {},
  accountDetailById: {}
};

const account = (id: string, amount: number, groupId = 'group-cash'): Account => ({
  id,
  groupId,
  name: id,
  amount,
  createdAt: '2026-05-01T12:00:00'
});

const group = (overrides: Partial<AssetGroupWithAccounts> = {}): AssetGroupWithAccounts => ({
  id: 'group-cash',
  name: 'Cash',
  nature: 'asset',
  includeInStats: true,
  sortOrder: 0,
  accounts: [account('cash', 100)],
  ...overrides
});

test('keeps home chart settings connected to the thumbnail x-axis range', () => {
  const settings = getHomeThumbnailTrendSettings(SETTINGS);

  assert.equal(settings.xAxisRange, '1m');
  assert.equal(settings.assetDisplay, SETTINGS.trend.assetDisplay);
  assert.equal(SETTINGS.trend.xAxisRange, '6m');
});

test('derives total chart data and empty trend state without history', () => {
  const data = deriveTotalChartData({
    groups: [group()],
    history: [],
    settings: SETTINGS,
    colorAssignmentMode: 'createdAt'
  });

  assert.equal(data.structureData.positiveTotal, 100);
  assert.deepEqual(data.trendPoints, []);
  assert.deepEqual(data.homeThumbnailTrendPoints, []);
  assert.equal(data.shouldShowHomeCharts, true);
});

test('honors selected category chart settings and keeps empty trend data stable', () => {
  const localSettings: AssetChartSettings = {
    ...SETTINGS,
    categoryDetailById: {
      'group-cash': {
        xAxisRange: '1y',
        pointValueMode: 'none'
      }
    }
  };
  const data = deriveSelectedGroupChartData({
    group: group({ accounts: [] }),
    history: [],
    settings: localSettings,
    colorAssignmentMode: 'share'
  });

  assert.deepEqual(data.settings, {
    xAxisRange: '1y',
    pointValueMode: 'none'
  });
  assert.equal(data.structureData?.signedTotal, 0);
  assert.deepEqual(data.trendData?.dates, []);
});

test('locked chart control uses global account settings for selected accounts', () => {
  const localSettings: AssetChartSettings = {
    ...SETTINGS,
    globalChartControlMode: 'locked',
    accountDetailById: {
      cash: {
        adaptiveYAxis: false,
        xAxisRange: '1y',
        pointValueMode: 'none'
      }
    }
  };
  const data = deriveSelectedAccountChartData({
    account: account('cash', 100),
    history: [],
    settings: localSettings
  });

  assert.deepEqual(data.settings, {
    adaptiveYAxis: true,
    xAxisRange: '6m',
    pointValueMode: 'adaptive'
  });
  assert.deepEqual(data.trendPoints, []);
  assert.equal(data.previewTrendSettings.assetDisplay, 'net');
});

test('maps structure segment source ids back to home overview legend colors', () => {
  const colorByName = deriveChartLegendColorByName({
    positiveSegments: [
      { id: 'group-other-positive', label: 'Other', amount: 10, color: '#123456', sourceIds: ['A', 'B'] }
    ],
    negativeSegments: [
      { id: 'Debt-negative', label: 'Debt', amount: 5, color: '#654321', sourceIds: ['Debt'] }
    ],
    positiveTotal: 10,
    negativeTotal: 5,
    debtRatio: 0.5
  });

  assert.equal(colorByName.get('A'), '#123456');
  assert.equal(colorByName.get('B'), '#123456');
  assert.equal(colorByName.get('Debt'), '#654321');
});

test('detects disabled home chart state from chart visibility settings', () => {
  assert.equal(
    shouldShowHomeCharts({
      ...SETTINGS,
      l0: { ...SETTINGS.l0, showStructure: false, showTrend: false }
    }),
    false
  );
});
