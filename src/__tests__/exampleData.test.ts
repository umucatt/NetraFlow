/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXAMPLE_TEMPLATES,
  createExampleData,
  isExampleAccountNameAllowed,
  isExampleHistoryNoteAllowed,
  validateExampleHistoryConsistency,
  type ExampleTemplateId
} from '../exampleData';
import { deriveGroupsWithAccounts, hasPersistedGroupAccounts } from '../app/accountData';
import type { Account, AssetGroup, HistoryRecord } from '../app/types';

const withSeededRandom = <T,>(seed: number, run: () => T) => {
  const originalRandom = Math.random;
  let state = seed >>> 0;

  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;

    return state / 0x100000000;
  };

  try {
    return run();
  } finally {
    Math.random = originalRandom;
  }
};

const getAccounts = (groups: AssetGroup[], accounts: Account[]) =>
  deriveGroupsWithAccounts(groups, accounts).flatMap((group) =>
    group.accounts.map((account) => ({ group, account }))
  );

const getAccountRecords = (history: HistoryRecord[], account: Account) =>
  history
    .filter((record) => record.accountId === account.id)
    .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));

const generatedExamples = EXAMPLE_TEMPLATES.flatMap((template, templateIndex) =>
  Array.from({ length: 8 }, (_, runIndex) => ({
    templateId: template.id,
    seed: 1000 + templateIndex * 100 + runIndex
  }))
);

test('example templates generate valid account and history data for every tier', () => {
  generatedExamples.forEach(({ templateId, seed }) => {
    const template = EXAMPLE_TEMPLATES.find((item) => item.id === templateId);
    const data = withSeededRandom(seed, () => createExampleData(templateId));
    const accounts = getAccounts(data.appData.groups, data.appData.accounts);

    assert.ok(template);
    assert.ok(accounts.length >= template.accountRange[0]);
    assert.ok(accounts.length <= template.accountRange[1]);
    assert.ok(data.appData.history.length >= template.historyRange[0]);
    assert.ok(data.appData.history.length <= template.historyRange[1]);
    assert.deepEqual(validateExampleHistoryConsistency(data.appData), []);
  });
});

test('example templates use top-level accounts without persisted nested groups', () => {
  generatedExamples.forEach(({ templateId, seed }) => {
    const data = withSeededRandom(seed, () => createExampleData(templateId));

    assert.equal(hasPersistedGroupAccounts(data.appData.groups), false);
    assert.equal(data.appData.accounts.length > 0, true);
    assert.equal(
      data.appData.accounts.every((account) =>
        data.appData.groups.some((group) => group.id === account.groupId)
      ),
      true
    );
  });
});

test('example account lifecycle records keep add, archive, restore, and modify order valid', () => {
  generatedExamples.forEach(({ templateId, seed }) => {
    const data = withSeededRandom(seed, () => createExampleData(templateId));
    const now = new Date().getTime();

    getAccounts(data.appData.groups, data.appData.accounts).forEach(({ account }) => {
      const records = getAccountRecords(data.appData.history, account);
      const addRecords = records.filter((record) => record.type === '新增');

      assert.equal(addRecords.length, 1, `${templateId}:${account.name}`);
      assert.equal(records[0]?.type, '新增', `${templateId}:${account.name}`);

      let isArchived = false;
      let hasArchivedBeforeRestore = false;

      records.forEach((record, index) => {
        assert.ok(Date.parse(record.time) <= now, `${templateId}:${account.name}:${record.type}`);

        if (index > 0) {
          assert.ok(
            Date.parse(record.time) >= Date.parse(records[index - 1].time),
            `${templateId}:${account.name}:${record.type}`
          );
        }

        if (record.type === '归档') {
          isArchived = true;
          hasArchivedBeforeRestore = true;
          return;
        }

        if (record.type === '重新启用') {
          assert.equal(hasArchivedBeforeRestore, true, `${templateId}:${account.name}`);
          assert.equal(isArchived, true, `${templateId}:${account.name}`);
          isArchived = false;
          return;
        }

        if (record.type === '修改') {
          assert.equal(isArchived, false, `${templateId}:${account.name}`);
        }
      });

      const lastRecord = records[records.length - 1];

      if (account.archived) {
        assert.equal(lastRecord?.type, '归档', `${templateId}:${account.name}`);
      } else {
        assert.notEqual(lastRecord?.type, '归档', `${templateId}:${account.name}`);
      }
    });
  });
});

test('example account names avoid mechanical and test-style names', () => {
  generatedExamples.forEach(({ templateId, seed }) => {
    const data = withSeededRandom(seed, () => createExampleData(templateId));

    getAccounts(data.appData.groups, data.appData.accounts).forEach(({ account }) => {
      assert.equal(isExampleAccountNameAllowed(account.name), true, `${templateId}:${account.name}`);
      assert.doesNotMatch(account.name, /^第[一二三四五六七八九十]+/);
      assert.doesNotMatch(account.name, /^account\s*\d+/i);
      assert.doesNotMatch(account.name, /^账户\s*\d+/);
      assert.doesNotMatch(account.name, /^备用账户\s*\d+/);
    });
  });
});

test('example history notes match account category and are not generated for every modification', () => {
  let modificationCount = 0;
  let modificationNoteCount = 0;

  generatedExamples.forEach(({ templateId, seed }) => {
    const data = withSeededRandom(seed, () => createExampleData(templateId));

    data.appData.history.forEach((record) => {
      assert.equal(isExampleHistoryNoteAllowed(record), true, `${templateId}:${record.accountName}:${record.note}`);

      if (record.type === '修改') {
        modificationCount += 1;

        if (record.note) {
          modificationNoteCount += 1;
        }
      }
    });
  });

  assert.ok(modificationCount > 0);
  assert.ok(modificationNoteCount > 0);
  assert.ok(modificationNoteCount < modificationCount);
});

test('advanced example tier includes at least one valid restored account lifecycle', () => {
  const restoredRecords: HistoryRecord[] = [];

  Array.from({ length: 4 }, (_, index) => index).forEach((index) => {
    const data = withSeededRandom(3000 + index, () => createExampleData('advanced' as ExampleTemplateId));

    restoredRecords.push(
      ...data.appData.history.filter((record) => record.type === '重新启用')
    );
  });

  assert.ok(restoredRecords.length > 0);
});
