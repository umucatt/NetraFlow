import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyStartupDataState,
  resolveStartupDestination
} from './firstWelcomeStateLogic';

const completed = { completed: true, pendingAfterClearAll: false };
const pending = { completed: false, pendingAfterClearAll: false };

test('startup destination follows valid controlled persistence rather than restored UI state', () => {
  assert.equal(resolveStartupDestination({ coreExists: false, stateExists: false, firstWelcome: completed, locked: false }), 'onboarding');
  assert.equal(resolveStartupDestination({ coreExists: true, stateExists: false, firstWelcome: completed, locked: false }), 'onboarding');
  assert.equal(resolveStartupDestination({ coreExists: true, stateExists: true, firstWelcome: pending, locked: false }), 'onboarding');
  assert.equal(resolveStartupDestination({ coreExists: true, stateExists: true, firstWelcome: completed, locked: false }), 'application');
  assert.equal(resolveStartupDestination({ coreExists: true, stateExists: true, firstWelcome: completed, locked: true }), 'locked');
});

test('clear cycle returns to onboarding and completion persists application eligibility', () => {
  const afterCompletion = resolveStartupDestination({ coreExists: true, stateExists: true, firstWelcome: completed, locked: false });
  const afterClear = resolveStartupDestination({ coreExists: false, stateExists: false, firstWelcome: completed, locked: false });
  assert.equal(afterCompletion, 'application');
  assert.equal(afterClear, 'onboarding');
});

test('startup data classification separates empty valid and invalid snapshots', () => {
  assert.equal(classifyStartupDataState({ core: 'missing', settings: 'missing', state: 'missing', security: 'missing' }), 'empty');
  assert.equal(classifyStartupDataState({ core: 'valid', settings: 'missing', state: 'valid', security: 'missing' }), 'valid');
  assert.equal(classifyStartupDataState({ core: 'valid', settings: 'valid', state: 'missing', security: 'valid' }), 'invalid');
  assert.equal(classifyStartupDataState({ core: 'valid', settings: 'invalid', state: 'valid', security: 'valid' }), 'invalid');
});

test('invalid and half snapshots never enter onboarding', () => {
  assert.equal(resolveStartupDestination({ coreExists: true, stateExists: false, firstWelcome: pending, locked: false, dataState: 'invalid' }), 'invalid');
  assert.equal(resolveStartupDestination({ coreExists: true, stateExists: true, firstWelcome: pending, locked: false, dataState: 'invalid' }), 'invalid');
  assert.equal(resolveStartupDestination({ coreExists: true, stateExists: true, firstWelcome: pending, locked: false, dataState: 'valid' }), 'invalid');
  assert.equal(resolveStartupDestination({ coreExists: false, stateExists: false, firstWelcome: pending, locked: false, dataState: 'empty' }), 'onboarding');
});
