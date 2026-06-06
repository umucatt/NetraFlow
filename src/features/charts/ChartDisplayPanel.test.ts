/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ChartPreviewPanel from './ChartPreviewPanel';
import {
  GroupDetailChartDisplayPanel,
  TotalAssetChartDisplayPanel
} from './ChartDisplayPanel';
import type { AssetStructureChartData } from './assetStructureData';
import type { AssetChartSettings } from './chartDataLogic';
import type { GroupDetailStructureData } from './groupDetailStructureData';
import type { GroupDetailTrendData } from './groupDetailTrendData';
import type { TrendChartPoint } from './assetTrendData';

const settings: AssetChartSettings = {
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

const structureData: AssetStructureChartData = {
  positiveSegments: [
    {
      id: 'cash-positive',
      label: '现金',
      amount: 120,
      color: '#9a6b2f'
    }
  ],
  negativeSegments: [],
  positiveTotal: 120,
  negativeTotal: 0,
  debtRatio: 0
};

const trendPoints: TrendChartPoint[] = [
  {
    date: '2026-05-01',
    kind: 'change-date',
    net: 100,
    positive: 100,
    negative: 0
  },
  {
    date: '2026-05-02',
    kind: 'change-date',
    net: 120,
    positive: 120,
    negative: 0
  }
];

const groupStructureData: GroupDetailStructureData = {
  segments: [
    {
      id: 'cash-account',
      label: '现金账户',
      amount: 120,
      color: '#9a6b2f'
    }
  ],
  total: 120,
  signedTotal: 120,
  nature: 'asset'
};

const groupTrendData: GroupDetailTrendData = {
  dates: ['2026-05-01', '2026-05-02'],
  pointKinds: ['change-date', 'change-date'],
  series: [
    {
      id: 'cash-account',
      label: '现金账户',
      color: '#9a6b2f',
      values: [100, 120]
    }
  ],
  totals: [100, 120],
  nature: 'asset'
};

const formatMoney = (amount: number | null) => `¥${amount ?? 0}`;

test('TotalAssetChartDisplayPanel receives existing total chart data', () => {
  const html = renderToStaticMarkup(
    React.createElement(TotalAssetChartDisplayPanel, {
      totalAssets: 120,
      structureData,
      trendPoints,
      settings,
      formatMoney
    })
  );

  assert.match(html, /总资产图表/);
  assert.match(html, /净资产/);
  assert.match(html, /资产占比/);
  assert.match(html, /资产趋势/);
});

test('GroupDetailChartDisplayPanel keeps disabled chart empty state stable', () => {
  const html = renderToStaticMarkup(
    React.createElement(GroupDetailChartDisplayPanel, {
      groupName: '现金',
      structureData: groupStructureData,
      trendData: groupTrendData,
      settings: settings.globalCategoryDetail,
      visibility: {
        showStructure: false,
        showTrend: false
      },
      formatMoney
    })
  );

  assert.match(html, /现金/);
  assert.match(html, /当前合计/);
  assert.match(html, /图表已关闭/);
});

test('GroupDetailChartDisplayPanel renders account share data with unified allocation layout', () => {
  const html = renderToStaticMarkup(
    React.createElement(GroupDetailChartDisplayPanel, {
      groupName: '现金',
      structureData: {
        ...groupStructureData,
        segments: [
          {
            id: 'cash-account',
            label: '现金账户',
            amount: 120,
            color: '#9a6b2f'
          }
        ]
      },
      trendData: groupTrendData,
      settings: settings.globalCategoryDetail,
      visibility: {
        showStructure: true,
        showTrend: false
      },
      formatMoney,
      formatPercent: (amount: number, total: number) =>
        `${Math.round((amount / total) * 100)}%`
    })
  );

  assert.match(html, /现金账户/);
  assert.match(html, /¥120/);
  assert.match(html, /100%/);
  assert.match(html, /asset-structure-detail asset-structure-detail--account-share/);
  assert.match(html, /asset-structure-graphic asset-structure-graphic--account-share/);
});

test('ChartPreviewPanel hides home thumbnails when chart settings disable them', () => {
  const html = renderToStaticMarkup(
    React.createElement(ChartPreviewPanel, {
      shouldShowCharts: false,
      showStructure: false,
      showTrend: false,
      structureData,
      showDebtMultiple: true,
      trendPoints,
      trendSettings: settings.trend,
      formatMoney,
      onOpenCharts: () => {}
    })
  );

  assert.equal(html, '');
});
