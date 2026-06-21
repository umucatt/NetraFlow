import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCOUNTS_STORAGE_KEY,
  AUTO_BACKUP_SETTINGS_STORAGE_KEY,
  BACKUP_RECORDS_STORAGE_KEY,
  CHART_SETTINGS_STORAGE_KEY,
  FIRST_WELCOME_STORAGE_KEY,
  FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY,
  GLOBAL_SETTINGS_STORAGE_KEY,
  GROUPS_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY,
  LAST_BACKUP_STORAGE_KEY,
  LEGACY_ACCOUNTS_STORAGE_KEY,
  LEGACY_ACCOUNT_TYPES_STORAGE_KEY,
  LEGACY_ARCHIVED_ACCOUNTS_STORAGE_KEY,
  LEGACY_DELETED_RECORDS_STORAGE_KEY,
  LEGACY_HISTORY_STORAGE_KEY,
  MIGRATION_BACKUP_STORAGE_KEY,
  NF_STORAGE_WHITELIST_KEYS,
  ROLLUP_IMPORT_HASHES_STORAGE_KEY,
  SNAPSHOT_IMPORT_RECORDS_STORAGE_KEY,
  isNfStorageKey
} from './storageKeys';
import {
  collectMigratableLegacyItems,
  isExampleStorageEntry,
  migrateLegacyLocalStorageToNfStorage,
  nfStorage
} from './nfStorage';

test('NF storage whitelist contains every persisted user data key', () => {
  assert.deepEqual(NF_STORAGE_WHITELIST_KEYS, [
    GROUPS_STORAGE_KEY,
    ACCOUNTS_STORAGE_KEY,
    HISTORY_STORAGE_KEY,
    LAST_BACKUP_STORAGE_KEY,
    LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY,
    BACKUP_RECORDS_STORAGE_KEY,
    SNAPSHOT_IMPORT_RECORDS_STORAGE_KEY,
    AUTO_BACKUP_SETTINGS_STORAGE_KEY,
    FORCE_AUTO_BACKUP_DUE_ONCE_STORAGE_KEY,
    CHART_SETTINGS_STORAGE_KEY,
    GLOBAL_SETTINGS_STORAGE_KEY,
    FIRST_WELCOME_STORAGE_KEY,
    ROLLUP_IMPORT_HASHES_STORAGE_KEY,
    MIGRATION_BACKUP_STORAGE_KEY,
    LEGACY_ACCOUNTS_STORAGE_KEY,
    LEGACY_ACCOUNT_TYPES_STORAGE_KEY,
    LEGACY_HISTORY_STORAGE_KEY,
    LEGACY_ARCHIVED_ACCOUNTS_STORAGE_KEY,
    LEGACY_DELETED_RECORDS_STORAGE_KEY
  ]);
  assert.equal(isNfStorageKey(GLOBAL_SETTINGS_STORAGE_KEY), true);
  assert.equal(isNfStorageKey('Cache'), false);
  assert.equal(isNfStorageKey('Code Cache'), false);
  assert.equal(isNfStorageKey('random-test-key'), false);
});

test('legacy localStorage migration keeps whitelist keys and rejects non-whitelist keys', () => {
  const migration = collectMigratableLegacyItems({
    [GROUPS_STORAGE_KEY]: '[{"id":"group-1","name":"现金"}]',
    [GLOBAL_SETTINGS_STORAGE_KEY]: '{"themeMode":"dark"}',
    'not-netraflow': 'keep out'
  });

  assert.deepEqual(migration.items, {
    [GROUPS_STORAGE_KEY]: '[{"id":"group-1","name":"现金"}]',
    [GLOBAL_SETTINGS_STORAGE_KEY]: '{"themeMode":"dark"}'
  });
  assert.deepEqual(migration.migratedKeys, [GROUPS_STORAGE_KEY, GLOBAL_SETTINGS_STORAGE_KEY]);
  assert.deepEqual(migration.skippedNonWhitelistKeys, ['not-netraflow']);
});

