import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

const readProjectFile = (filePath: string) =>
  readFileSync(path.join(projectRoot, filePath), 'utf8').replace(/\r\n?/g, '\n');

const normalizeAllowedDots = (text: string) =>
  text
    .replace(/\bcore\.json\b/g, 'core_json')
    .replace(/\b\d+\.\d+\.\d+\b/g, 'version')
    .replace(/https?:\/\/\S+/g, 'url');

const assertNoSentencePeriod = (texts: string[]) => {
  const invalid = texts.filter((text) => /[。.]/.test(normalizeAllowedDots(text)));

  assert.deepEqual(invalid, []);
};

test('seven visible error surfaces use concise copy without sentence periods', () => {
  assertNoSentencePeriod([
    '核心数据无法读取',
    '核心数据异常，NetraFlow 无法正常读取',
    '检查 core.json 后重启',
    '错误代码 PERSISTENCE_READ_INVALID',
    '打开数据目录',
    '退出 NetraFlow',
    '快照完整性验证失败',
    '快照已发生非 NetraFlow 写入的异常修改',
    '无法确认数据仍完整可信',
    '取消导入',
    '继续导入',
    '核心数据完整性验证失败',
    '核心数据已发生非 NetraFlow 写入的异常修改',
    '我知道了',
    '继续保存',
    '登录密码错误',
    '两次输入的新密码不一致',
    '登录密码修改失败',
    'NetraFlow 0.9.9'
  ]);
});

