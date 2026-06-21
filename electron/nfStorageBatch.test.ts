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
  defaultNfStorageFileAdapter,
  getNfStorageFilePath,
  getNfStoragePreviousFilePath,
  getNfStoragePreviousTempFilePath,
  getNfStorageTempFilePath,
  readNfStorageFile,
  writeNfStorageFile,
  type NfStorageItems,
  type NfStorageFileAdapter,
  type StorageReadResult,
  type StorageWriteResult
} from './storageFile.js';
import {
  setNfStorageBatchItems,
  validateNfStorageBatchItems
} from './nfStorageBatch.js';

const GROUPS_KEY = 'asset-overview-groups';
const ACCOUNTS_KEY = 'asset-overview-accounts';
const HISTORY_KEY = 'asset-overview-history';

const WHITELIST_KEYS = [
  GROUPS_KEY,
  ACCOUNTS_KEY,
  HISTORY_KEY,
  'netraflowGlobalSettings'
] as const;

const createTempStoragePath = (t: TestContext) => {
  const directoryPath = mkdtempSync(path.join(tmpdir(), 'netraflow-batch-'));
  const storageFilePath = getNfStorageFilePath(directoryPath);

  t.after(() => {
    rmSync(directoryPath, { recursive: true, force: true });
  });

  return {
    storageFilePath,
    tempStorageFilePath: getNfStorageTempFilePath(storageFilePath),
    previousStorageFilePath: getNfStoragePreviousFilePath(storageFilePath),
    previousTempStorageFilePath: getNfStoragePreviousTempFilePath(storageFilePath)
  };
};

