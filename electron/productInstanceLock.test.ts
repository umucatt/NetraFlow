import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import test from 'node:test';

import {
  PRODUCT_INSTANCE_PIPE_PATH,
  createProductInstanceCoordinator,
  getInstanceLockPath
} from './productInstanceLock.js';

const createTaskPipePath = () =>
  `\\\\.\\pipe\\netraflow-test-${process.pid}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

const waitFor = async (predicate: () => boolean) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 1000) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  assert.equal(predicate(), true);
};

const isWithinPosixDirectory = (candidatePath: string, directory: string) => {
  const relativePath = path.posix.relative(directory, candidatePath);
  return relativePath === '' || (relativePath !== '..' && !relativePath.startsWith('../'));
};
let posixSocketUnavailable = false;

test('instance lock paths use the Windows pipe and short UID-isolated POSIX sockets', () => {
  const windowsPath = getInstanceLockPath({ platform: 'win32' });
  const macPath = getInstanceLockPath({ platform: 'darwin', getuid: () => 501 });
  const linuxPath = getInstanceLockPath({ platform: 'linux', getuid: () => 1000 });
  const otherLinuxPath = getInstanceLockPath({ platform: 'linux', getuid: () => 1001 });

  assert.equal(windowsPath, '\\\\.\\pipe\\netraflow-com-netraflow-app-single-instance');
  assert.equal(macPath, '/tmp/netraflow-501.sock');
  assert.equal(linuxPath, '/tmp/netraflow-1000.sock');
  assert.equal(otherLinuxPath, '/tmp/netraflow-1001.sock');
  assert.notEqual(linuxPath, otherLinuxPath);
  assert.equal(getInstanceLockPath({ platform: 'linux', getuid: () => 1000 }), linuxPath);

  for (const socketPath of [macPath, linuxPath]) {
    assert.equal(path.posix.isAbsolute(socketPath), true);
    assert.equal(socketPath.length < 104, true);
    for (const homePath of ['/home/netraflow-test-user', 'C:\\Users\\netraflow-test-user']) {
      assert.equal(socketPath.includes(homePath), false);
    }
    assert.equal(socketPath.includes('netraflow-com-netraflow-app-single-instance'), false);
    assert.equal(isWithinPosixDirectory(socketPath, pathToFileURL(process.cwd()).pathname), false);
    assert.equal(
      isWithinPosixDirectory(socketPath, path.posix.dirname(pathToFileURL(process.execPath).pathname)),
      false
    );
  }
});

test('POSIX instance locks fail explicitly when a valid UID is unavailable', () => {
  assert.throws(
    () => getInstanceLockPath({ platform: 'linux', getuid: () => undefined }),
    /Cannot determine a valid POSIX user ID/
  );
  assert.throws(
    () => getInstanceLockPath({ platform: 'darwin', getuid: () => -1 }),
    /Cannot determine a valid POSIX user ID/
  );
});

test('product instance coordinator blocks a second process activates the first and releases', async (t) => {
  const pipePath = process.platform === 'win32'
    ? createTaskPipePath()
    : path.join(await mkdtemp(path.join(process.cwd(), '.tmp-tests', 'netraflow-lock-active-')), 'instance.sock');
  let activationCount = 0;
  const lockErrors: Array<{ code?: unknown }> = [];
  const first = createProductInstanceCoordinator({
    pipePath,
    expectedSocketPath: pipePath,
    onActivate: () => {
      activationCount += 1;
    },
    logger: { error: (_message, details) => lockErrors.push(details as { code?: unknown }) }
  });
  const second = createProductInstanceCoordinator({ pipePath, expectedSocketPath: pipePath });
  const third = createProductInstanceCoordinator({ pipePath, expectedSocketPath: pipePath });

  t.after(async () => {
    await third.release();
    await second.release();
    await first.release();
  });

  assert.equal(PRODUCT_INSTANCE_PIPE_PATH, '\\\\.\\pipe\\netraflow-com-netraflow-app-single-instance');
  const acquired = await first.acquire();
  if (process.platform !== 'win32' && !acquired && lockErrors.some((error) => error.code === 'EPERM')) {
    posixSocketUnavailable = true;
    t.skip('Unix socket listeners are unavailable in the test sandbox');
    return;
  }
  assert.equal(acquired, true);

  assert.equal(await second.acquire(), false);
  await waitFor(() => activationCount > 0);
  await first.release();

  assert.equal(await third.acquire(), true);
});

test('resetting state keeps waiters connected and one automatically takes ownership', async (t) => {
  const directory = await mkdtemp(path.join(process.cwd(), '.tmp-tests', 'netraflow-lock-resetting-'));
  const pipePath = process.platform === 'win32' ? createTaskPipePath() : path.join(directory, 'instance.sock');
  let state: 'active' | 'resetting' = 'active';
  let activations = 0;
  let resettingWaiters = 0;
  const errors: Array<{ code?: unknown }> = [];
  const owner = createProductInstanceCoordinator({
    pipePath,
    expectedSocketPath: pipePath,
    getState: () => state,
    onResettingWaiter: () => { resettingWaiters += 1; },
    onActivate: () => { activations += 1; },
    logger: { error: (_message, details) => errors.push(details as { code?: unknown }) }
  });
  const waiterA = createProductInstanceCoordinator({ pipePath, expectedSocketPath: pipePath });
  const waiterB = createProductInstanceCoordinator({ pipePath, expectedSocketPath: pipePath });
  t.after(async () => {
    await waiterB.release();
    await waiterA.release();
    await owner.release();
    await rm(directory, { recursive: true, force: true });
  });
  const acquired = await owner.acquire();
  if (!acquired && errors.some((error) => error.code === 'EPERM')) {
    t.skip('Unix socket listeners are unavailable in the test sandbox');
    return;
  }
  assert.equal(acquired, true);
  state = 'resetting';
  let waiterASettled = false;
  const resultA = waiterA.acquire().then((result) => { waiterASettled = true; return result; });
  const resultB = waiterB.acquire();
  await waitFor(() => resettingWaiters === 2);
  assert.equal(waiterASettled, false);
  assert.equal(activations, 0);
  await owner.release();
  const results = await Promise.all([resultA, resultB]);
  assert.deepEqual(results.sort(), [false, true]);
});

test('active state reports normal activation without waiting for takeover', async (t) => {
  const directory = await mkdtemp(path.join(process.cwd(), '.tmp-tests', 'netraflow-lock-state-active-'));
  const pipePath = process.platform === 'win32' ? createTaskPipePath() : path.join(directory, 'instance.sock');
  let activated = false;
  const errors: Array<{ code?: unknown }> = [];
  const owner = createProductInstanceCoordinator({
    pipePath,
    expectedSocketPath: pipePath,
    getState: () => 'active',
    onActivate: () => { activated = true; },
    logger: { error: (_message, details) => errors.push(details as { code?: unknown }) }
  });
  const contender = createProductInstanceCoordinator({ pipePath, expectedSocketPath: pipePath });
  t.after(async () => {
    await contender.release();
    await owner.release();
    await rm(directory, { recursive: true, force: true });
  });
  const acquired = await owner.acquire();
  if (!acquired && errors.some((error) => error.code === 'EPERM')) {
    t.skip('Unix socket listeners are unavailable in the test sandbox');
    return;
  }
  assert.equal(acquired, true);
  assert.equal(await contender.acquire(), false);
  await waitFor(() => activated);
});

test('product instance lock requests stay distinct from ordinary activation', async (t) => {
  const directory = await mkdtemp(path.join(process.cwd(), '.tmp-tests', 'netraflow-lock-command-'));
  const pipePath = process.platform === 'win32' ? createTaskPipePath() : path.join(directory, 'instance.sock');
  let activations = 0;
  let locks = 0;
  const errors: Array<{ code?: unknown }> = [];
  const owner = createProductInstanceCoordinator({
    pipePath,
    expectedSocketPath: pipePath,
    onActivate: () => { activations += 1; },
    onLock: () => { locks += 1; },
    logger: { error: (_message, details) => errors.push(details as { code?: unknown }) }
  });
  const lockContender = createProductInstanceCoordinator({
    pipePath,
    expectedSocketPath: pipePath,
    message: 'lock'
  });
  t.after(async () => {
    await lockContender.release();
    await owner.release();
    await rm(directory, { recursive: true, force: true });
  });

  const acquired = await owner.acquire();
  if (!acquired && errors.some((error) => error.code === 'EPERM')) {
    t.skip('Unix socket listeners are unavailable in the test sandbox');
    return;
  }
  assert.equal(acquired, true);
  assert.equal(await lockContender.acquire(), false);
  await waitFor(() => locks === 1);
  assert.equal(activations, 0);
});

test('POSIX stale socket recovery validates type owner and exact path', async (t) => {
  if (process.platform === 'win32' || !process.getuid) return;
  if (posixSocketUnavailable) {
    t.skip('Unix socket listeners are unavailable in the test sandbox');
    return;
  }
  const directory = await mkdtemp(path.join(process.cwd(), '.tmp-tests', 'netraflow-lock-stale-'));
  const socketPath = path.join(directory, 'instance.sock');
  t.after(() => rm(directory, { recursive: true, force: true }));

  const child = spawn(process.execPath, ['-e', `
    const net = require('node:net');
    const server = net.createServer();
    server.on('error', (error) => { process.stdout.write('unsupported:' + error.code + '\\n'); process.exit(0); });
    server.listen(${JSON.stringify(socketPath)}, () => process.stdout.write('ready\\n'));
    setInterval(() => {}, 1000);
  `], { stdio: ['ignore', 'pipe', 'inherit'] });
  const childStatus = await new Promise<string>((resolve, reject) => {
    child.stdout.once('data', (data) => resolve(String(data).trim()));
    child.once('error', reject);
  });
  if (childStatus === 'unsupported:EPERM') {
    t.skip('Unix socket listeners are unavailable in the test sandbox');
    return;
  }
  assert.equal(childStatus, 'ready');
  child.kill('SIGKILL');
  await new Promise<void>((resolve) => child.once('exit', () => resolve()));

  const recovered = createProductInstanceCoordinator({
    pipePath: socketPath,
    expectedSocketPath: socketPath
  });
  assert.equal(await recovered.acquire(), true);
  await recovered.release();

  await writeFile(socketPath, 'not a socket');
  const regularFile = createProductInstanceCoordinator({
    pipePath: socketPath,
    expectedSocketPath: socketPath
  });
  assert.equal(await regularFile.acquire(), false);
  await rm(socketPath);

  await symlink(path.join(directory, 'missing'), socketPath);
  const symbolicLink = createProductInstanceCoordinator({
    pipePath: socketPath,
    expectedSocketPath: socketPath
  });
  assert.equal(await symbolicLink.acquire(), false);
  await rm(socketPath);
});
