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

import {
  CURRENT_NF_STORAGE_SCHEMA_VERSION,
  defaultNfStorageFileAdapter,
  getNfStorageFilePath,
  getNfStoragePreviousFilePath,
  getNfStoragePreviousTempFilePath,
  getNfStorageTempFilePath,
  parseNfStorageDocument,
  readNfStorageFile,
  sanitizeNfStorageItems,
  serializeNfStorageDocument,
  writeNfStorageFile,
  type NfStorageFileAdapter,
  type NfStorageItems,
  type NfStorageLogger,
  type StorageReadResult
} from './storageFile.js';

const GROUPS_KEY = 'asset-overview-groups';
const ACCOUNTS_KEY = 'asset-overview-accounts';
const HISTORY_KEY = 'asset-overview-history';
const GLOBAL_SETTINGS_KEY = 'netraflowGlobalSettings';

const WHITELIST_KEYS = [
  GROUPS_KEY,
  ACCOUNTS_KEY,
  HISTORY_KEY,
  GLOBAL_SETTINGS_KEY
] as const;

type TempStoragePath = ReturnType<typeof createTempStoragePath>;

const createTempStoragePath = (t: TestContext) => {
  const directoryPath = mkdtempSync(path.join(tmpdir(), 'netraflow-storage-'));
  const storageFilePath = getNfStorageFilePath(directoryPath);

  t.after(() => {
    rmSync(directoryPath, { recursive: true, force: true });
  });

  return {
    directoryPath,
    storageFilePath,
    tempStorageFilePath: getNfStorageTempFilePath(storageFilePath),
    previousStorageFilePath: getNfStoragePreviousFilePath(storageFilePath),
    previousTempStorageFilePath: getNfStoragePreviousTempFilePath(storageFilePath)
  };
};

const readRawFile = (filePath: string) => readFileSync(filePath, 'utf8');

const readJsonFile = (filePath: string) => JSON.parse(readRawFile(filePath)) as unknown;

const writeRawStorage = (filePath: string, value: unknown) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeLegacyStorage = (filePath: string, items: NfStorageItems) => {
  writeRawStorage(filePath, items);
};

const writeSchemaStorage = (
  filePath: string,
  items: NfStorageItems,
  schemaVersion = CURRENT_NF_STORAGE_SCHEMA_VERSION
) => {
  writeRawStorage(filePath, { schemaVersion, items });
};

const writeInvalidStorage = (filePath: string) => {
  writeFileSync(filePath, '{', 'utf8');
};

const assertSchema1Storage = (filePath: string, expectedItems: NfStorageItems) => {
  const value = readJsonFile(filePath) as Record<string, unknown>;

  assert.deepEqual(Object.keys(value).sort(), ['items', 'schemaVersion']);
  assert.equal(value.schemaVersion, CURRENT_NF_STORAGE_SCHEMA_VERSION);
  assert.deepEqual(value.items, expectedItems);
};

const assertLegacyStorage = (filePath: string, expectedItems: NfStorageItems) => {
  assert.deepEqual(readJsonFile(filePath), expectedItems);
};

const createAdapter = (
  overrides: Partial<NfStorageFileAdapter> = {}
): NfStorageFileAdapter => ({
  ...defaultNfStorageFileAdapter,
  ...overrides
});

const createPathFailureAdapter = ({
  failWritePath,
  failSyncPath,
  failClosePath
}: {
  failWritePath?: string;
  failSyncPath?: string;
  failClosePath?: string;
}): NfStorageFileAdapter => {
  const fdPaths = new Map<number, string>();

  return createAdapter({
    openSync(filePath, flags, mode) {
      const fd = defaultNfStorageFileAdapter.openSync(filePath, flags, mode);
      fdPaths.set(fd, String(filePath));

      return fd;
    },
    writeSync(fd, ...args) {
      if (fdPaths.get(fd) === failWritePath) {
        throw Object.assign(new Error('write failed'), { code: 'EIO' });
      }

      return defaultNfStorageFileAdapter.writeSync(fd, ...args);
    },
    fsyncSync(fd) {
      if (fdPaths.get(fd) === failSyncPath) {
        throw Object.assign(new Error('sync failed'), { code: 'EIO' });
      }

      return defaultNfStorageFileAdapter.fsyncSync(fd);
    },
    closeSync(fd) {
      const filePath = fdPaths.get(fd);
      fdPaths.delete(fd);
      defaultNfStorageFileAdapter.closeSync(fd);

      if (filePath === failClosePath) {
        throw Object.assign(new Error('close failed'), { code: 'EIO' });
      }
    }
  });
};

const assertOkRead = (value: StorageReadResult) => {
  assert.equal(value.ok, true);

  if (!value.ok) {
    throw new Error(value.message);
  }

  return value;
};

