import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeApplicationLockRequest,
  resolveApplicationLockRequest,
  resolveSnapshotEncryptionChangeAction,
  shouldInitializeSecurityLocked
} from './useSecuritySettingsController';

test('a lock request without password protection shows the exact toast and never locks persistence', () => {
  const resolution = resolveApplicationLockRequest({
    applicationLockAllowed: true,
    passwordProtectionEnabled: false,
    isLocked: false,
    isUnlocking: false,
    lockRequestInProgress: false
  });
  const messages: string[] = [];
  let lockCalls = 0;

  executeApplicationLockRequest(resolution, {
    onPasswordProtectionDisabled: () => messages.push('未启用登录密码保护'),
    onLock: () => {
      lockCalls += 1;
    }
  });

  assert.equal(resolution, 'show-password-protection-disabled');
  assert.deepEqual(messages, ['未启用登录密码保护']);
  assert.equal(lockCalls, 0);
});

test('locked, unlocking, disallowed, and in-flight lock requests are ignored', () => {
  const enabled = {
    applicationLockAllowed: true,
    passwordProtectionEnabled: true,
    isLocked: false,
    isUnlocking: false,
    lockRequestInProgress: false
  };

  assert.equal(resolveApplicationLockRequest(enabled), 'lock');
  assert.equal(resolveApplicationLockRequest({ ...enabled, isLocked: true }), 'ignore');
  assert.equal(resolveApplicationLockRequest({ ...enabled, isUnlocking: true }), 'ignore');
  assert.equal(
    resolveApplicationLockRequest({ ...enabled, applicationLockAllowed: false }),
    'ignore'
  );
  assert.equal(
    resolveApplicationLockRequest({ ...enabled, lockRequestInProgress: true }),
    'ignore'
  );
});

test('security lock initializes from actual core lock state', () => {
  assert.equal(
    shouldInitializeSecurityLocked({
      passwordProtectionEnabled: true,
      coreProtectionLocked: true
    }),
    true
  );

  assert.equal(
    shouldInitializeSecurityLocked({
      passwordProtectionEnabled: true,
      coreProtectionLocked: false
    }),
    false
  );

  assert.equal(
    shouldInitializeSecurityLocked({
      passwordProtectionEnabled: false,
      coreProtectionLocked: true
    }),
    false
  );
});

test('snapshot encryption disable requires a password confirmation only when user-controlled', () => {
  assert.equal(
    resolveSnapshotEncryptionChangeAction({
      passwordProtectionEnabled: true,
      forceSnapshotEncryption: false,
      snapshotEncryptionEnabled: true,
      requestedValue: 'no'
    }),
    'open-disable-confirm'
  );

  assert.equal(
    resolveSnapshotEncryptionChangeAction({
      passwordProtectionEnabled: true,
      forceSnapshotEncryption: true,
      snapshotEncryptionEnabled: true,
      requestedValue: 'no'
    }),
    'blocked-by-force-encryption'
  );

  assert.equal(
    resolveSnapshotEncryptionChangeAction({
      passwordProtectionEnabled: false,
      forceSnapshotEncryption: false,
      snapshotEncryptionEnabled: true,
      requestedValue: 'no'
    }),
    'require-login-protection'
  );

  assert.equal(
    resolveSnapshotEncryptionChangeAction({
      passwordProtectionEnabled: true,
      forceSnapshotEncryption: false,
      snapshotEncryptionEnabled: false,
      requestedValue: 'no'
    }),
    'noop'
  );

  assert.equal(
    resolveSnapshotEncryptionChangeAction({
      passwordProtectionEnabled: true,
      forceSnapshotEncryption: false,
      snapshotEncryptionEnabled: false,
      requestedValue: 'yes'
    }),
    'enable-directly'
  );
});
