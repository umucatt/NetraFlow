/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseNetraFlowJsonFile } from '../../app/jsonIntegrity';
import {
  createBackupFileContent,
  getBackupFileName
} from './snapshotBackupLogic';

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
