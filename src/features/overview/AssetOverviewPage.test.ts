/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AssetOverviewPage from './AssetOverviewPage';
import type { AssetOverviewGroup } from './assetOverviewLogic';

const groups: AssetOverviewGroup[] = [
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

test('AssetOverviewPage renders category totals and expanded account rows', () => {
  const html = renderToStaticMarkup(
    React.createElement(AssetOverviewPage, {
      groups,
      expandedGroupIds: ['cash'],
      isGroupEditMode: false,
      draggingGroupId: '',
      groupDropIndicator: null,
      legendColorByName: new Map([['现金', '#9a6b2f']]),
      productNameZh: '净流',
      productNameEn: 'NetraFlow',
      productTagline: '资产变化记录工具',
      sortIcon: React.createElement('span'),
      deleteIcon: React.createElement('span'),
      formatMoney: (amount: number | null) => `¥${amount ?? 0}`,
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
    })
  );

  assert.match(html, /现金/);
  assert.match(html, /1 个账户/);
  assert.match(html, /现金账户/);
  assert.match(html, /100.0%/);
});
