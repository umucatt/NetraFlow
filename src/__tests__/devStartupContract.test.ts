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
  const mainSource = readProjectFile('electron/mainApplication.ts');
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

test('theme bootstrap reads formal settings and state without storage writes', () => {
  const mainSource = readProjectFile('electron/mainApplication.ts');
  const start = mainSource.indexOf('const readThemeBootstrapSettings = () => {');
  const end = mainSource.indexOf('const getSystemThemeForBootstrap', start);
  const themeSource = mainSource.slice(start, end);

  assert.ok(start >= 0);
  assert.ok(end > start);
  assert.equal(themeSource.includes('persistenceStore.readSettingsDocument()'), true);
  assert.equal(themeSource.includes('persistenceStore.readStateDocument()'), true);
  assert.equal(themeSource.includes('persistenceStore.readCoreDocument()'), false);
  assert.equal(themeSource.includes('writeSettingsDocument'), false);
  assert.equal(themeSource.includes('writeStateDocument'), false);
});

test('main exposes formal persistence IPC and removes old storage IPC', () => {
  const mainSource = readProjectFile('electron/mainApplication.ts');
  const persistenceIpcSource = readProjectFile('electron/persistenceIpc.ts');

  assert.equal(mainSource.includes('registerPersistenceHandlers(persistenceStore, {'), true);
  assert.equal(mainSource.includes('enterDemoPersistenceEnvironment'), true);
  assert.equal(mainSource.includes('exitDemoPersistenceEnvironment'), true);
  assert.equal(mainSource.includes("ipcMain.on('nf-storage:"), false);
  assert.equal(mainSource.includes('registerNfStorageHandlers'), false);
  assert.equal(mainSource.includes('migrateLegacyItemsToNfStorage'), false);
  [
    'persistence:read-core',
    'persistence:write-core',
    'persistence:read-settings',
    'persistence:write-settings',
    'persistence:read-state',
    'persistence:write-state',
    'persistence:read-security',
    'persistence:write-security'
  ].forEach((channel) => {
    assert.equal(persistenceIpcSource.includes(channel), true);
  });
});

test('main creates one StorageLayout before wiring persistence and runtime paths', () => {
  const mainSource = readProjectFile('electron/mainApplication.ts');
  const layoutDeclaration = mainSource.indexOf('const storageLayout = createStorageLayout({');
  const persistenceRootCall = mainSource.indexOf(
    'const persistenceRoots = createPersistenceEnvironmentRoots(storageLayout);'
  );
  const runtimePathConfiguration = mainSource.indexOf('configureRuntimeUserDataPath();');
  const readyHandler = mainSource.indexOf('app.whenReady().then(() => {');

  assert.ok(layoutDeclaration >= 0);
  assert.ok(persistenceRootCall > layoutDeclaration);
  assert.ok(runtimePathConfiguration > persistenceRootCall);
  assert.ok(readyHandler > runtimePathConfiguration);
  assert.equal(mainSource.match(/createStorageLayout\(\{/g)?.length, 1);
  assert.equal(mainSource.includes('persistenceRoot: process.env.NETRAFLOW_PERSISTENCE_EXE_DIR'), true);
  assert.equal(mainSource.includes('appPath: app.getAppPath()'), true);
  assert.equal(mainSource.includes("defaultUserDataPath: app.getPath('userData')"), true);
  assert.equal(mainSource.includes("app.setPath('userData', storageLayout.runtime)"), true);
  assert.equal(mainSource.includes("path.join(app.getPath('appData'), APP_NAME)"), false);
});
