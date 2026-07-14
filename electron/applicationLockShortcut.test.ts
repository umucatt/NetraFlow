import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  LOCK_ACCELERATOR,
  canRequestRendererLockCommand,
  isApplicationLockShortcut,
  type ApplicationLockShortcutInput
} from './applicationLockShortcut.js';

const createInput = (
  overrides: Partial<ApplicationLockShortcutInput> = {}
): ApplicationLockShortcutInput => ({
  type: 'keyDown',
  key: 'l',
  shift: true,
  control: true,
  meta: false,
  alt: false,
  isAutoRepeat: false,
  isComposing: false,
  ...overrides
});

test('lock accelerator keeps the product-level cross-platform spelling', () => {
  assert.equal(LOCK_ACCELERATOR, 'CommandOrControl+Shift+L');
});

test('lock shortcut uses Command on macOS and Control on Windows and Linux', () => {
  assert.equal(isApplicationLockShortcut('darwin', createInput({ control: false, meta: true })), true);
  assert.equal(isApplicationLockShortcut('darwin', createInput()), false);
  assert.equal(isApplicationLockShortcut('win32', createInput()), true);
  assert.equal(isApplicationLockShortcut('win32', createInput({ control: false, meta: true })), false);
  assert.equal(isApplicationLockShortcut('linux', createInput()), true);
});

test('lock shortcut rejects incomplete, alternate, repeated, composition, and key-up input', () => {
  assert.equal(isApplicationLockShortcut('win32', createInput({ shift: false })), false);
  assert.equal(isApplicationLockShortcut('win32', createInput({ alt: true })), false);
  assert.equal(isApplicationLockShortcut('win32', createInput({ key: 'k' })), false);
  assert.equal(isApplicationLockShortcut('win32', createInput({ type: 'keyUp' })), false);
  assert.equal(isApplicationLockShortcut('win32', createInput({ isAutoRepeat: true })), false);
  assert.equal(isApplicationLockShortcut('win32', createInput({ isComposing: true })), false);
});

test('renderer lock state keeps password availability separate from readiness and duplicate gates', () => {
  const enabled = {
    rendererReady: true,
    applicationLockAllowed: true,
    passwordProtectionEnabled: true,
    isLocked: false,
    isUnlocking: false,
    lockRequestInProgress: false,
    isDestructiveShutdown: false,
    isAppQuitInProgress: false,
    hasUsableWindow: true
  };

  assert.equal(canRequestRendererLockCommand(enabled), true);
  assert.equal(
    canRequestRendererLockCommand({ ...enabled, passwordProtectionEnabled: false }),
    true
  );
  assert.equal(canRequestRendererLockCommand({ ...enabled, rendererReady: false }), false);
  assert.equal(canRequestRendererLockCommand({ ...enabled, applicationLockAllowed: false }), false);
  assert.equal(canRequestRendererLockCommand({ ...enabled, isLocked: true }), false);
  assert.equal(canRequestRendererLockCommand({ ...enabled, isUnlocking: true }), false);
  assert.equal(canRequestRendererLockCommand({ ...enabled, lockRequestInProgress: true }), false);
  assert.equal(canRequestRendererLockCommand({ ...enabled, isDestructiveShutdown: true }), false);
  assert.equal(canRequestRendererLockCommand({ ...enabled, isAppQuitInProgress: true }), false);
  assert.equal(canRequestRendererLockCommand({ ...enabled, hasUsableWindow: false }), false);
});

test('main-process shortcut integration stays application-local', () => {
  const mainSource = readFileSync('electron/mainApplication.ts', 'utf8');

  assert.equal(mainSource.includes("webContents.on('before-input-event'"), true);
  assert.equal(mainSource.includes('globalShortcut'), false);
});
