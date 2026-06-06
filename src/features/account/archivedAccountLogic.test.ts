/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Account, AppData, AssetGroup, AssetGroupWithAccounts } from '../../app/types';
import {
  archiveAccountInAppData,
  filterArchivedAccountsForRestore,
  getArchivedRestoreTargetGroups,
  prepareArchivedAccountRestore,
  restoreArchivedAccountInAppData
} from './archivedAccountLogic';

const createGroup = (id: string, name: string, sortOrder = 0): AssetGroup => ({
  id,
  name,
  nature: 'asset',
  includeInStats: true,
  sortOrder
});

const createAccount = (id: string, groupId: string, archived = false): Account => ({
  id,
  groupId,
  name: id,
  amount: 100,
  createdAt: '2026-05-01T09:00:00.000Z',
  archived,
  archivedAt: archived ? '2026-05-02T09:00:00.000Z' : undefined
});

const withAccounts = (group: AssetGroup, accounts: Account[] = []): AssetGroupWithAccounts => ({
  ...group,
  accounts
});

test('archiving account keeps data and adds archive history', () => {
  const group = createGroup('g-cash', 'Cash');
  const account = createAccount('a-wallet', group.id);
  const nextData = archiveAccountInAppData({
    appData: { groups: [group], accounts: [account], history: [] },
    groupId: group.id,
    account,
    archivedAt: '2026-05-03T09:00:00.000Z',
    historyRecordId: 'h-archive'
  });

  assert.ok(nextData);
  assert.equal(nextData.accounts[0]?.archived, true);
  assert.equal(nextData.accounts[0]?.archivedAt, '2026-05-03T09:00:00.000Z');
  assert.equal(nextData.history[0]?.type, '\u5f52\u6863');
  assert.equal(nextData.history[0]?.beforeAmount, 100);
  assert.equal(nextData.history[0]?.afterAmount, 100);
});

test('restore target preparation requires choosing a group when original group is gone', () => {
  const currentGroup = createGroup('g-current', 'Current', 1);
  const archivedAccount = createAccount('a-archived', 'g-deleted', true);
  const plan = prepareArchivedAccountRestore(
    archivedAccount.groupId,
    archivedAccount,
    [currentGroup],
    'account-detail'
  );

  assert.equal(plan.type, 'needs-target');

  if (plan.type === 'needs-target') {
    assert.deepEqual(plan.pendingRestore, {
      accountId: archivedAccount.id,
      source: 'account-detail'
    });
  }
});

test('restore target list keeps account type sort order', () => {
  const late = createGroup('g-late', 'Late', 2);
  const early = createGroup('g-early', 'Early', 0);

  assert.deepEqual(
    getArchivedRestoreTargetGroups([late, early]).map((group) => group.id),
    ['g-early', 'g-late']
  );
});

test('restoring archived account blocks duplicate active names', () => {
  const group = createGroup('g-cash', 'Cash');
  const archivedAccount = { ...createAccount('a-archived', group.id, true), name: 'Wallet' };
  const activeAccount = { ...createAccount('a-active', group.id), name: 'Wallet' };
  const appData: AppData = {
    groups: [group],
    accounts: [archivedAccount, activeAccount],
    history: []
  };
  const result = restoreArchivedAccountInAppData({
    appData,
    groups: [withAccounts(group, [archivedAccount, activeAccount])],
    account: archivedAccount,
    targetGroup: group,
    restoredAt: '2026-05-03T09:00:00.000Z',
    historyRecordId: 'h-restore'
  });

  assert.equal(result.ok, false);
});

test('archived restore search filters by account name', () => {
  const group = createGroup('g-cash', 'Cash');
  const accounts = [
    { ...createAccount('a-wallet', group.id, true), groupName: group.name },
    { ...createAccount('a-card', group.id, true), name: 'Credit card', groupName: group.name }
  ];

  assert.deepEqual(
    filterArchivedAccountsForRestore(accounts, 'card').map((account) => account.id),
    ['a-card']
  );
});
