import assert from 'node:assert/strict';
import test from 'node:test';

import { createAppShutdownState } from './appShutdownState';

test('ordinary window close does not become an app quit', () => {
  const state = createAppShutdownState();

  state.requestWindowClose();

  assert.equal(state.getIntent(), 'window-close-request');
  assert.equal(state.handleWindowClosed(), false);
  assert.equal(state.getIntent(), 'normal');
});

test('app quit waits for an open window and resumes only after it closes', () => {
  const state = createAppShutdownState();

  assert.equal(state.requestAppQuit(true), 'start-close-approval');
  assert.equal(state.getIntent(), 'app-quit-request');
  assert.equal(state.requestAppQuit(true), 'awaiting-close-approval');
  assert.equal(state.handleWindowClosed(), true);
  assert.equal(state.getIntent(), 'app-quit-approved');
  assert.equal(state.requestAppQuit(false), 'continue-quit');
  assert.equal(state.isAppQuitInProgress(), true);
});

test('canceling app quit restores normal state for a later close request', () => {
  const state = createAppShutdownState();

  assert.equal(state.requestAppQuit(true), 'start-close-approval');
  state.cancelCloseRequest();

  assert.equal(state.getIntent(), 'normal');
  assert.equal(state.handleWindowClosed(), false);
  assert.equal(state.isAppQuitInProgress(), false);
  assert.equal(state.requestAppQuit(true), 'start-close-approval');
});

test('app quit takes ownership of a pending ordinary window close', () => {
  const state = createAppShutdownState();

  state.requestWindowClose();

  assert.equal(state.requestAppQuit(true), 'start-close-approval');
  assert.equal(state.getIntent(), 'app-quit-request');
  assert.equal(state.handleWindowClosed(), true);
  assert.equal(state.getIntent(), 'app-quit-approved');
});

test('app quit without an open window does not need close approval', () => {
  const state = createAppShutdownState();

  assert.equal(state.requestAppQuit(false), 'continue-quit');
  assert.equal(state.getIntent(), 'normal');
});

test('future destructive shutdown cannot be downgraded by normal close cancellation', () => {
  const state = createAppShutdownState();

  state.beginDestructiveShutdown();
  state.requestWindowClose();
  state.cancelCloseRequest();

  assert.equal(state.getIntent(), 'destructive-shutdown');
  assert.equal(state.requestAppQuit(true), 'continue-quit');
  assert.equal(state.handleWindowClosed(), false);
});

test('approved app quit is not canceled or downgraded before the second quit', () => {
  const state = createAppShutdownState();

  state.requestAppQuit(true);
  state.handleWindowClosed();
  state.cancelCloseRequest();
  state.requestWindowClose();

  assert.equal(state.getIntent(), 'app-quit-approved');
  assert.equal(state.requestAppQuit(false), 'continue-quit');
});
