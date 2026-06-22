import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';

import {
  createDefaultCoreDocument,
  createDefaultSecurityDocument,
  createDefaultSettingsDocument,
  createDefaultStateDocument,
  type CoreDocument
} from './persistenceContracts.js';
import {
  createPersistenceStore,
  defaultPersistenceFileAdapter,
  type PersistenceFileAdapter,
  type PersistenceLogger
} from './persistenceFileStore.js';
import { createPersistencePaths } from './persistencePaths.js';

const createTempStore = (t: TestContext) => {
  const root = mkdtempSync(path.join(tmpdir(), 'netraflow-persistence-'));
  const paths = createPersistencePaths(root);
  const store = createPersistenceStore({ paths });

  t.after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  return { root, paths, store };
};

const readJson = (filePath: string) => JSON.parse(readFileSync(filePath, 'utf8')) as unknown;

const writeJson = (filePath: string, value: unknown) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeBrokenJson = (filePath: string) => {
  writeFileSync(filePath, '{', 'utf8');
};

const validCore = (): CoreDocument => ({
  schemaVersion: 1,
  groups: [
    {
      id: 'group-1',
      name: 'Cash',
      nature: 'asset',
      includeInStats: true,
      sortOrder: 1
    }
  ],
  accounts: [
    {
      id: 'account-1',
      groupId: 'group-1',
      name: 'Wallet',
      amount: 100,
      createdAt: '2026-06-01T00:00:00.000Z'
    }
  ],
  history: [
    {
      id: 'history-1',
      accountId: 'account-1',
      type: 'adjust',
      groupName: 'Cash',
      accountName: 'Wallet',
      beforeAmount: 90,
      afterAmount: 100,
      time: '2026-06-01T00:00:00.000Z',
      source: 'rollup'
    }
  ]
});

const createAdapter = (
  overrides: Partial<PersistenceFileAdapter> = {}
): PersistenceFileAdapter => ({
  ...defaultPersistenceFileAdapter,
  ...overrides
});

const assertNoPreviousFiles = (root: string) => {
  const names = existsSync(root) ? readdirSync(root) : [];

  assert.equal(names.some((name) => name.includes('previous')), false);
  assert.equal(existsSync(path.join(root, 'core.json.previous')), false);
  assert.equal(existsSync(path.join(root, 'core.json.previous.tmp')), false);
  assert.equal(existsSync(path.join(root, 'settings.json.previous')), false);
  assert.equal(existsSync(path.join(root, 'state.json.previous')), false);
  assert.equal(existsSync(path.join(root, 'security.json.previous')), false);
};

test('reads missing formal files as defaults without creating files', (t) => {
  const { paths, store } = createTempStore(t);

  assert.deepEqual(store.readCoreDocument(), {
    ok: true,
    exists: false,
    document: createDefaultCoreDocument()
  });
  assert.deepEqual(store.readSettingsDocument(), {
    ok: true,
    exists: false,
    document: createDefaultSettingsDocument()
  });
  assert.deepEqual(store.readStateDocument(), {
    ok: true,
    exists: false,
    document: createDefaultStateDocument()
  });
  assert.deepEqual(store.readSecurityDocument(), {
    ok: true,
    exists: false,
    document: createDefaultSecurityDocument()
  });
  assert.equal(existsSync(paths.core), false);
  assert.equal(existsSync(paths.settings), false);
  assert.equal(existsSync(paths.state), false);
  assert.equal(existsSync(paths.security), false);
});

test('core invalid JSON and invalid schema fail without overwriting current', (t) => {
  const { paths, store } = createTempStore(t);

  writeBrokenJson(paths.core);
  const brokenRead = store.readCoreDocument();

  assert.equal(brokenRead.ok, false);
  assert.equal(brokenRead.code, 'PERSISTENCE_READ_INVALID');

  const saveOverBroken = store.writeCoreDocument(validCore());

  assert.equal(saveOverBroken.ok, false);
  assert.equal(saveOverBroken.code, 'PERSISTENCE_READ_INVALID');
  assert.equal(readFileSync(paths.core, 'utf8'), '{');

  writeJson(paths.core, { schemaVersion: 2, groups: [], accounts: [], history: [] });
  const invalidRead = store.readCoreDocument();

  assert.equal(invalidRead.ok, false);
  assert.equal(invalidRead.code, 'PERSISTENCE_SCHEMA_INVALID');
});

