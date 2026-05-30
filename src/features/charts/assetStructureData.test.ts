/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Account, AccountTypeNature, AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import { NETRAFLOW_CHART_PALETTE } from '../../chartLogic';
import {
  deriveAssetStructureData,
  getActiveGroupTotal,
  getGroupColorRegistry
} from './assetStructureData';

const HISTORY_TYPE = {
  create: '\u65b0\u589e' as HistoryRecord['type']
};

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
  amount: number,
  overrides: Partial<AssetGroupWithAccounts> = {}
): AssetGroupWithAccounts => ({
  id: `group-${name}`,
  name,
  nature,
  includeInStats: true,
  sortOrder: 0,
  accounts: [account(`${name}-account`, amount, false, `group-${name}`)],
  ...overrides
});

const historyRecord = (groupName: string, time: string): HistoryRecord => ({
  id: `history-${groupName}`,
  accountId: `account-${groupName}`,
  type: HISTORY_TYPE.create,
  groupName,
  accountName: `Account ${groupName}`,
  beforeAmount: null,
  afterAmount: 1,
  time
});

test('derives asset structure totals and segments from included active accounts only', () => {
  const data = deriveAssetStructureData(
    [
      group('Cash', 'asset', 100, {
        sortOrder: 1,
        accounts: [account('cash-active', 100), account('cash-archived', 50, true)]
      }),
      group('Receivable', 'receivable', 40, { sortOrder: 2 }),
      group('Debt', 'liability', 30, { sortOrder: 3 }),
      group('Hidden', 'asset', 1000, { includeInStats: false, sortOrder: 4 })
    ],
    [],
    'share'
  );

  assert.equal(data.positiveTotal, 140);
  assert.equal(data.negativeTotal, 30);
  assert.equal(data.debtRatio, 30 / 140);
  assert.deepEqual(
    data.positiveSegments.map((segment) => [segment.label, segment.amount, segment.sourceIds]),
    [
      ['Cash', 100, ['Cash']],
      ['Receivable', 40, ['Receivable']]
    ]
  );
  assert.deepEqual(
    data.negativeSegments.map((segment) => [segment.label, segment.amount, segment.sourceIds]),
    [['Debt', 30, ['Debt']]]
  );
  assert.equal(data.positiveSegments.some((segment) => segment.label === 'Hidden'), false);
  assert.equal(data.negativeSegments.some((segment) => segment.label === 'Hidden'), false);
});

test('keeps active group totals signed by nature while chart segment amounts stay absolute', () => {
  const liability = group('Debt', 'liability', 75, {
    accounts: [account('debt-active', 75), account('debt-archived', 25, true)]
  });
  const data = deriveAssetStructureData([liability], [], 'share');

  assert.equal(getActiveGroupTotal(liability), -75);
  assert.equal(data.negativeSegments[0]?.amount, 75);
  assert.equal(data.negativeTotal, 75);
});

test('preserves debt ratio boundaries', () => {
  assert.equal(
    deriveAssetStructureData([group('Asset', 'asset', 100), group('Debt', 'liability', 25)], [], 'share')
      .debtRatio,
    0.25
  );
  assert.equal(
    deriveAssetStructureData([group('Debt', 'liability', 25)], [], 'share').debtRatio,
    Number.POSITIVE_INFINITY
  );
  assert.equal(
    deriveAssetStructureData(
      [group('Empty asset', 'asset', 0), group('Empty debt', 'liability', 0)],
      [],
      'share'
    ).debtRatio,
    0
  );
});

test('share mode sorts by amount and splits mixed other sources into positive and negative segments', () => {
  const groups = [
    ...Array.from({ length: 11 }, (_, index) =>
      group(`Visible ${index}`, 'asset', 100 - index, { sortOrder: index })
    ),
    group('Other asset', 'asset', 10, { sortOrder: 11 }),
    group('Other debt', 'liability', 9, { sortOrder: 12 })
  ];
  const data = deriveAssetStructureData(groups, [], 'share');
  const otherPositive = data.positiveSegments.find((segment) => segment.id === 'group-other-positive');
  const otherNegative = data.negativeSegments.find((segment) => segment.id === 'group-other-negative');

  assert.equal(data.positiveSegments[0]?.label, 'Visible 0');
  assert.equal(data.positiveSegments[10]?.label, 'Visible 10');
  assert.equal(otherPositive?.label, '\u5176\u4ed6');
  assert.equal(otherPositive?.amount, 10);
  assert.deepEqual(otherPositive?.sourceIds, ['Other asset', 'Other debt']);
  assert.equal(otherNegative?.label, '\u5176\u4ed6');
  assert.equal(otherNegative?.amount, 9);
  assert.deepEqual(otherNegative?.sourceIds, ['Other asset', 'Other debt']);
});

test('createdAt mode uses the complete group and history registry for color stability', () => {
  const groups = [
    group('Excluded', 'asset', 999, { includeInStats: false, sortOrder: 1 }),
    group('Included', 'asset', 100, { sortOrder: 2 })
  ];
  const history = [historyRecord('Deleted historical group', '2020-01-01T12:00:00')];
  const data = deriveAssetStructureData(groups, history, 'createdAt');
  const registry = getGroupColorRegistry(groups, history);

  assert.deepEqual(
    registry.map((item) => item.id),
    ['Excluded', 'Included', 'Deleted historical group']
  );
  assert.equal(data.positiveSegments[0]?.label, 'Included');
  assert.equal(data.positiveSegments[0]?.color, NETRAFLOW_CHART_PALETTE[2]);
});
