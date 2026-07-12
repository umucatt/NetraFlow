import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const main = read('electron/mainApplication.ts');
const preload = read('electron/preload.ts');
const app = read('src/App.tsx');
const about = read('src/features/settings/AboutNetraFlowPanel.tsx');

test('packaged Linux normal windows defer their first show without changing other platforms', () => {
  assert.equal(main.includes("const deferFirstShow = process.platform === 'linux' && app.isPackaged;"), true);
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

test('normal readiness uses lifecycle-specific roots, fonts, theme, and two paint frames', () => {
  const readiness = read('src/app/normalAppFirstFrame.ts');
  assert.equal(readiness.includes('document.fonts?.ready'), false);
  assert.equal(readiness.includes("state === 'initializing'"), true);
  assert.equal(readiness.includes("state === 'onboarding'"), true);
  assert.equal(readiness.includes("state === 'locked'"), true);
  assert.equal(readiness.includes("'.first-welcome-modal'"), true);
  assert.equal(readiness.includes("'.lock-screen'"), true);
  assert.equal(readiness.includes("'.left-browse-panel'"), true);
  assert.equal(readiness.includes("'.right-action-panel'"), true);
  assert.equal(readiness.includes('documentRoot.dataset.resolvedTheme'), true);
  assert.equal((readiness.match(/window\.requestAnimationFrame\(/g) ?? []).length >= 3, true);
  assert.equal(readiness.includes('normalAppFirstFrameWasSent = true'), true);
  assert.equal(readiness.includes('normalAppFirstFrameReady?.()'), true);
  assert.equal(app.includes('useNormalAppFirstFrameReady('), true);
  assert.equal(app.includes('resolveNormalAppFirstFrameState({'), true);
});

test('plain second-instance activation never enters the protected lock action', () => {
  assert.match(main, /app\.on\('second-instance',[\s\S]+if \(argv\.includes\('--lock'\)\)[\s\S]+requestRendererLock\(\);[\s\S]+return;[\s\S]+requestWindowActivation\(\);/);
  assert.equal(main.includes('requestProductInstanceActivation = requestWindowActivation;'), true);
  assert.match(main, /if \(!mainWindowFirstFrameReady\) \{\s+pendingWindowActivation = true;\s+return;/);
  assert.equal(main.includes("createdWindow.webContents.send('netraflow-lock')"), true);
  assert.equal(main.includes('mainWindowFirstFrameReady = true;'), true);
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
