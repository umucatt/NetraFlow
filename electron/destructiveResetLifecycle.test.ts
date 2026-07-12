import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createResetTransaction,
  createRuntimePendingMarker,
  invalidateAndDeleteUserdata,
  isolateAndDeleteRuntime,
  runStartupDeletePreflight
} from './destructiveResetLifecycle.js';
import { createStorageLayout } from './storageLayout.js';

const makeLayout = (root: string) => createStorageLayout({
  platform: 'linux', isPackaged: true, isPortable: false,
  execPath: '/opt/NetraFlow/netraflow', appPath: '/opt/NetraFlow/resources/app.asar',
  defaultUserDataPath: root
});

test('userdata is atomically invalidated, physically deleted, and verified before runtime', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'netraflow-reset-'));
  t.after(() => import('node:fs').then(({ rmSync }) => rmSync(root, { recursive: true, force: true })));
  const layout = makeLayout(root);
  mkdirSync(layout.userdata, { recursive: true });
  for (const name of ['core.json', 'state.json', 'settings.json', '.snapshot-transaction.json']) {
    writeFileSync(path.join(layout.userdata, name), '{}');
  }
  const events: string[] = [];
  const transaction = createResetTransaction(layout, '11111111-1111-4111-8111-111111111111');
  await invalidateAndDeleteUserdata(transaction, (event) => events.push(event));
  assert.equal(existsSync(layout.userdata), false);
  assert.equal(existsSync(transaction.userdataDeleting), false);
  assert.deepEqual(events, ['userdata-renamed', 'userdata-delete-started', 'userdata-delete-verified']);
});

test('fixed runtime transaction cannot delete a newly created runtime', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'netraflow-runtime-reset-'));
  t.after(() => import('node:fs').then(({ rmSync }) => rmSync(root, { recursive: true, force: true })));
  const layout = makeLayout(root);
  mkdirSync(layout.runtime, { recursive: true });
  writeFileSync(path.join(layout.runtime, 'old'), 'old');
  const transaction = createResetTransaction(layout, '22222222-2222-4222-8222-222222222222');
  await createRuntimePendingMarker(transaction, () => undefined);
  await import('node:fs/promises').then(({ rename }) => rename(layout.runtime, transaction.runtimeDeleting));
  mkdirSync(layout.runtime, { recursive: true });
  writeFileSync(path.join(layout.runtime, 'new'), 'new');
  assert.equal(await isolateAndDeleteRuntime(transaction, () => undefined), true);
  assert.equal(existsSync(path.join(layout.runtime, 'new')), true);
  assert.equal(existsSync(transaction.runtimeDeleting), false);
});

test('startup preflight deletes userdata labels and isolates pending runtime before use', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'netraflow-preflight-'));
  t.after(() => import('node:fs').then(({ rmSync }) => rmSync(root, { recursive: true, force: true })));
  const layout = makeLayout(root);
  const transaction = createResetTransaction(layout, '33333333-3333-4333-8333-333333333333');
  mkdirSync(transaction.userdataDeleting, { recursive: true });
  mkdirSync(layout.runtime, { recursive: true });
  writeFileSync(path.join(layout.runtime, 'Preferences'), 'old');
  await createRuntimePendingMarker(transaction, () => undefined);
  await runStartupDeletePreflight(layout);
  assert.equal(existsSync(transaction.userdataDeleting), false);
  assert.equal(existsSync(transaction.runtimeDeleting), false);
  assert.equal(existsSync(transaction.runtimePending), false);
  assert.equal(existsSync(layout.runtime), false);
});
