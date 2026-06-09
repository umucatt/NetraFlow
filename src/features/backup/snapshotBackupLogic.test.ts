/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { Account, AppData, AssetGroup, HistoryRecord } from '../../app/types';
import {
  FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY,
  LAST_BACKUP_STORAGE_KEY
} from '../../app/storageKeys';
import { nfStorage } from '../../app/nfStorage';
import { parseNetraFlowJsonFile } from '../../app/jsonIntegrity';
import {
  consumeAutoBackupDueOnce,
  countChangedHistoryRecords,
  createSnapshotRestoreData,
  getAutoSnapshotProgressState,
  createBackupFileContent,
  getBackupFileName,
  isAutoBackupCycleDue,
  markAutoBackupDueOnce,
  mergeSnapshotImportRecords,
  normalizeSnapshotImportRecords,
  shouldRunStartupAutoBackupCycle,
  SNAPSHOT_INCOMPLETE_ERROR_MESSAGE
} from './snapshotBackupLogic';

const withStorageWindow = (callback: () => void) => {
  const items = new Map<string, string>();
  const previousWindow = (globalThis as unknown as { window?: unknown }).window;

  (globalThis as unknown as { window?: unknown }).window = {
    localStorage: {
      get length() {
        return items.size;
      },
      key(index: number) {
        return Array.from(items.keys())[index] ?? null;
      },
      getItem(key: string) {
        return items.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        items.set(key, value);
      },
      removeItem(key: string) {
        items.delete(key);
      }
    }
  };

  try {
    callback();
  } finally {
    (globalThis as unknown as { window?: unknown }).window = previousWindow;
  }
};

const createHistoryRecord = (overrides: Partial<HistoryRecord> = {}): HistoryRecord => ({
  id: 'history-1',
  accountId: 'account-1',
  type: '修改',
  groupName: '现金',
  accountName: '钱包',
  beforeAmount: 10,
  afterAmount: 12,
  time: '2026-06-09T12:00:00.000Z',
  ...overrides
});

const createGroup = (id: string, name: string): AssetGroup => ({
  id,
  name,
  nature: 'asset',
  includeInStats: true,
  sortOrder: 0
});

const createAccount = (id: string, groupId: string, name: string): Account => ({
  id,
  groupId,
  name,
  amount: 100,
  createdAt: '2026-06-01T12:00:00.000Z'
});

const createSnapshotFields = ({
  groups = [],
  accounts = [],
  history = []
}: {
  groups?: unknown;
  accounts?: unknown;
  history?: unknown;
} = {}) => ({
  groups,
  accounts,
  history
});

test('plain snapshot file content is minified integrity payload JSON', async () => {
  const payload = {
    app: 'NetraFlow',
    schemaVersion: 1,
    groups: [],
    accounts: [],
    history: []
  };
  const text = await createBackupFileContent(payload, null);
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const result = await parseNetraFlowJsonFile(text);

  assert.equal(text.includes('\n'), false);
  assert.equal('integrity' in parsed, true);
  assert.equal('payload' in parsed, true);
  assert.equal('encrypted' in parsed, false);
  assert.equal(result.status, 'valid');
  assert.deepEqual(result.content, payload);
});

test('encrypted snapshot file names keep the encrypted suffix before json', () => {
  const backupAt = new Date(2026, 5, 3, 4, 5).toISOString();

  assert.equal(
    getBackupFileName(backupAt, true),
    'netraflow-snapshot-20260603-0405.encrypted.json'
  );
  assert.equal(
    getBackupFileName(backupAt, false),
    'netraflow-snapshot-20260603-0405.json'
  );
});

test('auto snapshot progress uses day-level labels before any auto backup', () => {
  assert.deepEqual(
    getAutoSnapshotProgressState('', { value: 1, unit: 'day' }, new Date(2026, 5, 9, 12)),
    {
      progressPercent: 0,
      previousLabel: '暂未进行',
      nextLabel: '明天'
    }
  );

  assert.deepEqual(
    getAutoSnapshotProgressState('', { value: 3, unit: 'day' }, new Date(2026, 5, 9, 12)),
    {
      progressPercent: 0,
      previousLabel: '暂未进行',
      nextLabel: '3 天后'
    }
  );
});

