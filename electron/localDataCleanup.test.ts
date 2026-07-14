import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';

import {
  assertAllowedManagedDataDeletionPath,
  clearManagedLocalData,
  createManagedDataDeletionPlan,
  createSingleRunCleanupCoordinator,
  type ManagedDataDeletionContext
} from './localDataCleanup.js';
import type { StorageLayout } from './storageLayout.js';

const createPosixContext = (t: TestContext) => {
  const testRoot = mkdtempSync(path.join(tmpdir(), 'netraflow-cleanup-'));
  const root = path.join(testRoot, 'NetraFlow');
  const layout: StorageLayout = {
    root,
    userdata: path.join(root, 'userdata'),
    runtime: path.join(root, 'runtime'),
    demo: path.join(root, '.demo'),
    sessionData: path.join(root, 'runtime', 'sessionData'),
    cache: path.join(root, 'runtime', 'cache'),
    logs: path.join(root, 'runtime', 'logs'),
    crashDumps: path.join(root, 'runtime', 'crashDumps')
  };
  const context: ManagedDataDeletionContext = {
    layout,
    platform: process.platform,
    appPath: path.join(root, 'resources', 'app.asar'),
    execPath: path.join(root, process.platform === 'win32' ? 'NetraFlow.exe' : 'NetraFlow'),
    homePath: path.join(testRoot, 'home')
  };

  t.after(() => {
    rmSync(testRoot, { recursive: true, force: true });
  });

  return { context, layout, testRoot };
};

test('managed deletion plan contains only userdata, runtime, and demo', (t) => {
  const { context, layout, testRoot } = createPosixContext(t);
  const plan = createManagedDataDeletionPlan(context);

  assert.deepEqual(plan, [
    { kind: 'demo', path: path.resolve(layout.demo) },
    { kind: 'userdata', path: path.resolve(layout.userdata) },
    { kind: 'runtime', path: path.resolve(layout.runtime) }
  ]);

  assert.equal(assertAllowedManagedDataDeletionPath(layout.userdata, context).kind, 'userdata');
  assert.equal(assertAllowedManagedDataDeletionPath(layout.runtime, context).kind, 'runtime');
  assert.equal(assertAllowedManagedDataDeletionPath(layout.demo, context).kind, 'demo');
  assert.throws(() => assertAllowedManagedDataDeletionPath(layout.root, context));
  assert.throws(() =>
    assertAllowedManagedDataDeletionPath(path.dirname(layout.root), context)
  );
  assert.throws(() => assertAllowedManagedDataDeletionPath(context.execPath, context));
  assert.throws(() =>
    assertAllowedManagedDataDeletionPath(path.join(testRoot, 'exports'), context)
  );
});

test('managed deletion validation rejects unsafe or overlapping layouts', (t) => {
  const { context, layout } = createPosixContext(t);

  assert.throws(() =>
    createManagedDataDeletionPlan({
      ...context,
      layout: {
        ...layout,
        userdata: layout.root
      }
    })
  );
  assert.throws(() =>
    createManagedDataDeletionPlan({
      ...context,
      layout: {
        ...layout,
        runtime: path.join(layout.userdata, 'runtime')
      }
    })
  );
});

test('Windows deletion validation keeps the executable and install root protected', () => {
  const root = String.raw`E:\NetraFlow`;
  const layout: StorageLayout = {
    root,
    userdata: String.raw`E:\NetraFlow\userdata`,
    runtime: String.raw`E:\NetraFlow\runtime`,
    demo: String.raw`E:\NetraFlow\.demo`,
    sessionData: String.raw`E:\NetraFlow\runtime\sessionData`,
    cache: String.raw`E:\NetraFlow\runtime\cache`,
    logs: String.raw`E:\NetraFlow\runtime\logs`,
    crashDumps: String.raw`E:\NetraFlow\runtime\crashDumps`
  };
  const context: ManagedDataDeletionContext = {
    layout,
    platform: 'win32',
    appPath: String.raw`E:\NetraFlow\resources\app.asar`,
    execPath: String.raw`E:\NetraFlow\NetraFlow.exe`,
    homePath: String.raw`C:\Users\tester`
  };

  assert.deepEqual(
    createManagedDataDeletionPlan(context).map((target) => target.path),
    [layout.demo, layout.userdata, layout.runtime]
  );
  assert.throws(() => assertAllowedManagedDataDeletionPath(root, context));
  assert.throws(() =>
    assertAllowedManagedDataDeletionPath('E:\\', context)
  );
  assert.throws(() =>
    assertAllowedManagedDataDeletionPath(String.raw`D:\Exports`, context)
  );
});

test('cleanup removes managed data in order without touching exports or application files', async (t) => {
  const { context, layout, testRoot } = createPosixContext(t);
  const applicationFile = context.execPath;
  const externalSnapshot = path.join(testRoot, 'exports', 'netraflow-snapshot.json');
  const events: string[] = [];

  [layout.userdata, layout.runtime, layout.demo, path.dirname(applicationFile), path.dirname(externalSnapshot)]
    .forEach((directoryPath) => mkdirSync(directoryPath, { recursive: true }));
  writeFileSync(path.join(layout.userdata, 'core.json'), 'core', 'utf8');
  writeFileSync(path.join(layout.runtime, 'Local State'), 'runtime', 'utf8');
  writeFileSync(path.join(layout.demo, 'core.json'), 'demo', 'utf8');
  writeFileSync(applicationFile, 'application', 'utf8');
  writeFileSync(externalSnapshot, 'snapshot', 'utf8');

  const result = await clearManagedLocalData({
    plan: createManagedDataDeletionPlan(context),
    session: {
      closeAllConnections: async () => {
        events.push('close-session-connections');
      },
      clearData: async () => {
        events.push('clear-session-data');
      },
      clearCache: async () => {
        events.push('clear-session-cache');
      }
    },
    removeManagedDirectory: async (directoryPath) => {
      events.push(`delete:${path.basename(directoryPath)}`);
      await rm(directoryPath, { recursive: true, force: true });
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(events, [
    'delete:.demo',
    'delete:userdata',
    'close-session-connections',
    'clear-session-data',
    'clear-session-cache',
    'delete:runtime'
  ]);
  assert.equal(existsSync(layout.userdata), false);
  assert.equal(existsSync(layout.runtime), false);
  assert.equal(existsSync(layout.demo), false);
  assert.equal(readFileSync(applicationFile, 'utf8'), 'application');
  assert.equal(readFileSync(externalSnapshot, 'utf8'), 'snapshot');
  assert.equal(existsSync(layout.root), true);
});

test('single-run cleanup coordinator reuses the first request', async () => {
  const inputs: string[] = [];
  const coordinator = createSingleRunCleanupCoordinator(async (input: string) => {
    inputs.push(input);
    return `cleared:${input}`;
  });

  const first = coordinator.request('first');
  const second = coordinator.request('second');

  assert.equal(coordinator.hasStarted(), true);
  assert.equal(first, second);
  assert.equal(await first, 'cleared:first');
  assert.deepEqual(inputs, ['first']);
});
