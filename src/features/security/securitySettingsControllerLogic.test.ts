import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveSnapshotEncryptionChangeAction,
  shouldInitializeSecurityLocked
} from './useSecuritySettingsController';

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