const snapshotStorageFiles = ({
  storageFilePath,
  tempStorageFilePath,
  previousStorageFilePath,
  previousTempStorageFilePath
}: TempStoragePath) => ({
  current: existsSync(storageFilePath) ? readRawFile(storageFilePath) : null,
  tmp: existsSync(tempStorageFilePath) ? readRawFile(tempStorageFilePath) : null,
  previous: existsSync(previousStorageFilePath) ? readRawFile(previousStorageFilePath) : null,
  previousTmp: existsSync(previousTempStorageFilePath)
    ? readRawFile(previousTempStorageFilePath)
    : null
});

test('schema 1 parser accepts valid documents and keeps source format', () => {
  const empty = parseNfStorageDocument(
    { schemaVersion: CURRENT_NF_STORAGE_SCHEMA_VERSION, items: {} },
    WHITELIST_KEYS
  );

  assert.equal(empty.ok, true);
  assert.equal(empty.ok ? empty.document.format : '', 'schema-1');
  assert.deepEqual(empty.ok ? empty.items : null, {});

  const full = parseNfStorageDocument(
    {
      schemaVersion: 1.0,
      items: {
        [GROUPS_KEY]: 'groups',
        [ACCOUNTS_KEY]: 'accounts',
        [HISTORY_KEY]: 'history'
      }
    },
    WHITELIST_KEYS
  );

  assert.equal(full.ok, true);
  assert.deepEqual(full.ok ? full.items : null, {
    [GROUPS_KEY]: 'groups',
    [ACCOUNTS_KEY]: 'accounts',
    [HISTORY_KEY]: 'history'
  });
});

test('schema parser classifies invalid, unsupported, and future versions', () => {
  const invalidCases = [
    { schemaVersion: '1', items: {} },
    { schemaVersion: '2', items: {} },
    { schemaVersion: 1.5, items: {} },
    { schemaVersion: 1 },
    { items: {} },
    { schemaVersion: 1, items: null },
    { schemaVersion: 1, items: [] },
    { schemaVersion: 1, items: {}, extra: true },
    { schemaVersion: 1, items: { 'unknown-key': 'value' } },
    { schemaVersion: 1, items: { [GROUPS_KEY]: [] } }
  ];

  invalidCases.forEach((value) => {
    const result = parseNfStorageDocument(value, WHITELIST_KEYS);

    assert.equal(result.ok, false);
    assert.equal(result.code, 'STORAGE_SCHEMA_INVALID');
  });

  [0, -1].forEach((schemaVersion) => {
    const result = parseNfStorageDocument({ schemaVersion, items: {} }, WHITELIST_KEYS);

    assert.equal(result.ok, false);
    assert.equal(result.code, 'STORAGE_SCHEMA_UNSUPPORTED');
  });

  const future = parseNfStorageDocument({ schemaVersion: 2, items: null }, WHITELIST_KEYS);

  assert.equal(future.ok, false);
  assert.equal(future.code, 'STORAGE_SCHEMA_FUTURE');
});

test('schema parser rejects getter failures and unsafe keys', () => {
  const throwingDocument = { schemaVersion: 1 };

  Object.defineProperty(throwingDocument, 'items', {
    enumerable: true,
    get() {
      throw new Error('items getter failed');
    }
  });

  const unsafeItems = Object.create(null) as Record<string, unknown>;
  unsafeItems.__proto__ = 'pollute';

  const throwingItems = {};

  Object.defineProperty(throwingItems, GROUPS_KEY, {
    enumerable: true,
    get() {
      throw new Error('value getter failed');
    }
  });

  [throwingDocument, { schemaVersion: 1, items: unsafeItems }, { schemaVersion: 1, items: throwingItems }].forEach(
    (value) => {
      const result = parseNfStorageDocument(value, WHITELIST_KEYS);

      assert.equal(result.ok, false);
      assert.equal(result.code, 'STORAGE_SCHEMA_INVALID');
    }
  );
});

test('legacy parser accepts only current flat whitelist string tables', () => {
  const flat = parseNfStorageDocument(
    {
      [GROUPS_KEY]: 'groups',
      [GLOBAL_SETTINGS_KEY]: '{"themeMode":"dark"}'
    },
    WHITELIST_KEYS
  );

  assert.equal(flat.ok, true);
  assert.equal(flat.ok ? flat.document.format : '', 'legacy-flat');
  assert.deepEqual(flat.ok ? flat.items : null, {
    [GROUPS_KEY]: 'groups',
    [GLOBAL_SETTINGS_KEY]: '{"themeMode":"dark"}'
  });

  const empty = parseNfStorageDocument({}, WHITELIST_KEYS);

  assert.equal(empty.ok, true);
  assert.equal(empty.ok ? empty.document.format : '', 'legacy-flat');
  assert.deepEqual(empty.ok ? empty.items : null, {});
});

