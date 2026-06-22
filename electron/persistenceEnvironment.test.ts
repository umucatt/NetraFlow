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

const createRoots = (t: TestContext) => {
  const execDir = mkdtempSync(path.join(tmpdir(), 'netraflow-demo-env-'));

  t.after(() => {
    rmSync(execDir, { recursive: true, force: true });
  });

  return createPersistenceEnvironmentRoots({
    execDir,
    execPath: path.join(execDir, 'NetraFlow.exe')
  });
};

test('demo roots resolve as sibling demo and userdata directories under exe dir', (t) => {
  const roots = createRoots(t);

  assert.equal(roots.root, roots.execDir);
  assert.equal(roots.realRoot, path.join(roots.execDir, 'userdata'));
  assert.equal(roots.demoRoot, path.join(roots.execDir, '.demo'));
  assert.equal(roots.demoRoot.startsWith(roots.realRoot), false);
  assert.deepEqual(assertSafeDemoRoot(roots), { ok: true });
});

test('development persistence roots use app root instead of Electron binary directory', () => {
  const appRoot = path.join('D:', 'project', 'NF_dev');
  const electronExecPath = path.join(
    appRoot,
    'node_modules',
    'electron',
    'dist',
    'electron.exe'
  );
  const roots = createPersistenceEnvironmentRoots({
    root: appRoot,
    execPath: electronExecPath
  });
  const electronDistFragment = path.join('node_modules', 'electron', 'dist');

  assert.equal(roots.realRoot, path.join(path.resolve(appRoot), 'userdata'));
  assert.equal(roots.demoRoot, path.join(path.resolve(appRoot), '.demo'));
  assert.equal(roots.realRoot.includes(electronDistFragment), false);
  assert.equal(roots.demoRoot.includes(electronDistFragment), false);
  assert.deepEqual(assertSafeDemoRoot(roots), { ok: true });
});

test('packaged persistence roots keep using the executable directory', () => {
  const execPath = path.join('C:', 'Program Files', 'NetraFlow', 'NetraFlow.exe');
  const roots = createPersistenceEnvironmentRoots({ execPath });
  const exeDir = path.dirname(execPath);

  assert.equal(roots.root, path.resolve(exeDir));
  assert.equal(roots.realRoot, path.join(path.resolve(exeDir), 'userdata'));
  assert.equal(roots.demoRoot, path.join(path.resolve(exeDir), '.demo'));
});

test('portable persistence roots remain based on the portable executable directory', () => {
  const execPath = path.join('E:', 'Apps', 'NetraFlow_0.9.8', 'NetraFlow.exe');
  const roots = createPersistenceEnvironmentRoots({ execPath });
  const exeDir = path.dirname(execPath);

  assert.equal(roots.root, path.resolve(exeDir));
  assert.equal(roots.realRoot, path.join(path.resolve(exeDir), 'userdata'));
  assert.equal(roots.demoRoot, path.join(path.resolve(exeDir), '.demo'));
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
    { ...roots, demoRoot: roots.execDir },
    { ...roots, demoRoot: roots.realRoot },
    { ...roots, demoRoot: path.join(roots.realRoot, '.demo') },
    { ...roots, demoRoot: path.dirname(roots.execDir) }
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
