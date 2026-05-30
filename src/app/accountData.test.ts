/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveAssetStructureData } from '../features/charts/assetStructureData';
import {
  canDeleteAssetGroup,
  deleteAssetGroupFromAppData,
  deriveGroupsWithAccounts,
  getArchivedAccountEntries,
  getArchivedAccountRestoreGroup,
  getArchivedAccountRestoreTargetGroups,
  hasPersistedGroupAccounts,
  normalizeAppData,
  normalizeGroupsAndAccounts,
  restoreArchivedAccountToGroup,
  stripRuntimeAccountsFromGroups
} from './accountData';
import type { Account, AppData, AssetGroup, HistoryRecord } from './types';

const legacyGroups = [
  {
    name: 'Cash',
    nature: 'asset',
    includeInStats: true,
    sortOrder: 0,
    accounts: [
      {
        id: 'legacy-wallet',
        name: 'Wallet',
        amount: 120,
        createdAt: '2026-05-01T09:00:00.000Z',
        alias: 'W'
      },
      {
        name: 'Archived cash',
        amount: 30,
        createdAt: '2026-05-02T09:00:00.000Z',
        archived: true,
        archivedAt: '2026-05-03T09:00:00.000Z'
      }
    ]
  },
  {
    name: 'Cash',
    nature: 'asset',
    includeInStats: false,
    sortOrder: 1,
    accounts: [
      {
        name: 'Second wallet',
        amount: 80,
        createdAt: '2026-05-04T09:00:00.000Z'
      }
    ]
  },
  {
    name: 'Debt',
    nature: 'liability',
    includeInStats: true,
    sortOrder: 2,
    accounts: [
      {
        name: 'Credit card',
        amount: 50,
        createdAt: '2026-05-05T09:00:00.000Z'
      }
    ]
  }
];

test('legacy nested groups migrate to pure groups and top-level accounts', () => {
  const migrated = normalizeGroupsAndAccounts(legacyGroups);

  assert.equal(migrated.groups.length, 3);
  assert.equal(migrated.accounts.length, 4);
  assert.equal(hasPersistedGroupAccounts(migrated.groups), false);
  assert.equal(migrated.groups.every((group) => /^g_[0-9a-f]{24}$/.test(group.id)), true);
  assert.equal(migrated.accounts.every((account) => account.groupId.length > 0), true);
  assert.equal(
    migrated.accounts.every((account) =>
      migrated.groups.some((group) => group.id === account.groupId)
    ),
    true
  );
  assert.equal(migrated.accounts.some((account) => account.id === 'legacy-wallet'), true);

  const archivedAccount = migrated.accounts.find((account) => account.name === 'Archived cash');
  assert.equal(archivedAccount?.archived, true);
  assert.equal(archivedAccount?.archivedAt, '2026-05-03T09:00:00.000Z');

  const duplicateNameGroups = migrated.groups.filter((group) => group.name === 'Cash');
  assert.equal(duplicateNameGroups.length, 2);
  assert.notEqual(duplicateNameGroups[0]?.id, duplicateNameGroups[1]?.id);

  const liabilityAccount = migrated.accounts.find((account) => account.name === 'Credit card');
  assert.equal(liabilityAccount?.amount, -50);
});

test('normalizing migrated account data does not regenerate stable ids', () => {
  const migrated = normalizeGroupsAndAccounts(legacyGroups);
  const reloaded = normalizeGroupsAndAccounts({
    groups: migrated.groups,
    accounts: migrated.accounts
  });

  assert.deepEqual(
    reloaded.groups.map((group) => group.id),
    migrated.groups.map((group) => group.id)
  );
  assert.deepEqual(
    reloaded.accounts.map((account) => account.id),
    migrated.accounts.map((account) => account.id)
  );
  assert.deepEqual(
    reloaded.accounts.map((account) => account.groupId),
    migrated.accounts.map((account) => account.groupId)
  );
});