test('legacy parser rejects unknown shapes and never falls back from schema fields', () => {
  const unsafePayload = Object.create(null) as Record<string, unknown>;
  unsafePayload.constructor = 'unsafe';

  [
    null,
    [],
    { 'unknown-key': 'value' },
    { [GROUPS_KEY]: [] },
    unsafePayload
  ].forEach((value) => {
    const result = parseNfStorageDocument(value, WHITELIST_KEYS);

    assert.equal(result.ok, false);
    assert.equal(result.code, 'STORAGE_READ_INVALID');
  });

  [
    { schemaVersion: 1 },
    { items: {} },
    { schemaVersion: 1, [GROUPS_KEY]: 'legacy-looking' }
  ].forEach((value) => {
    const result = parseNfStorageDocument(value, WHITELIST_KEYS);

    assert.equal(result.ok, false);
    assert.equal(result.code, 'STORAGE_SCHEMA_INVALID');
  });
});

test('reads missing, schema 1, and legacy current storage without rewriting legacy bytes', (t) => {
  const { storageFilePath } = createTempStoragePath(t);

  assert.deepEqual(
    readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS }),
    { ok: true, exists: false, items: {} }
  );

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'schema-current' });

  assert.deepEqual(
    readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS }),
    {
      ok: true,
      exists: true,
      items: { [GROUPS_KEY]: 'schema-current' }
    }
  );

  writeLegacyStorage(storageFilePath, {
    [GROUPS_KEY]: 'legacy-current',
    [GLOBAL_SETTINGS_KEY]: '{"themeMode":"dark"}'
  });
  const legacyBytes = readRawFile(storageFilePath);

  assert.deepEqual(
    readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS }),
    {
      ok: true,
      exists: true,
      legacy: true,
      items: {
        [GROUPS_KEY]: 'legacy-current',
        [GLOBAL_SETTINGS_KEY]: '{"themeMode":"dark"}'
      }
    }
  );
  assert.equal(readRawFile(storageFilePath), legacyBytes);
});

test('existing empty legacy object is distinct from a missing file and upgrades on save', (t) => {
  const { storageFilePath } = createTempStoragePath(t);

  writeLegacyStorage(storageFilePath, {});

  assert.deepEqual(
    readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS }),
    { ok: true, exists: true, legacy: true, items: {} }
  );

  assert.deepEqual(
    writeNfStorageFile({
      storageFilePath,
      whitelistKeys: WHITELIST_KEYS,
      items: { [GROUPS_KEY]: 'first' }
    }),
    { ok: true }
  );
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'first' });
});

test('valid current storage wins over stale tmp and previous.tmp', (t) => {
  const paths = createTempStoragePath(t);

  writeSchemaStorage(paths.storageFilePath, { [GROUPS_KEY]: 'current' });
  writeSchemaStorage(paths.tempStorageFilePath, { [GROUPS_KEY]: 'tmp' });
  writeLegacyStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'previous-legacy' });
  writeSchemaStorage(paths.previousTempStorageFilePath, { [GROUPS_KEY]: 'previous-temp' });

  assert.deepEqual(
    readNfStorageFile({ storageFilePath: paths.storageFilePath, whitelistKeys: WHITELIST_KEYS }),
    {
      ok: true,
      exists: true,
      items: { [GROUPS_KEY]: 'current' }
    }
  );
  assert.equal(existsSync(paths.tempStorageFilePath), false);
  assert.equal(existsSync(paths.previousTempStorageFilePath), false);
  assertLegacyStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'previous-legacy' });
});

test('damaged or future previous does not block healthy current', (t) => {
  const { storageFilePath, previousStorageFilePath } = createTempStoragePath(t);

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'current' });
  writeInvalidStorage(previousStorageFilePath);

  assert.deepEqual(
    readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS }),
    {
      ok: true,
      exists: true,
      items: { [GROUPS_KEY]: 'current' }
    }
  );

  writeSchemaStorage(previousStorageFilePath, { [GROUPS_KEY]: 'future-previous' }, 2);

  assert.deepEqual(
    readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS }),
    {
      ok: true,
      exists: true,
      items: { [GROUPS_KEY]: 'current' }
    }
  );
});

test('missing or invalid current with only valid tmp requires recovery and keeps tmp', (t) => {
  const { storageFilePath, tempStorageFilePath } = createTempStoragePath(t);

  writeSchemaStorage(tempStorageFilePath, { [GROUPS_KEY]: 'tmp' });
  let result = readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'STORAGE_RECOVERY_REQUIRED');
  assert.equal(existsSync(tempStorageFilePath), true);

  writeInvalidStorage(storageFilePath);
  result = readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'STORAGE_RECOVERY_REQUIRED');
  assert.equal(existsSync(tempStorageFilePath), true);
});

