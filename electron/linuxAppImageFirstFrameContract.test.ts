import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const main = read('electron/mainApplication.ts');
const preload = read('electron/preload.ts');
const app = read('src/App.tsx');
const about = read('src/features/settings/AboutNetraFlowPanel.tsx');

test('only packaged Linux AppImage normal windows defer their first show', () => {
  assert.equal(main.includes('const deferFirstShow = isLinuxAppImageRuntime() && app.isPackaged;'), true);
  assert.equal(main.includes('show: deferFirstShow ? false : undefined'), true);
  assert.match(main, /pageLoaded && rendererReady && !didShow/);
  assert.equal(main.includes("event.sender !== createdWindow.webContents"), true);
  assert.equal(main.includes("ipcMain.removeListener('normal-app-first-frame-ready'"), true);
  assert.equal(main.includes('ready-to-show'), false);
});

test('main and renderer receive one resolved formal theme before mounting', () => {
  assert.equal(main.includes('const initialTheme = getInitialWindowTheme();'), true);
  assert.equal(main.includes('backgroundColor: initialTheme.backgroundColor'), true);
  assert.equal(main.includes('`--nf-initial-theme=${initialTheme.resolvedTheme}`'), true);
  assert.equal(preload.includes("value === 'dark' ? 'dark' : value === 'light' ? 'light' : undefined"), true);
  assert.equal(read('src/main.tsx').includes('document.documentElement.dataset.theme = window.appInfo.initialTheme'), true);
});

test('normal readiness waits for fonts, final two-column geometry, and two paint frames', () => {
  assert.equal(app.includes('document.fonts?.ready'), true);
  assert.equal(app.includes("querySelector<HTMLElement>('.app-shell')"), true);
  assert.equal(app.includes("querySelector<HTMLElement>('.left-browse-panel')"), true);
  assert.equal(app.includes("querySelector<HTMLElement>('.right-action-panel')"), true);
  assert.equal(app.includes('Math.abs(leftRect.left - rightRect.left) > 1'), true);
  assert.match(app, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  assert.equal(app.includes('normalAppFirstFrameReady?.()'), true);
});

test('current sandbox state is immutable UI input and status is outside contact card', () => {
  assert.equal(about.includes('useState'), false);
  assert.equal(about.includes('setShowSandboxStatus'), false);
  assert.equal(about.includes("window.appInfo?.chromiumSandboxEnabled === false"), true);
  const contactEnd = about.indexOf('</section>', about.indexOf('about-netraflow__contact'));
  const status = about.indexOf('{showSandboxStatus ? (');
  assert.ok(status > contactEnd);
  assert.equal(about.includes('下次启动将重新尝试启用沙盒'), true);
});
