import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rootDir = process.cwd();
const readSource = (relativePath: string) =>
  readFileSync(path.join(rootDir, relativePath), 'utf8');

test('password editor is content-driven with strength directly after the new password', () => {
  const dialogSource = readSource('src/features/settings/PasswordEditorDialog.tsx');
  const styles = readSource('src/styles.css');
  const fieldStyles = styles.match(/\.password-editor-dialog__fields \{[^}]*\}/s)?.[0] ?? '';
  const newPasswordStyles = styles.match(
    /\.password-editor-dialog__new-password \{[^}]*\}/s
  )?.[0] ?? '';
  const newPasswordIndex = dialogSource.indexOf('新密码');
  const strengthIndex = dialogSource.indexOf('password-editor-dialog__strength');
  const confirmPasswordIndex = dialogSource.indexOf('确认新密码');

  assert.match(dialogSource, /isEditingExistingPassword \? \(/);
  assert.ok(newPasswordIndex >= 0 && newPasswordIndex < strengthIndex);
  assert.ok(strengthIndex < confirmPasswordIndex);
  assert.match(fieldStyles, /gap:\s*16px/);
  assert.match(newPasswordStyles, /gap:\s*7px/);
  assert.doesNotMatch(dialogSource, /backdropStyle|cardStyle|marginTop|minHeight|height:/);
  assert.doesNotMatch(dialogSource, /<InlineErrorSlot[^>]+message=\{''\}/);
  assert.match(dialogSource, /\{formError \? \(/);
  assert.doesNotMatch(fieldStyles + newPasswordStyles, /height:|min-height:|space-between/);
});

test('password strength remains in the form and is absent from every save-success toast path', () => {
  const dialogSource = readSource('src/features/settings/PasswordEditorDialog.tsx');
  const controllerSource = readSource(
    'src/features/security/useSecuritySettingsController.tsx'
  );

  assert.equal(dialogSource.includes('estimatePasswordTryLevel(newPassword)'), true);
  assert.equal(controllerSource.includes('密码强度：'), false);
  assert.equal(controllerSource.includes('estimatePasswordTryLevel'), false);
  assert.equal(controllerSource.includes('showToast(estimatePasswordTryLevel'), false);
});

test('disable-password dialog removes the eyebrow without leaving an empty placeholder', () => {
  const layerSource = readSource(
    'src/app/snapshotSecurityDialogs/SnapshotSecurityDialogLayer.tsx'
  );

  assert.equal(layerSource.includes('登录密码确认'), false);
  assert.equal(layerSource.includes('title="关闭密码保护"'), true);
  assert.equal(layerSource.includes('请输入当前登录密码'), true);
  assert.equal(layerSource.includes('登录密码'), true);
  assert.equal(layerSource.includes('确认关闭'), true);
  assert.equal(layerSource.includes('eyebrow'), false);
});

test('main and renderer expose separate lock readiness, password, and lifecycle states', () => {
  const mainSource = readSource('electron/mainApplication.ts');
  const controllerSource = readSource(
    'src/features/security/useSecuritySettingsController.tsx'
  );
  const lockHandlerStart = controllerSource.indexOf('api.onNetraFlowLock(() => {');
  const lockHandlerSource = controllerSource.slice(
    lockHandlerStart,
    controllerSource.indexOf('\n  }, [', lockHandlerStart)
  );

  assert.equal(mainSource.includes('rendererCanLock'), false);
  assert.equal(mainSource.includes('rendererReadyForLockCommand'), true);
  assert.equal(mainSource.includes('rendererPasswordProtectionEnabled'), true);
  assert.equal(mainSource.includes('rendererIsLocked'), true);
  assert.equal(mainSource.includes('rendererIsUnlocking'), true);
  assert.equal(mainSource.includes('lockRequestInProgress'), true);
  assert.equal(lockHandlerSource.includes("showToast('未启用登录密码保护', 'info')"), true);
  assert.equal(lockHandlerSource.includes("showToast('请先启用登录密码保护', 'info')"), false);
  assert.equal(lockHandlerSource.includes('api.completeLockRequest?.();'), true);
});
