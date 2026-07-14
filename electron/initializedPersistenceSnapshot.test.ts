import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';

import { createCoreFileFingerprint } from './corePersistenceCodec.js';
import { writeInitializedPersistenceSnapshotDocuments } from './initializedPersistenceSnapshot.js';
import {
  createDefaultCoreDocument,
  createDefaultStateDocument,
  type CoreDocument,
  type StateDocument
} from './persistenceContracts.js';
import { createPersistenceStore, type PersistenceStore } from './persistenceFileStore.js';
import { runPersistenceSnapshotTransaction } from './persistenceSnapshotTransaction.js';

const createHarness = (t: TestContext) => {
  const root = mkdtempSync(path.join(tmpdir(), 'netraflow-initialized-snapshot-'));
  const store = createPersistenceStore({ root });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, store };
};

const createCore = (name: string): CoreDocument => ({
  ...createDefaultCoreDocument(),
  groups: [{
    id: `group-${name}`,
    name,
    nature: 'asset',
    includeInStats: true,
    sortOrder: 0
  }]
});

const createCompletedState = (marker: string): StateDocument => ({
  ...createDefaultStateDocument(),
  backup: {
    lastBackupAt: '2026-07-13T00:00:00.000Z',
    lastBackupHistoryCount: 7,
    records: [{ marker }],
    importRecords: [{ marker: `${marker}-import` }]
  },
  firstWelcome: { completed: true, pendingAfterClearAll: false },
  personalization: { nyaaThemeUnlocked: true }
});

const commitInitialized = (
  store: PersistenceStore,
  documents: { core: CoreDocument; state: StateDocument }
) => runPersistenceSnapshotTransaction(
  store.paths,
  () => writeInitializedPersistenceSnapshotDocuments(store, documents),
  (result) => result.ok
);

const readPlainSnapshot = (store: PersistenceStore) => {
  const core = store.readCoreDocument();
  const state = store.readStateDocument();
  assert.equal(core.ok && !('locked' in core), true);
  assert.equal(state.ok && !('locked' in state), true);
  if (!core.ok || 'locked' in core || !state.ok || 'locked' in state) {
    assert.fail('snapshot must be readable');
  }
  return { core, state };
};

test('initialized snapshot replacement preserves submitted state and confirms the final core bytes', (t) => {
  const { store } = createHarness(t);
  const oldCore = createCore('old');
  const oldState = createCompletedState('old');
  assert.equal(store.writeStateDocument(oldState).ok, true);
  assert.equal(store.writeCoreDocument(oldCore).ok, true);

  const previous = readPlainSnapshot(store);
  assert.deepEqual(
    previous.state.document.coreProtection?.lastConfirmedFingerprint,
    createCoreFileFingerprint(readFileSync(store.paths.core))
  );

  const nextCore = createCore('testdatain-equivalent');
  const nextState = createCompletedState('submitted');
  assert.equal(commitInitialized(store, { core: nextCore, state: nextState }).ok, true);

  const snapshot = readPlainSnapshot(store);
  assert.equal('integrityWarning' in snapshot.core, false);
  assert.equal('integrityFailure' in snapshot.core, false);
  assert.deepEqual(snapshot.core.document, nextCore);
  assert.deepEqual(snapshot.state.document.firstWelcome, nextState.firstWelcome);
  assert.deepEqual(snapshot.state.document.personalization, nextState.personalization);
  assert.deepEqual(snapshot.state.document.backup, nextState.backup);
  assert.deepEqual(
    snapshot.state.document.coreProtection?.lastConfirmedFingerprint,
    createCoreFileFingerprint(readFileSync(store.paths.core))
  );

  const ordinaryCore = createCore('ordinary-save');
  assert.deepEqual(store.writeCoreDocument(ordinaryCore), { ok: true });
  const afterOrdinarySave = readPlainSnapshot(store);
  assert.equal('integrityWarning' in afterOrdinarySave.core, false);
});

test('real external core modification remains blocked after initialized snapshot replacement', (t) => {
  const { store } = createHarness(t);
  assert.equal(commitInitialized(store, {
    core: createCore('trusted'),
    state: createCompletedState('trusted')
  }).ok, true);

  const externalBytes = `${readFileSync(store.paths.core, 'utf8')} `;
  writeFileSync(store.paths.core, externalBytes, 'utf8');
  const blocked = store.writeCoreDocument(createCore('must-not-replace'));

  assert.equal(blocked.ok, false);
  assert.equal(blocked.ok ? '' : blocked.code, 'PERSISTENCE_CORE_EXTERNAL_MODIFIED');
  assert.equal(readFileSync(store.paths.core, 'utf8'), externalBytes);
});

