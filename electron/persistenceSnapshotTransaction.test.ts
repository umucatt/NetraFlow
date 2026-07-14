import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';

import { createPersistencePaths } from './persistencePaths.js';
import {
  recoverInterruptedSnapshotTransaction,
  runPersistenceSnapshotTransaction
} from './persistenceSnapshotTransaction.js';

const withPaths = (t: TestContext) => {
  const root = mkdtempSync(path.join(tmpdir(), 'netraflow-snapshot-transaction-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(root, { recursive: true });
  return createPersistencePaths(root);
};

test('snapshot transaction commits core and state together', (t) => {
  const paths = withPaths(t);
  writeFileSync(paths.core, 'old-core');
  writeFileSync(paths.state, 'old-state');

  const result = runPersistenceSnapshotTransaction(
    paths,
    () => {
      writeFileSync(paths.core, 'new-core');
      writeFileSync(paths.state, 'new-state');
      return { ok: true as const };
    },
    (value) => value.ok
  );

  assert.equal(result.ok, true);
  assert.equal(readFileSync(paths.core, 'utf8'), 'new-core');
  assert.equal(readFileSync(paths.state, 'utf8'), 'new-state');
  assert.equal(recoverInterruptedSnapshotTransaction(paths).recovered, false);
});

test('failed snapshot transaction restores the complete previous generation', (t) => {
  const paths = withPaths(t);
  writeFileSync(paths.core, 'old-core');
  writeFileSync(paths.state, 'old-state');

  const result = runPersistenceSnapshotTransaction(
    paths,
    () => {
      writeFileSync(paths.core, 'new-core');
      return { ok: false as const };
    },
    (value) => value.ok
  );

  assert.equal(result.ok, false);
  assert.equal(readFileSync(paths.core, 'utf8'), 'old-core');
  assert.equal(readFileSync(paths.state, 'utf8'), 'old-state');
});

test('interrupted snapshot transaction is recovered before startup reads', (t) => {
  const paths = withPaths(t);
  writeFileSync(paths.core, 'old-core');
  writeFileSync(paths.state, 'old-state');

  assert.throws(() =>
    runPersistenceSnapshotTransaction(
      paths,
      () => {
        writeFileSync(paths.core, 'half-new-core');
        throw new Error('simulated interruption');
      },
      () => true
    )
  );

  assert.equal(readFileSync(paths.core, 'utf8'), 'old-core');
  assert.equal(readFileSync(paths.state, 'utf8'), 'old-state');
});
