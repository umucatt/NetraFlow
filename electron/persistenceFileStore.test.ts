import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
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
  createCoreFileFingerprint,
  encodePlainCoreFile,
  serializeCoreFile
} from './corePersistenceCodec.js';
import {
  createPersistenceStore,
  defaultPersistenceFileAdapter,
  type PersistenceFileAdapter,
  type PersistenceLogger
} from './persistenceFileStore.js';
import { createPersistencePaths } from './persistencePaths.js';

const createTempStore = (t: TestContext) => {
  const taskTempRoot = path.join(process.cwd(), '.tmp-core-protection');

  mkdirSync(taskTempRoot, { recursive: true });

  const root = mkdtempSync(path.join(taskTempRoot, 'netraflow-persistence-'));
  const paths = createPersistencePaths(root);
  const store = createPersistenceStore({ paths });

  t.after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  return { root, paths, store };
};

const readJson = (filePath: string) => JSON.parse(readFileSync(filePath, 'utf8')) as unknown;

const assertPlainCoreWrapper = (value: unknown, expectedPayload: CoreDocument) => {
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);

  const wrapper = value as {
    integrity?: { algorithm?: unknown; hash?: unknown };
    payload?: unknown;
  };

  assert.deepEqual(wrapper.payload, expectedPayload);
  assert.equal(wrapper.integrity?.algorithm, 'SHA-256');
  assert.equal(typeof wrapper.integrity?.hash, 'string');
  assert.equal(Object.hasOwn(value as Record<string, unknown>, 'encrypted'), false);
};

type TestEncryptedContent = {
  type: unknown;
  version: unknown;
  encryption: {
    algorithm: unknown;
    passwordKdf: unknown;
    fileKeyKdf: unknown;
    iv: unknown;
  };
  payload: unknown;
};

const getEncryptedContent = (value: unknown): TestEncryptedContent => {
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);

  const wrapper = value as {
    integrity?: { algorithm?: unknown; hash?: unknown };
    encrypted?: TestEncryptedContent;
  };

  assert.equal(wrapper.integrity?.algorithm, 'SHA-256');
  assert.equal(wrapper.encrypted?.type, 'netraflow-encrypted-core');
  assert.equal(wrapper.encrypted?.version, 1);
  assert.equal(wrapper.encrypted?.encryption?.algorithm, 'AES-256-GCM');
  assert.equal(Object.hasOwn(value as Record<string, unknown>, 'payload'), false);

  return wrapper.encrypted as TestEncryptedContent;
};

const writeJson = (filePath: string, value: unknown) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeCoreFile = (filePath: string, value: CoreDocument) => {
  writeFileSync(filePath, serializeCoreFile(encodePlainCoreFile(value)), 'utf8');
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

  writeCoreFile(paths.core, validCore());
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

  writeCoreFile(paths.core, current);
  writeCoreFile(paths.coreTmp, {
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
  assertPlainCoreWrapper(readJson(paths.core), current);
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
      appAccess: { autoLockMinutes: 30 },
      snapshotEncryption: { enabled: true, forceEnabled: true }
    }),
    { ok: true }
  );

  assertPlainCoreWrapper(readJson(paths.core), validCore());
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

test('core protection keeps only a session key and rotates file-key data on saves', (t) => {
  const { paths, store } = createTempStore(t);
  const core = validCore();
  const nextCore: CoreDocument = {
    ...core,
    groups: [{ ...(core.groups[0] as Record<string, unknown>), name: 'Session Cash' }]
  };

  assert.deepEqual(store.enableCoreProtection(core, 'session-password'), { ok: true });

  const firstEncrypted = getEncryptedContent(readJson(paths.core));
  const firstPasswordKdf = firstEncrypted.encryption?.passwordKdf;
  const firstFileKeyKdf = firstEncrypted.encryption?.fileKeyKdf as { salt?: unknown };
  const firstIv = firstEncrypted.encryption?.iv;

  assert.equal(JSON.stringify(readJson(paths.core)).includes('session-password'), false);
  assert.deepEqual(store.unlockCoreDocument('wrong-password'), {
    ok: false,
    code: 'PERSISTENCE_CORE_UNLOCK_FAILED',
    message: '无法解密该文件。'
  });

  const unlocked = store.unlockCoreDocument('session-password');
  assert.equal(unlocked.ok, true);
  assert.equal(unlocked.ok && 'locked' in unlocked, false);

  assert.deepEqual(store.writeCoreDocument(nextCore), { ok: true });

  const secondEncrypted = getEncryptedContent(readJson(paths.core));

  assert.deepEqual(secondEncrypted.encryption?.passwordKdf, firstPasswordKdf);
  assert.notEqual(
    (secondEncrypted.encryption?.fileKeyKdf as { salt?: unknown }).salt,
    firstFileKeyKdf.salt
  );
  assert.notEqual(secondEncrypted.encryption?.iv, firstIv);

  assert.deepEqual(store.lockCoreDocument(), { ok: true });

  const lockedRead = store.readCoreDocument();
  assert.equal(lockedRead.ok, true);
  assert.equal(lockedRead.ok && 'locked' in lockedRead, true);

  const lockedWrite = store.writeCoreDocument(nextCore);

  assert.equal(lockedWrite.ok, false);
  assert.equal(lockedWrite.ok ? '' : lockedWrite.code, 'PERSISTENCE_CORE_LOCKED');
});

