/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { readProjectFile } from './contractText';

const DEV_PORT = '5174';

test('development startup keeps Vite, wait-on, and Electron on the same strict port', () => {
  const viteConfigSource = readProjectFile('vite.config.ts');
  const packageJson = JSON.parse(readProjectFile('package.json')) as {
    scripts?: Record<string, string>;
  };
  const mainSource = readProjectFile('electron/main.ts');
  const devLauncherSource = readProjectFile('scripts/dev.mjs');

  const devScript = packageJson.scripts?.dev ?? '';
  const devRendererScript = packageJson.scripts?.['dev:renderer'] ?? '';
  const devElectronScript = packageJson.scripts?.['dev:electron'] ?? '';
  const buildScript = packageJson.scripts?.build ?? '';

  assert.match(viteConfigSource, /server:\s*\{[\s\S]*port:\s*5174/);
  assert.match(viteConfigSource, /server:\s*\{[\s\S]*strictPort:\s*true/);
  assert.equal(devScript, 'node scripts/dev.mjs');
  assert.equal(devRendererScript, 'vite');
  assert.equal(devLauncherSource.includes('const DEV_PORT = 5174;'), true);
  assert.equal(
    devLauncherSource.includes("const rendererProcess = spawnNpmScript('dev:renderer');"),
    true
  );
  assert.equal(devLauncherSource.includes("spawnNpmScript('dev:electron')"), true);
  assert.ok(
    devLauncherSource.indexOf('rendererReady = true;') <
      devLauncherSource.indexOf('startElectron();')
  );
  assert.equal(devLauncherSource.includes('rendererReady = true;'), true);
  assert.equal(devLauncherSource.includes('http://localhost:${DEV_PORT}/'), true);
  assert.equal(devLauncherSource.includes('finish(exitCode || 1, rendererProcess);'), true);
  assert.equal(devElectronScript.includes(`wait-on tcp:${DEV_PORT}`), true);
  assert.equal(
    devElectronScript.includes(`VITE_DEV_SERVER_URL=http://localhost:${DEV_PORT}`),
    true
  );
  assert.equal(devElectronScript.includes('http://localhost:5175'), false);
  assert.equal(mainSource.includes('const devServerUrl = process.env.VITE_DEV_SERVER_URL;'), true);
  assert.equal(mainSource.includes('createdWindow.loadURL(devServerUrl);'), true);
  assert.equal(mainSource.includes('if (app.isPackaged)'), true);
  assert.equal(mainSource.includes('http://localhost'), false);
  assert.ok(
    mainSource.indexOf('if (app.isPackaged)') <
      mainSource.indexOf('createdWindow.loadURL(devServerUrl);')
  );
  assert.equal(mainSource.includes("loadFileWithLogging(packagedIndexPath, 'packaged');"), true);
  assert.equal(mainSource.includes("loadFileWithLogging(localIndexPath, 'local');"), true);
  assert.equal(
    buildScript,
    'tsc --noEmit -p tsconfig.json && vite build && npm run clean:electron && tsc -p tsconfig.node.json'
  );
});

test('theme bootstrap degrades visually without storage writes on read errors', () => {
  const mainSource = readProjectFile('electron/main.ts');
  const start = mainSource.indexOf('const readThemeBootstrapSettings = () => {');
  const end = mainSource.indexOf('const getSystemThemeForBootstrap', start);
  const themeSource = mainSource.slice(start, end);

  assert.ok(start >= 0);
  assert.ok(end > start);
  assert.equal(themeSource.includes('const itemsResult = readNfStorageItems();'), true);
  assert.equal(themeSource.includes('if (!itemsResult.ok)'), true);
  assert.equal(themeSource.includes('logStorageReadError'), true);
  assert.equal(themeSource.includes('return normalizeThemeBootstrapSettings(null);'), true);
  assert.equal(themeSource.includes('writeNfStorageItems'), false);
});

test('main storage write IPC handlers read current storage before writing', () => {
  const mainSource = readProjectFile('electron/main.ts');
  const setItemStart = mainSource.indexOf("ipcMain.on('nf-storage:set-item'");
  const setItemsStart = mainSource.indexOf("ipcMain.on('nf-storage:set-items'");
  const removeItemStart = mainSource.indexOf("ipcMain.on('nf-storage:remove-item'");
  const keyStart = mainSource.indexOf("ipcMain.on('nf-storage:key'");
  const migrateStart = mainSource.indexOf('const migrateLegacyItemsToNfStorage =');
  const registerStart = mainSource.indexOf('const registerNfStorageHandlers =');

  const setItemSource = mainSource.slice(setItemStart, setItemsStart);
  const setItemsSource = mainSource.slice(setItemsStart, removeItemStart);
  const removeItemSource = mainSource.slice(removeItemStart, keyStart);
  const migrateSource = mainSource.slice(migrateStart, registerStart);

  assert.ok(setItemStart >= 0);
  assert.ok(setItemsStart > setItemStart);
  assert.ok(removeItemStart > setItemsStart);
  assert.ok(keyStart > removeItemStart);
  assert.ok(migrateStart >= 0);
  assert.ok(registerStart > migrateStart);

  assert.ok(
    setItemSource.indexOf('const items = getReadItemsOrBridgeError();') <
      setItemSource.indexOf('const writeResult = writeNfStorageItems(items);')
  );
  assert.equal(setItemSource.includes('isNfStorageBridgeErrorResult(items)'), true);

  assert.equal(setItemsSource.includes('readItems: readNfStorageItems'), true);
  assert.equal(setItemsSource.includes('writeItems: writeNfStorageItems'), true);

  assert.ok(
    removeItemSource.indexOf('const items = getReadItemsOrBridgeError();') <
      removeItemSource.indexOf('const writeResult = writeNfStorageItems(items);')
  );
  assert.equal(removeItemSource.includes('isNfStorageBridgeErrorResult(items)'), true);

  assert.ok(
    migrateSource.indexOf('const currentItemsResult = readNfStorageItems();') <
      migrateSource.indexOf('const writeResult = writeNfStorageItems(nextItems);')
  );
  assert.ok(
    migrateSource.indexOf('if (!currentItemsResult.ok)') <
      migrateSource.indexOf('const writeResult = writeNfStorageItems(nextItems);')
  );
});
