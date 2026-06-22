/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Account, AccountTypeNature, AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import { NETRAFLOW_CHART_PALETTE } from '../../chartLogic';
import {
  deriveGroupDetailStructureData,
  getAccountColorRegistry,
  getGroupDetailHistory
} from './groupDetailStructureData';

const HISTORY_TYPE = {
  create: '\u521b\u5efa' as HistoryRecord['type']
};

const account = (
  id: string,
  amount: number,
  overrides: Partial<Account> = {}
): Account => ({
  id,
  groupId: overrides.groupId ?? 'group-test',
  name: overrides.name ?? id,
  amount,
  createdAt: overrides.createdAt ?? '2026-05-01T12:00:00',
  archived: overrides.archived,
  archivedAt: overrides.archivedAt,
  alias: overrides.alias
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

const historyRecord = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: overrides.id ?? `history-${overrides.accountId ?? 'account'}`,
  accountId: overrides.accountId ?? 'account',
  type: overrides.type ?? HISTORY_TYPE.create,
  groupName: overrides.groupName ?? 'Cash',
  accountName: overrides.accountName ?? 'Account',
  beforeAmount: overrides.beforeAmount ?? null,
  afterAmount: overrides.afterAmount ?? 1,
  time: overrides.time ?? '2026-05-01T12:00:00',
  relatedTime: overrides.relatedTime,
  note: overrides.note,
  source: overrides.source
});

test('derives positive signed totals for asset and receivable accounts', () => {
  const assetData = deriveGroupDetailStructureData(
    group('Cash', 'asset', [account('cash', 120)]),
    [],
    'share'
  );
  const receivableData = deriveGroupDetailStructureData(
    group('Receivable', 'receivable', [account('invoice', 80)]),
    [],
    'share'
  );

  assert.equal(assetData.segments[0]?.amount, 120);
  assert.equal(assetData.total, 120);
  assert.equal(assetData.signedTotal, 120);
  assert.equal(assetData.nature, 'asset');
  assert.equal(receivableData.segments[0]?.amount, 80);
  assert.equal(receivableData.total, 80);
  assert.equal(receivableData.signedTotal, 80);
  assert.equal(receivableData.nature, 'receivable');
});

test('keeps liability segment amounts absolute while signedTotal is negative', () => {
  const data = deriveGroupDetailStructureData(
    group('Debt', 'liability', [account('loan', 75), account('refund-offset', -25)]),
    [],
    'share'
  );

  assert.deepEqual(
    data.segments.map((segment) => [segment.id, segment.amount]),
    [
      ['loan', 75],
      ['refund-offset', 25]
    ]
  );
  assert.equal(data.total, 100);
  assert.equal(data.signedTotal, -100);
  assert.equal(data.nature, 'liability');
});

test('excludes archived accounts from structure segments, total, and signedTotal', () => {
  const data = deriveGroupDetailStructureData(
    group(
      'Hidden Stats Cash',
      'asset',
      [account('active', 100), account('archived', 50, { archived: true })],
      { includeInStats: false }
    ),
    [],
    'share'
  );

  assert.deepEqual(
    data.segments.map((segment) => [segment.id, segment.amount, segment.sourceIds]),
    [['active', 100, ['active']]]
  );
  assert.equal(data.total, 100);
  assert.equal(data.signedTotal, 100);
});

test('keeps archived accounts in the createdAt color registry for stability', () => {
  const cash = group('Cash', 'asset', [
    account('archived-old', 500, {
      archived: true,
      createdAt: '2020-01-01T12:00:00'
    }),
    account('active-new', 100, {
      createdAt: '2026-01-01T12:00:00'
    })
  ]);
  const data = deriveGroupDetailStructureData(cash, [], 'createdAt');
  const registry = getAccountColorRegistry(cash, []);

  assert.deepEqual(
    registry.map((item) => item.id),
    ['archived-old', 'active-new']
  );
  assert.deepEqual(data.segments.map((segment) => segment.id), ['active-new']);
  assert.equal(data.segments[0]?.color, NETRAFLOW_CHART_PALETTE[1]);
});

test('uses current-account history only for registry order and createdAt color stability', () => {
  const cash = group('Cash', 'asset', [
    account('active', 100, {
      createdAt: '2026-01-01T12:00:00'
    })
  ]);
  const history = [
    historyRecord({
      id: 'deleted-in-group',
      accountId: 'deleted-old',
      groupName: 'Cash',
      accountName: 'Deleted old',
      afterAmount: 999,
      time: '2020-01-01T12:00:00'
    }),
    historyRecord({
      id: 'current-account-old-group',
      accountId: 'active',
      groupName: 'Previous Group',
      accountName: 'Active in previous group',
      afterAmount: 500,
      time: '2021-01-01T12:00:00'
    }),
    historyRecord({
      id: 'unrelated',
      accountId: 'unrelated',
      groupName: 'Other',
      accountName: 'Unrelated',
      afterAmount: 1000,
      time: '2019-01-01T12:00:00'
    })
  ];
  const relevantHistoryIds = getGroupDetailHistory(cash, history).map((record) => record.id);
  const registryIds = getAccountColorRegistry(cash, history).map((item) => item.id);
  const data = deriveGroupDetailStructureData(cash, history, 'createdAt');

  assert.deepEqual(relevantHistoryIds, ['current-account-old-group']);
  assert.equal(registryIds.includes('deleted-old'), false);
  assert.equal(registryIds.includes('unrelated'), false);
  assert.equal(data.total, 100);
  assert.equal(data.signedTotal, 100);
  assert.equal(data.segments[0]?.color, NETRAFLOW_CHART_PALETTE[0]);
  assert.equal(data.segments.some((segment) => segment.label === 'Deleted old'), false);
});