test('snapshot encryption uses the current session and remains independently decryptable', (t) => {
  const { store } = createTempStore(t);
  const core = validCore();
  const snapshot = {
    app: 'NetraFlow',
    schemaVersion: 1,
    exportedAt: '2026-06-23T00:00:00.000Z',
    groups: core.groups,
    accounts: core.accounts,
    history: core.history
  };

  const unavailable = store.encryptSnapshotDocument(snapshot);

  assert.equal(unavailable.ok, false);
  assert.equal(
    unavailable.ok ? '' : unavailable.code,
    'PERSISTENCE_CRYPTO_SESSION_UNAVAILABLE'
  );

  assert.deepEqual(store.enableCoreProtection(core, 'old-password'), { ok: true });

  const oldSnapshot = store.encryptSnapshotDocument(snapshot);

  assert.equal(oldSnapshot.ok, true);
  if (!oldSnapshot.ok) {
    assert.fail(oldSnapshot.message);
  }

  assert.equal(oldSnapshot.encrypted.type, 'netraflow-encrypted-snapshot');
  assert.equal(
    oldSnapshot.encrypted.encryption.fileKeyKdf.purpose,
    'netraflow-snapshot-v1'
  );
  assert.deepEqual(
    store.decryptSnapshotDocument(oldSnapshot.encrypted),
    { ok: true, document: snapshot }
  );
  assert.deepEqual(
    store.decryptSnapshotDocumentWithPassword(oldSnapshot.encrypted, 'old-password'),
    { ok: true, document: snapshot }
  );

  assert.deepEqual(store.lockCoreDocument(), { ok: true });

  const lockedDecrypt = store.decryptSnapshotDocument(oldSnapshot.encrypted);

  assert.equal(lockedDecrypt.ok, false);
  assert.equal(
    lockedDecrypt.ok ? '' : lockedDecrypt.code,
    'PERSISTENCE_CRYPTO_SESSION_UNAVAILABLE'
  );
  assert.deepEqual(
    store.decryptSnapshotDocumentWithPassword(oldSnapshot.encrypted, 'old-password'),
    { ok: true, document: snapshot }
  );

  assert.equal(store.unlockCoreDocument('old-password').ok, true);
  assert.deepEqual(store.changeCorePassword(core, 'old-password', 'new-password'), {
    ok: true
  });

  const historicalSessionDecrypt = store.decryptSnapshotDocument(oldSnapshot.encrypted);

  assert.equal(historicalSessionDecrypt.ok, false);
  assert.equal(
    historicalSessionDecrypt.ok ? '' : historicalSessionDecrypt.code,
    'PERSISTENCE_SNAPSHOT_DECRYPT_FAILED'
  );

  const newSnapshot = store.encryptSnapshotDocument(snapshot);

  assert.equal(newSnapshot.ok, true);
  if (!newSnapshot.ok) {
    assert.fail(newSnapshot.message);
  }

  assert.notDeepEqual(
    newSnapshot.encrypted.encryption.passwordKdf,
    oldSnapshot.encrypted.encryption.passwordKdf
  );
  assert.deepEqual(
    store.decryptSnapshotDocumentWithPassword(oldSnapshot.encrypted, 'old-password'),
    { ok: true, document: snapshot }
  );
  assert.deepEqual(
    store.decryptSnapshotDocumentWithPassword(newSnapshot.encrypted, 'new-password'),
    { ok: true, document: snapshot }
  );

  const wrongHistoricalPassword = store.decryptSnapshotDocumentWithPassword(
    oldSnapshot.encrypted,
    'new-password'
  );

  assert.equal(wrongHistoricalPassword.ok, false);
  assert.equal(
    wrongHistoricalPassword.ok ? '' : wrongHistoricalPassword.code,
    'PERSISTENCE_SNAPSHOT_DECRYPT_FAILED'
  );
});