const writeRawStorage = (storageFilePath: string, value: unknown) => {
  writeFileSync(storageFilePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const readStorageJson = (storageFilePath: string) =>
  JSON.parse(readFileSync(storageFilePath, 'utf8')) as Record<string, unknown>;

const writeLegacyStorage = (storageFilePath: string, items: NfStorageItems) => {
  writeRawStorage(storageFilePath, items);
};

const writeSchemaStorage = (
  storageFilePath: string,
  items: NfStorageItems,
  schemaVersion = 1
) => {
  writeRawStorage(storageFilePath, { schemaVersion, items });
};

const assertSchema1Storage = (storageFilePath: string, expectedItems: NfStorageItems) => {
  const value = readStorageJson(storageFilePath);

  assert.deepEqual(Object.keys(value).sort(), ['items', 'schemaVersion']);
  assert.equal(value.schemaVersion, 1);
  assert.deepEqual(value.items, expectedItems);
};

const assertLegacyStorage = (storageFilePath: string, expectedItems: NfStorageItems) => {
  assert.deepEqual(readStorageJson(storageFilePath), expectedItems);
};

const snapshotFiles = ({
  storageFilePath,
  tempStorageFilePath,
  previousStorageFilePath,
  previousTempStorageFilePath
}: ReturnType<typeof createTempStoragePath>) => ({
  current: existsSync(storageFilePath) ? readFileSync(storageFilePath, 'utf8') : null,
  tmp: existsSync(tempStorageFilePath) ? readFileSync(tempStorageFilePath, 'utf8') : null,
  previous: existsSync(previousStorageFilePath)
    ? readFileSync(previousStorageFilePath, 'utf8')
    : null,
  previousTmp: existsSync(previousTempStorageFilePath)
    ? readFileSync(previousTempStorageFilePath, 'utf8')
    : null
});

const createAdapter = (
  overrides: Partial<NfStorageFileAdapter> = {}
): NfStorageFileAdapter => ({
  ...defaultNfStorageFileAdapter,
  ...overrides
});

const createStorageDependencies = ({
  storageFilePath,
  adapter
}: {
  storageFilePath: string;
  adapter?: NfStorageFileAdapter;
}) => {
  let readCount = 0;
  let writeCount = 0;

  return {
    dependencies: {
      whitelistKeys: WHITELIST_KEYS,
      readItems: (): StorageReadResult => {
        readCount += 1;
        return readNfStorageFile({ storageFilePath, whitelistKeys: WHITELIST_KEYS });
      },
      writeItems: (items: Record<string, unknown>): StorageWriteResult => {
        writeCount += 1;
        return writeNfStorageFile({
          storageFilePath,
          whitelistKeys: WHITELIST_KEYS,
          items,
          adapter
        });
      }
    },
    getReadCount: () => readCount,
    getWriteCount: () => writeCount
  };
};

test('strict batch validation rejects unsupported, unsafe, and unreadable input', () => {
  const unsafePayload = Object.create(null) as Record<string, unknown>;
  unsafePayload.__proto__ = 'pollute';
  const throwingPayload = {};

  Object.defineProperty(throwingPayload, GROUPS_KEY, {
    enumerable: true,
    get() {
      throw new Error('getter failed');
    }
  });

  [
    null,
    [],
    { 'unknown-key': 'value' },
    { [GROUPS_KEY]: [] },
    unsafePayload,
    { prototype: 'value' },
    { constructor: 'value' },
    throwingPayload
  ].forEach((payload) => {
    const result = validateNfStorageBatchItems(payload, WHITELIST_KEYS);

    assert.equal(result.ok, false);
    assert.equal(result.code, 'INVALID_BATCH');
  });
});

test('empty batch is a successful no-op without reading or writing storage', (t) => {
  const { storageFilePath } = createTempStoragePath(t);
  const storage = createStorageDependencies({ storageFilePath });

  assert.deepEqual(setNfStorageBatchItems({}, storage.dependencies), { ok: true });
  assert.equal(storage.getReadCount(), 0);
  assert.equal(storage.getWriteCount(), 0);
  assert.equal(existsSync(storageFilePath), false);
});

test('valid batch reads current storage once, writes once, and updates all core keys', (t) => {
  const { storageFilePath, tempStorageFilePath } = createTempStoragePath(t);
  const storage = createStorageDependencies({ storageFilePath });

  writeLegacyStorage(storageFilePath, {
    [GROUPS_KEY]: 'groups-A',
    [ACCOUNTS_KEY]: 'accounts-A',
    [HISTORY_KEY]: 'history-A'
  });

  assert.deepEqual(
    setNfStorageBatchItems(
      {
        [GROUPS_KEY]: 'groups-B',
        [ACCOUNTS_KEY]: 'accounts-B',
        [HISTORY_KEY]: 'history-B'
      },
      storage.dependencies
    ),
    { ok: true }
  );
  assert.equal(storage.getReadCount(), 1);
  assert.equal(storage.getWriteCount(), 1);
  assertSchema1Storage(storageFilePath, {
    [GROUPS_KEY]: 'groups-B',
    [ACCOUNTS_KEY]: 'accounts-B',
    [HISTORY_KEY]: 'history-B'
  });
  assert.equal(existsSync(tempStorageFilePath), false);
});

test('invalid batch never partially accepts valid keys', (t) => {
  const { storageFilePath } = createTempStoragePath(t);
  const storage = createStorageDependencies({ storageFilePath });

  writeLegacyStorage(storageFilePath, {
    [GROUPS_KEY]: 'groups-A',
    [ACCOUNTS_KEY]: 'accounts-A',
    [HISTORY_KEY]: 'history-A'
  });

  const result = setNfStorageBatchItems(
    {
      [GROUPS_KEY]: 'groups-B',
      'unknown-key': 'value'
    },
    storage.dependencies
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, 'INVALID_BATCH');
  assert.equal(storage.getReadCount(), 0);
  assert.equal(storage.getWriteCount(), 0);
  assertLegacyStorage(storageFilePath, {
    [GROUPS_KEY]: 'groups-A',
    [ACCOUNTS_KEY]: 'accounts-A',
    [HISTORY_KEY]: 'history-A'
  });
});

test('read and write storage errors propagate as structured batch results', (t) => {
  const { storageFilePath } = createTempStoragePath(t);
  const writeOnlyStorage = createStorageDependencies({ storageFilePath });

  writeFileSync(storageFilePath, '{', 'utf8');

  const readFailure = setNfStorageBatchItems(
    { [GROUPS_KEY]: 'groups-B' },
    writeOnlyStorage.dependencies
  );

  assert.equal(readFailure.ok, false);
  assert.equal(readFailure.code, 'STORAGE_UNRECOVERABLE');
  assert.equal(writeOnlyStorage.getReadCount(), 1);
  assert.equal(writeOnlyStorage.getWriteCount(), 0);

  writeLegacyStorage(storageFilePath, {
    [GROUPS_KEY]: 'groups-A',
    [ACCOUNTS_KEY]: 'accounts-A',
    [HISTORY_KEY]: 'history-A'
  });

  const failingWriteStorage = createStorageDependencies({
    storageFilePath,
    adapter: createAdapter({
      writeSync() {
        throw Object.assign(new Error('write failed'), { code: 'EIO' });
      }
    })
  });
  const writeFailure = setNfStorageBatchItems(
    {
      [GROUPS_KEY]: 'groups-B',
      [ACCOUNTS_KEY]: 'accounts-B',
      [HISTORY_KEY]: 'history-B'
    },
    failingWriteStorage.dependencies
  );

  assert.equal(writeFailure.ok, false);
  assert.equal(writeFailure.code, 'TEMP_WRITE_FAILED');
  assert.equal(failingWriteStorage.getReadCount(), 1);
  assert.equal(failingWriteStorage.getWriteCount(), 1);
  assertLegacyStorage(storageFilePath, {
    [GROUPS_KEY]: 'groups-A',
    [ACCOUNTS_KEY]: 'accounts-A',
    [HISTORY_KEY]: 'history-A'
  });
});

test('future current batch write fails without touching any storage file', (t) => {
  const paths = createTempStoragePath(t);
  const storage = createStorageDependencies({ storageFilePath: paths.storageFilePath });

  writeSchemaStorage(paths.storageFilePath, { [GROUPS_KEY]: 'future-current' }, 2);
  writeSchemaStorage(paths.tempStorageFilePath, { [GROUPS_KEY]: 'tmp' });
  writeSchemaStorage(paths.previousStorageFilePath, { [GROUPS_KEY]: 'previous' });
  writeSchemaStorage(paths.previousTempStorageFilePath, { [GROUPS_KEY]: 'previous-tmp' });
  const before = snapshotFiles(paths);

  const result = setNfStorageBatchItems(
    {
      [GROUPS_KEY]: 'groups-B',
      [ACCOUNTS_KEY]: 'accounts-B',
      [HISTORY_KEY]: 'history-B'
    },
    storage.dependencies
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, 'STORAGE_SCHEMA_FUTURE');
  assert.equal(storage.getReadCount(), 1);
  assert.equal(storage.getWriteCount(), 0);
  assert.deepEqual(snapshotFiles(paths), before);
});

test('consecutive batch writes leave the final complete core state', (t) => {
  const { storageFilePath } = createTempStoragePath(t);
  const storage = createStorageDependencies({ storageFilePath });

  ['A', 'B', 'C'].forEach((version) => {
    assert.deepEqual(
      setNfStorageBatchItems(
        {
          [GROUPS_KEY]: `groups-${version}`,
          [ACCOUNTS_KEY]: `accounts-${version}`,
          [HISTORY_KEY]: `history-${version}`
        },
        storage.dependencies
      ),
      { ok: true }
    );
  });

  assert.equal(storage.getReadCount(), 3);
  assert.equal(storage.getWriteCount(), 3);
  assertSchema1Storage(storageFilePath, {
    [GROUPS_KEY]: 'groups-C',
    [ACCOUNTS_KEY]: 'accounts-C',
    [HISTORY_KEY]: 'history-C'
  });
});