test('missing or invalid current recovers previous into schema 1 current', (t) => {
  const paths = createTempStoragePath(t);

  writeSchemaStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'schema-previous' });
  writeSchemaStorage(paths.tempStorageFilePath, { [GROUPS_KEY]: 'tmp' });
  writeSchemaStorage(paths.previousTempStorageFilePath, { [GROUPS_KEY]: 'previous-temp' });

  let result = assertOkRead(
    readNfStorageFile({ storageFilePath: paths.storageFilePath, whitelistKeys: WHITELIST_KEYS })
  );

  assert.equal(result.exists, true);
  assert.equal(result.recovered, true);
  assert.deepEqual(result.items, { [GROUPS_KEY]: 'schema-previous' });
  assertSchema1Storage(paths.storageFilePath, { [GROUPS_KEY]: 'schema-previous' });
  assertSchema1Storage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'schema-previous' });
  assert.equal(existsSync(paths.tempStorageFilePath), false);
  assert.equal(existsSync(paths.previousTempStorageFilePath), false);

  writeInvalidStorage(paths.storageFilePath);
  writeLegacyStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'legacy-previous' });

  result = assertOkRead(
    readNfStorageFile({ storageFilePath: paths.storageFilePath, whitelistKeys: WHITELIST_KEYS })
  );

  assert.equal(result.exists, true);
  assert.equal(result.recovered, true);
  assert.deepEqual(result.items, { [GROUPS_KEY]: 'legacy-previous' });
  assertSchema1Storage(paths.storageFilePath, { [GROUPS_KEY]: 'legacy-previous' });
  assertLegacyStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'legacy-previous' });
});

test('invalid current and invalid or future previous are unrecoverable unless tmp is valid', (t) => {
  const { storageFilePath, tempStorageFilePath, previousStorageFilePath } =
    createTempStoragePath(t);

  writeInvalidStorage(storageFilePath);
  writeInvalidStorage(previousStorageFilePath);
  let result = readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'STORAGE_UNRECOVERABLE');

  writeSchemaStorage(previousStorageFilePath, { [GROUPS_KEY]: 'future-previous' }, 2);
  result = readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'STORAGE_UNRECOVERABLE');

  writeSchemaStorage(tempStorageFilePath, { [GROUPS_KEY]: 'tmp' });
  result = readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'STORAGE_RECOVERY_REQUIRED');
  assert.equal(existsSync(tempStorageFilePath), true);
});

test('future current read fails without recovering previous or touching any file', (t) => {
  const paths = createTempStoragePath(t);

  writeSchemaStorage(paths.storageFilePath, { [GROUPS_KEY]: 'future-current' }, 2);
  writeSchemaStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'previous' });
  writeSchemaStorage(paths.tempStorageFilePath, { [GROUPS_KEY]: 'tmp' });
  writeSchemaStorage(paths.previousTempStorageFilePath, { [GROUPS_KEY]: 'previous-tmp' });
  const before = snapshotStorageFiles(paths);

  const result = readNfStorageFile({
    storageFilePath: paths.storageFilePath,
    whitelistKeys: WHITELIST_KEYS
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'STORAGE_SCHEMA_FUTURE');
  assert.deepEqual(snapshotStorageFiles(paths), before);
});

test('recovery is idempotent and does not update previous', (t) => {
  const { storageFilePath, tempStorageFilePath, previousStorageFilePath } =
    createTempStoragePath(t);
  let currentReplaceCount = 0;
  const adapter = createAdapter({
    renameSync(oldPath, newPath) {
      if (oldPath === tempStorageFilePath && newPath === storageFilePath) {
        currentReplaceCount += 1;
      }

      return defaultNfStorageFileAdapter.renameSync(oldPath, newPath);
    }
  });

  writeInvalidStorage(storageFilePath);
  writeLegacyStorage(previousStorageFilePath, { [GROUPS_KEY]: 'previous' });

  const firstRead = assertOkRead(
    readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS, adapter })
  );
  const secondRead = assertOkRead(
    readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS, adapter })
  );

  assert.equal(firstRead.exists, true);
  assert.equal(firstRead.recovered, true);
  assert.equal(secondRead.exists, true);
  assert.equal(secondRead.recovered, undefined);
  assert.deepEqual(secondRead.items, { [GROUPS_KEY]: 'previous' });
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'previous' });
  assertLegacyStorage(previousStorageFilePath, { [GROUPS_KEY]: 'previous' });
  assert.equal(currentReplaceCount, 1);
  assert.equal(existsSync(tempStorageFilePath), false);
});