test('core writes block externally modified formal file until explicitly allowed', (t) => {
  const { paths, store } = createTempStore(t);
  const originalCore = validCore();
  const externalCore: CoreDocument = {
    ...originalCore,
    groups: [{ ...originalCore.groups[0], name: 'External Cash' }]
  };
  const nextCore: CoreDocument = {
    ...originalCore,
    groups: [{ ...originalCore.groups[0], name: 'Next Cash' }]
  };

  assert.deepEqual(store.writeCoreDocument(originalCore), { ok: true });
  writeCoreFile(paths.core, externalCore);

  const blocked = store.writeCoreDocument(nextCore);

  assert.equal(blocked.ok, false);
  assert.equal(blocked.ok ? '' : blocked.code, 'PERSISTENCE_CORE_EXTERNAL_MODIFIED');
  assertPlainCoreWrapper(readJson(paths.core), externalCore);
  assert.equal(existsSync(paths.coreTmp), false);

  assert.deepEqual(
    store.writeCoreDocument(nextCore, { allowExternalCoreOverwrite: true }),
    { ok: true }
  );
  assertPlainCoreWrapper(readJson(paths.core), nextCore);
});

test('core read establishes fingerprint baseline and acknowledgement suppresses only the same bytes', (t) => {
  const { paths, store } = createTempStore(t);
  const originalCore = validCore();
  const externalCore: CoreDocument = {
    ...originalCore,
    groups: [{ ...originalCore.groups[0], name: 'External Cash' }]
  };
  const changedAgainCore: CoreDocument = {
    ...originalCore,
    groups: [{ ...originalCore.groups[0], name: 'Changed Again Cash' }]
  };

  writeCoreFile(paths.core, originalCore);

  const firstRead = store.readCoreDocument();

  assert.equal(firstRead.ok, true);
  assert.equal(firstRead.ok && 'integrityWarning' in firstRead, false);
  assert.deepEqual(
    (readJson(paths.state) as { coreProtection?: unknown }).coreProtection,
    {
      schemaVersion: 1,
      lastConfirmedFingerprint: createCoreFileFingerprint(readFileSync(paths.core))
    }
  );

  writeCoreFile(paths.core, externalCore);

  const mismatch = store.readCoreDocument();

  assert.equal(mismatch.ok, true);
  assert.equal(mismatch.ok && 'integrityFailure' in mismatch ? mismatch.integrityFailure : '', 'continuity');
  assert.equal(mismatch.ok && 'integrityWarning' in mismatch, true);

  assert.deepEqual(store.acknowledgeCoreIntegrityIssue(), { ok: true });

  const acknowledged = store.readCoreDocument();

  assert.equal(acknowledged.ok, true);
  assert.equal(acknowledged.ok && 'integrityWarning' in acknowledged, false);

  writeCoreFile(paths.core, changedAgainCore);

  const changedAgain = store.readCoreDocument();

  assert.equal(changedAgain.ok, true);
  assert.equal(
    changedAgain.ok && 'integrityFailure' in changedAgain ? changedAgain.integrityFailure : '',
    'continuity'
  );
});

test('acknowledged internal core integrity warning is recorded by fingerprint and cleared by a good save', (t) => {
  const { paths, store } = createTempStore(t);
  const originalCore = validCore();
  const repairedCore: CoreDocument = {
    ...originalCore,
    groups: [{ ...originalCore.groups[0], name: 'Repaired Cash' }]
  };

  writeJson(paths.core, {
    integrity: {
      algorithm: 'SHA-256',
      hash: '0'.repeat(64)
    },
    payload: originalCore
  });

  const warning = store.readCoreDocument();

  assert.equal(warning.ok, true);
  assert.equal(warning.ok && 'integrityFailure' in warning ? warning.integrityFailure : '', 'internal');
  assert.equal(warning.ok && 'integrityWarning' in warning, true);

  assert.deepEqual(store.acknowledgeCoreIntegrityIssue(), { ok: true });

  const acknowledged = store.readCoreDocument();
  const acknowledgedFingerprint = createCoreFileFingerprint(readFileSync(paths.core));

  assert.equal(acknowledged.ok, true);
  assert.equal(acknowledged.ok && 'integrityWarning' in acknowledged, false);
  assert.deepEqual(
    (readJson(paths.state) as { coreProtection?: unknown }).coreProtection,
    {
      schemaVersion: 1,
      lastConfirmedFingerprint: acknowledgedFingerprint,
      acknowledgedInternalIntegrityFailureFingerprint: acknowledgedFingerprint
    }
  );

  assert.deepEqual(store.writeCoreDocument(repairedCore), { ok: true });
  assert.deepEqual(
    (readJson(paths.state) as { coreProtection?: unknown }).coreProtection,
    {
      schemaVersion: 1,
      lastConfirmedFingerprint: createCoreFileFingerprint(readFileSync(paths.core))
    }
  );
});

