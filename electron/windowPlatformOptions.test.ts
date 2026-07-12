import assert from 'node:assert/strict';
import test from 'node:test';

import { getPlatformWindowOptions } from './windowPlatformOptions.js';

const appResourceRoot = '/opt/netraflow/resources/app.asar';

test('Linux BrowserWindow uses the PNG icon and leaves the native frame enabled', () => {
  const options = getPlatformWindowOptions({ platform: 'linux', appResourceRoot });

  assert.equal(options.icon, `${appResourceRoot}/public/icons/linux/512x512.png`);
  assert.equal(options.frame, undefined);
  assert.equal(options.transparent, undefined);
  assert.equal(options.backgroundColor, undefined);
  assert.equal(options.resizable, undefined);
  assert.equal(options.titleBarStyle, undefined);
  assert.deepEqual(Object.keys(options), ['icon']);
});

test('Windows and macOS retain their established window options', () => {
  assert.deepEqual(getPlatformWindowOptions({ platform: 'win32', appResourceRoot }), {
    icon: `${appResourceRoot}/public/icons/netraflow.ico`,
    frame: false
  });
  assert.deepEqual(getPlatformWindowOptions({ platform: 'darwin', appResourceRoot }), {
    titleBarStyle: 'hiddenInset'
  });
});
