import assert from 'node:assert/strict';
import test from 'node:test';

import { getPlatformWindowOptions } from './windowPlatformOptions.js';

const posixAppResourceRoot = '/opt/netraflow/resources/app.asar';
const windowsAppResourceRoot = 'C:\\Program Files\\NetraFlow\\resources\\app.asar';

test('Linux BrowserWindow uses the PNG icon and leaves the native frame enabled', () => {
  const options = getPlatformWindowOptions({ platform: 'linux', appResourceRoot: posixAppResourceRoot });

  assert.equal(options.icon, `${posixAppResourceRoot}/public/icons/linux/512x512.png`);
  assert.equal(options.frame, undefined);
  assert.equal(options.transparent, undefined);
  assert.equal(options.backgroundColor, undefined);
  assert.equal(options.resizable, undefined);
  assert.equal(options.titleBarStyle, undefined);
  assert.deepEqual(Object.keys(options), ['icon']);
});

test('Windows and macOS retain their established window options', () => {
  assert.deepEqual(getPlatformWindowOptions({ platform: 'win32', appResourceRoot: windowsAppResourceRoot }), {
    icon: `${windowsAppResourceRoot}\\public\\icons\\netraflow.ico`,
    frame: false
  });
  assert.deepEqual(getPlatformWindowOptions({ platform: 'darwin', appResourceRoot: posixAppResourceRoot }), {
    titleBarStyle: 'hiddenInset'
  });
});
