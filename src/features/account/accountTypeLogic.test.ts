/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Account, AppData, ArchivedAccountEntry, AssetGroup } from '../../app/types';
import { DUPLICATE_NAME_PLACEHOLDER } from './accountNameUniqueness';
import {
  canDeleteAccountType,
  createAccountTypeInAppData,
  updateAccountTypeInAppData,
  validateAccountTypeName
} from './accountTypeLogic';

const group: AssetGroup = {
  id: 'g-cash',
  name: 'Cash',
  nature: 'asset',
  includeInStats: true,
  sortOrder: 0
};

const createGroup = (id: string, name: string): AssetGroup => ({
  id,
  name,
  nature: 'asset',
  includeInStats: true,
  sortOrder: 0
});

const account: Account = {
  id: 'a-wallet',
  groupId: group.id,
  name: 'Wallet',
  amount: 100,
  createdAt: '2026-05-01T09:00:00.000Z'
};

const archivedAccount: ArchivedAccountEntry = {
  ...account,
  id: 'a-archived',
  name: 'Archived wallet',
  archived: true,
  groupName: 'Archived type'
};

test('account type name validation keeps existing non-empty rule', () => {
  assert.equal(validateAccountTypeName(''), '请输入账户类型名称');
  assert.equal(validateAccountTypeName('  '), '请输入账户类型名称');
  assert.equal(validateAccountTypeName('Cash'), null);
});

test('account type creation appends after the current sort order', () => {
  const result = createAccountTypeInAppData({
    appData: { groups: [group], accounts: [], history: [] },
    archivedAccounts: [],
    groupId: 'g-debt',
    name: 'Debt',
    nature: 'liability',
    includeInStats: false
  });

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.group.sortOrder, 1);
    assert.equal(result.group.includeInStats, false);
    assert.equal(result.nextData.groups.length, 2);
  }
});

test('account type update rewrites group names in related history', () => {
  const appData: AppData = {
    groups: [group],
    accounts: [account],
    history: [
      {
        id: 'h-wallet',
        accountId: account.id,
        type: '\u4fee\u6539',
        groupName: group.name,
        accountName: account.name,
        beforeAmount: 90,
        afterAmount: 100,
        time: '2026-05-02T09:00:00.000Z'
      }
    ]
  };
  const result = updateAccountTypeInAppData({
    appData,
    archivedAccounts: [],
    groupId: group.id,
    name: 'Operating',
    nature: 'liability',
    includeInStats: false
  });

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.nextData.groups[0]?.name, 'Operating');
    assert.equal(result.nextData.accounts[0]?.amount, -100);
    assert.equal(result.nextData.history[0]?.groupName, 'Operating');
  }
});

test('account type delete remains blocked by active accounts only', () => {
  assert.equal(canDeleteAccountType(group.id, [account]), false);
  assert.equal(canDeleteAccountType(group.id, [{ ...account, archived: true }]), true);
});

test('account type creation rejects existing active names', () => {
  const result = createAccountTypeInAppData({
    appData: { groups: [group], accounts: [], history: [] },
    archivedAccounts: [],
    groupId: 'g-duplicate',
    name: ' Cash ',
    nature: 'asset',
    includeInStats: true
  });

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.error, DUPLICATE_NAME_PLACEHOLDER);
  }
});

test('account type update rejects another active account type name', () => {
  const otherGroup = createGroup('g-other', 'Other');
  const result = updateAccountTypeInAppData({
    appData: { groups: [group, otherGroup], accounts: [], history: [] },
    archivedAccounts: [],
    groupId: group.id,
    name: 'Other',
    nature: 'asset',
    includeInStats: true
  });

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.error, DUPLICATE_NAME_PLACEHOLDER);
  }
});

test('account type creation rejects names occupied by archived account group names', () => {
  const result = createAccountTypeInAppData({
    appData: { groups: [group], accounts: [archivedAccount], history: [] },
    archivedAccounts: [archivedAccount],
    groupId: 'g-archived',
    name: 'Archived type',
    nature: 'asset',
    includeInStats: true
  });

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.error, DUPLICATE_NAME_PLACEHOLDER);
  }
});