test('non-core corrupt files degrade independently to defaults', (t) => {
  const { paths, store } = createTempStore(t);

  writeJson(paths.core, validCore());
  writeBrokenJson(paths.settings);
  writeBrokenJson(paths.state);
  writeBrokenJson(paths.security);

  assert.deepEqual(store.readCoreDocument(), {
    ok: true,
    exists: true,
    document: validCore()
  });

  const settings = store.readSettingsDocument();
  const state = store.readStateDocument();
  const security = store.readSecurityDocument();

  assert.equal(settings.ok, true);
  assert.equal(settings.ok ? settings.degraded : false, true);
  assert.equal(state.ok, true);
  assert.equal(state.ok ? state.degraded : false, true);
  assert.equal(security.ok, true);
  assert.equal(security.ok ? security.degraded : false, true);
  assert.equal(readFileSync(paths.settings, 'utf8'), '{');
});

test('stale tmp files are deleted and never promoted on read', (t) => {
  const { paths, store } = createTempStore(t);
  const current = validCore();

  writeJson(paths.core, current);
  writeJson(paths.coreTmp, {
    schemaVersion: 1,
    groups: [],
    accounts: [],
    history: []
  });
  writeJson(paths.settingsTmp, createDefaultSettingsDocument());
  writeJson(paths.stateTmp, createDefaultStateDocument());
  writeJson(paths.securityTmp, createDefaultSecurityDocument());

  const result = store.readCoreDocument();

  assert.deepEqual(result, { ok: true, exists: true, document: current });
  assert.equal(existsSync(paths.coreTmp), false);
  assert.equal(existsSync(paths.settingsTmp), false);
  assert.equal(existsSync(paths.stateTmp), false);
  assert.equal(existsSync(paths.securityTmp), false);
  assert.deepEqual(readJson(paths.core), current);
});

test('successful writes use direct structured JSON and leave no previous or tmp files', (t) => {
  const { root, paths, store } = createTempStore(t);

  assert.deepEqual(store.writeCoreDocument(validCore()), { ok: true });
  assert.deepEqual(store.writeSettingsDocument({ global: { themeMode: 'dark' } }), {
    ok: true
  });
  assert.deepEqual(store.writeStateDocument({ rollupImportHashes: ['a', 'a', 'b'] }), {
    ok: true
  });
  assert.deepEqual(
    store.writeSecurityDocument({
      appAccess: { enabled: true, passwordHash: null },
      snapshotEncryption: { enabled: true, passwordHash: null }
    }),
    { ok: true }
  );

  assert.deepEqual(readJson(paths.core), validCore());
  assert.equal(Object.hasOwn(readJson(paths.core) as Record<string, unknown>, 'items'), false);
  assert.equal(existsSync(paths.coreTmp), false);
  assert.equal(existsSync(paths.settingsTmp), false);
  assert.equal(existsSync(paths.stateTmp), false);
  assert.equal(existsSync(paths.securityTmp), false);
  assertNoPreviousFiles(root);
});

test('settings state and security writes do not change core', (t) => {
  const { paths, store } = createTempStore(t);
  const core = validCore();

  assert.deepEqual(store.writeCoreDocument(core), { ok: true });
  const beforeCore = readFileSync(paths.core, 'utf8');

  assert.deepEqual(store.writeSettingsDocument(createDefaultSettingsDocument()), { ok: true });
  assert.deepEqual(store.writeStateDocument(createDefaultStateDocument()), { ok: true });
  assert.deepEqual(store.writeSecurityDocument(createDefaultSecurityDocument()), { ok: true });
  assert.equal(readFileSync(paths.core, 'utf8'), beforeCore);
});