test('normal writes create schema 1 current and previous after current exists', (t) => {
  const paths = createTempStoragePath(t);

  assert.deepEqual(
    writeNfStorageFile({
      storageFilePath: paths.storageFilePath,
      whitelistKeys: WHITELIST_KEYS,
      items: {
        [GROUPS_KEY]: 'first',
        'unknown-key': 'drop',
        [GLOBAL_SETTINGS_KEY]: 123
      }
    }),
    { ok: true }
  );
  assertSchema1Storage(paths.storageFilePath, { [GROUPS_KEY]: 'first' });
  assert.equal(existsSync(paths.previousStorageFilePath), false);
  assert.equal(existsSync(paths.tempStorageFilePath), false);

  assert.deepEqual(
    writeNfStorageFile({
      storageFilePath: paths.storageFilePath,
      whitelistKeys: WHITELIST_KEYS,
      items: { [GROUPS_KEY]: 'second', [GLOBAL_SETTINGS_KEY]: '{}' }
    }),
    { ok: true }
  );
  assertSchema1Storage(paths.storageFilePath, {
    [GROUPS_KEY]: 'second',
    [GLOBAL_SETTINGS_KEY]: '{}'
  });
  assertSchema1Storage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'first' });
  assert.equal(existsSync(paths.tempStorageFilePath), false);
  assert.equal(existsSync(paths.previousTempStorageFilePath), false);
});

test('legacy current upgrades on first real save and previous captures old logical items', (t) => {
  const paths = createTempStoragePath(t);
  const legacyItems = {
    [GROUPS_KEY]: 'groups-A',
    [ACCOUNTS_KEY]: 'accounts-A',
    [HISTORY_KEY]: 'history-A'
  };

  writeLegacyStorage(paths.storageFilePath, legacyItems);
  const beforeRead = readRawFile(paths.storageFilePath);

  assert.deepEqual(
    readNfStorageFile({ storageFilePath: paths.storageFilePath, whitelistKeys: WHITELIST_KEYS }),
    { ok: true, exists: true, legacy: true, items: legacyItems }
  );
  assert.equal(readRawFile(paths.storageFilePath), beforeRead);

  assert.deepEqual(
    writeNfStorageFile({
      storageFilePath: paths.storageFilePath,
      whitelistKeys: WHITELIST_KEYS,
      items: { [GROUPS_KEY]: 'groups-B' }
    }),
    { ok: true }
  );
  assertSchema1Storage(paths.storageFilePath, { [GROUPS_KEY]: 'groups-B' });
  assertSchema1Storage(paths.previousStorageFilePath, legacyItems);
  assert.equal(existsSync(paths.tempStorageFilePath), false);
  assert.equal(existsSync(paths.previousTempStorageFilePath), false);
});

test('mixed current and previous formats follow current-first semantics', (t) => {
  const paths = createTempStoragePath(t);

  writeSchemaStorage(paths.storageFilePath, { [GROUPS_KEY]: 'schema-current' });
  writeLegacyStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'legacy-previous' });

  assert.deepEqual(
    readNfStorageFile({ storageFilePath: paths.storageFilePath, whitelistKeys: WHITELIST_KEYS }),
    { ok: true, exists: true, items: { [GROUPS_KEY]: 'schema-current' } }
  );
  assertLegacyStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'legacy-previous' });

  assert.deepEqual(
    writeNfStorageFile({
      storageFilePath: paths.storageFilePath,
      whitelistKeys: WHITELIST_KEYS,
      items: { [GROUPS_KEY]: 'next' }
    }),
    { ok: true }
  );
  assertSchema1Storage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'schema-current' });

  writeLegacyStorage(paths.storageFilePath, { [GROUPS_KEY]: 'legacy-current' });
  writeSchemaStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'older-schema-previous' });

  assert.deepEqual(
    writeNfStorageFile({
      storageFilePath: paths.storageFilePath,
      whitelistKeys: WHITELIST_KEYS,
      items: { [GROUPS_KEY]: 'after-legacy' }
    }),
    { ok: true }
  );
  assertSchema1Storage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'legacy-current' });
  assertSchema1Storage(paths.storageFilePath, { [GROUPS_KEY]: 'after-legacy' });
});

test('damaged previous is rebuilt from healthy current on the next save', (t) => {
  const { storageFilePath, previousStorageFilePath } = createTempStoragePath(t);

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'current' });
  writeInvalidStorage(previousStorageFilePath);

  assert.deepEqual(
    writeNfStorageFile({
      storageFilePath,
      whitelistKeys: WHITELIST_KEYS,
      items: { [GROUPS_KEY]: 'next' }
    }),
    { ok: true }
  );
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'next' });
  assertSchema1Storage(previousStorageFilePath, { [GROUPS_KEY]: 'current' });
});

test('future current write fails before any file side effect', (t) => {
  const paths = createTempStoragePath(t);

  writeSchemaStorage(paths.storageFilePath, { [GROUPS_KEY]: 'future-current' }, 2);
  writeSchemaStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'previous' });
  writeSchemaStorage(paths.tempStorageFilePath, { [GROUPS_KEY]: 'tmp' });
  writeSchemaStorage(paths.previousTempStorageFilePath, { [GROUPS_KEY]: 'previous-tmp' });
  const before = snapshotStorageFiles(paths);

  const result = writeNfStorageFile({
    storageFilePath: paths.storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' }
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'STORAGE_SCHEMA_FUTURE');
  assert.deepEqual(snapshotStorageFiles(paths), before);
});

