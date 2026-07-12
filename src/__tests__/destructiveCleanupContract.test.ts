/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { readProjectFile } from './contractText';

test('highest reset keeps the existing confirmation UI and enters destructive cleanup', () => {
  const lifecycleSource = readProjectFile('src/app/useAppDataLifecycleController.tsx');
  const backupPanelSource = readProjectFile('src/features/settings/BackupSettingsPanel.tsx');
  const resetDialogSource = readProjectFile(
    'src/app/resetDangerDialog/ResetDangerDialogLayer.tsx'
  );
  const confirmSource = lifecycleSource.slice(
    lifecycleSource.indexOf('const confirmResetAction = () => {'),
    lifecycleSource.indexOf('return {', lifecycleSource.indexOf('const confirmResetAction = () => {'))
  );

  assert.equal(backupPanelSource.includes("onOpenResetConfirmation('settings')"), true);
  assert.equal(backupPanelSource.includes("onOpenResetConfirmation('history')"), true);
  assert.equal(backupPanelSource.includes("onOpenResetConfirmation('all')"), true);
  assert.equal(resetDialogSource.includes('输入上方 4 位数字'), true);
  assert.equal(confirmSource.includes("if (action === 'settings')"), true);
  assert.equal(confirmSource.includes('resetUserConfiguration();'), true);
  assert.equal(confirmSource.includes("if (action === 'history')"), true);
  assert.equal(confirmSource.includes('resetAssetHistory(true);'), true);
  assert.equal(confirmSource.includes('clearAllLocalDataAndQuit();'), true);
  assert.equal(confirmSource.includes('resetAllData'), false);
  assert.equal(confirmSource.includes('markPendingFirstWelcomeAfterClearAll'), false);
});

test('renderer stops persistence before invoking the pathless main cleanup channel', () => {
  const appSource = readProjectFile('src/App.tsx');
  const preloadSource = readProjectFile('electron/preload.ts');
  const viteEnvSource = readProjectFile('src/vite-env.d.ts');
  const cleanupSource = appSource.slice(
    appSource.indexOf('const clearAllLocalDataAndQuit = () => {'),
    appSource.indexOf('const {', appSource.indexOf('const clearAllLocalDataAndQuit = () => {'))
  );

  assert.equal(cleanupSource.includes('destructiveShutdownRef.current = true;'), true);
  assert.equal(cleanupSource.includes('persistenceGenerationRef.current += 1;'), true);
  assert.equal(cleanupSource.includes('coreSaveCoordinator.beginDestructiveShutdown();'), true);
  assert.equal(cleanupSource.includes('api.clearAllLocalDataAndQuit()'), true);
  assert.equal(
    preloadSource.includes("ipcRenderer.invoke('app:clear-all-local-data-and-quit')"),
    true
  );
  assert.equal(viteEnvSource.includes('clearAllLocalDataAndQuit?: () => Promise<void>;'), true);
  assert.equal(preloadSource.includes('storageLayout.userdata'), false);
  assert.equal(preloadSource.includes('storageLayout.runtime'), false);
  assert.equal(preloadSource.includes('storageLayout.demo'), false);
});

test('main owns destructive state, deletion paths, session cleanup, and application exit', () => {
  const mainSource = readProjectFile('electron/mainApplication.ts');
  const persistenceIpcSource = readProjectFile('electron/persistenceIpc.ts');
  const cleanupModuleSource = readProjectFile('electron/destructiveResetLifecycle.ts');
  const handlerSource = mainSource.slice(
    mainSource.indexOf("ipcMain.handle('app:clear-all-local-data-and-quit'"),
    mainSource.indexOf('const isFileUrlForPath', mainSource.indexOf("ipcMain.handle('app:clear-all-local-data-and-quit'"))
  );
  const coordinatorSource = mainSource.slice(
    mainSource.indexOf('const destructiveCleanupCoordinator'),
    mainSource.indexOf("ipcMain.handle('app:clear-all-local-data-and-quit'")
  );

  assert.equal(handlerSource.includes('createManagedDataDeletionPlan({'), true);
  assert.equal(handlerSource.includes('layout: storageLayout'), true);
  assert.equal(handlerSource.includes('event,'), false);
  assert.equal(coordinatorSource.includes('appShutdownState.beginDestructiveShutdown();'), true);
  assert.equal(coordinatorSource.includes('realPersistenceStore.lockCoreDocument();'), true);
  assert.equal(coordinatorSource.includes('demoPersistenceStore.lockCoreDocument();'), true);
  assert.equal(coordinatorSource.includes('forceClosingWindows.add(targetWindow);'), true);
  assert.equal(coordinatorSource.includes('invalidateAndDeleteUserdata('), true);
  assert.equal(coordinatorSource.includes('createRuntimePendingMarker('), true);
  assert.equal(coordinatorSource.includes('isolateAndDeleteRuntime('), true);
  assert.equal(coordinatorSource.includes('app.exit(0);'), true);
  assert.equal(coordinatorSource.includes('app.quit();'), false);
  assert.equal(coordinatorSource.includes('targetSession.closeAllConnections()'), true);
  assert.equal(coordinatorSource.includes('targetSession.clearData()'), true);
  assert.equal(coordinatorSource.includes('targetSession.clearCache()'), true);
  assert.equal(cleanupModuleSource.includes("'.userdata.deleting-'"), true);
  assert.equal(cleanupModuleSource.includes("'.runtime.delete-pending-'"), true);
  assert.equal(persistenceIpcSource.includes('respondGuarded'), true);
  assert.equal(mainSource.includes('isBlocked: isDestructiveShutdown'), true);
});

test('clearing page is a standalone root with CSS-only dots and no business stores', () => {
  const rootSource = readProjectFile('src/main.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const pageSource = rootSource.slice(
    rootSource.indexOf('function ClearingPage()'),
    rootSource.indexOf('function NormalApplicationRoot()')
  );
  assert.equal(pageSource.includes('正在清除全部数据'), true);
  assert.equal(pageSource.includes('AppShell'), false);
  assert.equal(pageSource.includes('Store'), false);
  assert.equal(pageSource.includes('notifyClearingPageReady'), true);
  assert.equal(stylesSource.includes('@keyframes destructive-clearing-dots'), true);
  assert.equal(stylesSource.includes("content: '...'"), true);
  assert.equal(rootSource.includes('clearing ? <ClearingPage />'), true);
});