test('auto snapshot progress shows next startup once the day cycle is reached', () => {
  const now = new Date(2026, 5, 9, 0, 1);
  const yesterdayLate = new Date(2026, 5, 8, 23, 59).toISOString();

  assert.deepEqual(
    getAutoSnapshotProgressState(yesterdayLate, { value: 1, unit: 'day' }, now),
    {
      progressPercent: 100,
      previousLabel: '昨天',
      nextLabel: '下次启动'
    }
  );
});

test('auto snapshot progress keeps relative labels at calendar-day granularity', () => {
  const now = new Date(2026, 5, 9, 12);
  const today = new Date(2026, 5, 9, 1).toISOString();
  const twoDaysAgo = new Date(2026, 5, 7, 23).toISOString();
  const twoDayState = getAutoSnapshotProgressState(
    twoDaysAgo,
    { value: 1, unit: 'week' },
    now
  );

  assert.deepEqual(getAutoSnapshotProgressState(today, { value: 1, unit: 'day' }, now), {
    progressPercent: 0,
    previousLabel: '今天',
    nextLabel: '明天'
  });
  assert.equal(twoDayState.progressPercent, (2 / 7) * 100);
  assert.equal(twoDayState.previousLabel, '2 天前');
  assert.equal(twoDayState.nextLabel, '5 天后');
});

test('auto backup cycle due check uses local calendar days for one-day cycles', () => {
  const todayNoon = new Date(2026, 5, 9, 12);
  const todayEarly = new Date(2026, 5, 9, 0, 1).toISOString();
  const yesterdayLate = new Date(2026, 5, 8, 23, 59).toISOString();

  assert.equal(
    isAutoBackupCycleDue(todayEarly, { value: 1, unit: 'day' }, todayNoon),
    false
  );
  assert.equal(
    isAutoBackupCycleDue(yesterdayLate, { value: 1, unit: 'day' }, todayNoon),
    true
  );
});

test('auto backup cycle due check uses local calendar days for weekly cycles', () => {
  const todayNoon = new Date(2026, 5, 9, 12);
  const sixDaysAgo = new Date(2026, 5, 3, 23, 59).toISOString();
  const sevenDaysAgo = new Date(2026, 5, 2, 23, 59).toISOString();

  assert.equal(
    isAutoBackupCycleDue(sixDaysAgo, { value: 1, unit: 'week' }, todayNoon),
    false
  );
  assert.equal(
    isAutoBackupCycleDue(sevenDaysAgo, { value: 1, unit: 'week' }, todayNoon),
    true
  );
});

test('auto backup cycle due check is not blocked by minute-level time differences', () => {
  const todayJustAfterMidnight = new Date(2026, 5, 9, 0, 1);
  const yesterdayJustBeforeMidnight = new Date(2026, 5, 8, 23, 59).toISOString();

  assert.equal(
    isAutoBackupCycleDue(
      yesterdayJustBeforeMidnight,
      { value: 1, unit: 'day' },
      todayJustAfterMidnight
    ),
    true
  );
});

test('doautobackup marker writes, consumes once, clears, and preserves lastBackupAt', () => {
  withStorageWindow(() => {
    const lastBackupAt = '2026-06-09T09:00:00.000Z';

    assert.equal(nfStorage.getItem(FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY), null);
    markAutoBackupDueOnce();
    nfStorage.setItem(LAST_BACKUP_STORAGE_KEY, lastBackupAt);

    assert.equal(nfStorage.getItem(FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY), 'true');
    assert.equal(consumeAutoBackupDueOnce(), true);
    assert.equal(nfStorage.getItem(FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY), null);
    assert.equal(nfStorage.getItem(LAST_BACKUP_STORAGE_KEY), lastBackupAt);
    assert.equal(consumeAutoBackupDueOnce(), false);
  });
});

