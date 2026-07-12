/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_GLOBAL_SETTINGS
} from '../globalSettings/globalSettingsLogic';
import type { AppData } from '../types';
import {
  createDefaultSecurityDocument,
  createDefaultSettingsDocument,
  createDefaultStateDocument
} from './persistenceDefaults';
import type {
  CoreDocument,
  SecurityDocument,
  SettingsDocument,
  StateDocument
} from './persistenceDocuments';
import {
  createCoreDocumentFromAppData,
  commitInitializedPersistenceSnapshot,
  createRuntimeGlobalSettings,
  createSecurityDocumentFromRuntime,
  createSettingsDocumentFromRuntime,
  enterDemoPersistenceEnvironment,
  exitDemoPersistenceEnvironment,
  promoteDemoCoreToRealPersistenceEnvironment,
  readRuntimePersistenceSnapshot,
  writeCoreDocument,
  writeSecurityDocument,
  writeSettingsDocument,
  writeStateDocument
} from './runtimePersistence';

const coreDocument: CoreDocument = {
  schemaVersion: 1,
  groups: [
    {
      id: 'group-1',
      name: 'Cash',
      nature: 'asset',
      includeInStats: true,
      sortOrder: 0
    }
  ],
  accounts: [
    {
      id: 'account-1',
      groupId: 'group-1',
      name: 'Wallet',
      amount: 100,
      createdAt: '2026-06-01T12:00:00.000Z'
    }
  ],
  history: [
    {
      id: 'history-1',
      accountId: 'account-1',
      type: '修改',
      groupName: 'Cash',
      accountName: 'Wallet',
      beforeAmount: 90,
      afterAmount: 100,
      time: '2026-06-02T12:00:00.000Z'
    }
  ]
};

const withPersistenceBridge = (
  callback: (writes: string[]) => void
) => {
  const previousWindow = (globalThis as unknown as { window?: unknown }).window;
  const writes: string[] = [];
  const settingsDocument = createDefaultSettingsDocument();
  const stateDocument = createDefaultStateDocument();
  const securityDocument = createDefaultSecurityDocument();

  (globalThis as unknown as { window?: unknown }).window = {
    netraflowPersistence: {
      readCoreDocument: () => ({ ok: true, exists: true, document: coreDocument }),
      writeCoreDocument: (_document: unknown) => {
        writes.push('core');
      },
      readSettingsDocument: () => ({ ok: true, exists: true, document: settingsDocument }),
      writeSettingsDocument: (_document: unknown) => {
        writes.push('settings');
      },
      readStateDocument: () => ({ ok: true, exists: true, document: stateDocument }),
      writeStateDocument: (_document: unknown) => {
        writes.push('state');
      },
      readSecurityDocument: () => ({ ok: true, exists: true, document: securityDocument }),
      writeSecurityDocument: (_document: unknown) => {
        writes.push('security');
      },
      enterDemoEnvironment: (documents: unknown) => ({ ok: true, snapshot: documents }),
      exitDemoEnvironment: () => ({
        ok: true,
        snapshot: {
          core: coreDocument,
          settings: settingsDocument,
          state: stateDocument,
          security: securityDocument
        },
        cleanup: { ok: true, removed: true }
      }),
      promoteDemoCoreToRealEnvironment: () => ({
        ok: true,
        snapshot: {
          core: coreDocument,
          settings: settingsDocument,
          state: stateDocument,
          security: securityDocument
        },
        cleanup: { ok: true, removed: true }
      })
    }
  };

  try {
    callback(writes);
  } finally {
    (globalThis as unknown as { window?: unknown }).window = previousWindow;
  }
};

test('startup reads four formal documents without writing', () => {
  withPersistenceBridge((writes) => {
    const snapshot = readRuntimePersistenceSnapshot();

    assert.deepEqual(snapshot.core, coreDocument);
    assert.deepEqual(snapshot.settings, createDefaultSettingsDocument());
    assert.deepEqual(snapshot.state, createDefaultStateDocument());
    assert.deepEqual(snapshot.security, createDefaultSecurityDocument());
    assert.deepEqual(writes, []);
  });
});

test('runtime persistence writes only the requested formal document', () => {
  withPersistenceBridge((writes) => {
    const appData: AppData = {
      groups: [
        {
          ...coreDocument.groups[0]!,
          accounts: coreDocument.accounts
        } as unknown as AppData['groups'][number]
      ],
      accounts: coreDocument.accounts,
      history: coreDocument.history
    };
    const runtimeGlobalSettings = createRuntimeGlobalSettings(
      createDefaultSettingsDocument(),
      createDefaultStateDocument(),
      createDefaultSecurityDocument()
    );
    const settingsDocument: SettingsDocument = createSettingsDocumentFromRuntime({
      autoBackupSettings: createDefaultSettingsDocument().autoBackup,
      assetChartSettings: createDefaultSettingsDocument().assetChart,
      globalSettings: runtimeGlobalSettings
    });
    const stateDocument: StateDocument = {
      ...createDefaultStateDocument(),
      rollupImportHashes: ['hash-1']
    };
    const securityDocument: SecurityDocument =
      createSecurityDocumentFromRuntime(DEFAULT_GLOBAL_SETTINGS);

    writeCoreDocument(createCoreDocumentFromAppData(appData));
    writeSettingsDocument(settingsDocument);
    writeStateDocument(stateDocument);
    writeSecurityDocument(securityDocument);

    assert.deepEqual(writes, ['core', 'settings', 'state', 'security']);
    assert.deepEqual(createCoreDocumentFromAppData(appData), coreDocument);
    assert.equal('passwordHash' in settingsDocument.global, false);
    assert.equal('groups' in settingsDocument, false);
    assert.equal('groups' in stateDocument, false);
  });
});