test('invalid current never overwrites an existing valid previous or stale tmp', (t) => {
  const paths = createTempStoragePath(t);

  writeInvalidStorage(paths.storageFilePath);
  writeSchemaStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'previous' });
  writeSchemaStorage(paths.tempStorageFilePath, { [GROUPS_KEY]: 'stale-tmp' });

  const before = snapshotStorageFiles(paths);
  const result = writeNfStorageFile({
    storageFilePath: paths.storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' }
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'STORAGE_READ_INVALID');
  assert.deepEqual(snapshotStorageFiles(paths), before);
});

test('stale tmp delete failure during write leaves current storage unchanged', (t) => {
  const { storageFilePath, tempStorageFilePath } = createTempStoragePath(t);

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'old' });
  writeSchemaStorage(tempStorageFilePath, { [GROUPS_KEY]: 'stale' });

  const result = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' },
    adapter: createAdapter({
      unlinkSync(filePath) {
        if (filePath === tempStorageFilePath) {
          throw Object.assign(new Error('blocked'), { code: 'EPERM' });
        }

        return defaultNfStorageFileAdapter.unlinkSync(filePath);
      }
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'TEMP_CLEANUP_FAILED');
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'old' });
});

test('previous.tmp cleanup failure stops write before current replacement', (t) => {
  const { storageFilePath, previousTempStorageFilePath } = createTempStoragePath(t);

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'old' });
  writeSchemaStorage(previousTempStorageFilePath, { [GROUPS_KEY]: 'stale-previous-temp' });

  const result = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' },
    adapter: createAdapter({
      unlinkSync(filePath) {
        if (filePath === previousTempStorageFilePath) {
          throw Object.assign(new Error('blocked'), { code: 'EPERM' });
        }

        return defaultNfStorageFileAdapter.unlinkSync(filePath);
      }
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'PREVIOUS_PREPARE_FAILED');
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'old' });
});

test('tmp write, fsync, and verify failures keep current storage unchanged and clean tmp', (t) => {
  const { storageFilePath, tempStorageFilePath } = createTempStoragePath(t);

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'old' });

  const writeFailed = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' },
    adapter: createPathFailureAdapter({ failWritePath: tempStorageFilePath })
  });

  assert.equal(writeFailed.ok, false);
  assert.equal(writeFailed.code, 'TEMP_WRITE_FAILED');
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'old' });
  assert.equal(existsSync(tempStorageFilePath), false);

  const syncFailed = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' },
    adapter: createPathFailureAdapter({ failSyncPath: tempStorageFilePath })
  });

  assert.equal(syncFailed.ok, false);
  assert.equal(syncFailed.code, 'TEMP_SYNC_FAILED');
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'old' });
  assert.equal(existsSync(tempStorageFilePath), false);

  const verifyFailed = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' },
    adapter: createAdapter({
      readFileSync(filePath, options) {
        if (filePath === tempStorageFilePath) {
          return '{"asset-overview-groups":"different"}';
        }

        return defaultNfStorageFileAdapter.readFileSync(filePath, options);
      }
    })
  });

  assert.equal(verifyFailed.ok, false);
  assert.equal(verifyFailed.code, 'TEMP_VERIFY_FAILED');
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'old' });
  assert.equal(existsSync(tempStorageFilePath), false);
});

test('previous prepare write, sync, close, verify, and rename failures keep current unchanged', (t) => {
  const { storageFilePath, previousStorageFilePath, previousTempStorageFilePath } =
    createTempStoragePath(t);
  const cases = [
    {
      name: 'write',
      adapter: createPathFailureAdapter({ failWritePath: previousTempStorageFilePath })
    },
    {
      name: 'sync',
      adapter: createPathFailureAdapter({ failSyncPath: previousTempStorageFilePath })
    },
    {
      name: 'close',
      adapter: createPathFailureAdapter({ failClosePath: previousTempStorageFilePath })
    },
    {
      name: 'verify',
      adapter: createAdapter({
        readFileSync(filePath, options) {
          if (filePath === previousTempStorageFilePath) {
            return '{"asset-overview-groups":"different"}';
          }

          return defaultNfStorageFileAdapter.readFileSync(filePath, options);
        }
      })
    },
    {
      name: 'rename',
      adapter: createAdapter({
        renameSync(oldPath, newPath) {
          if (oldPath === previousTempStorageFilePath && newPath === previousStorageFilePath) {
            throw Object.assign(new Error('rename failed'), { code: 'EPERM' });
          }

          return defaultNfStorageFileAdapter.renameSync(oldPath, newPath);
        }
      })
    }
  ];

  cases.forEach(({ adapter, name }) => {
    writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: `old-${name}` });
    writeSchemaStorage(previousStorageFilePath, { [GROUPS_KEY]: `previous-${name}` });

    const result = writeNfStorageFile({
      storageFilePath,
      whitelistKeys: WHITELIST_KEYS,
      items: { [GROUPS_KEY]: `new-${name}` },
      adapter
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'PREVIOUS_PREPARE_FAILED');
    assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: `old-${name}` });
    assertSchema1Storage(previousStorageFilePath, { [GROUPS_KEY]: `previous-${name}` });
    assert.equal(existsSync(previousTempStorageFilePath), false);
  });
});

