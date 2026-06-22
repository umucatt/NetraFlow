/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Account, AppData, AssetGroup, HistoryRecord } from '../../app/types';
import type { RollupImportRecord, RollupImportReview } from '../../rollupImportLogic';
import { createRollupImportWritePlan } from './rollupImportWriteLogic';
import type { RollupHistoryRecordInput } from './rollupImportTypes';

const group: AssetGroup = {
  id: 'group-1',
  name: 'Latest Assets',
  nature: 'asset',
  includeInStats: true,
  sortOrder: 0
};

const account: Account = {
  id: 'account-1',
  groupId: group.id,
  name: 'Wallet',
  amount: 100,
  createdAt: '2026-05-01T00:00:00.000Z'
};

const createReview = (records: RollupImportRecord[]): RollupImportReview => ({
  format: 'netraflow_rollup',
  records,
  unresolvedItems: [],
  issues: [],
  riskLevel: 'low',
  lowRiskKind: 'strict',
  hasBlockingIssues: false
});

const record = (
  date: string,
  amount: number,
  inputIndex: number,
  accountKeyword = 'wallet'
): RollupImportRecord => ({
  id: `${accountKeyword}-${date}-${inputIndex}`,
  date,
  mode: 'change',
  amount,
  currency: 'CNY',
  accountKeyword,
  inputIndex
});

const createHistoryRecord = ({
  account: recordAccount,
  afterAmount,
  beforeAmount,
  groupName,
  source,
  time
}: RollupHistoryRecordInput): HistoryRecord => ({
  id: `history-${time}-${afterAmount}`,
  accountId: recordAccount.id,
  type: '修改',
  groupName,
  accountName: recordAccount.name,
  beforeAmount,
  afterAmount,
  time,
  source
});

test('rollup write plan applies batch to latest core state', () => {
  const otherAccount: Account = {
    ...account,
    id: 'account-2',
    name: 'Other',
    amount: 60
  };
  const unrelatedHistory: HistoryRecord = {
    id: 'unrelated-after-preview',
    accountId: otherAccount.id,
    type: '修改',
    groupName: group.name,
    accountName: otherAccount.name,
    beforeAmount: 50,
    afterAmount: 60,
    time: '2026-05-09T12:00:00.000Z'
  };
  const appData: AppData = {
    groups: [group],
    accounts: [{ ...account, amount: 150 }, otherAccount],
    history: [unrelatedHistory]
  };

  const plan = createRollupImportWritePlan({
    appData,
    accountAssignments: {
      wallet: { groupId: 'old-group', groupName: 'Old Assets', accountId: account.id }
    },
    createHistoryRecord,
    importReview: createReview([record('2026-05-10', 10, 0)])
  });

  assert.ok(plan);
  assert.deepEqual(
    plan.historyRecords.map((historyRecord) => ({
      beforeAmount: historyRecord.beforeAmount,
      afterAmount: historyRecord.afterAmount,
      groupName: historyRecord.groupName,
      source: historyRecord.source
    })),
    [
      {
        beforeAmount: 150,
        afterAmount: 160,
        groupName: 'Latest Assets',
        source: 'rollup'
      }
    ]
  );
  assert.equal(
    plan.nextAccounts.find((currentAccount) => currentAccount.id === account.id)?.amount,
    160
  );
  assert.equal(
    plan.nextAccounts.find((currentAccount) => currentAccount.id === otherAccount.id)?.amount,
    60
  );
  assert.equal(
    plan.nextHistory.some((historyRecord) => historyRecord.id === unrelatedHistory.id),
    true
  );
});

test('rollup write plan chains same-account records in batch order', () => {
  const appData: AppData = {
    groups: [group],
    accounts: [{ ...account, amount: 100 }],
    history: []
  };

  const plan = createRollupImportWritePlan({
    appData,
    accountAssignments: {
      wallet: { groupId: group.id, groupName: group.name, accountId: account.id }
    },
    createHistoryRecord,
    importReview: createReview([
      record('2026-05-10', 10, 0),
      record('2026-05-11', -5, 1)
    ])
  });

  assert.ok(plan);
  assert.deepEqual(
    plan.historyRecords.map((historyRecord) => ({
      beforeAmount: historyRecord.beforeAmount,
      afterAmount: historyRecord.afterAmount
    })),
    [
      { beforeAmount: 100, afterAmount: 110 },
      { beforeAmount: 110, afterAmount: 105 }
    ]
  );
  assert.equal(plan.nextAccounts[0]?.amount, 105);
});

test('rollup write plan refuses archived latest target', () => {
  const plan = createRollupImportWritePlan({
    appData: {
      groups: [group],
      accounts: [{ ...account, archived: true }],
      history: []
    },
    accountAssignments: {
      wallet: { groupId: group.id, groupName: group.name, accountId: account.id }
    },
    createHistoryRecord,
    importReview: createReview([record('2026-05-10', 10, 0)])
  });

  assert.equal(plan, null);
});
