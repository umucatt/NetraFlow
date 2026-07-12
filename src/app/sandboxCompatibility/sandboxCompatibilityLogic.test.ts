import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canConfirmSandboxCompatibility,
  getSandboxConsentSecondsRemaining
} from './sandboxCompatibilityLogic.js';

test('sandbox consent countdown uses monotonic elapsed time and waits five seconds', () => {
  assert.equal(getSandboxConsentSecondsRemaining(100, 100), 5);
  assert.equal(getSandboxConsentSecondsRemaining(100, 1100), 4);
  assert.equal(getSandboxConsentSecondsRemaining(100, 4100), 1);
  assert.equal(getSandboxConsentSecondsRemaining(100, 5099), 1);
  assert.equal(getSandboxConsentSecondsRemaining(100, 5100), 0);
  assert.equal(canConfirmSandboxCompatibility(100, 5099, false), false);
  assert.equal(canConfirmSandboxCompatibility(100, 5100, false), true);
  assert.equal(canConfirmSandboxCompatibility(100, 5100, true), false);
});