test('top-level account mutations preserve groupId and never re-nest accounts', () => {
  const group: AssetGroup = {
    id: 'g_current',
    name: 'Current',
    nature: 'asset',
    includeInStats: true,
    sortOrder: 0
  };
  const newAccount: Account = {
    id: 'a_current',
    groupId: group.id,
    name: 'Operating',
    amount: 100,
    createdAt: '2026-05-06T09:00:00.000Z'
  };
  const created = normalizeAppData([group], [newAccount], []);
  const edited: AppData = {
    ...created,
    accounts: created.accounts.map((account) =>
      account.id === newAccount.id ? { ...account, name: 'Operating edited' } : account
    )
  };
  const balanceChanged: AppData = {
    ...edited,
    accounts: edited.accounts.map((account) =>
      account.id === newAccount.id ? { ...account, amount: account.amount + 25 } : account
    )
  };
  const archived: AppData = {
    ...balanceChanged,
    accounts: balanceChanged.accounts.map((account) =>
      account.id === newAccount.id
        ? { ...account, archived: true, archivedAt: '2026-05-07T09:00:00.000Z' }
        : account
    )
  };
  const restored: AppData = {
    ...archived,
    accounts: archived.accounts.map((account) =>
      account.id === newAccount.id && archived.groups.some((item) => item.id === account.groupId)
        ? { ...account, archived: false, archivedAt: undefined }
        : account
    )
  };

  assert.equal(created.accounts.length, 1);
  assert.equal(edited.accounts[0]?.groupId, group.id);
  assert.equal(balanceChanged.accounts[0]?.groupId, group.id);
  assert.equal(archived.accounts.length, 1);
  assert.equal(archived.accounts[0]?.archived, true);
  assert.equal(restored.accounts[0]?.archived, false);
  assert.equal(restored.accounts[0]?.groupId, group.id);
  assert.equal(hasPersistedGroupAccounts(restored.groups), false);
});

test('runtime groupsWithAccounts is derived and stripped before persistence', () => {
  const migrated = normalizeGroupsAndAccounts(legacyGroups);
  const groupsWithAccounts = deriveGroupsWithAccounts(migrated.groups, migrated.accounts);
  const strippedGroups = stripRuntimeAccountsFromGroups(groupsWithAccounts);

  assert.equal(hasPersistedGroupAccounts(groupsWithAccounts), true);
  assert.equal(hasPersistedGroupAccounts(strippedGroups), false);
  assert.deepEqual(strippedGroups, migrated.groups);
});

test('snapshot-shaped exports keep groups and accounts as separate sources', () => {
  const migrated = normalizeGroupsAndAccounts(legacyGroups);
  const snapshotPayload = JSON.parse(
    JSON.stringify({
      groups: migrated.groups,
      accounts: migrated.accounts,
      history: []
    })
  ) as AppData;

  assert.equal(Array.isArray(snapshotPayload.groups), true);
  assert.equal(Array.isArray(snapshotPayload.accounts), true);
  assert.equal(hasPersistedGroupAccounts(snapshotPayload.groups), false);
  assert.equal(snapshotPayload.accounts.every((account) => account.groupId.length > 0), true);
});

test('legacy snapshot imports migrate through the same normalization path', () => {
  const imported = normalizeGroupsAndAccounts({ groups: legacyGroups, history: [] });

  assert.equal(imported.groups.length, 3);
  assert.equal(imported.accounts.length, 4);
  assert.equal(hasPersistedGroupAccounts(imported.groups), false);
  assert.equal(imported.accounts.every((account) => account.groupId.length > 0), true);
});

test('legacy nested archived accounts still migrate to their generated group id', () => {
  const imported = normalizeGroupsAndAccounts({ groups: legacyGroups, history: [] });
  const archivedAccount = imported.accounts.find((account) => account.name === 'Archived cash');
  const originalGroup = imported.groups.find((group) => group.id === archivedAccount?.groupId);

  assert.ok(archivedAccount);
  assert.equal(archivedAccount.archived, true);
  assert.equal(originalGroup?.name, 'Cash');
});

test('chart data derives account direction from groupId-linked group nature', () => {
  const migrated = normalizeGroupsAndAccounts(legacyGroups);
  const groupsWithAccounts = deriveGroupsWithAccounts(migrated.groups, migrated.accounts);
  const chartData = deriveAssetStructureData(groupsWithAccounts, [], 'share');

  assert.equal(chartData.positiveTotal, 120);
  assert.equal(chartData.negativeTotal, 50);
});

const createGroup = (id: string, name: string, sortOrder = 0): AssetGroup => ({
  id,
  name,
  nature: 'asset',
  includeInStats: true,
  sortOrder
});

