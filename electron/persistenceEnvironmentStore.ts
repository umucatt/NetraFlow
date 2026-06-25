import type { CoreDocument } from './persistenceContracts.js';
import type { PersistenceErrorCode, PersistenceStore } from './persistenceFileStore.js';
import type { PersistenceEnvironment } from './persistencePaths.js';

type PersistenceEnvironmentPromotionErrorCode =
  | PersistenceErrorCode
  | 'DEMO_NOT_ACTIVE'
  | 'DEMO_CORE_MISSING'
  | 'DEMO_CORE_LOCKED';

export type PersistenceEnvironmentPromotionResult =
  | { ok: true; core: CoreDocument }
  | {
      ok: false;
      code: PersistenceEnvironmentPromotionErrorCode;
      message: string;
    };

export type PersistenceEnvironmentStoreController = {
  store: PersistenceStore;
  getEnvironment: () => PersistenceEnvironment;
  setEnvironment: (environment: PersistenceEnvironment) => void;
  getStoreForEnvironment: (environment: PersistenceEnvironment) => PersistenceStore;
  getCurrentStore: () => PersistenceStore;
  promoteDemoCoreToReal: () => PersistenceEnvironmentPromotionResult;
};

export const createPersistenceEnvironmentStoreController = ({
  realStore,
  demoStore,
  initialEnvironment = 'real'
}: {
  realStore: PersistenceStore;
  demoStore: PersistenceStore;
  initialEnvironment?: PersistenceEnvironment;
}): PersistenceEnvironmentStoreController => {
  let currentEnvironment = initialEnvironment;

  const getStoreForEnvironment = (environment: PersistenceEnvironment) =>
    environment === 'demo' ? demoStore : realStore;

  const getCurrentStore = () => getStoreForEnvironment(currentEnvironment);

  const store: PersistenceStore = {
    get paths() {
      return getCurrentStore().paths;
    },
    readCoreDocument: () => getCurrentStore().readCoreDocument(),
    writeCoreDocument: (document, options) =>
      getCurrentStore().writeCoreDocument(document, options),
    unlockCoreDocument: (password) => getCurrentStore().unlockCoreDocument(password),
    enableCoreProtection: (document, password, options) =>
      getCurrentStore().enableCoreProtection(document, password, options),
    changeCorePassword: (document, currentPassword, nextPassword, options) =>
      getCurrentStore().changeCorePassword(document, currentPassword, nextPassword, options),
    disableCoreProtection: (document, password, options) =>
      getCurrentStore().disableCoreProtection(document, password, options),
    lockCoreDocument: () => getCurrentStore().lockCoreDocument(),
    acknowledgeCoreIntegrityIssue: () =>
      getCurrentStore().acknowledgeCoreIntegrityIssue(),
    encryptSnapshotDocument: (document) =>
      getCurrentStore().encryptSnapshotDocument(document),
    decryptSnapshotDocument: (encrypted) =>
      getCurrentStore().decryptSnapshotDocument(encrypted),
    decryptSnapshotDocumentWithPassword: (encrypted, password) =>
      getCurrentStore().decryptSnapshotDocumentWithPassword(encrypted, password),
    readSettingsDocument: () => getCurrentStore().readSettingsDocument(),
    writeSettingsDocument: (document) =>
      getCurrentStore().writeSettingsDocument(document),
    readStateDocument: () => getCurrentStore().readStateDocument(),
    writeStateDocument: (document) => getCurrentStore().writeStateDocument(document),
    readSecurityDocument: () => getCurrentStore().readSecurityDocument(),
    writeSecurityDocument: (document) =>
      getCurrentStore().writeSecurityDocument(document)
  };

  const promoteDemoCoreToReal = (): PersistenceEnvironmentPromotionResult => {
    if (currentEnvironment !== 'demo') {
      return {
        ok: false,
        code: 'DEMO_NOT_ACTIVE',
        message: 'Demo environment is not active.'
      };
    }

    const demoCore = demoStore.readCoreDocument();

    if (!demoCore.ok) {
      return {
        ok: false,
        code: demoCore.code,
        message: demoCore.message
      };
    }

    if (!demoCore.exists) {
      return {
        ok: false,
        code: 'DEMO_CORE_MISSING',
        message: 'Demo core document is missing.'
      };
    }

    if ('locked' in demoCore) {
      return {
        ok: false,
        code: 'DEMO_CORE_LOCKED',
        message: 'Demo core document is locked.'
      };
    }

    const currentDemoCore = demoCore.document as CoreDocument;

    demoStore.lockCoreDocument();
    realStore.lockCoreDocument();
    currentEnvironment = 'real';
    const writeResult = realStore.writeCoreDocument(currentDemoCore);

    if (!writeResult.ok) {
      currentEnvironment = 'demo';
      return {
        ok: false,
        code: writeResult.code,
        message: writeResult.message
      };
    }

    return { ok: true, core: currentDemoCore };
  };

  return {
    store,
    getEnvironment: () => currentEnvironment,
    setEnvironment: (environment) => {
      realStore.lockCoreDocument();
      demoStore.lockCoreDocument();
      currentEnvironment = environment;
    },
    getStoreForEnvironment,
    getCurrentStore,
    promoteDemoCoreToReal
  };
};
