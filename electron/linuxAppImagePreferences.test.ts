import assert from 'node:assert/strict';
import { chmodSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  clearLinuxAppImageUnsandboxedConsent,
  getLinuxAppImagePreferencesPath,
  readLinuxAppImageUnsandboxedConsent,
  writeLinuxAppImageUnsandboxedConsent
} from './linuxAppImagePreferences.js';

test('launcher consent pure contract rejects missing, malformed, and oversized content', (t) => {
  const temporaryRoot = path.join(os.tmpdir(), `nf-launcher-pref-${process.pid}-${Date.now()}`);
  const filePath = path.join(temporaryRoot, 'NetraFlow', 'launcher-preferences.json');
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));

  assert.equal(readLinuxAppImageUnsandboxedConsent(filePath), false);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, '{"linuxAppImageUnsandboxedConsent":true}');
  assert.equal(readLinuxAppImageUnsandboxedConsent(filePath), false);
  writeFileSync(filePath, 'x'.repeat(129));
  assert.equal(readLinuxAppImageUnsandboxedConsent(filePath), false);
  rmSync(filePath);
  clearLinuxAppImageUnsandboxedConsent(filePath);
  clearLinuxAppImageUnsandboxedConsent(filePath);
});

test('Linux preference path uses stable POSIX XDG and HOME semantics', () => {
  assert.equal(getLinuxAppImagePreferencesPath({ xdgConfigHome: '/config', home: '/home/user' }), '/config/NetraFlow/launcher-preferences.json');
  assert.equal(getLinuxAppImagePreferencesPath({ xdgConfigHome: '', home: '/home/user' }), '/home/user/.config/NetraFlow/launcher-preferences.json');
});

test('POSIX launcher consent is strict, private, atomic, and removable', {
  skip: process.platform === 'win32' ? 'Requires POSIX mode, ownership, O_NOFOLLOW, and atomic rename semantics' : false
}, (t) => {
  const temporaryRoot = path.join(os.tmpdir(), `nf-launcher-pref-posix-${process.pid}-${Date.now()}`);
  const filePath = path.join(temporaryRoot, 'NetraFlow', 'launcher-preferences.json');
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));

  writeLinuxAppImageUnsandboxedConsent(filePath);
  assert.equal(readLinuxAppImageUnsandboxedConsent(filePath), true);
  assert.equal(lstatSync(filePath).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(filePath, 'utf8')), {
    schemaVersion: 1,
    linuxAppImageUnsandboxedConsent: true
  });
  clearLinuxAppImageUnsandboxedConsent(filePath);
  assert.equal(readLinuxAppImageUnsandboxedConsent(filePath), false);
});

test('POSIX launcher consent rejects symbolic links and unsafe permissions', {
  skip: process.platform === 'win32' ? 'Requires POSIX symlink, mode, and ownership semantics' : false
}, (t) => {
  const temporaryRoot = path.join(os.tmpdir(), `nf-launcher-pref-unsafe-${process.pid}-${Date.now()}`);
  const target = path.join(temporaryRoot, 'target');
  const link = path.join(temporaryRoot, 'link');
  mkdirSync(temporaryRoot, { recursive: true });
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
  writeFileSync(target, '{"linuxAppImageUnsandboxedConsent":true}');
  chmodSync(target, 0o600);
  symlinkSync(target, link);
  assert.equal(readLinuxAppImageUnsandboxedConsent(target), false);
  assert.equal(readLinuxAppImageUnsandboxedConsent(link), false);
  writeFileSync(target, '{"schemaVersion":1,"linuxAppImageUnsandboxedConsent":true}\n');
  chmodSync(target, 0o644);
  assert.equal(readLinuxAppImageUnsandboxedConsent(target), false);
});
