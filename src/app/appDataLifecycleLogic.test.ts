/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { AppData, BackupRecord } from './types';
import {
  createEmptyAppData,
  createExampleDataApplyResult,
  createExampleModeSnapshot,
  createResetConfirmation,
  createResetConfirmationCode,
  createRestoredRealDataState,
  createTestDataInRealAppData,
  getResetActionLabel,
  isResetConfirmationInputValid,
  sanitizeResetConfirmationInput
} from './appDataLifecycleLogic';

const appData: AppData = {
  groups: [
    {
      id: 'g-cash',
      name: 'Cash',
      nature: 'asset',
      includeInStats: true,
      sortOrder: 0
    }
  ],
  accounts: [
    {
      id: 'a-wallet',
      groupId: 'g-cash',
      name: 'Wallet',
      amount: 100,
      createdAt: '2026-05-01T09:00:00.000Z'
    }
  ],
  history: [
    {
      id: 'h-wallet',
      accountId: 'a-wallet',
      type: '\u65b0\u589e',
      groupName: 'Cash',
      accountName: 'Wallet',
      beforeAmount: null,
      afterAmount: 100,
      time: '2026-05-01T09:00:00.000Z'
    }
  ]
};

const backupRecords: BackupRecord[] = [
  {
    id: 'b-1',
    backedUpAt: '2026-05-02T09:00:00.000Z',
    historyCount: 1,
    incrementCount: 1,
    method: 'manual'
  }
];

test('creates empty app data for reset without shared arrays', () => {
  const first = createEmptyAppData();
  const second = createEmptyAppData();

  first.groups.push({
    id: 'g-temp',
    name: 'Temp',
    nature: 'asset',
    includeInStats: true,
    sortOrder: 0
  });

  assert.deepEqual(second, { groups: [], accounts: [], history: [] });
});

test('clones example snapshots so sample mode does not share real data references', () => {
  const snapshot = createExampleModeSnapshot({
    appData,
    backupRecords,
    lastBackupAt: '2026-05-02T09:00:00.000Z',
    lastBackupHistoryCount: 1
  });
  const generated = createExampleDataApplyResult(snapshot);

  snapshot.appData.accounts[0].name = 'Changed';
  snapshot.backupRecords[0].historyCount = 9;

  assert.equal(generated.appData.accounts[0]?.name, 'Wallet');
  assert.equal(generated.backupRecords[0]?.historyCount, 1);
});

test('restores saved real data or falls back to storage snapshot after sample mode', () => {
  const saved = createRestoredRealDataState({
    savedSnapshot: {
      appData,
      backupRecords,
      lastBackupAt: '2026-05-02T09:00:00.000Z',
      lastBackupHistoryCount: 1
    },
    loadFallbackSnapshot: () => {
      assert.fail('fallback should not be used when saved snapshot exists');
    }
  });
  const fallback = createRestoredRealDataState({
    savedSnapshot: null,
    loadFallbackSnapshot: () => ({
      appData: createEmptyAppData(),
      backupRecords: [],
      lastBackupAt: '',
      lastBackupHistoryCount: 0
    })
  });

  assert.equal(saved.appData.accounts[0]?.id, 'a-wallet');
  assert.deepEqual(fallback.appData, { groups: [], accounts: [], history: [] });
});

test('testdatain real-data helper uses advanced example app data only', () => {
  const requestedTemplates: string[] = [];
  const generatedAppData: AppData = {
    groups: [
      {
        id: 'g-advanced',
        name: 'Advanced',
        nature: 'asset',
        includeInStats: true,
        sortOrder: 0
      }
    ],
    accounts: [
      {
        id: 'a-advanced',
        groupId: 'g-advanced',
        name: 'Advanced Account',
        amount: 200,
        createdAt: '2026-06-09T09:00:00.000Z'
      }
    ],
    history: [
      {
        id: 'h-advanced',
        accountId: 'a-advanced',
        type: '新增',
        groupName: 'Advanced',
        accountName: 'Advanced Account',
        beforeAmount: null,
        afterAmount: 200,
        time: '2026-06-09T09:00:00.000Z'
      }
    ]
  };

  const result = createTestDataInRealAppData((templateId) => {
    requestedTemplates.push(templateId);

    return {
      appData: generatedAppData,
      backupRecords: [
        {
          id: 'generated-backup',
          backedUpAt: '2026-06-09T10:00:00.000Z',
          historyCount: 1,
          incrementCount: 1,
          method: 'auto'
        }
      ],
      lastBackupAt: '2026-06-09T10:00:00.000Z',
      lastBackupHistoryCount: 1
    };
  });

  assert.deepEqual(requestedTemplates, ['advanced']);
  assert.deepEqual(result, generatedAppData);
});

test('testdatain controller overwrites real asset data without touching sample mode data or backup state', () => {
  const source = readFileSync('src/app/useAppDataLifecycleController.tsx', 'utf8');
  const handlerSource = source.slice(
    source.indexOf('const writeExampleDataToRealData = () => {'),
    source.indexOf('const resetUserConfiguration = () => {')
  );

  assert.equal(handlerSource.includes('createTestDataInRealAppData(createExampleData)'), true);
  assert.equal(handlerSource.includes('persistAppData(nextAppData, { allowEmptyHistoryOverwrite: true })'), true);
  assert.equal(handlerSource.includes('setAppData(nextAppData)'), true);
  assert.equal(handlerSource.includes('setIsExampleMode(false)'), true);
  assert.equal(handlerSource.includes('applyLifecycleSnapshot'), false);
  assert.equal(handlerSource.includes('applyBackupState'), false);
  assert.equal(handlerSource.includes('backupRecords'), false);
  assert.equal(handlerSource.includes('lastBackupAt'), false);
});

test('keeps reset confirmation code and input handling in lifecycle logic', () => {
  const confirmation = createResetConfirmation('history', 0.1234);

  assert.equal(createResetConfirmationCode(0), '0000');
  assert.equal(createResetConfirmationCode(0.99999), '9999');
  assert.deepEqual(confirmation, { action: 'history', code: '1234' });
  assert.equal(sanitizeResetConfirmationInput('a1 2-345'), '1234');
  assert.equal(isResetConfirmationInputValid(confirmation, '1234'), true);
  assert.equal(isResetConfirmationInputValid(confirmation, '123'), false);
});

test('keeps reset action labels stable', () => {
  assert.equal(getResetActionLabel('settings'), '清除用户配置');
  assert.equal(getResetActionLabel('history'), '清除历史记录');
  assert.equal(getResetActionLabel('all'), '清除所有');
});
