import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createMacosAboutPanelOptions } from './macosAboutPanel.js';

test('the macOS About panel has one visible version and no extra copyright fields', () => {
  assert.deepEqual(createMacosAboutPanelOptions('NetraFlow', '0.9.9'), {
    applicationName: 'NetraFlow',
    applicationVersion: '0.9.9',
    version: ''
  });
});

test('the main process installs the compact native macOS About panel', () => {
  const mainSource = readFileSync('electron/mainApplication.ts', 'utf8');

  assert.match(mainSource, /app\.setAboutPanelOptions\(createMacosAboutPanelOptions\(app\.getName\(\), app\.getVersion\(\)\)\)/);
  assert.equal(mainSource.includes('copyright:'), false);
});