test('doautobackup marker can make startup cycle due without changing calendar due logic', () => {
  withStorageWindow(() => {
    const todayNoon = new Date(2026, 5, 9, 12);
    const todayEarly = new Date(2026, 5, 9, 0, 1).toISOString();
    const cycle = { value: 1, unit: 'day' } as const;

    assert.equal(isAutoBackupCycleDue(todayEarly, cycle, todayNoon), false);
    markAutoBackupDueOnce();

    assert.equal(
      shouldRunStartupAutoBackupCycle(
        todayEarly,
        cycle,
        consumeAutoBackupDueOnce(),
        todayNoon
      ),
      true
    );
    assert.equal(
      shouldRunStartupAutoBackupCycle(
        todayEarly,
        cycle,
        consumeAutoBackupDueOnce(),
        todayNoon
      ),
      false
    );
  });
});

test('startup auto backup consumes marker without bypassing enabled or directory checks', () => {
  const source = readFileSync('src/features/backup/useSnapshotBackupController.tsx', 'utf8');
  const runStartupSource = source.slice(
    source.indexOf('const runStartupAutoBackup = async () => {'),
    source.indexOf('const importBackupData =')
  );
  const consumeIndex = runStartupSource.indexOf(
    'const forceDueOnce = consumeAutoBackupDueOnce();'
  );
  const enabledCheckIndex = runStartupSource.indexOf('if (!settings.enabled)');
  const directoryCheckIndex = runStartupSource.indexOf('if (!directory)');
  const dueCheckIndex = runStartupSource.indexOf('shouldRunStartupAutoBackupCycle(');

  assert.equal(consumeIndex > -1, true);
  assert.equal(enabledCheckIndex > consumeIndex, true);
  assert.equal(directoryCheckIndex > enabledCheckIndex, true);
  assert.equal(dueCheckIndex > directoryCheckIndex, true);
});

test('snapshot import records normalize count fields and sort latest first', () => {
  const records = normalizeSnapshotImportRecords([
    {
      id: 'older',
      importedAt: '2026-06-08T12:00:00.000Z',
      snapshotCreatedAt: 'bad-time',
      historyRecordCount: 3.8,
      changedHistoryRecordCount: -1
    },
    {
      id: 'latest',
      importedAt: '2026-06-09T12:00:00.000Z',
      snapshotCreatedAt: '2026-06-09T10:00:00.000Z',
      historyRecordCount: '8',
      changedHistoryRecordCount: 0
    },
    {
      id: 'invalid',
      importedAt: 'bad-time',
      historyRecordCount: 1,
      changedHistoryRecordCount: 1
    }
  ]);

  assert.deepEqual(records, [
    {
      id: 'latest',
      importedAt: '2026-06-09T12:00:00.000Z',
      snapshotCreatedAt: '2026-06-09T10:00:00.000Z',
      historyRecordCount: 0,
      changedHistoryRecordCount: 0
    },
    {
      id: 'older',
      importedAt: '2026-06-08T12:00:00.000Z',
      snapshotCreatedAt: null,
      historyRecordCount: 3,
      changedHistoryRecordCount: 0
    }
  ]);
});

test('changed history count ignores normalized-equivalent source field aliases', () => {
  const currentRecord = createHistoryRecord({ note: '备注' });
  const importedRecord = {
    ...createHistoryRecord({ note: '备注' }),
    recordId: currentRecord.id,
    date: currentRecord.time,
    remark: currentRecord.note
  } as HistoryRecord;
  const mergedRecord = { ...currentRecord, ...importedRecord };

  assert.equal(
    countChangedHistoryRecords([currentRecord], [importedRecord], [mergedRecord]),
    0
  );
});

test('changed history count includes new records and same-id content updates', () => {
  const unchangedRecord = createHistoryRecord({ id: 'unchanged' });
  const changedRecord = createHistoryRecord({ id: 'changed', afterAmount: 12 });
  const importedChangedRecord = createHistoryRecord({ id: 'changed', afterAmount: 15 });
  const newRecord = createHistoryRecord({ id: 'new' });

  assert.equal(
    countChangedHistoryRecords(
      [unchangedRecord, changedRecord],
      [unchangedRecord, importedChangedRecord, newRecord],
      [unchangedRecord, { ...changedRecord, ...importedChangedRecord }, newRecord]
    ),
    2
  );
});

