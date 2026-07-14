import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';

import {
  assertSafeDemoRoot,
  cleanupDemoDirectory,
  createPersistenceEnvironmentRoots,
  preflightDemoDirectory
} from './persistenceEnvironment.js';
import { createStorageLayout } from './storageLayout.js';

const createRoots = (t: TestContext) => {
  const root = mkdtempSync(path.join(tmpdir(), 'netraflow-demo-env-'));

  t.after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const layout = createStorageLayout({
    platform: process.platform,
    isPackaged: false,
    isPortable: false,
    execPath: path.join(root, process.platform === 'win32' ? 'NetraFlow.exe' : 'netraflow'),
    appPath: root,
    defaultUserDataPath: path.join(root, 'ignored-platform-userdata')
  });

  return createPersistenceEnvironmentRoots(layout);
};

test('persistence environment consumes real and demo roots from StorageLayout', (t) => {
  const roots = createRoots(t);

  assert.equal(roots.realRoot, path.join(roots.root, 'userdata'));
  assert.equal(roots.demoRoot, path.join(roots.root, '.demo'));
  assert.equal(roots.demoRoot.startsWith(roots.realRoot), false);
  assert.deepEqual(assertSafeDemoRoot(roots), { ok: true });
});

test('demo preflight deletes stale demo and verifies writable directory', (t) => {
  const roots = createRoots(t);
  const staleFile = path.join(roots.demoRoot, 'core.json');

  mkdirSync(roots.demoRoot);
  writeFileSync(staleFile, '{"stale":true}', 'utf8');

  assert.deepEqual(preflightDemoDirectory(roots), { ok: true });
  assert.equal(existsSync(roots.demoRoot), true);
  assert.equal(existsSync(staleFile), false);

  const liveFile = path.join(roots.demoRoot, 'settings.json');
  writeFileSync(liveFile, '{"live":true}', 'utf8');

  assert.deepEqual(cleanupDemoDirectory(roots), { ok: true, removed: true });
  assert.equal(existsSync(roots.demoRoot), false);
});

test('demo cleanup refuses dangerous paths before recursive removal', (t) => {
  const roots = createRoots(t);
  const unsafeCases = [
    { ...roots, demoRoot: roots.root },
    { ...roots, demoRoot: roots.realRoot },
    { ...roots, demoRoot: path.join(roots.realRoot, '.demo') },
    { ...roots, demoRoot: path.dirname(roots.root) }
  ];

  for (const unsafeRoots of unsafeCases) {
    const result = cleanupDemoDirectory(unsafeRoots);

    assert.equal(result.ok, false);
    assert.equal(result.ok ? '' : result.code, 'DEMO_PATH_UNSAFE');
  }
});

test('demo cleanup removes only the fixed demo directory', (t) => {
  const roots = createRoots(t);
  const realCore = path.join(roots.realRoot, 'core.json');
  const demoCore = path.join(roots.demoRoot, 'core.json');

  mkdirSync(roots.realRoot);
  mkdirSync(roots.demoRoot);
  writeFileSync(realCore, '{"real":true}', 'utf8');
  writeFileSync(demoCore, '{"demo":true}', 'utf8');

  const cleanup = cleanupDemoDirectory(roots);

  assert.deepEqual(cleanup, { ok: true, removed: true });
  assert.equal(readFileSync(realCore, 'utf8'), '{"real":true}');
  assert.equal(existsSync(demoCore), false);
});
