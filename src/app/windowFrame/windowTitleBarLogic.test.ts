import assert from 'node:assert/strict';
import test from 'node:test';

import {
  areCustomWindowControlsVisible,
  isCustomWindowTitleBrandVisible,
  isCustomWindowTitleBarVisible
} from './windowTitleBarLogic.js';

test('only Windows shows the custom title-bar brand', () => {
  assert.equal(isCustomWindowTitleBrandVisible('darwin'), false);
  assert.equal(isCustomWindowTitleBrandVisible('win32'), true);
  assert.equal(isCustomWindowTitleBrandVisible('linux'), false);
});

test('only Windows shows custom window controls', () => {
  assert.equal(areCustomWindowControlsVisible('darwin'), false);
  assert.equal(areCustomWindowControlsVisible('win32'), true);
  assert.equal(areCustomWindowControlsVisible('linux'), false);
});

test('Linux omits the renderer title bar while Windows and macOS retain theirs', () => {
  assert.equal(isCustomWindowTitleBarVisible('darwin'), true);
  assert.equal(isCustomWindowTitleBarVisible('win32'), true);
  assert.equal(isCustomWindowTitleBarVisible('linux'), false);
});