test('legacy localStorage migration never overwrites existing NF storage values', () => {
  const migration = collectMigratableLegacyItems(
    {
      [GLOBAL_SETTINGS_STORAGE_KEY]: '{"themeMode":"light"}',
      [CHART_SETTINGS_STORAGE_KEY]: '{"categoryVisibility":{"showTrend":false}}'
    },
    {
      [GLOBAL_SETTINGS_STORAGE_KEY]: '{"themeMode":"dark"}'
    }
  );

  assert.deepEqual(migration.items, {
    [CHART_SETTINGS_STORAGE_KEY]: '{"categoryVisibility":{"showTrend":false}}'
  });
  assert.deepEqual(migration.skippedExistingKeys, [GLOBAL_SETTINGS_STORAGE_KEY]);
});

test('legacy localStorage migration is idempotent when repeated', () => {
  const firstMigration = collectMigratableLegacyItems({
    [LAST_BACKUP_STORAGE_KEY]: '2026-05-30T00:00:00.000Z'
  });
  const secondMigration = collectMigratableLegacyItems(
    {
      [LAST_BACKUP_STORAGE_KEY]: '2026-05-30T00:00:00.000Z'
    },
    firstMigration.items
  );

  assert.deepEqual(firstMigration.migratedKeys, [LAST_BACKUP_STORAGE_KEY]);
  assert.deepEqual(secondMigration.items, {});
  assert.deepEqual(secondMigration.skippedExistingKeys, [LAST_BACKUP_STORAGE_KEY]);
});

test('legacy localStorage migration does not migrate example data payloads', () => {
  const exampleGroups = JSON.stringify([
    { id: 'example-light-cash', name: '示例现金', sortOrder: 0 }
  ]);
  const migration = collectMigratableLegacyItems({
    [GROUPS_STORAGE_KEY]: exampleGroups,
    [GLOBAL_SETTINGS_STORAGE_KEY]: '{"themeMode":"dark"}'
  });

  assert.equal(isExampleStorageEntry(GROUPS_STORAGE_KEY, exampleGroups), true);
  assert.deepEqual(migration.items, {
    [GLOBAL_SETTINGS_STORAGE_KEY]: '{"themeMode":"dark"}'
  });
  assert.deepEqual(migration.skippedExampleKeys, [GROUPS_STORAGE_KEY]);
});

test('Electron bridge migration clears staged legacy localStorage whitelist keys', () => {
  const localItems = new Map<string, string>([
    [GROUPS_STORAGE_KEY, '[{"id":"group-1","name":"现金"}]'],
    ['not-netraflow', 'keep']
  ]);
  const migratedPayloads: Array<Record<string, string>> = [];
  const testWindow = {
    localStorage: {
      get length() {
        return localItems.size;
      },
      key(index: number) {
        return Array.from(localItems.keys())[index] ?? null;
      },
      getItem(key: string) {
        return localItems.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        localItems.set(key, value);
      },
      removeItem(key: string) {
        localItems.delete(key);
      }
    },
    netraflowStorage: {
      getItem: () => null,
      setItem: () => undefined,
      setItems: () => undefined,
      removeItem: () => undefined,
      key: () => null,
      length: () => 0,
      getAllItems: () => ({}),
      migrateLegacyItems: (items: Record<string, string>) => {
        migratedPayloads.push(items);

        return {
          migratedKeys: Object.keys(items).filter((key) => isNfStorageKey(key)),
          skippedExistingKeys: [],
          skippedNonWhitelistKeys: Object.keys(items).filter((key) => !isNfStorageKey(key)),
          skippedExampleKeys: []
        };
      }
    }
  };
  const globalWithWindow = globalThis as unknown as { window?: typeof testWindow };

  globalWithWindow.window = testWindow;

  try {
    const migration = migrateLegacyLocalStorageToNfStorage();

    assert.deepEqual(migratedPayloads, [
      {
        [GROUPS_STORAGE_KEY]: '[{"id":"group-1","name":"现金"}]',
        'not-netraflow': 'keep'
      }
    ]);
    assert.deepEqual(migration.migratedKeys, [GROUPS_STORAGE_KEY]);
    assert.equal(localItems.has(GROUPS_STORAGE_KEY), false);
    assert.equal(localItems.get('not-netraflow'), 'keep');
  } finally {
    delete globalWithWindow.window;
  }
});

