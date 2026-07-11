import assert from 'node:assert/strict';
import path from 'node:path';
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

const isWithinDirectory = (candidatePath: string, directory: string) => {
  const relativePath = path.relative(directory, candidatePath);
  return relativePath === '' || (relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`));
};

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
    assert.equal(path.isAbsolute(socketPath), true);
    assert.equal(socketPath.length < 104, true);
    assert.equal(socketPath.includes(process.env.HOME ?? ''), false);
    assert.equal(socketPath.includes('netraflow-com-netraflow-app-single-instance'), false);
    assert.equal(isWithinDirectory(socketPath, process.cwd()), false);
    assert.equal(isWithinDirectory(socketPath, path.dirname(process.execPath)), false);
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
  if (process.platform !== 'win32') {
    return;
  }

  const pipePath = createTaskPipePath();
  let activationCount = 0;
  const first = createProductInstanceCoordinator({
    pipePath,
    onActivate: () => {
      activationCount += 1;
    }
  });
  const second = createProductInstanceCoordinator({ pipePath });
  const third = createProductInstanceCoordinator({ pipePath });

  t.after(async () => {
    await third.release();
    await second.release();
    await first.release();
  });

  assert.equal(PRODUCT_INSTANCE_PIPE_PATH, '\\\\.\\pipe\\netraflow-com-netraflow-app-single-instance');
  assert.equal(await first.acquire(), true);

  assert.equal(await second.acquire(), false);
  await waitFor(() => activationCount > 0);
  await first.release();

  assert.equal(await third.acquire(), true);
});
