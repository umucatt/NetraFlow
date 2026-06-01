import {
  ACCOUNTS_STORAGE_KEY,
  BACKUP_RECORDS_STORAGE_KEY,
  GROUPS_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  NF_STORAGE_WHITELIST_KEYS,
  type NfStorageKey,
  isNfStorageKey
} from './storageKeys';

export type NfStorageItems = Partial<Record<NfStorageKey, string>>;

export type NfStorageMigrationResult = {
  migratedKeys: string[];
  skippedExistingKeys: string[];
  skippedNonWhitelistKeys: string[];
  skippedExampleKeys: string[];
};

type NfStorageBridge = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  key: (index: number) => string | null;
  length: () => number;
  getAllItems: () => Record<string, string>;
  migrateLegacyItems: (items: Record<string, string>) => NfStorageMigrationResult;
};

const USER_DATA_JSON_KEYS = new Set<string>([
  GROUPS_STORAGE_KEY,
  ACCOUNTS_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  BACKUP_RECORDS_STORAGE_KEY
]);

const getBridge = () =>
  typeof window === 'undefined' ? undefined : window.netraflowStorage;

const getLocalStorageFallback = () =>
  typeof window === 'undefined' ? undefined : window.localStorage;

const valueContainsExampleData = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value.startsWith('example-');
  }

  if (Array.isArray(value)) {
    return value.some(valueContainsExampleData);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(valueContainsExampleData);
  }

  return false;
};

export const isExampleStorageEntry = (key: string, value: string) => {
  if (!USER_DATA_JSON_KEYS.has(key)) {
    return false;
  }

  try {
    return valueContainsExampleData(JSON.parse(value));
  } catch {
    return false;
  }
};

export const collectMigratableLegacyItems = (
  legacyItems: Record<string, string | null>,
  existingItems: Record<string, string | null> = {}
) => {
  const nextItems: Record<string, string> = {};
  const skippedExistingKeys: string[] = [];
  const skippedNonWhitelistKeys: string[] = [];
  const skippedExampleKeys: string[] = [];

  Object.entries(legacyItems).forEach(([key, value]) => {
    if (!isNfStorageKey(key)) {
      skippedNonWhitelistKeys.push(key);
      return;
    }

    if (value === null) {
      return;
    }

    if (existingItems[key] !== undefined && existingItems[key] !== null) {
      skippedExistingKeys.push(key);
      return;
    }

    if (isExampleStorageEntry(key, value)) {
      skippedExampleKeys.push(key);
      return;
    }

    nextItems[key] = value;
  });

  return {
    items: nextItems,
    migratedKeys: Object.keys(nextItems),
    skippedExistingKeys,
    skippedNonWhitelistKeys,
    skippedExampleKeys
  };
};

const getLegacyLocalStorageItems = () => {
  const legacyStorage = getLocalStorageFallback();

  if (!legacyStorage) {
    return {};
  }

  return Array.from({ length: legacyStorage.length }, (_, index) => legacyStorage.key(index))
    .filter((key): key is string => typeof key === 'string')
    .reduce<Record<string, string | null>>((items, key) => {
      items[key] = legacyStorage.getItem(key);
      return items;
    }, {});
};

const migrateLegacyItemsWithoutBridge = (
  items: Record<string, string | null>
): NfStorageMigrationResult => {
  const legacyStorage = getLocalStorageFallback();

  if (!legacyStorage) {
    return {
      migratedKeys: [],
      skippedExistingKeys: [],
      skippedNonWhitelistKeys: Object.keys(items),
      skippedExampleKeys: []
    };
  }

  const existingItems = NF_STORAGE_WHITELIST_KEYS.reduce<Record<string, string | null>>(
    (snapshot, key) => {
      snapshot[key] = legacyStorage.getItem(key);
      return snapshot;
    },
    {}
  );
  const migration = collectMigratableLegacyItems(items, existingItems);

  Object.entries(migration.items).forEach(([key, value]) => {
    legacyStorage.setItem(key, value);
  });

  return {
    migratedKeys: migration.migratedKeys,
    skippedExistingKeys: migration.skippedExistingKeys,
    skippedNonWhitelistKeys: migration.skippedNonWhitelistKeys,
    skippedExampleKeys: migration.skippedExampleKeys
  };
};

export const migrateLegacyLocalStorageToNfStorage = () => {
  const legacyItems = getLegacyLocalStorageItems();
  const bridge = getBridge();

  if (bridge) {
    const migration = bridge.migrateLegacyItems(
      Object.entries(legacyItems).reduce<Record<string, string>>((items, [key, value]) => {
        if (value !== null) {
          items[key] = value;
        }

        return items;
      }, {})
    );

    NF_STORAGE_WHITELIST_KEYS.forEach((key) => {
      getLocalStorageFallback()?.removeItem(key);
    });

    return migration;
  }

  return migrateLegacyItemsWithoutBridge(legacyItems);
};

export const nfStorage = {
  get length() {
    const bridge = getBridge();

    if (bridge) {
      return bridge.length();
    }

    return NF_STORAGE_WHITELIST_KEYS.filter(
      (key) => getLocalStorageFallback()?.getItem(key) !== null
    ).length;
  },

  key(index: number) {
    const bridge = getBridge();

    if (bridge) {
      return bridge.key(index);
    }

    return NF_STORAGE_WHITELIST_KEYS.filter(
      (key) => getLocalStorageFallback()?.getItem(key) !== null
    )[index] ?? null;
  },

  getItem(key: string) {
    if (!isNfStorageKey(key)) {
      return null;
    }

    return getBridge()?.getItem(key) ?? getLocalStorageFallback()?.getItem(key) ?? null;
  },

  setItem(key: string, value: string) {
    if (!isNfStorageKey(key)) {
      throw new Error(`NF storage key is not whitelisted: ${key}`);
    }

    const bridge = getBridge();

    if (bridge) {
      bridge.setItem(key, value);
      return;
    }

    getLocalStorageFallback()?.setItem(key, value);
  },

  removeItem(key: string) {
    if (!isNfStorageKey(key)) {
      return;
    }

    const bridge = getBridge();

    if (bridge) {
      bridge.removeItem(key);
      return;
    }

    getLocalStorageFallback()?.removeItem(key);
  },

  getAllItems(): NfStorageItems {
    const bridge = getBridge();

    if (bridge) {
      return bridge.getAllItems() as NfStorageItems;
    }

    return NF_STORAGE_WHITELIST_KEYS.reduce<NfStorageItems>((items, key) => {
      const value = getLocalStorageFallback()?.getItem(key);

      if (value !== null && value !== undefined) {
        items[key] = value;
      }

      return items;
    }, {});
  }
};
