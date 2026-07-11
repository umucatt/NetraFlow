import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSISTENCE_SHUTTING_DOWN_ERROR,
  runWithPersistenceShutdownGuard
} from './persistenceShutdownGuard.js';

test('persistence shutdown guard rejects work after destructive shutdown', () => {
  let calls = 0;
  const result = runWithPersistenceShutdownGuard(
    () => true,
    () => {
      calls += 1;
      return { ok: true as const };
    }
  );

  assert.equal(calls, 0);
  assert.deepEqual(result, PERSISTENCE_SHUTTING_DOWN_ERROR);
});

test('persistence shutdown guard preserves ordinary persistence behavior', () => {
  let calls = 0;
  const result = runWithPersistenceShutdownGuard(
    () => false,
    () => {
      calls += 1;
      return { ok: true as const };
    }
  );

  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});
