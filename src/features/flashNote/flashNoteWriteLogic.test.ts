/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  Account,
  AppData,
  AssetGroup,
  HistoryRecord
} from '../../app/types';
import {
  createFlashNoteWritePlan,
  createFlashNoteWritePlanForAppData,
  createFlashWriteRows,
  type FlashHistoryRecordInput
} from './flashNoteWriteLogic';
import type { FlashCell } from './flashNoteTypes';

const account: Account = {
  id: 'account-1',
  groupId: 'group-1',
  name: 'Cash',
  amount: 100,
  createdAt: '2026-05-01T00:00:00.000Z'
};

const assetGroups: AssetGroup[] = [
  {
    id: 'group-1',
    name: 'Assets',
    nature: 'asset',
    includeInStats: true,
    sortOrder: 0
  },
  {
    id: 'group-liability',
    name: 'Debt',
    nature: 'liability',
    includeInStats: true,
    sortOrder: 1
  }
];

const cell = (date: string, value: string): FlashCell => ({
  date,
  value,
  enabled: true,
  original: true,
  missing: false
});

const historyRecord = (
  id: string,
  afterAmount: number,
  time = '2026-05-09T12:00:00.000Z'
): HistoryRecord => ({
  id,
  accountId: account.id,
  type: '修改' as HistoryRecord['type'],
  groupName: 'Assets',
  accountName: account.name,
  beforeAmount: null,
  afterAmount,
  time
});

const createHistoryRecord = ({
  account: recordAccount,
  afterAmount,
  beforeAmount,
  groupName,
  source,
  time
}: FlashHistoryRecordInput): HistoryRecord => ({
  id: `history-${time.slice(0, 10)}-${afterAmount}`,
  accountId: recordAccount.id,
  type: '修改' as HistoryRecord['type'],
  groupName,
  accountName: recordAccount.name,
  beforeAmount,
  afterAmount,
  time,
  source
});

test('flash write rows keep stable track order and calculate change balances', () => {
  const rows = createFlashWriteRows({
    account,
    cells: {
      '2026-05-10': cell('2026-05-10', '10'),
      '2026-05-11': cell('2026-05-11', '-5'),
      '2026-05-12': cell('2026-05-12', '')
    },
    groupId: 'group-1',
    groups: assetGroups,
    inputMode: 'change',
    sortedHistory: [historyRecord('latest', 120)],
    trackDates: ['2026-05-10', '2026-05-11', '2026-05-12']
  });

  assert.deepEqual(
    rows.map((row) => ({
      date: row.date,
      beforeAmount: row.beforeAmount,
      afterAmount: row.afterAmount,
      delta: row.delta
    })),
    [
      {
        date: '2026-05-10',
        beforeAmount: 120,
        afterAmount: 130,
        delta: 10
      },
      {
        date: '2026-05-11',
        beforeAmount: 130,
        afterAmount: 125,
        delta: -5
      }
    ]
  );
});

test('flash write rows keep liability balance semantics in balance mode', () => {
  const rows = createFlashWriteRows({
    account: {
      ...account,
      groupId: 'group-liability',
      amount: -100
    },
    cells: {
      '2026-05-10': cell('2026-05-10', '200')
    },
    groupId: 'group-liability',
    groups: assetGroups,
    inputMode: 'balance',
    sortedHistory: [historyRecord('latest', -100)],
    trackDates: ['2026-05-10']
  });

  assert.equal(rows[0]?.beforeAmount, -100);
  assert.equal(rows[0]?.afterAmount, -200);
  assert.equal(rows[0]?.delta, -100);
});

