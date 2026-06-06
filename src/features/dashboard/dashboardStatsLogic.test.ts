/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import type { Account, AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import {
  deriveDashboardStats,
  filterHistoryForExistingDashboardAccounts,
  deriveHomeAssetStatDisplay,
  deriveRecentNetWorthChange
} from './dashboardStatsLogic';

const HISTORY_TYPE = {
  modify: '\u4fee\u6539' as HistoryRecord['type']
};

const historyRecord = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: overrides.id ?? 'history-test',
  accountId: overrides.accountId ?? 'account-test',
  type: overrides.type ?? HISTORY_TYPE.modify,
  groupName: overrides.groupName ?? 'Assets',
  accountName: overrides.accountName ?? 'Cash',
  beforeAmount: overrides.beforeAmount ?? 0,
  afterAmount: overrides.afterAmount ?? 0,
  time: overrides.time ?? '2026-05-01T12:00:00'
});

const account = (id: string): Account => ({
  id,
  groupId: 'g-assets',
  name: id,
  amount: 100,
  createdAt: '2026-05-01T12:00:00'
});

const group = (accounts: Account[]): AssetGroupWithAccounts => ({
  id: 'g-assets',
  name: 'Assets',
  nature: 'asset',
  includeInStats: true,
  sortOrder: 0,
  accounts
});

test('derives home net worth and total assets using the existing include rules', () => {
  const stats = deriveDashboardStats([
    { includeInStats: true, nature: 'asset', total: 100 },
    { includeInStats: true, nature: 'receivable', total: 40 },
    { includeInStats: true, nature: 'liability', total: -30 },
    { includeInStats: false, nature: 'asset', total: 999 }
  ]);

  assert.deepEqual(stats, {
    netWorth: 110,
    totalAssets: 140
  });
});

test('prepares the configured home stat without recalculating display text in App', () => {
  const stats = { netWorth: 110, totalAssets: 140 };

  assert.deepEqual(
    deriveHomeAssetStatDisplay(stats, {
      homeAssetStatMetric: 'totalAssets',
      homeAssetStatLabelMode: 'short',
      homeAssetStatCompact: true
    }),
    {
      label: 'TA',
      value: 140,
      compact: true
    }
  );
});

test('derives recent net worth change from the latest effective history date', () => {
  const change = deriveRecentNetWorthChange([
    historyRecord({
      id: 'older',
      beforeAmount: 10,
      afterAmount: 30,
      time: '2026-05-01T12:00:00'
    }),
    historyRecord({
      id: 'latest-a',
      beforeAmount: 30,
      afterAmount: 45,
      time: '2026-05-02T09:00:00'
    }),
    historyRecord({
      id: 'latest-b',
      beforeAmount: 5,
      afterAmount: 2,
      time: '2026-05-02T18:00:00'
    })
  ]);

  assert.equal(change?.date, '2026-05-02');
  assert.equal(change?.amount, 12);
  assert.equal(typeof change?.relativeLabel, 'string');
});

test('filters missing account history before deriving dashboard recent change', () => {
  const history = [
    historyRecord({
      id: 'active',
      accountId: 'active',
      beforeAmount: 10,
      afterAmount: 30,
      time: '2026-05-01T12:00:00'
    }),
    historyRecord({
      id: 'missing',
      accountId: 'missing-old',
      accountName: '已删除旧账户',
      beforeAmount: 0,
      afterAmount: 999,
      time: '2026-05-02T12:00:00'
    })
  ];
  const filteredHistory = filterHistoryForExistingDashboardAccounts(
    [group([account('active')])],
    history
  );
  const change = deriveRecentNetWorthChange(filteredHistory);

  assert.deepEqual(filteredHistory.map((record) => record.id), ['active']);
  assert.equal(change?.date, '2026-05-01');
  assert.equal(change?.amount, 20);
});

test('keeps recent change empty state stable when history is empty', () => {
  assert.equal(deriveRecentNetWorthChange([]), null);
});
