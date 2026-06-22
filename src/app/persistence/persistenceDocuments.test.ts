import assert from 'node:assert/strict';
import test from 'node:test';

import type { Account, AssetGroup, HistoryRecord } from '../types';
import { PASSWORD_HASH_ALGORITHM, PASSWORD_HASH_ITERATIONS } from '../../security/passwordHash';
import {
  createDefaultCoreDocument,
  createDefaultSettingsDocument,
  createDefaultStateDocument,
  createDefaultSecurityDocument,
  normalizeRollupImportHashes,
  normalizeSecurityDocument,
  normalizeSettingsDocument,
  normalizeStateDocument
} from './persistenceDefaults';
import {
  EXCLUDED_PERSISTENCE_FIELDS,
  PERSISTENCE_SCHEMA_VERSION,
  type CoreDocument,
  type SecurityDocument,
  type StateDocument
} from './persistenceDocuments';
import {
  isCoreDocument,
  isExcludedPersistenceField,
  isSecurityDocument,
  isSettingsDocument,
  isStateDocument
} from './persistenceValidation';

const createGroup = (overrides: Partial<AssetGroup> = {}): AssetGroup => ({
  id: 'group-1',
  name: 'Cash',
  nature: 'asset',
  includeInStats: true,
  sortOrder: 1,
  ...overrides
});

const createAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'account-1',
  groupId: 'group-1',
  name: 'Wallet',
  amount: 1200.5,
  createdAt: '2026-06-01T12:00:00.000Z',
  alias: 'cash',
  ...overrides
});

const createHistoryRecord = (
  overrides: Partial<HistoryRecord> = {}
): HistoryRecord => ({
  id: 'history-1',
  accountId: 'account-1',
  type: '淇敼' as HistoryRecord['type'],
  groupName: 'Cash',
  accountName: 'Wallet',
  beforeAmount: 1000,
  afterAmount: 1200.5,
  time: '2026-06-02T12:00:00.000Z',
  relatedTime: '2026-06-02',
  note: 'monthly note',
  source: 'rollup',
  ...overrides
});

const passwordHash = {
  algorithm: PASSWORD_HASH_ALGORITHM,
  iterations: PASSWORD_HASH_ITERATIONS,
  salt: 'salt-base64',
  hash: 'hash-base64'
} as const;

test('core contract accepts empty and current business documents', () => {
  const emptyCore = createDefaultCoreDocument();
  const core: CoreDocument = {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    groups: [createGroup()],
    accounts: [createAccount({ archived: true, archivedAt: '2026-06-03T12:00:00.000Z' })],
    history: [createHistoryRecord()]
  };

  assert.deepEqual(emptyCore, {
    schemaVersion: 1,
    groups: [],
    accounts: [],
    history: []
  });
  assert.equal(isCoreDocument(emptyCore), true);
  assert.equal(isCoreDocument(core), true);
  assert.equal(core.history[0]?.note, 'monthly note');
  assert.equal(core.history[0]?.source, 'rollup');
});

test('core contract rejects invalid amounts schema versions and mixed categories', () => {
  assert.equal(
    isCoreDocument({
      ...createDefaultCoreDocument(),
      schemaVersion: 2
    }),
    false
  );
  assert.equal(
    isCoreDocument({
      ...createDefaultCoreDocument(),
      accounts: [createAccount({ amount: Number.NaN })]
    }),
    false
  );
  assert.equal(
    isCoreDocument({
      ...createDefaultCoreDocument(),
      settings: {}
    }),
    false
  );
});

test('settings defaults are independent and exclude security state and core data', () => {
  const first = createDefaultSettingsDocument();
  const second = createDefaultSettingsDocument();

  first.autoBackup.cycle.value = 3;
  first.assetChart.categoryDetailById.group1 = {
    xAxisRange: '1m',
    pointValueMode: 'minmax'
  };

  assert.equal(second.autoBackup.cycle.value, 7);
  assert.deepEqual(second.assetChart.categoryDetailById, {});
  assert.equal(second.assetChart.l0.showStructure, true);
  assert.equal(second.assetChart.trend.adaptiveYAxis, true);
  assert.equal(second.global.themeMode, 'system');
  assert.equal(second.global.themeStyle, 'default');
  assert.equal('passwordHash' in second.global, false);
  assert.equal('nyaaThemeUnlocked' in second.global, false);
  assert.equal('groups' in second, false);
  assert.equal(isSettingsDocument(second), true);
});

test('settings normalizer restores missing fields without admitting security fields', () => {
  const normalized = normalizeSettingsDocument({
    autoBackup: { enabled: true, cycle: { value: 2, unit: 'week' }, directory: 'D:/Backup' },
    assetChart: { trend: { xAxisRange: '1y', adaptiveYAxis: false } },
    global: {
      themeMode: 'dark',
      themeStyle: 'nyaa',
      passwordProtectionEnabled: true,
      passwordHash,
      nyaaThemeUnlocked: true
    }
  });

  assert.equal(normalized.autoBackup.enabled, true);
  assert.equal(normalized.autoBackup.cycle.unit, 'week');
  assert.equal(normalized.assetChart.trend.xAxisRange, '1y');
  assert.equal(normalized.assetChart.trend.adaptiveYAxis, false);
  assert.equal(normalized.global.themeMode, 'dark');
  assert.equal(normalized.global.themeStyle, 'nyaa');
  assert.equal('passwordProtectionEnabled' in normalized.global, false);
  assert.equal('passwordHash' in normalized.global, false);
  assert.equal('nyaaThemeUnlocked' in normalized.global, false);
});