test('flash write plan returns history records with flash source and target account', () => {
  const plan = createFlashNoteWritePlan({
    account,
    accounts: [account, { ...account, id: 'account-2', name: 'Other' }],
    cells: {
      '2026-05-11': cell('2026-05-11', '10'),
      '2026-05-10': cell('2026-05-10', '5')
    },
    createHistoryRecord,
    groupName: 'Assets',
    groups: assetGroups,
    history: [historyRecord('old', 100, '2026-05-01T12:00:00.000Z')],
    inputMode: 'change',
    selectedAccount: {
      groupId: 'group-1',
      accountId: account.id,
      groupName: 'Assets'
    },
    sortedHistory: [historyRecord('latest', 100)],
    trackDates: ['2026-05-11', '2026-05-10'],
    writeTime: new Date(2026, 4, 20, 8, 30, 0, 0)
  });

  assert.ok(plan);
  assert.deepEqual(plan.rows.map((row) => row.date), ['2026-05-11', '2026-05-10']);
  assert.equal(plan.historyRecords.length, 2);
  assert.deepEqual(
    plan.historyRecords.map((record) => record.source),
    ['flash-note', 'flash-note']
  );
  assert.deepEqual(plan.targetAccount, {
    groupId: 'group-1',
    accountId: account.id,
    groupName: 'Assets'
  });
  assert.equal(
    plan.nextAccounts.find((currentAccount) => currentAccount.id === account.id)?.amount,
    110
  );
});

test('flash write plan for app data applies batch to latest core state', () => {
  const otherAccount: Account = {
    ...account,
    id: 'account-2',
    name: 'Other',
    amount: 50
  };
  const latestHistory = historyRecord('latest-before-confirm', 150, '2026-05-09T12:00:00.000Z');
  const unrelatedHistory: HistoryRecord = {
    id: 'unrelated-after-preview',
    accountId: otherAccount.id,
    type: '修改',
    groupName: 'Assets',
    accountName: otherAccount.name,
    beforeAmount: 40,
    afterAmount: 50,
    time: '2026-05-09T13:00:00.000Z'
  };
  const appData: AppData = {
    groups: assetGroups,
    accounts: [{ ...account, amount: 150 }, otherAccount],
    history: [unrelatedHistory, latestHistory]
  };

  const plan = createFlashNoteWritePlanForAppData({
    appData,
    cells: {
      '2026-05-10': cell('2026-05-10', '10'),
      '2026-05-11': cell('2026-05-11', '5')
    },
    createHistoryRecord,
    inputMode: 'change',
    selectedAccount: {
      groupId: 'group-1',
      accountId: account.id,
      groupName: 'Assets'
    },
    trackDates: ['2026-05-10', '2026-05-11'],
    writeTime: new Date(2026, 4, 20, 8, 30, 0, 0)
  });

  assert.ok(plan);
  assert.deepEqual(
    plan.historyRecords.map((record) => ({
      beforeAmount: record.beforeAmount,
      afterAmount: record.afterAmount,
      source: record.source
    })),
    [
      { beforeAmount: 150, afterAmount: 160, source: 'flash-note' },
      { beforeAmount: 160, afterAmount: 165, source: 'flash-note' }
    ]
  );
  assert.equal(
    plan.nextAccounts.find((currentAccount) => currentAccount.id === account.id)?.amount,
    165
  );
  assert.equal(
    plan.nextAccounts.find((currentAccount) => currentAccount.id === otherAccount.id)?.amount,
    50
  );
  assert.equal(
    plan.nextHistory.some((record) => record.id === unrelatedHistory.id),
    true
  );
});

test('flash write plan for app data refuses archived latest target', () => {
  const plan = createFlashNoteWritePlanForAppData({
    appData: {
      groups: assetGroups,
      accounts: [{ ...account, archived: true }],
      history: []
    },
    cells: {
      '2026-05-10': cell('2026-05-10', '10')
    },
    createHistoryRecord,
    inputMode: 'change',
    selectedAccount: {
      groupId: 'group-1',
      accountId: account.id,
      groupName: 'Assets'
    },
    trackDates: ['2026-05-10']
  });

  assert.equal(plan, null);
});