const createAccount = (
  id: string,
  groupId: string,
  archived = false,
  name = id
): Account => ({
  id,
  groupId,
  name,
  amount: 100,
  createdAt: '2026-05-01T09:00:00.000Z',
  archived,
  archivedAt: archived ? '2026-05-02T09:00:00.000Z' : undefined
});

const createHistory = (accountId: string, groupName: string): HistoryRecord => ({
  id: `h-${accountId}`,
  accountId,
  type: '\u4fee\u6539' as HistoryRecord['type'],
  groupName,
  accountName: accountId,
  beforeAmount: 90,
  afterAmount: 100,
  time: '2026-05-03T09:00:00.000Z'
});

test('asset group delete availability uses group ids and ignores archived accounts', () => {
  const accounts = [
    createAccount('active-target', 'g-active'),
    createAccount('archived-target', 'g-archived', true),
    createAccount('same-name-active', 'g-same-name-active')
  ];

  assert.equal(canDeleteAssetGroup('g-active', accounts), false);
  assert.equal(canDeleteAssetGroup('g-archived', accounts), true);
  assert.equal(canDeleteAssetGroup('g-empty', accounts), true);
  assert.equal(canDeleteAssetGroup('g-default-empty', accounts), true);
});

test('archived account restore resolves the original group by id, not by name', () => {
  const originalGroup = createGroup('g-original', 'Cash', 2);
  const sameNameGroup = createGroup('g-same-name', 'Cash', 0);
  const account = createAccount('archived-cash', originalGroup.id, true, 'Cash account');

  assert.equal(
    getArchivedAccountRestoreGroup(account, [sameNameGroup, originalGroup])?.id,
    originalGroup.id
  );
});

test('archived top-level accounts keep missing group ids during normalization', () => {
  const group = createGroup('g-current', 'Current', 0);
  const normalized = normalizeGroupsAndAccounts({
    groups: [group],
    accounts: [
      {
        id: 'a-archived-missing',
        groupId: 'g-deleted',
        name: 'Archived missing',
        amount: 100,
        createdAt: '2026-05-01T09:00:00.000Z',
        archived: true,
        archivedAt: '2026-05-02T09:00:00.000Z'
      }
    ]
  });

  assert.equal(normalized.accounts[0]?.groupId, 'g-deleted');
  assert.equal(normalized.accounts[0]?.archived, true);
});

test('archived top-level accounts do not fall back to same-name groups', () => {
  const sameNameGroup = createGroup('g-new-cash', 'Cash', 0);
  const normalized = normalizeGroupsAndAccounts({
    groups: [sameNameGroup],
    accounts: [
      {
        id: 'a-archived-cash',
        groupId: 'g-deleted-cash',
        groupName: 'Cash',
        name: 'Archived cash',
        amount: 100,
        createdAt: '2026-05-01T09:00:00.000Z',
        archived: true,
        archivedAt: '2026-05-02T09:00:00.000Z'
      }
    ]
  });

  assert.equal(normalized.accounts[0]?.groupId, 'g-deleted-cash');
  assert.notEqual(normalized.accounts[0]?.groupId, sameNameGroup.id);
});

test('archived top-level accounts do not fall back to the first group', () => {
  const firstGroup = createGroup('g-first', 'First', 0);
  const normalized = normalizeGroupsAndAccounts({
    groups: [firstGroup],
    accounts: [
      {
        id: 'a-archived-orphan',
        groupId: 'g-deleted-orphan',
        name: 'Archived orphan',
        amount: 100,
        createdAt: '2026-05-01T09:00:00.000Z',
        archived: true,
        archivedAt: '2026-05-02T09:00:00.000Z'
      }
    ]
  });

  assert.equal(normalized.accounts[0]?.groupId, 'g-deleted-orphan');
  assert.notEqual(normalized.accounts[0]?.groupId, firstGroup.id);
});