test('current replacement failure leaves current and previous at the old value', (t) => {
  const { storageFilePath, tempStorageFilePath, previousStorageFilePath } =
    createTempStoragePath(t);

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'old' });

  const result = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' },
    adapter: createAdapter({
      renameSync(oldPath, newPath) {
        if (oldPath === tempStorageFilePath && newPath === storageFilePath) {
          throw Object.assign(new Error('rename failed'), { code: 'EPERM' });
        }

        return defaultNfStorageFileAdapter.renameSync(oldPath, newPath);
      }
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'FINAL_REPLACE_FAILED');
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'old' });
  assertSchema1Storage(previousStorageFilePath, { [GROUPS_KEY]: 'old' });
  assert.equal(existsSync(tempStorageFilePath), false);
});

test('final verify one-time read failure restores previous and reports save failure', (t) => {
  const { storageFilePath, tempStorageFilePath, previousStorageFilePath } =
    createTempStoragePath(t);
  let currentReplaceCount = 0;
  let failedFinalRead = false;

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'old' });

  const result = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' },
    adapter: createAdapter({
      renameSync(oldPath, newPath) {
        defaultNfStorageFileAdapter.renameSync(oldPath, newPath);

        if (oldPath === tempStorageFilePath && newPath === storageFilePath) {
          currentReplaceCount += 1;
        }
      },
      readFileSync(filePath, options) {
        if (filePath === storageFilePath && currentReplaceCount === 1 && !failedFinalRead) {
          failedFinalRead = true;
          throw Object.assign(new Error('final read failed'), { code: 'EIO' });
        }

        return defaultNfStorageFileAdapter.readFileSync(filePath, options);
      }
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'FINAL_VERIFY_FAILED_RECOVERED');
  assert.equal(result.recovered, true);
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'old' });
  assertSchema1Storage(previousStorageFilePath, { [GROUPS_KEY]: 'old' });
  assert.equal(currentReplaceCount, 2);
});

test('final verify detects corrupted replacement and restores previous', (t) => {
  const { storageFilePath, tempStorageFilePath, previousStorageFilePath } =
    createTempStoragePath(t);
  let shouldCorruptCurrentReplace = true;

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'old' });

  const result = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' },
    adapter: createAdapter({
      renameSync(oldPath, newPath) {
        defaultNfStorageFileAdapter.renameSync(oldPath, newPath);

        if (
          shouldCorruptCurrentReplace &&
          oldPath === tempStorageFilePath &&
          newPath === storageFilePath
        ) {
          shouldCorruptCurrentReplace = false;
          writeInvalidStorage(storageFilePath);
        }
      }
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'FINAL_VERIFY_FAILED_RECOVERED');
  assertSchema1Storage(storageFilePath, { [GROUPS_KEY]: 'old' });
  assertSchema1Storage(previousStorageFilePath, { [GROUPS_KEY]: 'old' });
});