test('Electron bridge storage errors propagate through the renderer adapter', () => {
  const storageError = Object.assign(new Error('Storage failed'), {
    name: 'NfStorageError',
    code: 'STORAGE_READ_INVALID'
  });
  const testWindow = {
    netraflowStorage: {
      getItem: () => {
        throw storageError;
      },
      setItem: () => {
        throw storageError;
      },
      setItems: () => {
        throw storageError;
      },
      removeItem: () => {
        throw storageError;
      },
      key: () => null,
      length: () => 0,
      getAllItems: () => {
        throw storageError;
      },
      migrateLegacyItems: () => ({
        migratedKeys: [],
        skippedExistingKeys: [],
        skippedNonWhitelistKeys: [],
        skippedExampleKeys: []
      })
    }
  };
  const globalWithWindow = globalThis as unknown as { window?: typeof testWindow };

  globalWithWindow.window = testWindow;

  try {
    assert.throws(() => nfStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, '{}'), {
      name: 'NfStorageError',
      code: 'STORAGE_READ_INVALID'
    });
    assert.throws(() => nfStorage.setItems({ [GLOBAL_SETTINGS_STORAGE_KEY]: '{}' }), {
      name: 'NfStorageError',
      code: 'STORAGE_READ_INVALID'
    });
    assert.throws(() => nfStorage.removeItem(GLOBAL_SETTINGS_STORAGE_KEY), {
      name: 'NfStorageError',
      code: 'STORAGE_READ_INVALID'
    });
    assert.throws(() => nfStorage.getAllItems(), {
      name: 'NfStorageError',
      code: 'STORAGE_READ_INVALID'
    });
    assert.throws(() => nfStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY), {
      name: 'NfStorageError',
      code: 'STORAGE_READ_INVALID'
    });
  } finally {
    delete globalWithWindow.window;
  }
});

test('renderer adapter preserves future schema storage errors', () => {
  const storageError = Object.assign(new Error('Future schema'), {
    name: 'NfStorageError',
    code: 'STORAGE_SCHEMA_FUTURE'
  });
  const testWindow = {
    netraflowStorage: {
      getItem: () => {
        throw storageError;
      },
      setItem: () => {
        throw storageError;
      },
      setItems: () => {
        throw storageError;
      },
      removeItem: () => {
        throw storageError;
      },
      key: () => null,
      length: () => 0,
      getAllItems: () => {
        throw storageError;
      },
      migrateLegacyItems: () => {
        throw storageError;
      }
    }
  };
  const globalWithWindow = globalThis as unknown as { window?: typeof testWindow };

  globalWithWindow.window = testWindow;

  try {
    [
      () => nfStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, '{}'),
      () => nfStorage.setItems({ [GLOBAL_SETTINGS_STORAGE_KEY]: '{}' }),
      () => nfStorage.removeItem(GLOBAL_SETTINGS_STORAGE_KEY),
      () => nfStorage.getAllItems(),
      () => nfStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY),
      () => migrateLegacyLocalStorageToNfStorage()
    ].forEach((action) => {
      assert.throws(action, {
        name: 'NfStorageError',
        code: 'STORAGE_SCHEMA_FUTURE'
      });
    });
  } finally {
    delete globalWithWindow.window;
  }
});

