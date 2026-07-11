import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { createStorageLayout, type StorageLayout } from './storageLayout.js';

const assertChildLayout = (
  layout: StorageLayout,
  platformPath: typeof path.posix | typeof path.win32,
  expectedRoot: string
) => {
  assert.equal(layout.root, expectedRoot);
  assert.equal(layout.userdata, platformPath.join(expectedRoot, 'userdata'));
  assert.equal(layout.runtime, platformPath.join(expectedRoot, 'runtime'));
  assert.equal(layout.demo, platformPath.join(expectedRoot, '.demo'));
  assert.equal(layout.sessionData, platformPath.join(expectedRoot, 'runtime', 'sessionData'));
  assert.equal(layout.cache, platformPath.join(expectedRoot, 'runtime', 'cache'));
  assert.equal(layout.logs, platformPath.join(expectedRoot, 'runtime', 'logs'));
  assert.equal(layout.crashDumps, platformPath.join(expectedRoot, 'runtime', 'crashDumps'));
  assert.equal(Object.isFrozen(layout), true);
  assert.equal(Reflect.set(layout, 'root', platformPath.join(expectedRoot, 'other')), false);
};

test('Windows installed storage remains beside the executable', () => {
  const execPath = String.raw`C:\Program Files\NetraFlow\NetraFlow.exe`;
  const expectedRoot = path.win32.dirname(execPath);
  const layout = createStorageLayout({
    platform: 'win32',
    isPackaged: true,
    isPortable: false,
    execPath,
    appPath: String.raw`C:\Program Files\NetraFlow\resources\app.asar`,
    defaultUserDataPath: String.raw`C:\Users\tester\AppData\Roaming\NetraFlow`
  });

  assertChildLayout(layout, path.win32, expectedRoot);
});

test('Windows portable storage remains beside the executable', () => {
  const execPath = String.raw`E:\Apps\NetraFlow_0.9.10\NetraFlow.exe`;
  const expectedRoot = path.win32.dirname(execPath);
  const layout = createStorageLayout({
    platform: 'win32',
    isPackaged: true,
    isPortable: true,
    execPath,
    appPath: String.raw`E:\Apps\NetraFlow_0.9.10\resources\app.asar`,
    defaultUserDataPath: String.raw`C:\Users\tester\AppData\Roaming\NetraFlow`
  });

  assertChildLayout(layout, path.win32, expectedRoot);
});

test('Windows development storage uses the app project root instead of the Electron binary', () => {
  const appPath = String.raw`D:\Projects\NetraFlow`;
  const layout = createStorageLayout({
    platform: 'win32',
    isPackaged: false,
    isPortable: false,
    execPath: String.raw`D:\Projects\NetraFlow\node_modules\electron\dist\electron.exe`,
    appPath,
    defaultUserDataPath: String.raw`C:\Users\tester\AppData\Roaming\NetraFlow`
  });

  assertChildLayout(layout, path.win32, appPath);
});

test('packaged macOS storage uses Electron userData outside the app bundle', () => {
  const execPath = '/Applications/NetraFlow.app/Contents/MacOS/NetraFlow';
  const defaultUserDataPath = '/Users/tester/Library/Application Support/NetraFlow';
  const layout = createStorageLayout({
    platform: 'darwin',
    isPackaged: true,
    isPortable: false,
    execPath,
    appPath: '/Applications/NetraFlow.app/Contents/Resources/app.asar',
    defaultUserDataPath
  });

  assertChildLayout(layout, path.posix, defaultUserDataPath);
  assert.notEqual(layout.root, path.posix.dirname(execPath));
  assert.equal(layout.root.startsWith('/Applications/NetraFlow.app/'), false);
});

test('packaged Linux storage uses Electron userData outside the AppImage mount', () => {
  const execPath = '/tmp/.mount_NetraFlow/usr/bin/netraflow';
  const defaultUserDataPath = '/home/tester/.config/NetraFlow';
  const layout = createStorageLayout({
    platform: 'linux',
    isPackaged: true,
    isPortable: false,
    execPath,
    appPath: '/tmp/.mount_NetraFlow/resources/app.asar',
    defaultUserDataPath
  });

  assertChildLayout(layout, path.posix, defaultUserDataPath);
  assert.notEqual(layout.root, path.posix.dirname(execPath));
  assert.equal(layout.root.startsWith('/tmp/.mount_NetraFlow/'), false);
});

test('validation overrides are normalized and runtime descendants follow the runtime override', () => {
  const layout = createStorageLayout({
    platform: 'linux',
    isPackaged: true,
    isPortable: false,
    execPath: '/tmp/.mount_NetraFlow/usr/bin/netraflow',
    appPath: '/tmp/.mount_NetraFlow/resources/app.asar',
    defaultUserDataPath: '/home/tester/.config/NetraFlow',
    overrides: {
      persistenceRoot: '/tmp/nf-validation/persistence',
      userdata: '/tmp/nf-validation/userdata',
      runtime: '/tmp/nf-validation/runtime',
      demo: '/tmp/nf-validation/persistence/.demo'
    }
  });

  assert.equal(layout.root, '/tmp/nf-validation/persistence');
  assert.equal(layout.userdata, '/tmp/nf-validation/userdata');
  assert.equal(layout.runtime, '/tmp/nf-validation/runtime');
  assert.equal(layout.demo, '/tmp/nf-validation/persistence/.demo');
  assert.equal(layout.sessionData, '/tmp/nf-validation/runtime/sessionData');
});

test('unsupported packaged platforms fail instead of writing beside an unknown executable', () => {
  assert.throws(
    () =>
      createStorageLayout({
        platform: 'freebsd',
        isPackaged: true,
        isPortable: false,
        execPath: '/opt/NetraFlow/netraflow',
        appPath: '/opt/NetraFlow/resources/app.asar',
        defaultUserDataPath: '/home/tester/.config/NetraFlow'
      }),
    /Unsupported packaged storage platform/
  );
});
