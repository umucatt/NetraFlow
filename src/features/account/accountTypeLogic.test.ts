/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Account, AppData, AssetGroup } from '../../app/types';
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

const account: Account = {
  id: 'a-wallet',
  groupId: group.id,
  name: 'Wallet',
  amount: 100,
  createdAt: '2026-05-01T09:00:00.000Z'
};

test('account type name validation keeps existing non-empty rule', () => {
  assert.equal(validateAccountTypeName(''), '请输入账户类型名称');
  assert.equal(validateAccountTypeName('  '), '请输入账户类型名称');
  assert.equal(validateAccountTypeName('Cash'), null);
});

test('account type creation appends after the current sort order', () => {
  const result = createAccountTypeInAppData({
    appData: { groups: [group], accounts: [], history: [] },
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
