import assert from 'node:assert/strict';
import test from 'node:test';

import { createCloseBeforeWindowCoordinator } from './closeBeforeWindowState';

const createWindowHarness = () => {
  const sentChannels: string[] = [];
  const calls: string[] = [];
  const window = {
    close: () => {
      calls.push('close');
    },
    webContents: {
      send: (channel: string) => {
        sentChannels.push(channel);
      }
    }
  };
  const event = {
    preventDefault: () => {
      calls.push('preventDefault');
    }
  };

  return { calls, event, sentChannels, window };
};

test('main sends one renderer close request while requested is active', () => {
  const coordinator = createCloseBeforeWindowCoordinator();
  const { sentChannels, window } = createWindowHarness();

  assert.equal(coordinator.requestRendererCloseApproval(window), true);
  assert.equal(coordinator.requestRendererCloseApproval(window), false);

  assert.deepEqual(sentChannels, ['app:close-request']);
  assert.deepEqual(coordinator.getWindowStateForTest(window), {
    requested: true,
    allowNextClose: false
  });
});

test('cancel resets requested without allowing the window to close', () => {
  const coordinator = createCloseBeforeWindowCoordinator();
  const { calls, sentChannels, window } = createWindowHarness();

  coordinator.requestRendererCloseApproval(window);
  coordinator.cancelCloseRequest(window);
  assert.equal(coordinator.requestRendererCloseApproval(window), true);

  assert.deepEqual(calls, []);
  assert.deepEqual(sentChannels, ['app:close-request', 'app:close-request']);
});

test('allowNextClose is consumed once and later closes re-enter coordination', () => {
  const coordinator = createCloseBeforeWindowCoordinator();
  const { calls, event, sentChannels, window } = createWindowHarness();

  coordinator.requestRendererCloseApproval(window);
  coordinator.allowNextWindowClose(window);
  assert.equal(coordinator.handleWindowClose(window, event), true);
  assert.equal(coordinator.handleWindowClose(window, event), false);
  assert.equal(coordinator.requestRendererCloseApproval(window), true);

  assert.deepEqual(calls, ['close', 'preventDefault']);
  assert.deepEqual(sentChannels, ['app:close-request', 'app:close-request']);
  assert.deepEqual(coordinator.getWindowStateForTest(window), {
    requested: true,
    allowNextClose: false
  });
});
