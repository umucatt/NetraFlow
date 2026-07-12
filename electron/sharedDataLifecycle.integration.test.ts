import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';

import { createCoreSaveCoordinator } from '../src/app/coreSaveCoordinator.js';
import { classifyStartupDataState } from '../src/app/firstWelcome/firstWelcomeStateLogic.js';
import { deriveGroupsWithAccounts } from '../src/app/accountData.js';
import { createExampleData, createExtremeExampleData } from '../src/exampleData.js';
import { deriveAssetTrendPoints } from '../src/features/charts/assetTrendData.js';
import { clearManagedLocalData, createManagedDataDeletionPlan } from './localDataCleanup.js';
import { createDefaultPersistenceDocument } from './persistenceContracts.js';
import { createPersistenceStore } from './persistenceFileStore.js';
import { runPersistenceSnapshotTransaction } from './persistenceSnapshotTransaction.js';
import type { StorageLayout } from './storageLayout.js';

const createHarness = (t: TestContext) => {
  const testRoot = mkdtempSync(path.join(tmpdir(), 'netraflow-lifecycle-'));
  const root = path.join(testRoot, 'NetraFlow');
  const layout: StorageLayout = {
    root,
    userdata: path.join(root, 'userdata'),
    runtime: path.join(root, 'runtime'),
    demo: path.join(root, '.demo'),
    sessionData: path.join(root, 'runtime', 'sessionData'),
    cache: path.join(root, 'runtime', 'cache'),
    logs: path.join(root, 'runtime', 'logs'),
    crashDumps: path.join(root, 'runtime', 'crashDumps')
  };
  const exportPath = path.join(testRoot, 'exports', 'snapshot.json');
  mkdirSync(path.dirname(exportPath), { recursive: true });
  writeFileSync(exportPath, 'external');
  const store = createPersistenceStore({ root: layout.userdata });

  t.after(() => rmSync(testRoot, { recursive: true, force: true }));
  return { testRoot, layout, exportPath, store };
};

const createCompletedState = () => ({
  ...createDefaultPersistenceDocument('state'),
  firstWelcome: { completed: true, pendingAfterClearAll: false }
});

const commitFixture = (
  store: ReturnType<typeof createPersistenceStore>,
  data: ReturnType<typeof createExtremeExampleData>
) => runPersistenceSnapshotTransaction(
  store.paths,
  () => {
    const core = store.writeCoreDocument({ schemaVersion: 1, ...data.appData }, {
      allowExternalCoreOverwrite: true
    });
    if (!core.ok) return core;
    return store.writeStateDocument(createCompletedState());
  },
  (result) => result.ok
);

test('isolated lifecycle covers extreme startup, sequential replacement, and destructive clear', async (t) => {
  const { layout, exportPath, store } = createHarness(t);
  assert.equal(classifyStartupDataState({ core: 'missing', settings: 'missing', state: 'missing', security: 'missing' }), 'empty');

  const extreme = createExtremeExampleData();
  assert.equal(commitFixture(store, extreme).ok, true);
  assert.equal(store.readCoreDocument().exists, true);
  assert.equal(store.readStateDocument().exists, true);
  assert.equal(extreme.appData.history.length, 48_000);

  const normal = createExampleData('advanced');
  assert.equal(commitFixture(store, normal).ok, true);
  assert.equal(commitFixture(store, extreme).ok, true);
  const finalCore = store.readCoreDocument();
  assert.equal(finalCore.ok && !('locked' in finalCore) && finalCore.document.history.length, 48_000);

  if (!finalCore.ok || 'locked' in finalCore) assert.fail('extreme core must be readable');
  const groups = deriveGroupsWithAccounts(
    finalCore.document.groups as Parameters<typeof deriveGroupsWithAccounts>[0],
    finalCore.document.accounts as Parameters<typeof deriveGroupsWithAccounts>[1]
  );
  const points = deriveAssetTrendPoints(
    groups,
    finalCore.document.history as Parameters<typeof deriveAssetTrendPoints>[1],
    { xAxisRange: '6m' }
  );
  assert.ok(points.length > 0);

  let clearing = false;
  const timers = new Map<number, { dueAt: number; handler: () => void }>();
  let nextTimer = 1;
  let now = 0;
  const coordinator = createCoreSaveCoordinator({
    timerApi: {
      setTimeout: (handler, delayMs) => {
        const id = nextTimer++;
        timers.set(id, { dueAt: now + delayMs, handler });
        return id;
      },
      clearTimeout: (id) => timers.delete(id as number)
    },
    cloneAppData: (value: { value: number }) => ({ ...value }),
    saveAppData: () => assert.fail('old generation must not persist after clearing'),
    isExternalCoreModificationError: () => false,
    showCoreIntegrityPrompt: () => undefined,
    onCoalescedSaveError: () => undefined
  });
  coordinator.saveWithExternalModificationCheck({ value: 1 }, {}, () => undefined);
  clearing = true;
  coordinator.beginDestructiveShutdown();
  assert.equal(coordinator.saveWithExternalModificationCheck({ value: 2 }, {}, () => undefined), false);
  now += 20_000;
  Array.from(timers.entries())
    .filter(([, timer]) => timer.dueAt <= now)
    .forEach(([id, timer]) => {
      timers.delete(id);
      timer.handler();
    });
  assert.equal(timers.size, 0);
  assert.equal(clearing, true);

  const cleanup = await clearManagedLocalData({
    plan: createManagedDataDeletionPlan({
      layout,
      platform: process.platform,
      appPath: path.join(layout.root, 'resources', 'app.asar'),
      execPath: path.join(layout.root, 'NetraFlow'),
      homePath: path.dirname(layout.root)
    }),
    session: {
      closeAllConnections: async () => undefined,
      clearData: async () => undefined,
      clearCache: async () => undefined
    }
  });
  assert.equal(cleanup.ok, true);
  assert.equal(existsSync(layout.userdata), false);
  assert.equal(existsSync(layout.runtime), false);
  assert.equal(existsSync(exportPath), true);
  assert.equal(classifyStartupDataState({ core: 'missing', settings: 'missing', state: 'missing', security: 'missing' }), 'empty');
});