test('tmp creation write sync verify and replace failures keep current where possible', (t) => {
  const { paths } = createTempStore(t);
  const oldCore = validCore();
  const firstGroup = oldCore.groups[0] as Record<string, unknown>;
  const newCore = {
    ...oldCore,
    groups: [{ ...firstGroup, name: 'New Cash' }]
  };

  writeJson(paths.core, oldCore);

  const createFailed = createPersistenceStore({
    paths,
    adapter: createAdapter({
      openSync(filePath, flags, mode) {
        if (filePath === paths.coreTmp) {
          throw Object.assign(new Error('blocked'), { code: 'EEXIST' });
        }

        return defaultPersistenceFileAdapter.openSync(filePath, flags, mode);
      }
    })
  }).writeCoreDocument(newCore);

  assert.equal(createFailed.ok, false);
  assert.equal(createFailed.code, 'PERSISTENCE_TEMP_CREATE_FAILED');
  assert.deepEqual(readJson(paths.core), oldCore);

  const syncFailed = createPersistenceStore({
    paths,
    adapter: createAdapter({
      fsyncSync() {
        throw Object.assign(new Error('sync failed'), { code: 'EIO' });
      }
    })
  }).writeCoreDocument(newCore);

  assert.equal(syncFailed.ok, false);
  assert.equal(syncFailed.code, 'PERSISTENCE_TEMP_SYNC_FAILED');
  assert.deepEqual(readJson(paths.core), oldCore);
  assert.equal(existsSync(paths.coreTmp), false);

  const verifyFailed = createPersistenceStore({
    paths,
    adapter: createAdapter({
      readFileSync(filePath, options) {
        if (filePath === paths.coreTmp) {
          return '{';
        }

        return defaultPersistenceFileAdapter.readFileSync(filePath, options);
      }
    })
  }).writeCoreDocument(newCore);

  assert.equal(verifyFailed.ok, false);
  assert.equal(verifyFailed.code, 'PERSISTENCE_TEMP_VERIFY_FAILED');
  assert.deepEqual(readJson(paths.core), oldCore);

  const replaceFailed = createPersistenceStore({
    paths,
    adapter: createAdapter({
      renameSync(oldPath, newPath) {
        if (oldPath === paths.coreTmp && newPath === paths.core) {
          throw Object.assign(new Error('replace failed'), { code: 'EPERM' });
        }

        return defaultPersistenceFileAdapter.renameSync(oldPath, newPath);
      }
    })
  }).writeCoreDocument(newCore);

  assert.equal(replaceFailed.ok, false);
  assert.equal(replaceFailed.code, 'PERSISTENCE_REPLACE_FAILED');
  assert.deepEqual(readJson(paths.core), oldCore);
});

test('stale tmp cleanup failure blocks save and logs without payload content', (t) => {
  const { paths } = createTempStore(t);
  const entries: string[] = [];
  const logger: PersistenceLogger = {
    warn(message, details) {
      entries.push(`${message} ${JSON.stringify(details)}`);
    }
  };

  writeJson(paths.core, validCore());
  writeJson(paths.coreTmp, validCore());

  const result = createPersistenceStore({
    paths,
    logger,
    adapter: createAdapter({
      unlinkSync(filePath) {
        if (filePath === paths.coreTmp) {
          throw Object.assign(new Error('blocked'), { code: 'EPERM' });
        }

        return defaultPersistenceFileAdapter.unlinkSync(filePath);
      }
    })
  }).writeCoreDocument(validCore());

  assert.equal(result.ok, false);
  assert.equal(result.code, 'PERSISTENCE_TEMP_CLEANUP_FAILED');
  assert.equal(entries.some((entry) => entry.includes('Wallet')), false);
  assert.equal(entries.some((entry) => entry.includes('100')), false);
});