test('core write checks formal fingerprint before temp write and before replace', (t) => {
  const { paths } = createTempStore(t);
  const originalCore = validCore();
  const externalCore: CoreDocument = {
    ...originalCore,
    groups: [{ ...originalCore.groups[0], name: 'External Cash' }]
  };
  const nextCore: CoreDocument = {
    ...originalCore,
    groups: [{ ...originalCore.groups[0], name: 'Next Cash' }]
  };

  writeCoreFile(paths.core, originalCore);

  let preTempCoreReads = 0;
  let armedPreTempMutation = false;
  let openedTmpBeforePreTempFailure = false;
  const preTempStore = createPersistenceStore({
    paths,
    adapter: createAdapter({
      readFileSync(filePath, options) {
        if (armedPreTempMutation && filePath === paths.core) {
          preTempCoreReads += 1;

          if (preTempCoreReads === 2) {
            writeCoreFile(paths.core, externalCore);
          }
        }

        return defaultPersistenceFileAdapter.readFileSync(filePath, options);
      },
      openSync(filePath, flags, mode) {
        if (filePath === paths.coreTmp) {
          openedTmpBeforePreTempFailure = true;
        }

        return defaultPersistenceFileAdapter.openSync(filePath, flags, mode);
      }
    })
  });

  assert.equal(preTempStore.readCoreDocument().ok, true);
  armedPreTempMutation = true;

  const preTempBlocked = preTempStore.writeCoreDocument(nextCore);

  assert.equal(preTempBlocked.ok, false);
  assert.equal(preTempBlocked.ok ? '' : preTempBlocked.code, 'PERSISTENCE_CORE_EXTERNAL_MODIFIED');
  assert.equal(openedTmpBeforePreTempFailure, false);
  assertPlainCoreWrapper(readJson(paths.core), externalCore);
  assert.equal(existsSync(paths.coreTmp), false);

  writeCoreFile(paths.core, originalCore);

  let preReplaceCoreReads = 0;
  let armedPreReplaceMutation = false;
  let renamedAfterPreReplaceFailure = false;
  const preReplaceStore = createPersistenceStore({
    paths,
    adapter: createAdapter({
      readFileSync(filePath, options) {
        if (armedPreReplaceMutation && filePath === paths.core) {
          preReplaceCoreReads += 1;

          if (preReplaceCoreReads === 3) {
            writeCoreFile(paths.core, externalCore);
          }
        }

        return defaultPersistenceFileAdapter.readFileSync(filePath, options);
      },
      renameSync(oldPath, newPath) {
        if (oldPath === paths.coreTmp && newPath === paths.core) {
          renamedAfterPreReplaceFailure = true;
        }

        return defaultPersistenceFileAdapter.renameSync(oldPath, newPath);
      }
    })
  });

  assert.equal(preReplaceStore.readCoreDocument().ok, true);
  armedPreReplaceMutation = true;

  const preReplaceBlocked = preReplaceStore.writeCoreDocument(nextCore);

  assert.equal(preReplaceBlocked.ok, false);
  assert.equal(
    preReplaceBlocked.ok ? '' : preReplaceBlocked.code,
    'PERSISTENCE_CORE_EXTERNAL_MODIFIED'
  );
  assert.equal(renamedAfterPreReplaceFailure, false);
  assertPlainCoreWrapper(readJson(paths.core), externalCore);
  assert.equal(existsSync(paths.coreTmp), false);
});

test('tmp creation write sync verify and replace failures keep current where possible', (t) => {
  const { paths } = createTempStore(t);
  const oldCore = validCore();
  const firstGroup = oldCore.groups[0] as Record<string, unknown>;
  const newCore = {
    ...oldCore,
    groups: [{ ...firstGroup, name: 'New Cash' }]
  };

  writeCoreFile(paths.core, oldCore);

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
  assertPlainCoreWrapper(readJson(paths.core), oldCore);

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
  assertPlainCoreWrapper(readJson(paths.core), oldCore);
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
  assertPlainCoreWrapper(readJson(paths.core), oldCore);

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
  assertPlainCoreWrapper(readJson(paths.core), oldCore);
});

test('stale tmp cleanup failure blocks save and logs without payload content', (t) => {
  const { paths } = createTempStore(t);
  const entries: string[] = [];
  const logger: PersistenceLogger = {
    warn(message, details) {
      entries.push(`${message} ${JSON.stringify(details)}`);
    }
  };

  writeCoreFile(paths.core, validCore());
  writeCoreFile(paths.coreTmp, validCore());

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