test('runtime persistence validates demo environment transitions', () => {
  withPersistenceBridge(() => {
    const demoSnapshot = {
      core: coreDocument,
      settings: createDefaultSettingsDocument(),
      state: createDefaultStateDocument(),
      security: createDefaultSecurityDocument(),
      coreProtection: { enabled: false, locked: false },
      documentExists: { core: true, settings: true, state: true, security: true }
    };
    const entered = enterDemoPersistenceEnvironment(demoSnapshot);
    const exited = exitDemoPersistenceEnvironment();

    assert.deepEqual(entered.snapshot, demoSnapshot);
    assert.deepEqual(exited.snapshot.core, coreDocument);
    assert.deepEqual(exited.cleanup, { ok: true, removed: true });
  });
});

test('runtime persistence validates demo core promotion transition', () => {
  withPersistenceBridge(() => {
    const promoted = promoteDemoCoreToRealPersistenceEnvironment();

    assert.deepEqual(promoted.snapshot.core, coreDocument);
    assert.deepEqual(promoted.snapshot.settings, createDefaultSettingsDocument());
    assert.deepEqual(promoted.snapshot.state, createDefaultStateDocument());
    assert.deepEqual(promoted.snapshot.security, createDefaultSecurityDocument());
    assert.deepEqual(promoted.cleanup, { ok: true, removed: true });
  });
});

test('startup prefers one consistent snapshot bridge read', () => {
  const previousWindow = (globalThis as unknown as { window?: unknown }).window;
  let snapshotReads = 0;
  (globalThis as unknown as { window?: unknown }).window = {
    netraflowPersistence: {
      readSnapshot: () => {
        snapshotReads += 1;
        return {
          ok: true,
          snapshot: {
            core: coreDocument,
            settings: createDefaultSettingsDocument(),
            state: createDefaultStateDocument(),
            security: createDefaultSecurityDocument(),
            coreProtection: { enabled: false, locked: false },
            documentExists: { core: true, settings: false, state: true, security: false },
            documentStatus: { core: 'valid', settings: 'missing', state: 'valid', security: 'missing' }
          }
        };
      },
      readCoreDocument: () => assert.fail('individual core read must not run'),
      readSettingsDocument: () => assert.fail('individual settings read must not run'),
      readStateDocument: () => assert.fail('individual state read must not run'),
      readSecurityDocument: () => assert.fail('individual security read must not run')
    }
  };

  try {
    const snapshot = readRuntimePersistenceSnapshot();
    assert.equal(snapshotReads, 1);
    assert.equal(snapshot.documentStatus?.core, 'valid');
  } finally {
    (globalThis as unknown as { window?: unknown }).window = previousWindow;
  }
});

test('invalid consistent snapshot is rejected instead of normalized to onboarding', () => {
  const previousWindow = (globalThis as unknown as { window?: unknown }).window;
  (globalThis as unknown as { window?: unknown }).window = {
    netraflowPersistence: {
      readSnapshot: () => ({
        ok: true,
        snapshot: {
          core: coreDocument,
          settings: createDefaultSettingsDocument(),
          state: createDefaultStateDocument(),
          security: createDefaultSecurityDocument(),
          documentStatus: { core: 'valid', settings: 'invalid', state: 'valid', security: 'valid' }
        }
      })
    }
  };

  try {
    assert.throws(() => readRuntimePersistenceSnapshot(), /PERSISTENCE_SNAPSHOT_INVALID/);
  } finally {
    (globalThis as unknown as { window?: unknown }).window = previousWindow;
  }
});

test('test data commit sends core and completed state as one snapshot', () => {
  const previousWindow = (globalThis as unknown as { window?: unknown }).window;
  const state = {
    ...createDefaultStateDocument(),
    firstWelcome: { completed: true, pendingAfterClearAll: false }
  };
  let request: unknown;
  (globalThis as unknown as { window?: unknown }).window = {
    netraflowPersistence: {
      commitInitializedSnapshot: (value: unknown) => {
        request = value;
        return {
          ok: true,
          snapshot: {
            core: coreDocument,
            settings: createDefaultSettingsDocument(),
            state,
            security: createDefaultSecurityDocument(),
            coreProtection: { enabled: false, locked: false },
            documentExists: { core: true, settings: false, state: true, security: false },
            documentStatus: { core: 'valid', settings: 'missing', state: 'valid', security: 'missing' }
          }
        };
      }
    }
  };

  try {
    const snapshot = commitInitializedPersistenceSnapshot({ core: coreDocument, state });
    assert.deepEqual(request, { core: coreDocument, state });
    assert.equal(snapshot.state.firstWelcome.completed, true);
  } finally {
    (globalThis as unknown as { window?: unknown }).window = previousWindow;
  }
});
