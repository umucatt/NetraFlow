/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import type { Account, AccountTypeNature, AssetGroupWithAccounts } from '../../app/types';
import {
  EXCLUDED_STATS_LABEL,
  decorateAssetOverviewGroups,
  deriveAssetOverviewGroupTotals,
  getPositiveStatsBaseTotal
} from './assetOverviewLogic';

const account = (id: string, amount: number, archived = false, groupId = 'group-test'): Account => ({
  id,
  groupId,
  name: id,
  amount,
  createdAt: '2026-05-01T12:00:00',
  archived
});

const group = (
  name: string,
  nature: AccountTypeNature,
  accounts: Account[],
  overrides: Partial<AssetGroupWithAccounts> = {}
): AssetGroupWithAccounts => ({
  id: `group-${name}`,
  name,
  nature,
  includeInStats: true,
  sortOrder: 0,
  accounts,
  ...overrides
});

test('aggregates account type totals from active accounts only', () => {
  const totals = deriveAssetOverviewGroupTotals([
    group('Cash', 'asset', [
      account('cash-active', 100, false, 'group-Cash'),
      account('cash-archived', 50, true, 'group-Cash')
    ]),
    group('Debt', 'liability', [account('debt-active', -30, false, 'group-Debt')])
  ]);

  assert.equal(totals[0].total, 100);
  assert.deepEqual(
    totals[0].activeAccounts.map((currentAccount) => currentAccount.id),
    ['cash-active']
  );
  assert.equal(totals[1].total, -30);
});

test('decorates overview rows with stable percentages, exclusion labels, and colors', () => {
  const totals = deriveAssetOverviewGroupTotals([
    group('Cash', 'asset', [account('cash', 100, false, 'group-Cash')]),
    group('Receivable', 'receivable', [account('receivable', 50, false, 'group-Receivable')]),
    group('Debt', 'liability', [account('debt', -25, false, 'group-Debt')]),
    group('Hidden', 'asset', [account('hidden', 999, false, 'group-Hidden')], {
      includeInStats: false
    })
  ]);
  const overviewGroups = decorateAssetOverviewGroups(totals, getPositiveStatsBaseTotal(totals));

  assert.deepEqual(
    overviewGroups.map((currentGroup) => [
      currentGroup.name,
      currentGroup.percentageLabel,
      currentGroup.percentageColor
    ]),
    [
      ['Cash', '66.7%', '#9a6b2f'],
      ['Receivable', '33.3%', '#9a6b2f'],
      ['Debt', '16.7%', '#15803d'],
      ['Hidden', EXCLUDED_STATS_LABEL, 'var(--text-muted)']
    ]
  );
  assert.equal(overviewGroups[0].activeAccounts[0].percentageLabel, '100.0%');
  assert.equal(overviewGroups[3].activeAccounts[0].percentageLabel, EXCLUDED_STATS_LABEL);
});

test('keeps empty account type overview rows stable', () => {
  const totals = deriveAssetOverviewGroupTotals([group('Empty', 'asset', [])]);
  const overviewGroups = decorateAssetOverviewGroups(totals, getPositiveStatsBaseTotal(totals));

  assert.equal(overviewGroups[0].total, 0);
  assert.deepEqual(overviewGroups[0].activeAccounts, []);
  assert.equal(overviewGroups[0].percentageLabel, '0%');
  assert.equal(overviewGroups[0].isEmpty, true);
});
