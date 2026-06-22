import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';

import type { CoreDocument } from './persistenceContracts.js';
import { createPersistenceEnvironmentStoreController } from './persistenceEnvironmentStore.js';
import { createPersistenceStore } from './persistenceFileStore.js';

const createCore = (name: string): CoreDocument => ({
  schemaVersion: 1,
  groups: [
    {
      id: `group-${name}`,
      name,
      nature: 'asset',
      includeInStats: true,
      sortOrder: 0
    }
  ],
  accounts: [],
  history: []
});

const createTempRoots = (t: TestContext) => {
  const root = mkdtempSync(path.join(tmpdir(), 'netraflow-env-store-'));
  const realRoot = path.join(root, 'userdata');
  const demoRoot = path.join(root, '.demo');

  t.after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  return { realRoot, demoRoot };
};

test('environment store routes formal document IO to current environment', (t) => {
  const { realRoot, demoRoot } = createTempRoots(t);
  const realStore = createPersistenceStore({ root: realRoot });
  const demoStore = createPersistenceStore({ root: demoRoot });
  const controller = createPersistenceEnvironmentStoreController({
    realStore,
    demoStore
  });

  assert.deepEqual(controller.store.writeCoreDocument(createCore('real')), { ok: true });
  controller.setEnvironment('demo');
  assert.deepEqual(controller.store.writeCoreDocument(createCore('demo')), { ok: true });

  assert.equal(existsSync(path.join(realRoot, 'core.json')), true);
  assert.equal(existsSync(path.join(demoRoot, 'core.json')), true);
  assert.equal(readFileSync(path.join(realRoot, 'core.json'), 'utf8').includes('real'), true);
  assert.equal(readFileSync(path.join(demoRoot, 'core.json'), 'utf8').includes('demo'), true);

  assert.equal(controller.store.paths.root, path.resolve(demoRoot));
  controller.setEnvironment('real');
  assert.equal(controller.store.paths.root, path.resolve(realRoot));
});

test('environment store promotes current demo core to real core only', (t) => {
  const { realRoot, demoRoot } = createTempRoots(t);
  const realStore = createPersistenceStore({ root: realRoot });
  const demoStore = createPersistenceStore({ root: demoRoot });
  const controller = createPersistenceEnvironmentStoreController({
    realStore,
    demoStore
  });
  const realCore = createCore('real-before');
  const demoCore: CoreDocument = {
    ...createCore('demo-edited'),
    accounts: [
      {
        id: 'account-demo',
        groupId: 'group-demo-edited',
        name: 'Edited demo account',
        amount: 123,
        createdAt: '2026-06-21T00:00:00.000Z'
      }
    ],
    history: [
      {
        id: 'history-demo',
        accountId: 'account-demo',
        type: 'edit',
        groupName: 'demo-edited',
        accountName: 'Edited demo account',
        beforeAmount: 100,
        afterAmount: 123,
        time: '2026-06-21T00:01:00.000Z'
      }
    ]
  };

  assert.deepEqual(realStore.writeCoreDocument(realCore), { ok: true });
  assert.deepEqual(realStore.writeSettingsDocument({ global: { themeMode: 'dark' } }), {
    ok: true
  });
  assert.deepEqual(realStore.writeStateDocument({ rollupImportHashes: ['real-hash'] }), {
    ok: true
  });
  assert.deepEqual(
    realStore.writeSecurityDocument({
      appAccess: { enabled: true, passwordHash: null },
      snapshotEncryption: { enabled: false, passwordHash: null }
    }),
    { ok: true }
  );
  assert.deepEqual(demoStore.writeCoreDocument(demoCore), { ok: true });
  assert.deepEqual(demoStore.writeSettingsDocument({ global: { themeMode: 'light' } }), {
    ok: true
  });
  assert.deepEqual(demoStore.writeStateDocument({ rollupImportHashes: ['demo-hash'] }), {
    ok: true
  });
  assert.deepEqual(
    demoStore.writeSecurityDocument({
      appAccess: { enabled: false, passwordHash: null },
      snapshotEncryption: { enabled: true, passwordHash: null }
    }),
    { ok: true }
  );

  const realSettingsBefore = readFileSync(path.join(realRoot, 'settings.json'), 'utf8');
  const realStateBefore = readFileSync(path.join(realRoot, 'state.json'), 'utf8');
  const realSecurityBefore = readFileSync(path.join(realRoot, 'security.json'), 'utf8');

  controller.setEnvironment('demo');
  const promotion = controller.promoteDemoCoreToReal();

  assert.deepEqual(promotion, { ok: true, core: demoCore });
  assert.equal(controller.getEnvironment(), 'real');
  assert.deepEqual(realStore.readCoreDocument(), {
    ok: true,
    exists: true,
    document: demoCore
  });
  assert.deepEqual(demoStore.readCoreDocument(), {
    ok: true,
    exists: true,
    document: demoCore
  });
  assert.equal(readFileSync(path.join(realRoot, 'settings.json'), 'utf8'), realSettingsBefore);
  assert.equal(readFileSync(path.join(realRoot, 'state.json'), 'utf8'), realStateBefore);
  assert.equal(readFileSync(path.join(realRoot, 'security.json'), 'utf8'), realSecurityBefore);
});

test('environment store keeps demo active when demo core is missing', (t) => {
  const { realRoot, demoRoot } = createTempRoots(t);
  const realStore = createPersistenceStore({ root: realRoot });
  const demoStore = createPersistenceStore({ root: demoRoot });
  const controller = createPersistenceEnvironmentStoreController({
    realStore,
    demoStore
  });
  const realCore = createCore('real-before');

  assert.deepEqual(realStore.writeCoreDocument(realCore), { ok: true });

  controller.setEnvironment('demo');
  const promotion = controller.promoteDemoCoreToReal();

  assert.equal(promotion.ok, false);
  assert.equal(promotion.ok ? '' : promotion.code, 'DEMO_CORE_MISSING');
  assert.equal(controller.getEnvironment(), 'demo');
  assert.deepEqual(realStore.readCoreDocument(), {
    ok: true,
    exists: true,
    document: realCore
  });
  assert.equal(existsSync(path.join(demoRoot, 'core.json')), false);
});

test('environment store restores demo when real core write fails', (t) => {
  const { realRoot, demoRoot } = createTempRoots(t);
  const realStore = createPersistenceStore({ root: realRoot });
  const demoStore = createPersistenceStore({ root: demoRoot });
  const controller = createPersistenceEnvironmentStoreController({
    realStore,
    demoStore
  });
  const demoCore = createCore('demo-edited');
  const realCorePath = path.join(realRoot, 'core.json');

  assert.deepEqual(demoStore.writeCoreDocument(demoCore), { ok: true });
  assert.deepEqual(realStore.writeCoreDocument(createCore('real-before')), { ok: true });
  writeFileSync(realCorePath, '{', 'utf8');

  controller.setEnvironment('demo');
  const promotion = controller.promoteDemoCoreToReal();

  assert.equal(promotion.ok, false);
  assert.equal(promotion.ok ? '' : promotion.code, 'PERSISTENCE_READ_INVALID');
  assert.equal(controller.getEnvironment(), 'demo');
  assert.equal(readFileSync(realCorePath, 'utf8'), '{');
  assert.deepEqual(demoStore.readCoreDocument(), {
    ok: true,
    exists: true,
    document: demoCore
  });
});
