/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import DashboardPage from './DashboardPage';
import type { AssetChartSettings } from '../charts/chartDataLogic';
import type { AssetStructureChartData } from '../charts/assetStructureData';
import type { TrendChartPoint } from '../charts/assetTrendData';
import type { AssetOverviewGroup } from '../overview/assetOverviewLogic';

const chartSettings: AssetChartSettings = {
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
      color: '#9a6b2f',
      sourceIds: ['现金']
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

const overviewGroups: AssetOverviewGroup[] = [
  {
    id: 'cash',
    name: '现金',
    nature: 'asset',
    includeInStats: true,
    sortOrder: 0,
    accounts: [],
    activeAccounts: [
      {
        id: 'cash-account',
        groupId: 'cash',
        name: '现金账户',
        amount: 120,
        createdAt: '2026-05-01T12:00:00',
        percentageLabel: '100.0%'
      }
    ],
    total: 120,
    percentageLabel: '100.0%',
    percentageColor: '#9a6b2f',
    isEmpty: false
  }
];

const noop = () => {};
const formatHomeMoney = (amount: number | null) => `¥${amount ?? 0}`;
const formatChartMoney = (amount: number | null) => `¥${amount ?? 0}`;

test('DashboardPage renders home stats, chart previews, and overview rows', () => {
  const html = renderToStaticMarkup(
    React.createElement(DashboardPage, {
      homeAssetStat: {
        label: '净资产',
        value: 120,
        compact: false
      },
      recentNetWorthChange: {
        date: '2026-05-02',
        amount: 20,
        relativeLabel: '今天'
      },
      chartPreview: {
        shouldShowCharts: true,
        showStructure: chartSettings.l0.showStructure,
        showTrend: chartSettings.l0.showTrend,
        structureData,
        showDebtMultiple: chartSettings.structure.showDebtMultiple,
        trendPoints,
        trendSettings: chartSettings.trend
      },
      overview: {
        groups: overviewGroups,
        expandedGroupIds: ['cash'],
        isGroupEditMode: false,
        draggingGroupId: '',
        groupDropIndicator: null,
        legendColorByName: new Map([['现金', '#9a6b2f']]),
        productIconPath: 'icons/netraflow.ico',
        productNameZh: '净流',
        productNameEn: 'NetraFlow',
        productTagline: '资产变化记录工具',
        sortIcon: React.createElement('span'),
        deleteIcon: React.createElement('span'),
        formatMoney: formatHomeMoney,
        canDeleteGroup: () => true,
        onGroupClick: noop,
        onOpenAccount: noop,
        onDeleteGroup: noop,
        onGroupPointerDown: noop,
        onGroupPointerMove: noop,
        onGroupPointerUp: noop,
        onGroupPointerLeave: noop,
        onGroupPointerCancel: noop,
        onGroupDragStart: noop,
        onGroupDragOver: noop,
        onGroupDragLeave: noop,
        onGroupDrop: noop,
        onGroupDragEnd: noop
      },
      formatHomeMoneyAmount: formatHomeMoney,
      formatChartMoney,
      onOpenTotalCharts: noop,
      onOpenSearch: noop,
      onOpenArchivedAccounts: noop,
      onOpenHistory: noop,
      onOpenAddAccount: noop
    })
  );

  assert.match(html, /净资产/);
  assert.match(html, /今天/);
  assert.match(html, /打开总资产图表/);
  assert.match(html, /打开总资产趋势图/);
  assert.match(html, /现金账户/);
  assert.match(html, /资产变化记录工具/);
});