test('renderer adapter setItems validates batches before bridge calls', () => {
  const payloads: Array<Record<string, string>> = [];
  const testWindow = {
    netraflowStorage: {
      getItem: () => null,
      setItem: () => undefined,
      setItems: (items: Record<string, string>) => {
        payloads.push(items);
      },
      removeItem: () => undefined,
      key: () => null,
      length: () => 0,
      getAllItems: () => ({}),
      migrateLegacyItems: () => ({
        migratedKeys: [],
        skippedExistingKeys: [],
        skippedNonWhitelistKeys: [],
        skippedExampleKeys: []
      })
    }
  };
  const globalWithWindow = globalThis as unknown as { window?: typeof testWindow };

  globalWithWindow.window = testWindow;

  try {
    nfStorage.setItems({
      [GROUPS_STORAGE_KEY]: 'groups',
      [ACCOUNTS_STORAGE_KEY]: 'accounts',
      [HISTORY_STORAGE_KEY]: 'history'
    });
    assert.deepEqual(payloads, [
      {
        [GROUPS_STORAGE_KEY]: 'groups',
        [ACCOUNTS_STORAGE_KEY]: 'accounts',
        [HISTORY_STORAGE_KEY]: 'history'
      }
    ]);

    nfStorage.setItems({});
    assert.equal(payloads.length, 1);

    assert.throws(() =>
      nfStorage.setItems({ [GROUPS_STORAGE_KEY]: 'groups', unknown: 'value' } as never)
    );
    assert.throws(() =>
      nfStorage.setItems({ [GROUPS_STORAGE_KEY]: [] } as never)
    );
    assert.equal(payloads.length, 1);
  } finally {
    delete globalWithWindow.window;
  }
});

test('localStorage fallback setItems rolls back partial writes on failure', () => {
  const localItems = new Map<string, string>([
    [GROUPS_STORAGE_KEY, 'groups-A'],
    [ACCOUNTS_STORAGE_KEY, 'accounts-A'],
    [HISTORY_STORAGE_KEY, 'history-A']
  ]);
  let shouldFailAccountsWrite = false;
  const testWindow = {
    localStorage: {
      get length() {
        return localItems.size;
      },
      key(index: number) {
        return Array.from(localItems.keys())[index] ?? null;
      },
      getItem(key: string) {
        return localItems.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        if (shouldFailAccountsWrite && key === ACCOUNTS_STORAGE_KEY) {
          throw new Error('quota exceeded');
        }

        localItems.set(key, value);
      },
      removeItem(key: string) {
        localItems.delete(key);
      }
    }
  };
  const globalWithWindow = globalThis as unknown as { window?: typeof testWindow };

  globalWithWindow.window = testWindow;

  try {
    nfStorage.setItems({
      [GROUPS_STORAGE_KEY]: 'groups-B',
      [ACCOUNTS_STORAGE_KEY]: 'accounts-B',
      [HISTORY_STORAGE_KEY]: 'history-B'
    });
    assert.equal(localItems.get(GROUPS_STORAGE_KEY), 'groups-B');
    assert.equal(localItems.get(ACCOUNTS_STORAGE_KEY), 'accounts-B');
    assert.equal(localItems.get(HISTORY_STORAGE_KEY), 'history-B');

    shouldFailAccountsWrite = true;
    assert.throws(() =>
      nfStorage.setItems({
        [GROUPS_STORAGE_KEY]: 'groups-C',
        [ACCOUNTS_STORAGE_KEY]: 'accounts-C',
        [HISTORY_STORAGE_KEY]: 'history-C'
      })
    );
    assert.equal(localItems.get(GROUPS_STORAGE_KEY), 'groups-B');
    assert.equal(localItems.get(ACCOUNTS_STORAGE_KEY), 'accounts-B');
    assert.equal(localItems.get(HISTORY_STORAGE_KEY), 'history-B');

    assert.throws(() =>
      nfStorage.setItems({ [GROUPS_STORAGE_KEY]: 'groups-D', unknown: 'value' } as never)
    );
    assert.equal(localItems.get(GROUPS_STORAGE_KEY), 'groups-B');
  } finally {
    delete globalWithWindow.window;
  }
});
