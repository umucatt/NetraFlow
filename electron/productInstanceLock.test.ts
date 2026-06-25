import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  PRODUCT_INSTANCE_PIPE_PATH,
  createProductInstanceCoordinator
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

test('product instance coordinator blocks a second process activates the first and releases', async (t) => {
  if (process.platform !== 'win32') {
    return;
  }

  const pipePath = createTaskPipePath();
  const firstCwd = process.cwd();
  const taskTempRoot = path.join(firstCwd, '.tmp-core-protection');
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
    process.chdir(firstCwd);
    await third.release();
    await second.release();
    await first.release();
  });

  assert.equal(PRODUCT_INSTANCE_PIPE_PATH, '\\\\.\\pipe\\netraflow-com-netraflow-app-single-instance');
  assert.equal(await first.acquire(), true);

  mkdirSync(taskTempRoot, { recursive: true });
  process.chdir(taskTempRoot);

  assert.equal(await second.acquire(), false);
  await waitFor(() => activationCount > 0);

  process.chdir(firstCwd);
  await first.release();

  assert.equal(await third.acquire(), true);
});