test('changed history count includes records removed by snapshot restore', () => {
  const removedRecord = createHistoryRecord({ id: 'removed' });
  const unchangedRecord = createHistoryRecord({ id: 'unchanged' });

  assert.equal(
    countChangedHistoryRecords([removedRecord, unchangedRecord], [unchangedRecord]),
    1
  );
});

test('snapshot restore replaces account types accounts and history instead of appending', () => {
  const currentGroup = createGroup('g-current', 'Current');
  const importedGroup = createGroup('g-imported', 'Imported');
  const currentAccount = createAccount('a-current', currentGroup.id, 'Current wallet');
  const importedAccount = createAccount('a-imported', importedGroup.id, 'Imported wallet');
  const currentHistory = createHistoryRecord({
    id: 'h-current',
    accountId: currentAccount.id,
    groupName: currentGroup.name,
    accountName: currentAccount.name
  });
  const importedHistory = createHistoryRecord({
    id: 'h-imported',
    accountId: importedAccount.id,
    groupName: importedGroup.name,
    accountName: importedAccount.name
  });
  const currentData: AppData = {
    groups: [currentGroup],
    accounts: [currentAccount],
    history: [currentHistory]
  };
  const restore = createSnapshotRestoreData({
    currentData,
    importedAccountData: {
      groups: [importedGroup],
      accounts: [importedAccount]
    },
    importedHistory: [importedHistory],
    snapshotFields: createSnapshotFields({
      groups: [importedGroup],
      accounts: [importedAccount],
      history: [importedHistory]
    })
  });

  assert.deepEqual(
    restore.nextData.groups.map((group) => group.id),
    ['g-imported']
  );
  assert.deepEqual(
    restore.nextData.accounts.map((account) => account.id),
    ['a-imported']
  );
  assert.deepEqual(
    restore.nextData.history.map((record) => record.id),
    ['h-imported']
  );
  assert.equal(restore.changedHistoryRecordCount, 2);
});

test('snapshot restore rejects missing data fields as incomplete snapshots', () => {
  const currentGroup = createGroup('g-current', 'Current');
  const currentAccount = createAccount('a-current', currentGroup.id, 'Current wallet');
  const currentHistory = createHistoryRecord({
    id: 'h-current',
    accountId: currentAccount.id,
    groupName: currentGroup.name,
    accountName: currentAccount.name
  });
  const baseOptions = {
    currentData: {
      groups: [currentGroup],
      accounts: [currentAccount],
      history: [currentHistory]
    },
    importedAccountData: {
      groups: [],
      accounts: []
    },
    importedHistory: []
  };

  assert.throws(
    () =>
      createSnapshotRestoreData({
        ...baseOptions,
        snapshotFields: { groups: undefined, accounts: [], history: [] }
      }),
    { message: SNAPSHOT_INCOMPLETE_ERROR_MESSAGE }
  );
  assert.throws(
    () =>
      createSnapshotRestoreData({
        ...baseOptions,
        snapshotFields: { groups: [], accounts: undefined, history: [] }
      }),
    { message: SNAPSHOT_INCOMPLETE_ERROR_MESSAGE }
  );
  assert.throws(
    () =>
      createSnapshotRestoreData({
        ...baseOptions,
        snapshotFields: { groups: [], accounts: [], history: undefined }
      }),
    { message: SNAPSHOT_INCOMPLETE_ERROR_MESSAGE }
  );
});

test('snapshot restore accepts complete empty snapshot arrays and restores empty data', () => {
  const currentGroup = createGroup('g-current', 'Current');
  const currentAccount = createAccount('a-current', currentGroup.id, 'Current wallet');
  const restore = createSnapshotRestoreData({
    currentData: {
      groups: [currentGroup],
      accounts: [currentAccount],
      history: []
    },
    importedAccountData: {
      groups: [],
      accounts: []
    },
    importedHistory: [],
    snapshotFields: createSnapshotFields()
  });

  assert.deepEqual(restore.nextData, {
    groups: [],
    accounts: [],
    history: []
  });
  assert.equal(restore.changedHistoryRecordCount, 0);
});