test('final verify recovery failures report serious failure and preserve previous', (t) => {
  const { storageFilePath, tempStorageFilePath, previousStorageFilePath } =
    createTempStoragePath(t);
  const fdPaths = new Map<number, string>();
  let tempOpenCount = 0;
  let recoveryTempFd: number | null = null;
  let currentReplaceCount = 0;
  let failedFinalRead = false;

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'old' });

  const writeFailure = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' },
    adapter: createAdapter({
      openSync(filePath, flags, mode) {
        const fd = defaultNfStorageFileAdapter.openSync(filePath, flags, mode);
        fdPaths.set(fd, String(filePath));

        if (filePath === tempStorageFilePath) {
          tempOpenCount += 1;

          if (tempOpenCount === 2) {
            recoveryTempFd = fd;
          }
        }

        return fd;
      },
      writeSync(fd, ...args) {
        if (fd === recoveryTempFd) {
          throw Object.assign(new Error('recovery write failed'), { code: 'EIO' });
        }

        return defaultNfStorageFileAdapter.writeSync(fd, ...args);
      },
      closeSync(fd) {
        fdPaths.delete(fd);
        return defaultNfStorageFileAdapter.closeSync(fd);
      },
      renameSync(oldPath, newPath) {
        defaultNfStorageFileAdapter.renameSync(oldPath, newPath);

        if (oldPath === tempStorageFilePath && newPath === storageFilePath) {
          currentReplaceCount += 1;
        }
      },
      readFileSync(filePath, options) {
        if (filePath === storageFilePath && currentReplaceCount === 1 && !failedFinalRead) {
          failedFinalRead = true;
          throw Object.assign(new Error('final read failed'), { code: 'EIO' });
        }

        return defaultNfStorageFileAdapter.readFileSync(filePath, options);
      }
    })
  });

  assert.equal(writeFailure.ok, false);
  assert.equal(writeFailure.code, 'FINAL_VERIFY_FAILED_RECOVERY_FAILED');
  assert.equal(writeFailure.recovered, false);
  assertSchema1Storage(previousStorageFilePath, { [GROUPS_KEY]: 'old' });
  assert.equal(existsSync(tempStorageFilePath), false);

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'old' });
  currentReplaceCount = 0;
  failedFinalRead = false;

  const renameFailure = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: { [GROUPS_KEY]: 'new' },
    adapter: createAdapter({
      renameSync(oldPath, newPath) {
        if (oldPath === tempStorageFilePath && newPath === storageFilePath) {
          currentReplaceCount += 1;

          if (currentReplaceCount === 2) {
            throw Object.assign(new Error('recovery rename failed'), { code: 'EPERM' });
          }
        }

        return defaultNfStorageFileAdapter.renameSync(oldPath, newPath);
      },
      readFileSync(filePath, options) {
        if (filePath === storageFilePath && currentReplaceCount === 1 && !failedFinalRead) {
          failedFinalRead = true;
          throw Object.assign(new Error('final read failed'), { code: 'EIO' });
        }

        return defaultNfStorageFileAdapter.readFileSync(filePath, options);
      }
    })
  });

  assert.equal(renameFailure.ok, false);
  assert.equal(renameFailure.code, 'FINAL_VERIFY_FAILED_RECOVERY_FAILED');
  assertSchema1Storage(previousStorageFilePath, { [GROUPS_KEY]: 'old' });
});

test('100 consecutive writes leave schema 1 current at 100 and previous at 99', (t) => {
  const paths = createTempStoragePath(t);

  for (let index = 1; index <= 100; index += 1) {
    const result = writeNfStorageFile({
      storageFilePath: paths.storageFilePath,
      whitelistKeys: WHITELIST_KEYS,
      items: { [GROUPS_KEY]: `write-${index}` }
    });

    assert.deepEqual(result, { ok: true });
  }

  assertSchema1Storage(paths.storageFilePath, {
    [GROUPS_KEY]: 'write-100'
  });
  assertSchema1Storage(paths.previousStorageFilePath, {
    [GROUPS_KEY]: 'write-99'
  });
  assert.equal(existsSync(paths.tempStorageFilePath), false);
  assert.equal(existsSync(paths.previousTempStorageFilePath), false);
});

test('storage error logs omit storage payload content', (t) => {
  const { storageFilePath, tempStorageFilePath } = createTempStoragePath(t);
  const logEntries: string[] = [];
  const logger: NfStorageLogger = {
    error(message, details) {
      logEntries.push(`${message} ${JSON.stringify(details)}`);
    }
  };
  let didRename = false;

  writeSchemaStorage(storageFilePath, { [GROUPS_KEY]: 'old' });

  const result = writeNfStorageFile({
    storageFilePath,
    whitelistKeys: WHITELIST_KEYS,
    items: {
      [GROUPS_KEY]: '[{"name":"Private Account","amount":123456.78}]'
    },
    logger,
    adapter: createAdapter({
      renameSync(oldPath, newPath) {
        defaultNfStorageFileAdapter.renameSync(oldPath, newPath);

        if (oldPath === tempStorageFilePath && newPath === storageFilePath) {
          didRename = true;
        }
      },
      readFileSync(filePath, options) {
        if (didRename && filePath === storageFilePath) {
          return serializeNfStorageDocument({ [GROUPS_KEY]: 'tampered' });
        }

        return defaultNfStorageFileAdapter.readFileSync(filePath, options);
      }
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'FINAL_VERIFY_FAILED_RECOVERY_FAILED');
  assert.equal(logEntries.some((entry) => entry.includes('Private Account')), false);
  assert.equal(logEntries.some((entry) => entry.includes('123456.78')), false);
  assert.equal(logEntries.some((entry) => entry.includes(GROUPS_KEY)), false);
});

test('IPC input sanitizing still drops unknown keys and non-string values', () => {
  assert.deepEqual(
    sanitizeNfStorageItems(
      {
        [GROUPS_KEY]: '[]',
        'unknown-key': 'value',
        [GLOBAL_SETTINGS_KEY]: { themeMode: 'dark' }
      },
      WHITELIST_KEYS
    ),
    {
      [GROUPS_KEY]: '[]'
    }
  );
});
