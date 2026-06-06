/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveSearchNavigationTarget,
  getSearchNavigationTargetsForResult
} from '../searchNavigationLogic';
import {
  createAccountSearchTarget,
  createHistorySearchTarget,
  createSettingsSearchTarget,
  createSnapshotSearchTarget
} from '../searchNavigation';
import type {
  AssetGroupWithAccounts,
  BackupRecord,
  HistoryRecord,
  SettingsSearchItem
} from '../searchTypes';

type SettingsSection = 'appearance' | 'backup' | 'search';

const isSettingsSection = (value: string): value is SettingsSection =>
  value === 'appearance' || value === 'backup' || value === 'search';

const groups: AssetGroupWithAccounts[] = [
  {
    id: 'group-a',
    name: 'Assets',
    nature: 'asset',
    includeInStats: true,
    sortOrder: 0,
    accounts: [
      {
        id: 'account-a',
        groupId: 'group-a',
        name: 'Cash',
        amount: 100,
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ]
  }
];

const historyRecords: HistoryRecord[] = [
  {
    id: 'history-a',
    accountId: 'account-a',
    type: '修改',
    groupName: 'Assets',
    accountName: 'Cash',
    beforeAmount: 80,
    afterAmount: 100,
    time: '2026-05-12T10:00:00.000Z'
  }
];

const backupRecords: BackupRecord[] = [
  {
    id: 'backup-a',
    backedUpAt: '2026-05-13T10:00:00.000Z',
    historyCount: 1,
    incrementCount: 1,
    method: 'manual'
  }
];

const settingsItems: SettingsSearchItem[] = [
  {
    id: 'settings-search',
    title: 'Search',
    group: 'Settings',
    description: 'Search settings',
    section: 'search',
    blockId: 'settings-search-block'
  },
  {
    id: 'settings-legacy',
    title: 'Legacy',
    group: 'Settings',
    description: 'Legacy section fallback',
    section: 'legacy-section'
  }
];

const resolveTarget = (target: Parameters<typeof resolveSearchNavigationTarget>[0]) =>
  resolveSearchNavigationTarget<SettingsSection>(target, {
    groups,
    historyRecords,
    backupRecords,
    settingsItems,
    defaultSettingsSection: 'appearance',
    isSettingsSection,
    getHistoryRecordDate: (record) => record.time.slice(0, 10)
  });

test('resolves account search targets', () => {
  const intent = resolveTarget(createAccountSearchTarget('group-a', 'account-a'));

  assert.equal(intent.type, 'account');
  assert.equal(intent.type === 'account' ? intent.group.id : '', 'group-a');
  assert.equal(intent.type === 'account' ? intent.account.id : '', 'account-a');
});

test('resolves history search targets with account-detail positioning data', () => {
  const intent = resolveTarget(createHistorySearchTarget('history-a'));

  assert.equal(intent.type, 'history');
  assert.equal(intent.type === 'history' ? intent.record.id : '', 'history-a');
  assert.equal(intent.type === 'history' ? intent.group.id : '', 'group-a');
  assert.equal(intent.type === 'history' ? intent.account.id : '', 'account-a');
  assert.equal(intent.type === 'history' ? intent.recordDate : '', '2026-05-12');
});

test('resolves snapshot search targets', () => {
  const intent = resolveTarget(createSnapshotSearchTarget('backup-a'));

  assert.equal(intent.type, 'snapshot');
  assert.equal(intent.type === 'snapshot' ? intent.record.id : '', 'backup-a');
});

test('resolves settings section and block targets', () => {
  const intent = resolveTarget(
    createSettingsSearchTarget('settings-search', 'search', 'settings-search-block')
  );

  assert.equal(intent.type, 'settings');
  assert.equal(intent.type === 'settings' ? intent.section : '', 'search');
  assert.equal(intent.type === 'settings' ? intent.blockId : '', 'settings-search-block');
});

test('falls back safely for invalid settings sections and invalid targets', () => {
  const settingsIntent = resolveTarget(
    createSettingsSearchTarget('settings-legacy', 'missing-section')
  );
  const missingIntent = resolveTarget(createHistorySearchTarget('missing-history'));

  assert.equal(settingsIntent.type, 'settings');
  assert.equal(settingsIntent.type === 'settings' ? settingsIntent.section : '', 'appearance');
  assert.deepEqual(missingIntent, {
    type: 'none',
    target: createHistorySearchTarget('missing-history'),
    reason: 'not-found'
  });
});

test('uses strong navigation targets only when the opened target belongs to them', () => {
  const firstTarget = createHistorySearchTarget('history-a');
  const secondTarget = createSnapshotSearchTarget('backup-a');
  const unrelatedTarget = createAccountSearchTarget('group-a', 'account-a');

  assert.deepEqual(getSearchNavigationTargetsForResult(firstTarget, [firstTarget, secondTarget]), [
    firstTarget,
    secondTarget
  ]);
  assert.deepEqual(getSearchNavigationTargetsForResult(unrelatedTarget, [firstTarget]), [
    unrelatedTarget
  ]);
});
