import assert from 'node:assert/strict';
import test from 'node:test';

import { isCustomWindowTitleBrandVisible } from './windowTitleBarLogic.js';

test('only macOS omits the custom title-bar brand', () => {
  assert.equal(isCustomWindowTitleBrandVisible('darwin'), false);
  assert.equal(isCustomWindowTitleBrandVisible('win32'), true);
  assert.equal(isCustomWindowTitleBrandVisible('linux'), true);
});
