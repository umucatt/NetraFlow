import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCloseBeforeController,
  type CloseBeforeControllerHandlers
} from './closeBeforeController';

const createHarness = (overrides: Partial<CloseBeforeControllerHandlers> = {}) => {
  const calls: string[] = [];
  const state = {
    runtimeError: false,
    promptVisible: false,
    integrityWarning: true,
    pendingSave: false,
    flushResult: true
  };
  const controller = createCloseBeforeController();
  const handlers: CloseBeforeControllerHandlers = {
    hasRuntimePersistenceError: () => state.runtimeError,
    hasVisibleIntegrityPrompt: () => state.promptVisible,
    upgradeVisibleIntegrityPromptForClose: () => {
      calls.push('upgrade-prompt');
      state.promptVisible = true;
    },
    readHasIntegrityWarning: () => state.integrityWarning,
    hasPendingSave: () => state.pendingSave,
    showIntegrityPromptForClose: () => {
      calls.push('show-prompt');
      state.promptVisible = true;
    },
    acknowledgeCoreIntegrity: () => {
      calls.push('acknowledge-core');
    },
    acknowledgePendingSaveWithoutPersisting: () => {
      calls.push('acknowledge-pending-without-save');
      state.pendingSave = false;
    },
    flushPendingSaveForClose: (allowExternalCoreOverwrite) => {
      calls.push(`flush:${allowExternalCoreOverwrite}`);
      return state.flushResult;
    },
    reportRuntimePersistenceError: () => {
      calls.push('runtime-error');
    },
    clearIntegrityPrompt: () => {
      calls.push('clear-prompt');
      state.promptVisible = false;
    },
    allowClose: () => {
      calls.push('allow-close');
    },
    cancelCloseRequest: () => {
      calls.push('cancel-close');
    },
    ...overrides
  };
  controller.setHandlers(handlers);

  return { calls, controller, state };
};

test('existing integrity prompt is upgraded into close-before and acknowledge allows close', () => {
  const { calls, controller, state } = createHarness();
  state.promptVisible = true;
  state.pendingSave = false;

  controller.requestClose();
  controller.handleAcknowledgePrompt();

  assert.deepEqual(calls, [
    'upgrade-prompt',
    'acknowledge-core',
    'clear-prompt',
    'allow-close'
  ]);
  assert.equal(controller.getState(), 'allowed');
});

test('pending integrity prompt acknowledge cancels pending save and does not flush', () => {
  const { calls, controller, state } = createHarness();
  state.promptVisible = true;
  state.pendingSave = true;

  controller.requestClose();
  controller.handleAcknowledgePrompt();

  assert.deepEqual(calls, [
    'upgrade-prompt',
    'acknowledge-core',
    'acknowledge-pending-without-save',
    'clear-prompt',
    'allow-close'
  ]);
  assert.equal(calls.some((call) => call.startsWith('flush:')), false);
});

test('continue save flushes latest pending data once before allowing close', () => {
  const { calls, controller, state } = createHarness({
    flushPendingSaveForClose: (allowExternalCoreOverwrite) => {
      assert.equal(calls.includes('allow-close'), false);
      calls.push(`flush:${allowExternalCoreOverwrite}`);
      return true;
    }
  });
  state.promptVisible = true;
  state.pendingSave = true;

  controller.requestClose();
  controller.handleContinueSavePrompt();

  assert.deepEqual(calls, [
    'upgrade-prompt',
    'acknowledge-core',
    'clear-prompt',
    'flush:true',
    'allow-close'
  ]);
});

test('continue save failure cancels the request so a later close can start over', () => {
  const { calls, controller, state } = createHarness();
  state.promptVisible = true;
  state.pendingSave = true;
  state.flushResult = false;

  controller.requestClose();
  controller.handleContinueSavePrompt();
  controller.requestClose();

  assert.deepEqual(calls, [
    'upgrade-prompt',
    'acknowledge-core',
    'clear-prompt',
    'flush:true',
    'cancel-close',
    'show-prompt'
  ]);
  assert.equal(controller.getState(), 'awaiting-integrity');
});

test('duplicate close while a request is active does not create a second prompt request', () => {
  const { calls, controller, state } = createHarness();
  state.promptVisible = true;

  controller.requestClose();
  controller.requestClose();

  assert.deepEqual(calls, ['upgrade-prompt']);
});