test('state contract keeps backup state rollup hashes welcome state and personalization', () => {
  const state: StateDocument = {
    schemaVersion: 1,
    backup: {
      lastBackupAt: '2026-06-10T12:00:00.000Z',
      lastBackupHistoryCount: 8,
      records: [
        {
          id: 'backup-1',
          backedUpAt: '2026-06-10T12:00:00.000Z',
          historyCount: 8,
          incrementCount: 2,
          method: 'auto'
        }
      ],
      importRecords: [
        {
          id: 'import-1',
          importedAt: '2026-06-11T12:00:00.000Z',
          snapshotCreatedAt: '2026-06-10T12:00:00.000Z',
          historyRecordCount: 8,
          changedHistoryRecordCount: 1
        }
      ],
      forceAutoBackupDueOnce: true
    },
    rollupImportHashes: ['a', 'b'],
    firstWelcome: { completed: true, pendingAfterClearAll: false },
    personalization: { nyaaThemeUnlocked: true }
  };

  assert.equal(isStateDocument(createDefaultStateDocument()), true);
  assert.equal(isStateDocument(state), true);
});

test('state normalizer applies rollup de-duplication count limit and force marker boundary', () => {
  const hashes = Array.from({ length: 83 }, (_, index) => `hash-${index}`);
  const normalized = normalizeStateDocument({
    backup: {
      lastBackupAt: 'bad-time',
      lastBackupHistoryCount: -1,
      records: [],
      importRecords: [],
      forceAutoBackupDueOnce: false
    },
    rollupImportHashes: ['hash-0', ...hashes, 'hash-82'],
    firstWelcome: { completed: true },
    personalization: { nyaaThemeUnlocked: true },
    passwordHash
  });

  assert.equal(normalized.backup.lastBackupAt, undefined);
  assert.equal(normalized.backup.lastBackupHistoryCount, 0);
  assert.equal(normalized.backup.forceAutoBackupDueOnce, undefined);
  assert.equal(normalized.rollupImportHashes.length, 80);
  assert.equal(normalized.rollupImportHashes[0], 'hash-3');
  assert.equal(
    normalized.rollupImportHashes[normalized.rollupImportHashes.length - 1],
    'hash-82'
  );
  assert.deepEqual(normalizeRollupImportHashes(['a', 'a', 'b']), ['a', 'b']);
  assert.equal(normalized.personalization.nyaaThemeUnlocked, true);
});

test('state contract rejects core and password fields', () => {
  assert.equal(
    isStateDocument({
      ...createDefaultStateDocument(),
      groups: []
    }),
    false
  );
  assert.equal(
    isStateDocument({
      ...createDefaultStateDocument(),
      passwordHash
    }),
    false
  );
});

test('security defaults mean disabled and valid PBKDF2 credentials are accepted', () => {
  const disabled = createDefaultSecurityDocument();
  const enabled: SecurityDocument = {
    schemaVersion: 1,
    appAccess: {
      enabled: true,
      autoLockMinutes: 15,
      passwordHash
    },
    snapshotEncryption: {
      enabled: true,
      passwordHash
    }
  };

  assert.deepEqual(disabled, {
    schemaVersion: 1,
    appAccess: {
      enabled: false,
      autoLockMinutes: 10,
      passwordHash: null
    },
    snapshotEncryption: {
      enabled: false,
      passwordHash: null
    }
  });
  assert.equal(isSecurityDocument(disabled), true);
  assert.equal(isSecurityDocument(enabled), true);
});

test('security normalizer disables enabled protections without valid hashes', () => {
  const normalized = normalizeSecurityDocument({
    appAccess: {
      enabled: true,
      autoLockMinutes: 0,
      passwordHash: { algorithm: PASSWORD_HASH_ALGORITHM, iterations: 1 }
    },
    snapshotEncryption: {
      enabled: true,
      passwordHash: null
    }
  });

  assert.equal(normalized.appAccess.enabled, false);
  assert.equal(normalized.appAccess.autoLockMinutes, 10);
  assert.equal(normalized.appAccess.passwordHash, null);
  assert.equal(normalized.snapshotEncryption.enabled, false);
  assert.equal(normalized.snapshotEncryption.passwordHash, null);
});

test('security contract rejects ordinary UI settings and export-style fields', () => {
  assert.equal(
    isSecurityDocument({
      ...createDefaultSecurityDocument(),
      themeMode: 'dark'
    }),
    false
  );
  assert.equal(
    isSecurityDocument({
      ...createDefaultSecurityDocument(),
      assetChart: {}
    }),
    false
  );
});

test('new formal contracts explicitly exclude migration legacy demo runtime tmp and previous fields', () => {
  for (const field of EXCLUDED_PERSISTENCE_FIELDS) {
    assert.equal(isExcludedPersistenceField(field), true);
  }

  assert.equal(isExcludedPersistenceField('core'), false);
  assert.equal(isExcludedPersistenceField('settings'), false);
});