test('snapshot restore history diff counts added updated and removed records', () => {
  const removedRecord = createHistoryRecord({ id: 'removed' });
  const changedRecord = createHistoryRecord({ id: 'changed', afterAmount: 12 });
  const importedChangedRecord = createHistoryRecord({ id: 'changed', afterAmount: 15 });
  const unchangedRecord = createHistoryRecord({ id: 'unchanged' });
  const newRecord = createHistoryRecord({ id: 'new' });
  const restore = createSnapshotRestoreData({
    currentData: {
      groups: [],
      accounts: [],
      history: [removedRecord, changedRecord, unchangedRecord]
    },
    importedAccountData: {
      groups: [],
      accounts: []
    },
    importedHistory: [importedChangedRecord, unchangedRecord, newRecord],
    snapshotFields: createSnapshotFields({
      history: [importedChangedRecord, unchangedRecord, newRecord]
    })
  });

  assert.equal(restore.historyRecordCount, 3);
  assert.equal(restore.changedHistoryRecordCount, 3);
});

test('identical snapshot restore has zero changed history but import record is still kept', () => {
  const record = createHistoryRecord({ id: 'same' });
  const restore = createSnapshotRestoreData({
    currentData: {
      groups: [],
      accounts: [],
      history: [record]
    },
    importedAccountData: {
      groups: [],
      accounts: []
    },
    importedHistory: [record],
    snapshotFields: createSnapshotFields({
      history: [record]
    })
  });
  const importRecords = mergeSnapshotImportRecords([], {
    id: 'snapshot-import-1',
    importedAt: '2026-06-09T13:00:00.000Z',
    snapshotCreatedAt: '2026-06-09T12:00:00.000Z',
    historyRecordCount: restore.historyRecordCount,
    changedHistoryRecordCount: restore.changedHistoryRecordCount
  });

  assert.equal(restore.changedHistoryRecordCount, 0);
  assert.equal(importRecords.length, 1);
  assert.equal(importRecords[0]?.changedHistoryRecordCount, 0);
});

test('snapshot import controller uses restore wording and no merge helpers in import path', () => {
  const source = readFileSync('src/features/backup/useSnapshotBackupController.tsx', 'utf8');
  const importBackupDataStart = source.indexOf('const importBackupData =');
  const importBackupDataEnd = source.indexOf('const readImportSnapshotData =');
  const importBackupDataSource = source.slice(importBackupDataStart, importBackupDataEnd);
  const importBackupHandlerSource = source.slice(
    source.indexOf('const importResult = importBackupData(snapshotData);'),
    source.indexOf('reader.onerror =')
  );

  assert.equal(source.includes('现有数据已按字段合并'), false);
  assert.equal(source.includes('快照已导入，当前数据已按快照恢复'), true);
  assert.equal(source.includes('SNAPSHOT_INCOMPLETE_ERROR_MESSAGE'), true);
  assert.equal(
    source.includes('error.message === SNAPSHOT_INCOMPLETE_ERROR_MESSAGE'),
    true
  );
  assert.equal(importBackupDataSource.includes('getStandardSnapshotFieldValue(value, \'groups\')'), true);
  assert.equal(importBackupDataSource.includes('getStandardSnapshotFieldValue(value, \'accounts\')'), true);
  assert.equal(importBackupDataSource.includes('getStandardSnapshotFieldValue(value, \'history\')'), true);
  assert.equal(
    importBackupHandlerSource.indexOf('saveSnapshotImportSuccess(importResult)') >
      importBackupHandlerSource.indexOf('const importResult = importBackupData(snapshotData);'),
    true
  );
  assert.equal(importBackupDataSource.includes('hasImportedAccountData'), false);
  assert.equal(importBackupDataSource.includes('hasImportedHistory'), false);
  assert.equal(importBackupDataSource.includes('deriveGroupsWithAccounts(assetGroups, accounts)'), false);
  assert.equal(importBackupDataSource.includes('mergeGroups'), false);
  assert.equal(importBackupDataSource.includes('mergeAccounts'), false);
  assert.equal(importBackupDataSource.includes('mergeHistoryRecords'), false);
});
