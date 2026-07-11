import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getAppIconResource } from './appIcon.js';

test('application icon resource is selected once from the preload platform value', () => {
  assert.equal(getAppIconResource('darwin'), 'icons/netraflow-macos.svg');
  assert.equal(getAppIconResource('win32'), 'icons/netraflow.svg');
  assert.equal(getAppIconResource('linux'), 'icons/netraflow.svg');
});

test('the renderer routes its application icon surfaces through the shared selector', () => {
  const appSource = readFileSync('src/App.tsx', 'utf8');

  assert.match(appSource, /getAppIconResource\(window\.appInfo\?\.platform\)/);
  assert.equal(appSource.includes("const PRODUCT_ICON_PATH = 'icons/netraflow.ico'"), false);
});