test('active top-level accounts with missing group ids still use compatibility fallback', () => {
  const sameNameGroup = createGroup('g-current-cash', 'Cash', 0);
  const normalized = normalizeGroupsAndAccounts({
    groups: [sameNameGroup],
    accounts: [
      {
        id: 'a-active-cash',
        groupId: 'g-deleted-cash',
        groupName: 'Cash',
        name: 'Active cash',
        amount: 100,
        createdAt: '2026-05-01T09:00:00.000Z',
        archived: false
      }
    ]
  });

  assert.equal(normalized.accounts[0]?.groupId, sameNameGroup.id);
  assert.equal(normalized.accounts[0]?.archived, false);
});

test('new-structure snapshot imports preserve archived missing group ids', () => {
  const currentGroup = createGroup('g-current', 'Current', 0);
  const snapshot = {
    groups: [currentGroup],
    accounts: [
      {
        id: 'a-snapshot-archived',
        groupId: 'g-snapshot-deleted',
        groupName: 'Current',
        name: 'Snapshot archived',
        amount: 100,
        createdAt: '2026-05-01T09:00:00.000Z',
        archived: true,
        archivedAt: '2026-05-02T09:00:00.000Z'
      }
    ],
    history: []
  };
  const imported = normalizeGroupsAndAccounts(snapshot);

  assert.equal(imported.accounts[0]?.groupId, 'g-snapshot-deleted');
});

test('deleted original group sends archived account restore to an unselected target list', () => {
  const sameNameGroup = createGroup('g-same-name', 'Cash', 3);
  const targetGroup = createGroup('g-target', 'Operating', 1);
  const otherGroup = createGroup('g-other', 'Reserve', 2);
  const account = createAccount('archived-cash', 'g-deleted', true, 'Cash account');

  assert.equal(getArchivedAccountRestoreGroup(account, [sameNameGroup, targetGroup, otherGroup]), null);
  assert.deepEqual(
    getArchivedAccountRestoreTargetGroups([sameNameGroup, targetGroup, otherGroup]).map(
      (group) => group.id
    ),
    ['g-target', 'g-other', 'g-same-name']
  );
  assert.deepEqual(getArchivedAccountRestoreTargetGroups([]), []);
});

test('restore entry list includes archived accounts whose group id no longer exists', () => {
  const currentGroup = createGroup('g-current', 'Current', 0);
  const visibleArchivedAccount = createAccount(
    'a-visible-archived',
    currentGroup.id,
    true,
    'Visible archived'
  );
  const missingGroupArchivedAccount = createAccount(
    'a-missing-group',
    'g-deleted',
    true,
    'Missing group archived'
  );
  const groups = deriveGroupsWithAccounts([currentGroup], [visibleArchivedAccount]);
  const entries = getArchivedAccountEntries(
    groups,
    [visibleArchivedAccount, missingGroupArchivedAccount],
    [createHistory(missingGroupArchivedAccount.id, 'Deleted group')]
  );

  assert.deepEqual(
    entries.map((account) => account.id),
    ['a-visible-archived', 'a-missing-group']
  );
  assert.equal(
    entries.find((account) => account.id === missingGroupArchivedAccount.id)?.groupName,
    'Deleted group'
  );
});

test('missing-group archived restore requires a target choice and uses the chosen group only', () => {
  const sameNameGroup = createGroup('g-same-name', 'Cash', 0);
  const targetGroup = createGroup('g-target', 'Operating', 1);
  const account = createAccount('a-deleted-cash', 'g-deleted-cash', true, 'Cash account');
  const appData: AppData = {
    groups: [sameNameGroup, targetGroup],
    accounts: [account],
    history: [createHistory(account.id, 'Cash')]
  };

  assert.equal(getArchivedAccountRestoreGroup(account, appData.groups), null);

  const nextData = restoreArchivedAccountToGroup(
    appData,
    account.id,
    targetGroup.id,
    '2026-05-08T09:00:00.000Z',
    'h-target-restore'
  );

  assert.ok(nextData);
  assert.equal(nextData.accounts[0]?.groupId, targetGroup.id);
  assert.notEqual(nextData.accounts[0]?.groupId, sameNameGroup.id);
  assert.equal(nextData.history[0]?.groupName, targetGroup.name);
  assert.equal(nextData.history[1]?.groupName, 'Cash');
});