test('startup fatal error page hides internal English read errors from main copy', () => {
  const appSource = readProjectFile('src/App.tsx');
  const fatalErrorSource = readProjectFile('src/app/fatalError/FatalErrorPage.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const fatalTitleBlock = stylesSource.match(/\.fatal-error-page__title\s*\{[^}]*\}/s)?.[0] ?? '';

  assert.equal(appSource.includes('核心数据无法读取'), true);
  assert.equal(appSource.includes('核心数据异常，NetraFlow 无法正常读取'), true);
  assert.equal(appSource.includes('检查 core.json 后重启'), true);
  assert.equal(appSource.includes('错误代码 ${errorCode}'), true);
  assert.equal(appSource.includes('Failed to read core document'), false);
  assert.equal(fatalErrorSource.includes('fatal-error-page__technical'), true);
  assert.match(fatalTitleBlock, /word-break:\s*keep-all;/);
  assert.match(fatalTitleBlock, /font-size:\s*clamp\(1\.65rem,\s*2\.8vw,\s*2rem\);/);
});

test('close-time core read failure uses the fatal surface instead of force-closing', () => {
  const appSource = readProjectFile('src/App.tsx');
  const closeBeforeControllerSource = readProjectFile('src/app/closeBeforeController.ts');

  assert.equal(appSource.includes('const [runtimePersistenceError, setRuntimePersistenceError]'), true);
  assert.equal(appSource.includes('return <StartupPersistenceErrorScreen error={runtimePersistenceError} />;'), true);
  assert.equal(closeBeforeControllerSource.includes('readHasIntegrityWarning'), true);
  assert.equal(closeBeforeControllerSource.includes('reportRuntimePersistenceError(error);'), true);
  assert.equal(closeBeforeControllerSource.includes('forceCloseApp();'), false);
});

test('product single instance lock is product-wide and acquired before persistence setup', () => {
  const mainSource = readProjectFile('electron/mainApplication.ts');
  const productLockSource = readProjectFile('electron/productInstanceLock.ts');
  const lockIndex = mainSource.indexOf('const gotProductInstanceLock = await productInstanceCoordinator.acquire();');
  const rootsIndex = mainSource.indexOf(
    'const persistenceRoots = createPersistenceEnvironmentRoots(storageLayout);'
  );
  const electronLockIndex = mainSource.indexOf('const gotSingleInstanceLock = app.requestSingleInstanceLock();');

  assert.ok(lockIndex >= 0);
  assert.ok(rootsIndex >= 0);
  assert.ok(electronLockIndex >= 0);
  assert.ok(lockIndex < rootsIndex);
  assert.ok(rootsIndex < electronLockIndex);
  assert.equal(productLockSource.includes('export const PRODUCT_INSTANCE_PIPE_PATH ='), true);
  assert.equal(productLockSource.includes('netraflow-com-netraflow-app-single-instance'), true);
  assert.equal(
    productLockSource.includes("const PRODUCT_INSTANCE_ACTIVATE_MESSAGE = 'activate';"),
    true
  );
  assert.equal(productLockSource.includes("const PRODUCT_INSTANCE_LOCK_MESSAGE = 'lock';"), true);
  assert.equal(productLockSource.includes("initial.code !== 'EADDRINUSE'"), true);
  assert.equal(productLockSource.includes("existing.code !== 'ECONNREFUSED'"), true);
  assert.equal(productLockSource.includes('removeVerifiedStaleSocket'), true);
  assert.equal(productLockSource.includes('currentServer.close(async () =>'), true);
  assert.equal(mainSource.includes('void productInstanceCoordinator.release();'), true);
});

test('risk confirmation dialogs use the unified concise structure', () => {
  const appSource = readProjectFile('src/App.tsx');
  const dialogControllerSource = readProjectFile('src/app/useAppDialogController.ts');
  const coreIntegrityDialogSource = readProjectFile('src/app/coreIntegrity/CoreIntegrityDialog.tsx');
  const securityControllerSource = readProjectFile(
    'src/features/security/useSecuritySettingsController.tsx'
  );
  const confirmDialogSource = readProjectFile('src/components/dialogs/ConfirmDialog.tsx');

  assert.equal(dialogControllerSource.includes('快照完整性验证失败'), true);
  assert.equal(
    dialogControllerSource.includes('快照已发生非 NetraFlow 写入的异常修改\\n无法确认数据仍完整可信'),
    true
  );
  assert.equal(coreIntegrityDialogSource.includes('核心数据完整性验证失败'), true);
  assert.equal(coreIntegrityDialogSource.includes('我知道了'), true);
  assert.equal(coreIntegrityDialogSource.includes('继续保存'), true);
  assert.equal(securityControllerSource.includes('showCoreIntegrityDialog'), true);
  assert.equal(confirmDialogSource.includes("message.split('\\n')"), true);
  assert.equal(confirmDialogSource.includes("tone === 'danger'"), true);
});

test('form error surfaces keep one reserved inline error slot', () => {
  const inlineErrorSource = readProjectFile('src/components/InlineErrorSlot.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const inlineErrorBlock = stylesSource.match(/\.inline-error-slot\s*\{[^}]*\}/s)?.[0] ?? '';
  const lockScreenSource = readProjectFile('src/app/lockScreen/LockScreenLayer.tsx');
  const snapshotSecurityLayerSource = readProjectFile(
    'src/app/snapshotSecurityDialogs/SnapshotSecurityDialogLayer.tsx'
  );
  const passwordEditorSource = readProjectFile('src/features/settings/PasswordEditorDialog.tsx');
  const snapshotEncryptionDisableSource = readProjectFile(
    'src/features/settings/SnapshotEncryptionDisableDialog.tsx'
  );

  assert.equal(inlineErrorSource.includes('inline-error-slot--visible'), true);
  assert.match(inlineErrorBlock, /min-height:\s*20px;/);
  assert.match(inlineErrorBlock, /visibility:\s*hidden;/);
  assert.doesNotMatch(inlineErrorBlock, /display:\s*none/);
  assert.match(inlineErrorBlock, /white-space:\s*nowrap;/);
  assert.equal(lockScreenSource.includes('<InlineErrorSlot id="lock-screen-error" message={error} />'), true);
  assert.equal(lockScreenSource.includes('{error ? <p'), false);
  assert.equal(
    snapshotSecurityLayerSource.includes(
      '<InlineErrorSlot id="disable-password-protection-error" message={error} />'
    ),
    true
  );
  assert.equal(
    snapshotEncryptionDisableSource.includes(
      '<InlineErrorSlot id="disable-snapshot-encryption-error" message={error} />'
    ),
    true
  );
  assert.equal(passwordEditorSource.includes('password-editor-old-error'), true);
  assert.equal(passwordEditorSource.includes('password-editor-confirm-error'), true);
  assert.equal(passwordEditorSource.includes('password-editor-form-error'), true);
});

test('settings password dialogs cancel on Escape without changing blocking dialogs', () => {
  const dialogShellSource = readProjectFile('src/components/dialogs/DialogShell.tsx');
  const snapshotSecurityLayerSource = readProjectFile(
    'src/app/snapshotSecurityDialogs/SnapshotSecurityDialogLayer.tsx'
  );
  const passwordEditorSource = readProjectFile('src/features/settings/PasswordEditorDialog.tsx');
  const snapshotEncryptionDisableSource = readProjectFile(
    'src/features/settings/SnapshotEncryptionDisableDialog.tsx'
  );
  const coreIntegrityDialogSource = readProjectFile(
    'src/app/coreIntegrity/CoreIntegrityDialog.tsx'
  );

  assert.equal(dialogShellSource.includes('onKeyDown?:'), true);
  assert.equal(passwordEditorSource.includes("event.key !== 'Escape'"), true);
  assert.equal(passwordEditorSource.includes('onKeyDown={handleDialogKeyDown}'), true);
  assert.equal(passwordEditorSource.includes('onCancel();'), true);
  assert.equal(snapshotEncryptionDisableSource.includes("event.key !== 'Escape'"), true);
  assert.equal(
    snapshotEncryptionDisableSource.includes('onKeyDown={handleDialogKeyDown}'),
    true
  );
  assert.equal(snapshotEncryptionDisableSource.includes('onCancel();'), true);
  assert.equal(snapshotSecurityLayerSource.includes('const cancelOnEscape ='), true);
  assert.equal(
    snapshotSecurityLayerSource.includes(
      'onKeyDown={(event) => cancelOnEscape(event, onCancel)}'
    ),
    true
  );
  assert.equal(coreIntegrityDialogSource.includes('onKeyDown='), false);
  assert.equal(coreIntegrityDialogSource.includes('onClose='), false);
});

test('snapshot encryption disable keeps state unchanged until password confirmation succeeds', () => {
  const securityControllerSource = readProjectFile(
    'src/features/security/useSecuritySettingsController.tsx'
  );
  const updateSnapshotEncryptionSource = securityControllerSource.slice(
    securityControllerSource.indexOf('const updateSnapshotEncryption ='),
    securityControllerSource.indexOf('const confirmDisableSnapshotEncryption =')
  );
  const confirmDisableSnapshotEncryptionSource = securityControllerSource.slice(
    securityControllerSource.indexOf('const confirmDisableSnapshotEncryption ='),
    securityControllerSource.indexOf('const updateForceSnapshotEncryption =')
  );
  const closeSnapshotEncryptionDisableSource = securityControllerSource.slice(
    securityControllerSource.indexOf('const closeSnapshotEncryptionDisableConfirm ='),
    securityControllerSource.indexOf('const requestDisableSnapshotEncryption =')
  );

  assert.equal(updateSnapshotEncryptionSource.includes('requestDisableSnapshotEncryption();'), true);
  assert.equal(updateSnapshotEncryptionSource.includes('snapshotEncryptionEnabled: false'), false);
  assert.equal(confirmDisableSnapshotEncryptionSource.includes('unlockCoreDocument(snapshotEncryptionDisableInput);'), true);
  assert.equal(confirmDisableSnapshotEncryptionSource.includes('snapshotEncryptionEnabled: false'), true);
  assert.equal(
    confirmDisableSnapshotEncryptionSource.includes(
      'SECURITY_ERROR_MESSAGES.snapshotEncryptionDisableFailed'
    ),
    true
  );
  assert.equal(closeSnapshotEncryptionDisableSource.includes("setSnapshotEncryptionDisableInput('');"), true);
  assert.equal(closeSnapshotEncryptionDisableSource.includes("setSnapshotEncryptionDisableError('');"), true);
  assert.equal(closeSnapshotEncryptionDisableSource.includes('setIsDisablingSnapshotEncryption(false);'), true);
});

test('password errors are mapped without merging unrelated causes', () => {
  const securityErrorMessagesSource = readProjectFile(
    'src/features/security/securityErrorMessages.ts'
  );
  const securityControllerSource = readProjectFile(
    'src/features/security/useSecuritySettingsController.tsx'
  );
  const unlockAppSource = securityControllerSource.slice(
    securityControllerSource.indexOf('const unlockApp = async'),
    securityControllerSource.indexOf('const resetSecurityState')
  );

  assert.equal(securityErrorMessagesSource.includes('登录密码错误'), true);
  assert.equal(securityErrorMessagesSource.includes('两次输入的新密码不一致'), true);
  assert.equal(securityErrorMessagesSource.includes('登录密码修改失败'), true);
  assert.equal(securityErrorMessagesSource.includes('密码保护关闭失败'), false);
  assert.equal(securityErrorMessagesSource.includes('快照加密关闭失败'), false);
  assert.equal(securityControllerSource.includes('旧密码不正确或保存失败'), false);
  assert.equal(securityControllerSource.includes('密码保存失败'), false);
  assert.equal(
    securityControllerSource.includes('SECURITY_ERROR_MESSAGES.passwordMismatch'),
    true
  );
  assert.equal(
    securityControllerSource.includes('SECURITY_ERROR_MESSAGES.loginPasswordChangeFailed'),
    true
  );
  assert.equal(unlockAppSource.includes('showConfirmationDialog'), false);
  assert.equal(unlockAppSource.includes('showNoticeDialog'), false);
});

test('core integrity pending save keeps the ordinary ui change in memory', () => {
  const appSource = readProjectFile('src/App.tsx');
  const coreSaveCoordinatorSource = readProjectFile('src/app/coreSaveCoordinator.ts');
  const runtimePersistenceSource = readProjectFile('src/app/persistence/runtimePersistence.ts');
  const securityControllerSource = readProjectFile(
    'src/features/security/useSecuritySettingsController.tsx'
  );
  const saveRequestTypeSource = coreSaveCoordinatorSource.slice(
    coreSaveCoordinatorSource.indexOf('export type CoreSaveRequest'),
    coreSaveCoordinatorSource.indexOf('export type CoreSaveScheduleOptions')
  );
  const acceptInMemorySource = coreSaveCoordinatorSource.slice(
    coreSaveCoordinatorSource.indexOf('const acceptCoreSaveRequestInMemory ='),
    coreSaveCoordinatorSource.indexOf('const clearAutoSaveTimer =')
  );
  const externalModificationCatchSource = coreSaveCoordinatorSource.slice(
    coreSaveCoordinatorSource.indexOf('if (!currentHandlers.isExternalCoreModificationError(error))'),
    coreSaveCoordinatorSource.indexOf(
      'return false;',
      coreSaveCoordinatorSource.indexOf('currentHandlers.showCoreIntegrityPrompt(saveRequest);')
    ) + 13
  );
  const saveAppDataWithExternalCheckSource = coreSaveCoordinatorSource.slice(
    coreSaveCoordinatorSource.indexOf('const saveWithExternalModificationCheck ='),
    coreSaveCoordinatorSource.indexOf('const acknowledgePendingSaveWithoutPersisting =')
  );
  const commitAppDataUpdateSource = appSource.slice(
    appSource.indexOf('const commitAppDataUpdate: CommitAppDataUpdate ='),
    appSource.indexOf('const updateAssetChartSettings =')
  );

  assert.equal(saveRequestTypeSource.includes('acceptedInMemory: boolean;'), true);
  assert.equal(acceptInMemorySource.includes('if (saveRequest.acceptedInMemory)'), true);
  assert.equal(acceptInMemorySource.includes('saveRequest.onSaved();'), true);
  assert.equal(acceptInMemorySource.includes('saveRequest.acceptedInMemory = true;'), true);
  assert.equal(
    externalModificationCatchSource.indexOf('acceptCoreSaveRequestInMemory(saveRequest);') <
      externalModificationCatchSource.indexOf(
        'currentHandlers.showCoreIntegrityPrompt(saveRequest);'
      ),
    true
  );
  assert.equal(
    saveAppDataWithExternalCheckSource.includes(
      "state.persistenceBlocked && state.pendingSave?.revision === saveRequest.revision"
    ),
    true
  );
  assert.match(
    commitAppDataUpdateSource,
    /coordinator\.dirtyRevision > coordinator\.persistedRevision[\s\S]*cloneAppData\(latestRealAppDataRef\.current\)[\s\S]*createAppDataFromCoreDocument\(readCoreDocument\(\)\)/
  );
  assert.equal(runtimePersistenceSource.includes("message.includes('Core document was modified outside NetraFlow')"), true);
  assert.equal(securityControllerSource.includes("message.includes('Core document was modified outside NetraFlow')"), true);
});

test('ordinary core saves use one trailing coalescing timer and explicit flush bypasses it', () => {
  const coreSaveCoordinatorSource = readProjectFile('src/app/coreSaveCoordinator.ts');
  const coordinatorTypeSource = coreSaveCoordinatorSource.slice(
    coreSaveCoordinatorSource.indexOf('export type CoreSaveCoordinatorState'),
    coreSaveCoordinatorSource.indexOf('export type CoreSaveTimerApi')
  );
  const pendingSource = coreSaveCoordinatorSource.slice(
    coreSaveCoordinatorSource.indexOf('const hasPendingSaveData ='),
    coreSaveCoordinatorSource.indexOf('const scheduleAutoSave =')
  );
  const saveSource = coreSaveCoordinatorSource.slice(
    coreSaveCoordinatorSource.indexOf('const saveWithExternalModificationCheck ='),
    coreSaveCoordinatorSource.indexOf('const acknowledgePendingSaveWithoutPersisting =')
  );
  const scheduleSource = coreSaveCoordinatorSource.slice(
    coreSaveCoordinatorSource.indexOf('const scheduleAutoSave ='),
    coreSaveCoordinatorSource.indexOf('const performSaveRequest =')
  );

  assert.equal(
    coreSaveCoordinatorSource.includes('export const CORE_AUTO_SAVE_COALESCE_MS = 150;'),
    true
  );
  assert.equal(coordinatorTypeSource.includes('autoSaveTimer: unknown | null;'), true);
  assert.equal(scheduleSource.includes('clearAutoSaveTimer();'), true);
  assert.equal(scheduleSource.includes('getHandlers().timerApi.setTimeout'), true);
  assert.equal(scheduleSource.includes('flushLatestSave(false);'), true);
  assert.equal(saveSource.includes('if (!scheduleOptions.flush)'), true);
  assert.equal(
    saveSource.indexOf('acceptCoreSaveRequestInMemory(saveRequest);') <
      saveSource.indexOf('scheduleAutoSave();'),
    true
  );
  assert.equal(saveSource.includes('clearAutoSaveTimer();'), true);
  assert.equal(pendingSource.includes('state.dirtyRevision > state.persistedRevision'), true);
  assert.equal(pendingSource.includes('state.autoSaveTimer !== null'), true);
  assert.equal(pendingSource.includes('state.saving && state.dirtyRevision > state.persistedRevision'), true);
});

test('close-before uses a single renderer state machine and one-shot main allow close', () => {
  const appSource = readProjectFile('src/App.tsx');
  const mainSource = readProjectFile('electron/mainApplication.ts');
  const closeBeforeControllerSource = readProjectFile('src/app/closeBeforeController.ts');
  const closeBeforeWindowSource = readProjectFile('electron/closeBeforeWindowState.ts');
  const preloadSource = readProjectFile('electron/preload.ts');
  const viteEnvSource = readProjectFile('src/vite-env.d.ts');
  const closeSource = appSource.slice(
    appSource.indexOf('closeBeforeControllerRef.current.setHandlers'),
    appSource.indexOf('useEffect(() => {', appSource.indexOf('const requestControlledAppClose ='))
  );

  assert.equal(closeBeforeControllerSource.includes("export type CloseBeforeState ="), true);
  assert.equal(appSource.includes('const closeBeforeControllerRef = useRef(createCloseBeforeController());'), true);
  assert.equal(closeBeforeControllerSource.includes("state === 'requested'"), true);
  assert.equal(closeBeforeControllerSource.includes("state = 'awaiting-integrity';"), true);
  assert.equal(closeBeforeControllerSource.includes("state = 'saving-before-close';"), true);
  assert.equal(appSource.includes("window.electronAPI?.allowClose"), true);
  assert.equal(closeSource.includes('hasPendingCoreSaveData'), true);
  assert.equal(closeSource.includes('acknowledgePendingSaveWithoutPersisting'), true);
  assert.equal(closeSource.includes('flushPendingSaveForClose: flushLatestCoreSave'), true);
  assert.equal(mainSource.includes('createCloseBeforeWindowCoordinator'), true);
  assert.equal(closeBeforeWindowSource.includes('const windowStates = new WeakMap'), true);
  assert.equal(closeBeforeWindowSource.includes('if (closeState.requested)'), true);
  assert.equal(closeBeforeWindowSource.includes("targetWindow.webContents.send('app:close-request');"), true);
  assert.equal(closeBeforeWindowSource.includes('cancelCloseRequest'), true);
  assert.equal(closeBeforeWindowSource.includes('closeState.allowNextClose = true;'), true);
  assert.equal(closeBeforeWindowSource.includes('closeState.allowNextClose = false;'), true);
  assert.equal(preloadSource.includes("allowClose: () => ipcRenderer.send('window:allow-close')"), true);
  assert.equal(preloadSource.includes("cancelCloseRequest: () => ipcRenderer.send('window:cancel-close-request')"), true);
  assert.equal(viteEnvSource.includes('allowClose?: () => void;'), true);
  assert.equal(viteEnvSource.includes('cancelCloseRequest?: () => void;'), true);
});

test('macOS app quit waits for close approval and defers persistence cleanup until will-quit', () => {
  const mainSource = readProjectFile('electron/mainApplication.ts');
  const shutdownStateSource = readProjectFile('electron/appShutdownState.ts');
  const beforeQuitStart = mainSource.indexOf("app.on('before-quit', (event) => {");
  const willQuitStart = mainSource.indexOf("app.on('will-quit', () => {");
  const beforeQuitSource = mainSource.slice(beforeQuitStart, willQuitStart);
  const willQuitSource = mainSource.slice(
    willQuitStart,
    mainSource.indexOf("app.on('window-all-closed'", willQuitStart)
  );

  assert.ok(beforeQuitStart >= 0);
  assert.ok(willQuitStart > beforeQuitStart);
  assert.equal(shutdownStateSource.includes("| 'window-close-request'"), true);
  assert.equal(shutdownStateSource.includes("| 'app-quit-request'"), true);
  assert.equal(shutdownStateSource.includes("| 'app-quit-approved'"), true);
  assert.equal(shutdownStateSource.includes("| 'destructive-shutdown'"), true);
  assert.equal(mainSource.includes('const appShutdownState = createAppShutdownState();'), true);
  assert.equal(beforeQuitSource.includes("process.platform !== 'darwin'"), true);
  assert.equal(
    beforeQuitSource.includes('appShutdownState.requestAppQuit(Boolean(targetWindow))'),
    true
  );
  assert.equal(beforeQuitSource.includes("appQuitRequest === 'continue-quit'"), true);
  assert.equal(beforeQuitSource.includes("appQuitRequest === 'start-close-approval'"), true);
  assert.equal(beforeQuitSource.includes('event.preventDefault();'), true);
  assert.equal(
    beforeQuitSource.includes('closeBeforeWindows.requestRendererCloseApproval(targetWindow);'),
    true
  );
  assert.equal(beforeQuitSource.includes('cleanupDemoOnAppQuit'), false);
  assert.equal(willQuitSource.includes('cleanupDemoOnAppQuit();'), true);
  assert.equal(mainSource.includes('appShutdownState.cancelCloseRequest();'), true);
  assert.equal(mainSource.includes('appShutdownState.handleWindowClosed();'), true);
  assert.equal(
    mainSource.includes('if (shouldResumeAppQuit) {\n      setTimeout(() => {\n        app.quit();'),
    true
  );
  assert.equal(mainSource.includes('const isAppQuitInProgress = ()'), true);
  assert.equal(mainSource.includes('!isAppQuitInProgress()'), true);
});

test('core integrity dialog exposes only the allowed pending-save actions', () => {
  const appSource = readProjectFile('src/App.tsx');
  const coreIntegrityDialogSource = readProjectFile('src/app/coreIntegrity/CoreIntegrityDialog.tsx');
  const dialogRenderSource = appSource.slice(
    appSource.indexOf('<CoreIntegrityDialog'),
    appSource.indexOf('</CoreIntegrityDialog>') >= 0
      ? appSource.indexOf('</CoreIntegrityDialog>') + '</CoreIntegrityDialog>'.length
      : appSource.indexOf('<ResetDangerDialogLayer')
  );

  assert.equal(dialogRenderSource.includes('!!coreIntegrityPrompt.pendingSave'), true);
  assert.equal(dialogRenderSource.includes('!!coreIntegrityPrompt.onContinueSave'), true);
  assert.equal(coreIntegrityDialogSource.includes('我知道了'), true);
  assert.equal(coreIntegrityDialogSource.includes('继续保存'), true);
  assert.equal(coreIntegrityDialogSource.includes('取消'), false);
  assert.equal(coreIntegrityDialogSource.includes('不保存'), false);
  assert.equal(coreIntegrityDialogSource.includes('退出'), false);
});

test('testdatain remains a hidden data helper and not the ordinary account-save path', () => {
  const appSource = readProjectFile('src/App.tsx');
  const lifecycleSource = readProjectFile('src/app/useAppDataLifecycleController.tsx');
  const accountOperationsSource = readProjectFile(
    'src/features/account/useAccountOperationsController.ts'
  );
  const secretConsoleSource = appSource.slice(
    appSource.indexOf('const runSecretConsoleCommand ='),
    appSource.indexOf('const showSecretConsoleResult =')
  );
  const saveAmountSource = accountOperationsSource.slice(
    accountOperationsSource.indexOf('const performSaveAmount ='),
    accountOperationsSource.indexOf('const performDeleteAccount =')
  );

  assert.equal(secretConsoleSource.includes("command === 'testdatain'"), true);
  assert.equal(secretConsoleSource.includes('writeExampleDataToRealData()'), true);
  assert.equal(lifecycleSource.includes('const writeExampleDataToRealData = () =>'), true);
  assert.equal(lifecycleSource.includes('return writeTestDataToRealData();'), true);
  assert.equal(saveAmountSource.includes('commitAppDataUpdate((latestData)'), true);
  assert.equal(saveAmountSource.includes('testdatain'), false);
  assert.equal(accountOperationsSource.includes('testdatain'), false);
});

test('lock screen brand preserves NetraFlow casing and primary accent styling', () => {
  const lockScreenSource = readProjectFile('src/app/lockScreen/LockScreenLayer.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const lockBrandStyle = stylesSource.match(/\.lock-screen__brand \.eyebrow\s*\{[^}]*\}/s)?.[0] ?? '';

  assert.equal(lockScreenSource.includes('NetraFlow'), true);
  assert.equal(lockScreenSource.includes('NETRAFLOW'), false);
  assert.equal(lockScreenSource.includes('净流'), false);
  assert.equal(lockBrandStyle.includes('color: var(--button-primary-bg);'), true);
  assert.equal(lockBrandStyle.includes('text-transform: none;'), true);
  assert.equal(lockBrandStyle.includes('letter-spacing: 0;'), true);
  assert.equal(lockBrandStyle.includes('var(--accent-text)'), false);
  assert.equal(lockBrandStyle.includes('#9a6b2f'), false);
  assert.equal(lockScreenSource.includes('<InlineErrorSlot id="lock-screen-error" message={error} />'), true);
  assert.equal(lockScreenSource.includes('登录密码错误'), false);
});