test('state write failure does not replace core and transaction removes its directory', (t) => {
  const { store } = createHarness(t);
  const oldCore = createCore('old');
  const oldState = createCompletedState('old');
  assert.equal(store.writeStateDocument(oldState).ok, true);
  assert.equal(store.writeCoreDocument(oldCore).ok, true);
  const oldCoreBytes = readFileSync(store.paths.core);
  const oldStateBytes = readFileSync(store.paths.state);

  const failingStore: PersistenceStore = {
    ...store,
    writeStateDocument: () => ({
      ok: false,
      code: 'PERSISTENCE_WRITE_FAILED',
      message: 'simulated state failure'
    })
  };
  const result = commitInitialized(failingStore, {
    core: createCore('new'),
    state: createCompletedState('new')
  });

  assert.equal(result.ok, false);
  assert.deepEqual(readFileSync(store.paths.core), oldCoreBytes);
  assert.deepEqual(readFileSync(store.paths.state), oldStateBytes);
  assert.equal(existsSync(path.join(store.paths.root, '.snapshot-transaction')), false);
});

test('core write failure rolls back state and preserves the old matching fingerprint', (t) => {
  const { store } = createHarness(t);
  const oldCore = createCore('old');
  const oldState = createCompletedState('old');
  assert.equal(store.writeStateDocument(oldState).ok, true);
  assert.equal(store.writeCoreDocument(oldCore).ok, true);
  const oldCoreBytes = readFileSync(store.paths.core);
  const oldStateBytes = readFileSync(store.paths.state);

  const failingStore: PersistenceStore = {
    ...store,
    writeCoreDocument: () => ({
      ok: false,
      code: 'PERSISTENCE_WRITE_FAILED',
      message: 'simulated core failure'
    })
  };
  const result = commitInitialized(failingStore, {
    core: createCore('new'),
    state: createCompletedState('new')
  });

  assert.equal(result.ok, false);
  assert.deepEqual(readFileSync(store.paths.core), oldCoreBytes);
  assert.deepEqual(readFileSync(store.paths.state), oldStateBytes);
  const snapshot = readPlainSnapshot(store);
  assert.deepEqual(
    snapshot.state.document.coreProtection?.lastConfirmedFingerprint,
    createCoreFileFingerprint(readFileSync(store.paths.core))
  );
  assert.equal(existsSync(path.join(store.paths.root, '.snapshot-transaction')), false);
});

test('initialized replacement keeps an unlocked encrypted core session usable', (t) => {
  const { store } = createHarness(t);
  const oldState = createCompletedState('old-encrypted');
  assert.equal(store.writeStateDocument(oldState).ok, true);
  assert.equal(store.enableCoreProtection(createCore('old-encrypted'), 'test-password').ok, true);

  assert.equal(commitInitialized(store, {
    core: createCore('new-encrypted'),
    state: createCompletedState('new-encrypted')
  }).ok, true);
  const rawCore = JSON.parse(readFileSync(store.paths.core, 'utf8')) as Record<string, unknown>;
  assert.equal(typeof rawCore.encrypted, 'object');

  const snapshot = readPlainSnapshot(store);
  assert.equal('integrityWarning' in snapshot.core, false);
  assert.deepEqual(
    snapshot.state.document.coreProtection?.lastConfirmedFingerprint,
    createCoreFileFingerprint(readFileSync(store.paths.core))
  );
  assert.deepEqual(store.writeCoreDocument(createCore('encrypted-ordinary-save')), { ok: true });
  assert.equal('locked' in store.readCoreDocument(), false);
});

test('initialized snapshot helper writes state before core and returns the first error', () => {
  const calls: string[] = [];
  const stateFailure = writeInitializedPersistenceSnapshotDocuments({
    writeStateDocument: () => {
      calls.push('state');
      return { ok: false, code: 'STATE_FAILED', message: 'state failed' };
    },
    writeCoreDocument: () => {
      calls.push('core');
      return { ok: true };
    }
  }, { core: {}, state: {} });
  assert.deepEqual(calls, ['state']);
  assert.equal(stateFailure.ok ? '' : stateFailure.code, 'STATE_FAILED');

  calls.length = 0;
  const coreFailure = writeInitializedPersistenceSnapshotDocuments({
    writeStateDocument: () => {
      calls.push('state');
      return { ok: true };
    },
    writeCoreDocument: (_document, options) => {
      calls.push(`core:${options?.allowExternalCoreOverwrite === true}`);
      return { ok: false, code: 'CORE_FAILED', message: 'core failed' };
    }
  }, { core: {}, state: {} });
  assert.deepEqual(calls, ['state', 'core:true']);
  assert.equal(coreFailure.ok ? '' : coreFailure.code, 'CORE_FAILED');
});
