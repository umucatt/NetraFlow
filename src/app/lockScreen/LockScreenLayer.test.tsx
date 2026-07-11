import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { LockScreenLayer } from './LockScreenLayer';
import {
  isAppContentInertForLockScreen,
  isLockScreenPanelExiting,
  isLockScreenVisible,
  type LockScreenState
} from './lockScreenLogic';

const renderLockScreen = (state: LockScreenState) =>
  renderToStaticMarkup(
    <LockScreenLayer
      state={state}
      productIconPath="/icons/netraflow.svg"
      password=""
      error=""
      isUnlocking={state === 'authenticating'}
      onPasswordChange={() => undefined}
      onSubmit={(event) => event.preventDefault()}
      onPanelExitComplete={() => undefined}
    />
  );

test('lock screen keeps its opaque layer mounted until the exit phase completes', () => {
  for (const state of ['locked', 'authenticating', 'unlock-exiting'] as const) {
    const markup = renderLockScreen(state);

    assert.equal(isLockScreenVisible(state), true);
    assert.equal(isAppContentInertForLockScreen(state), true);
    assert.match(markup, /class="lock-screen"/);
    assert.match(markup, /aria-modal="true"/);
    assert.match(markup, /class="lock-screen__panel"/);
  }

  assert.match(renderLockScreen('unlock-exiting'), /data-state="unlock-exiting"/);
  assert.equal(isLockScreenPanelExiting('unlock-exiting'), true);
  assert.equal(renderLockScreen('unlocked'), '');
  assert.equal(isLockScreenVisible('unlocked'), false);
  assert.equal(isAppContentInertForLockScreen('unlocked'), false);
});
