/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf8');

test('account history displays use date-only labels while snapshots keep precise time', () => {
  const appSource = readProjectFile('src/App.tsx');
  const backupListSource = readProjectFile('src/features/history/BackupRecordList.tsx');
  const searchEngineSource = readProjectFile('src/search/searchEngine.ts');

  assert.equal(appSource.includes('formatShortTime: formatHistoryRecordDate'), true);
  assert.equal(appSource.includes('formatShortTime={formatHistoryRecordDate}'), true);
  assert.equal(
    appSource.includes('return `${year}-${month}-${day} ${hour}:${minute}:${second}`;'),
    true
  );
  assert.equal(backupListSource.includes('{formatPreciseBackupTime(record.backedUpAt)}'), true);
  assert.equal(
    searchEngineSource.includes('title: options.formatPreciseBackupTime(record.backedUpAt)'),
    true
  );
});

test('flash write timestamps are scoped to new flash records without history migration', () => {
  const appSource = readProjectFile('src/App.tsx');
  const normalizeHistorySource = appSource.slice(
    appSource.indexOf('const normalizeHistory'),
    appSource.indexOf('const mergeHistoryRecords')
  );
  const flashWriteSource = appSource.slice(
    appSource.indexOf('const confirmFlashNoteWrite'),
    appSource.indexOf('const renderFlashLightningIcon')
  );

  assert.equal(
    flashWriteSource.includes(
      'createHistoryTimestampForBusinessDate(row.date, flashWriteTime, index)'
    ),
    true
  );
  assert.equal(flashWriteSource.includes('T12:00:00'), false);
  assert.equal(normalizeHistorySource.includes('createHistoryTimestampForBusinessDate'), false);
});