test('restoring an archived account to a chosen group updates only that account and appends target history', () => {
  const targetGroup = createGroup('g-target', 'Operating', 0);
  const untouchedGroup = createGroup('g-untouched', 'Cash', 1);
  const archivedAccount = createAccount('archived-cash', 'g-deleted', true, 'Cash account');
  const untouchedAccount = createAccount('active-cash', untouchedGroup.id, false, 'Active cash');
  const oldHistory = createHistory(archivedAccount.id, 'Deleted Cash');
  const appData: AppData = {
    groups: [targetGroup, untouchedGroup],
    accounts: [archivedAccount, untouchedAccount],
    history: [oldHistory]
  };

  const nextData = restoreArchivedAccountToGroup(
    appData,
    archivedAccount.id,
    targetGroup.id,
    '2026-05-08T09:00:00.000Z',
    'h-restore'
  );

  assert.ok(nextData);
  const restoredAccount = nextData.accounts.find((account) => account.id === archivedAccount.id);
  assert.equal(restoredAccount?.groupId, targetGroup.id);
  assert.equal(restoredAccount?.archived, false);
  assert.equal(restoredAccount?.archivedAt, undefined);
  assert.equal(nextData.accounts.find((account) => account.id === untouchedAccount.id)?.groupId, untouchedGroup.id);
  assert.equal(nextData.history[0]?.id, 'h-restore');
  assert.equal(nextData.history[0]?.type, '\u91cd\u65b0\u542f\u7528');
  assert.equal(nextData.history[0]?.groupName, targetGroup.name);
  assert.equal(nextData.history[1], oldHistory);
  assert.equal(oldHistory.groupName, 'Deleted Cash');
});

test('restore helper keeps valid groupId direct restores and refuses missing target groups', () => {
  const originalGroup = createGroup('g-original', 'Cash', 0);
  const account = createAccount('archived-cash', originalGroup.id, true, 'Cash account');
  const appData: AppData = {
    groups: [originalGroup],
    accounts: [account],
    history: []
  };

  const directlyRestored = restoreArchivedAccountToGroup(
    appData,
    account.id,
    originalGroup.id,
    '2026-05-08T09:00:00.000Z',
    'h-direct-restore'
  );
  const blocked = restoreArchivedAccountToGroup(
    { ...appData, groups: [] },
    account.id,
    originalGroup.id,
    '2026-05-08T09:00:00.000Z',
    'h-blocked-restore'
  );

  assert.ok(directlyRestored);
  assert.equal(directlyRestored.accounts[0]?.groupId, originalGroup.id);
  assert.equal(directlyRestored.accounts[0]?.archived, false);
  assert.equal(blocked, null);
});

test('deleting an asset group only removes the target group and preserves accounts and history', () => {
  const groups = [createGroup('g-cash-a', 'Cash'), createGroup('g-cash-b', 'Cash', 1)];
  const accounts = [
    createAccount('archived-cash', 'g-cash-a', true),
    createAccount('active-cash', 'g-cash-b')
  ];
  const history = [
    createHistory('archived-cash', 'Cash'),
    createHistory('active-cash', 'Cash')
  ];
  const appData: AppData = { groups, accounts, history };

  const nextData = deleteAssetGroupFromAppData(appData, 'g-cash-a');

  assert.deepEqual(
    nextData.groups.map((group) => group.id),
    ['g-cash-b']
  );
  assert.strictEqual(nextData.accounts, accounts);
  assert.strictEqual(nextData.history, history);
  assert.equal(nextData.accounts.find((account) => account.id === 'archived-cash')?.groupId, 'g-cash-a');
  assert.equal(nextData.history[0]?.groupName, 'Cash');
});

test('asset group deletion is blocked only by active accounts in the same group id', () => {
  const groups = [createGroup('g-cash-a', 'Cash'), createGroup('g-cash-b', 'Cash', 1)];
  const history = [createHistory('active-cash-a', 'Cash')];
  const appData: AppData = {
    groups,
    accounts: [
      createAccount('active-cash-a', 'g-cash-a'),
      createAccount('archived-cash-b', 'g-cash-b', true)
    ],
    history
  };

  const blockedData = deleteAssetGroupFromAppData(appData, 'g-cash-a');
  const nextData = deleteAssetGroupFromAppData(appData, 'g-cash-b');

  assert.strictEqual(blockedData, appData);
  assert.deepEqual(
    nextData.groups.map((group) => group.id),
    ['g-cash-a']
  );
  assert.deepEqual(appData.history, history);
});