test('share mode sorts by amount then order, name, and id', () => {
  const cash = group('Cash', 'asset', [
    account('large', 90, { name: 'Large', createdAt: '2026-05-02T12:00:00' }),
    account('history-first', 20, { name: 'Zeta', createdAt: '2026-05-02T12:00:00' }),
    account('label-alpha', 20, { name: 'Alpha', createdAt: '2026-05-02T12:00:00' }),
    account('id-b', 20, { name: 'Same', createdAt: '2026-05-02T12:00:00' }),
    account('id-a', 20, { name: 'Same', createdAt: '2026-05-02T12:00:00' }),
    account('name-zeta', 20, { name: 'Zeta', createdAt: '2026-05-02T12:00:00' })
  ]);
  const data = deriveGroupDetailStructureData(
    cash,
    [
      historyRecord({
        accountId: 'history-first',
        groupName: 'Cash',
        accountName: 'History first',
        time: '2020-01-01T12:00:00'
      })
    ],
    'share'
  );

  assert.deepEqual(
    data.segments.map((segment) => segment.id),
    ['large', 'history-first', 'label-alpha', 'id-a', 'id-b', 'name-zeta']
  );
});

test('does not generate account share items from missing old account history', () => {
  const cash = group('Cash', 'asset', [account('active', 120)]);
  const history = [
    historyRecord({
      id: 'missing-old',
      accountId: 'missing-old',
      groupName: 'Cash',
      accountName: '已删除旧账户',
      afterAmount: 999,
      time: '2026-05-02T12:00:00'
    })
  ];
  const data = deriveGroupDetailStructureData(cash, history, 'share');

  assert.deepEqual(getGroupDetailHistory(cash, history), []);
  assert.equal(getAccountColorRegistry(cash, history).some((item) => item.id === 'missing-old'), false);
  assert.equal(data.segments.some((segment) => segment.label === '已删除旧账户'), false);
  assert.deepEqual(
    data.segments.map((segment) => [segment.id, segment.amount]),
    [['active', 120]]
  );
});

test('keeps archived accounts available to history-backed group detail trend semantics', () => {
  const archived = account('archived-old', 50, { archived: true });
  const cash = group('Cash', 'asset', [archived]);
  const history = [
    historyRecord({
      id: 'archived-create',
      accountId: archived.id,
      groupName: 'Cash',
      accountName: archived.name,
      afterAmount: 50,
      time: '2026-05-02T12:00:00'
    })
  ];

  assert.deepEqual(
    getGroupDetailHistory(cash, history).map((record) => record.id),
    ['archived-create']
  );
  assert.equal(getAccountColorRegistry(cash, history).some((item) => item.id === archived.id), true);
});

test('share mode collapses extra accounts into Other with sourceIds', () => {
  const accounts = Array.from({ length: 13 }, (_, index) =>
    account(`account-${index}`, 100 - index, {
      name: `Account ${index}`,
      createdAt: `2026-05-${String(index + 1).padStart(2, '0')}T12:00:00`
    })
  );
  const data = deriveGroupDetailStructureData(group('Cash', 'asset', accounts), [], 'share');
  const other = data.segments[11];

  assert.equal(data.segments.length, 12);
  assert.deepEqual(data.segments[0]?.sourceIds, ['account-0']);
  assert.equal(other?.id, 'Cash-account-other');
  assert.equal(other?.label, '\u5176\u4ed6');
  assert.equal(other?.amount, 89 + 88);
  assert.deepEqual(other?.sourceIds, ['account-11', 'account-12']);
});

test('returns empty structure data for empty groups and all-zero accounts', () => {
  const emptyData = deriveGroupDetailStructureData(group('Empty', 'asset', []), [], 'share');
  const zeroData = deriveGroupDetailStructureData(
    group('Zero', 'asset', [account('zero-a', 0), account('zero-b', 0)]),
    [],
    'share'
  );

  assert.deepEqual(emptyData.segments, []);
  assert.equal(emptyData.total, 0);
  assert.equal(emptyData.signedTotal, 0);
  assert.deepEqual(zeroData.segments, []);
  assert.equal(zeroData.total, 0);
  assert.equal(zeroData.signedTotal, 0);
});
