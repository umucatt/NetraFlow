import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

test('preload exposes only validated initial theme snapshot fields', () => {
  const preload = read('electron/preload.ts');
  const appInfo = preload.slice(
    preload.indexOf("contextBridge.exposeInMainWorld('appInfo'"),
    preload.indexOf('if (isSandboxConsentBootstrap)')
  );

  assert.equal(appInfo.includes("argument.startsWith('--nf-initial-theme=')"), true);
  assert.equal(appInfo.includes("argument.startsWith('--nf-initial-theme-style=')"), true);
  assert.equal(
    appInfo.includes("value === 'dark' ? 'dark' : value === 'light' ? 'light' : undefined"),
    true
  );
  assert.equal(
    appInfo.includes("value === 'default' ? 'default' : value === 'nyaa' ? 'nyaa' : undefined"),
    true
  );
  assert.equal(appInfo.includes('initialThemeStyle:'), true);
  assert.equal(appInfo.includes('argv:'), false);
  assert.equal(appInfo.includes('process.argv,'), false);
});

test('renderer applies the complete optional snapshot before React render', () => {
  const rendererMain = read('src/main.tsx');
  const snapshotStart = rendererMain.indexOf('if (window.appInfo?.sandboxConsentBootstrap)');
  const renderStart = rendererMain.indexOf('ReactDOM.createRoot');
  const snapshotBlock = rendererMain.slice(snapshotStart, renderStart);

  assert.ok(snapshotStart >= 0);
  assert.ok(renderStart > snapshotStart);
  assert.equal(snapshotBlock.includes('document.documentElement.dataset.theme = window.appInfo.initialTheme;'), true);
  assert.equal(snapshotBlock.includes('document.documentElement.dataset.resolvedTheme = window.appInfo.initialTheme;'), true);
  assert.equal(snapshotBlock.includes("document.documentElement.style.setProperty('color-scheme', window.appInfo.initialTheme);"), true);
  assert.equal(snapshotBlock.includes('document.documentElement.dataset.themeStyle = window.appInfo.initialThemeStyle;'), true);
  assert.equal(snapshotBlock.includes('if (window.appInfo.initialThemeStyle)'), true);
  assert.equal(snapshotBlock.includes('dataset.themeMode'), false);
  assert.equal(snapshotBlock.includes('delete document.documentElement.dataset'), false);
  assert.equal(snapshotBlock.includes('removeAttribute'), false);
  assert.ok(rendererMain.indexOf("const App = lazy(() => import('./App'));") < snapshotStart);
  assert.ok(snapshotStart < renderStart);
});

test('initial theme style remains optional so index preboot is the fallback', () => {
  const types = read('src/vite-env.d.ts');
  const rendererMain = read('src/main.tsx');

  assert.equal(types.includes("initialThemeStyle?: 'default' | 'nyaa';"), true);
  assert.equal(rendererMain.includes('if (window.appInfo.initialThemeStyle)'), true);
  assert.equal(rendererMain.includes("dataset.themeStyle = 'default'"), false);
});
