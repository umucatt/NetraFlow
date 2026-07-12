/// <reference types="node" />

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

type PackagedRendererLoaderModule = {
  validatePackagedRendererLoader: (source: string) => string[];
  assertPackagedRendererLoader: (mainPath: string) => void;
};

const projectRootPath = process.cwd();
const logicModuleUrl = pathToFileURL(
  path.join(projectRootPath, 'scripts', 'packaged-renderer-loader-logic.mjs')
).href;

const loadPackagedRendererLoaderLogic = async () =>
  (await import(logicModuleUrl)) as PackagedRendererLoaderModule;

const validLoaderSource = `
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const packagedIndexPath = path.join(app.getAppPath(), 'dist', 'index.html');
  const localIndexPath = path.join(__dirname, '../dist/index.html');

  if (app.isPackaged) {
    createdWindow.loadFile(packagedIndexPath);
    return;
  }

  if (!app.isPackaged && devServerUrl) {
    createdWindow.loadURL(devServerUrl);
    return;
  }

  createdWindow.loadFile(localIndexPath);
`;

const replaceEvery = (source: string, search: string, replacement: string) =>
  source.split(search).join(replacement);

test('packaged renderer loader contract accepts current ASAR app.getAppPath form', async () => {
  const { validatePackagedRendererLoader } = await loadPackagedRendererLoaderLogic();

  assert.deepEqual(validatePackagedRendererLoader(validLoaderSource), []);
});

test('packaged renderer loader contract accepts quote and formatting changes', async () => {
  const { validatePackagedRendererLoader } = await loadPackagedRendererLoaderLogic();
  const source = `
    const packagedIndexPath = path.join(
      app.getAppPath(),
      "dist",
      "index.html"
    );

    if (app.isPackaged) {
      createdWindow
        .loadFile(packagedIndexPath);
      return;
    }

    if (! app.isPackaged && devServerUrl) {
      createdWindow.loadURL(devServerUrl);
    }
  `;

  assert.deepEqual(validatePackagedRendererLoader(source), []);
});

test('packaged renderer loader contract accepts an app root variable name', async () => {
  const { validatePackagedRendererLoader } = await loadPackagedRendererLoaderLogic();
  const source = `
    const root = app.getAppPath();
    const target = path.join(root, 'dist', 'index.html');

    if (app.isPackaged) {
      createdWindow.loadFile(target);
      return;
    }

    if (!app.isPackaged && devServerUrl) {
      createdWindow.loadURL(devServerUrl);
    }
  `;

  assert.deepEqual(validatePackagedRendererLoader(source), []);
});

test('packaged renderer loader contract rejects missing app.getAppPath', async () => {
  const { validatePackagedRendererLoader } = await loadPackagedRendererLoaderLogic();
  const errors = validatePackagedRendererLoader(
    validLoaderSource.replace('app.getAppPath()', 'process.resourcesPath')
  );

  assert.equal(errors.includes('missing app.getAppPath() ASAR app root lookup'), true);
});

test('packaged renderer loader contract rejects missing loadFile', async () => {
  const { validatePackagedRendererLoader } = await loadPackagedRendererLoaderLogic();
  const errors = validatePackagedRendererLoader(replaceEvery(validLoaderSource, 'loadFile', 'loadURL'));

  assert.equal(errors.includes('missing BrowserWindow.loadFile renderer load'), true);
});

test('packaged renderer loader contract rejects missing dist/index.html target semantics', async () => {
  const { validatePackagedRendererLoader } = await loadPackagedRendererLoaderLogic();
  const errors = validatePackagedRendererLoader(
    replaceEvery(replaceEvery(validLoaderSource, 'dist', 'public'), 'index.html', 'index.htm')
  );

  assert.equal(errors.includes('missing app.getAppPath() dist/index.html renderer target'), true);
});

test('packaged renderer loader contract rejects expanded resources/app renderer paths', async () => {
  const { validatePackagedRendererLoader } = await loadPackagedRendererLoaderLogic();
  const source = `
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    const packagedIndexPath = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
    const diagnosticRoot = app.getAppPath();

    if (app.isPackaged) {
      createdWindow.loadFile(packagedIndexPath);
      return;
    }

    if (!app.isPackaged && devServerUrl) {
      createdWindow.loadURL(devServerUrl);
    }
  `;
  const errors = validatePackagedRendererLoader(source);

  assert.equal(
    errors.includes('packaged renderer must not use expanded resources/app/dist/index.html'),
    true
  );
});

test('packaged renderer loader contract rejects packaged dev-server fallback', async () => {
  const { validatePackagedRendererLoader } = await loadPackagedRendererLoaderLogic();
  const errors = validatePackagedRendererLoader(
    validLoaderSource.replace('if (!app.isPackaged && devServerUrl)', 'if (devServerUrl)')
  );

  assert.equal(
    errors.includes('packaged builds must not fall back to VITE_DEV_SERVER_URL'),
    true
  );
});

test('current generated dist-electron dispatcher passes packaged renderer loader contract', async (t) => {
  const generatedMainPath = path.join(projectRootPath, 'dist-electron', 'main.js');

  if (!existsSync(generatedMainPath)) {
    t.skip('dist-electron/main.js has not been generated yet');
    return;
  }

  const { assertPackagedRendererLoader } = await loadPackagedRendererLoaderLogic();
  assert.doesNotThrow(() => assertPackagedRendererLoader(generatedMainPath));
});
