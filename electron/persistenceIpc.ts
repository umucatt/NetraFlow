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

export const registerPersistenceHandlers = (
  store: PersistenceStore,
  demoLifecycle?: PersistenceDemoLifecycleHandlers
) => {
  ipcMain.on('persistence:read-core', (event) => respond(event, store.readCoreDocument()));
  ipcMain.on('persistence:write-core', (event, document: unknown) =>
    respond(event, store.writeCoreDocument(document))
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
