import { ipcMain, type IpcMainEvent } from 'electron';

import type { PersistenceStore } from './persistenceFileStore.js';

export type PersistenceDemoLifecycleHandlers = {
  enterDemoEnvironment: (documents: unknown) => unknown;
  exitDemoEnvironment: () => unknown;
  promoteDemoCoreToRealEnvironment: () => unknown;
};

const respond = (event: IpcMainEvent, result: unknown) => {
  event.returnValue = result;
};

const getCoreWriteOptions = (value: unknown) => ({
  allowExternalCoreOverwrite:
    typeof value === 'object' &&
    value !== null &&
    (value as { allowExternalCoreOverwrite?: unknown }).allowExternalCoreOverwrite === true
});

export const registerPersistenceHandlers = (
  store: PersistenceStore,
  demoLifecycle?: PersistenceDemoLifecycleHandlers
) => {
  ipcMain.on('persistence:read-core', (event) => respond(event, store.readCoreDocument()));
  ipcMain.on('persistence:write-core', (event, request: unknown) =>
    respond(
      event,
      typeof request === 'object' && request !== null && 'document' in request
        ? store.writeCoreDocument(
            (request as { document?: unknown }).document,
            getCoreWriteOptions((request as { options?: unknown }).options)
          )
        : store.writeCoreDocument(request)
    )
  );
  ipcMain.on('persistence:unlock-core', (event, password: unknown) =>
    respond(event, store.unlockCoreDocument(typeof password === 'string' ? password : ''))
  );
  ipcMain.on('persistence:enable-core-protection', (event, request: unknown) =>
    respond(
      event,
      typeof request === 'object' && request !== null
        ? store.enableCoreProtection(
            (request as { document?: unknown }).document,
            typeof (request as { password?: unknown }).password === 'string'
              ? (request as { password: string }).password
              : '',
            getCoreWriteOptions((request as { options?: unknown }).options)
          )
        : store.enableCoreProtection(undefined, '')
    )
  );
  ipcMain.on('persistence:change-core-password', (event, request: unknown) =>
    respond(
      event,
      typeof request === 'object' && request !== null
        ? store.changeCorePassword(
            (request as { document?: unknown }).document,
            typeof (request as { currentPassword?: unknown }).currentPassword === 'string'
              ? (request as { currentPassword: string }).currentPassword
              : '',
            typeof (request as { nextPassword?: unknown }).nextPassword === 'string'
              ? (request as { nextPassword: string }).nextPassword
              : '',
            getCoreWriteOptions((request as { options?: unknown }).options)
          )
        : store.changeCorePassword(undefined, '', '')
    )
  );
  ipcMain.on('persistence:disable-core-protection', (event, request: unknown) =>
    respond(
      event,
      typeof request === 'object' && request !== null
        ? store.disableCoreProtection(
            (request as { document?: unknown }).document,
            typeof (request as { password?: unknown }).password === 'string'
              ? (request as { password: string }).password
              : '',
            getCoreWriteOptions((request as { options?: unknown }).options)
          )
        : store.disableCoreProtection(undefined, '')
    )
  );
  ipcMain.on('persistence:lock-core', (event) => respond(event, store.lockCoreDocument()));
  ipcMain.on('persistence:acknowledge-core-integrity', (event) =>
    respond(event, store.acknowledgeCoreIntegrityIssue())
  );
  ipcMain.on('persistence:encrypt-snapshot', (event, document: unknown) =>
    respond(event, store.encryptSnapshotDocument(document))
  );
  ipcMain.on('persistence:decrypt-snapshot', (event, encrypted: unknown) =>
    respond(event, store.decryptSnapshotDocument(encrypted))
  );
  ipcMain.on('persistence:decrypt-snapshot-with-password', (event, request: unknown) =>
    respond(
      event,
      typeof request === 'object' && request !== null
        ? store.decryptSnapshotDocumentWithPassword(
            (request as { encrypted?: unknown }).encrypted,
            typeof (request as { password?: unknown }).password === 'string'
              ? (request as { password: string }).password
              : ''
          )
        : store.decryptSnapshotDocumentWithPassword(undefined, '')
    )
  );
  ipcMain.on('persistence:read-settings', (event) =>
    respond(event, store.readSettingsDocument())
  );
  ipcMain.on('persistence:write-settings', (event, document: unknown) =>
    respond(event, store.writeSettingsDocument(document))
  );
  ipcMain.on('persistence:read-state', (event) => respond(event, store.readStateDocument()));
  ipcMain.on('persistence:write-state', (event, document: unknown) =>
    respond(event, store.writeStateDocument(document))
  );
  ipcMain.on('persistence:read-security', (event) =>
    respond(event, store.readSecurityDocument())
  );
  ipcMain.on('persistence:write-security', (event, document: unknown) =>
    respond(event, store.writeSecurityDocument(document))
  );

  ipcMain.on('persistence:enter-demo', (event, documents: unknown) =>
    respond(
      event,
      demoLifecycle?.enterDemoEnvironment(documents) ?? {
        ok: false,
        code: 'DEMO_LIFECYCLE_UNAVAILABLE',
        message: 'Demo persistence lifecycle is unavailable.'
      }
    )
  );
  ipcMain.on('persistence:exit-demo', (event) =>
    respond(
      event,
      demoLifecycle?.exitDemoEnvironment() ?? {
        ok: false,
        code: 'DEMO_LIFECYCLE_UNAVAILABLE',
        message: 'Demo persistence lifecycle is unavailable.'
      }
    )
  );
  ipcMain.on('persistence:promote-demo-core-to-real', (event) =>
    respond(
      event,
      demoLifecycle?.promoteDemoCoreToRealEnvironment() ?? {
        ok: false,
        code: 'DEMO_LIFECYCLE_UNAVAILABLE',
        message: 'Demo persistence lifecycle is unavailable.'
      }
    )
  );
};
