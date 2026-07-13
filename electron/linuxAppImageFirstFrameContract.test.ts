import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  canShowNormalAppWindow,
  shouldDeferNormalAppFirstShow,
  shouldWaitForStableRendererFrame
} from './normalAppFirstFramePolicy';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const main = read('electron/mainApplication.ts');
const preload = read('electron/preload.ts');
const app = read('src/App.tsx');
const about = read('src/features/settings/AboutNetraFlowPanel.tsx');

test('initial hiding and stable renderer-frame waiting are independent policies', () => {
  assert.equal(main.includes('show: deferInitialShow ? false : undefined'), false);
  assert.equal(main.includes('...(deferInitialShow ? { show: false } : {}),'), true);
  [
    ['win32', false, true],
    ['win32', true, true],
    ['linux', false, false],
    ['linux', true, true],
    ['darwin', false, false],
    ['darwin', true, false]
  ].forEach(([platform, isPackaged, expected]) => {
    const options = shouldDeferNormalAppFirstShow(platform as NodeJS.Platform, isPackaged as boolean)
      ? { show: false }
      : {};
    assert.equal(Object.hasOwn(options, 'show'), expected);
  });
  [
    ['win32', false, false],
    ['win32', true, false],
    ['linux', false, false],
    ['linux', true, true],
    ['darwin', false, false],
    ['darwin', true, false]
  ].forEach(([platform, isPackaged, expected]) => {
    assert.equal(
      shouldWaitForStableRendererFrame(
        platform as NodeJS.Platform,
        isPackaged as boolean
      ),
      expected
    );
  });
});

test('Windows shows after document load while packaged Linux also waits for renderer readiness', () => {
  assert.equal(canShowNormalAppWindow(false, false, false), false);
  assert.equal(canShowNormalAppWindow(true, false, false), true);
  assert.equal(canShowNormalAppWindow(false, true, true), false);
  assert.equal(canShowNormalAppWindow(true, false, true), false);
  assert.equal(canShowNormalAppWindow(true, true, true), true);
  const deferredShowBlock = main.slice(
    main.indexOf('if (deferInitialShow) {'),
    main.indexOf("if (process.platform !== 'darwin')")
  );
  assert.equal(deferredShowBlock.includes('canShowNormalAppWindow('), true);
  assert.equal(deferredShowBlock.includes('waitForStableRendererFrame'), true);
  assert.equal(deferredShowBlock.includes('createdWindow.show();'), true);
  assert.match(
    deferredShowBlock,
    /if \(waitForStableRendererFrame\) \{[\s\S]*ipcMain\.on\('normal-app-first-frame-ready'/
  );
  assert.match(
    deferredShowBlock,
    /\}\s*ipcMain\.on\('normal-app-startup-state-resolved', handleStartupStateResolved\);/
  );
  assert.match(deferredShowBlock, /const firstFrameTimeout = setTimeout\([\s\S]*15_000\);/);
  assert.equal(main.includes("event.sender !== createdWindow.webContents"), true);
  assert.equal(main.includes("ipcMain.removeListener('normal-app-first-frame-ready'"), true);
  assert.equal(main.includes('ready-to-show'), false);
});

test('main and renderer receive one complete formal theme snapshot before mounting', () => {
  const rendererMain = read('src/main.tsx');
  assert.equal(main.includes('const initialTheme = getInitialWindowTheme();'), true);
  assert.equal(main.includes('backgroundColor: initialTheme.backgroundColor'), true);
  assert.equal(main.includes('`--nf-initial-theme=${initialTheme.resolvedTheme}`'), true);
  assert.equal(main.includes('`--nf-initial-theme-style=${initialTheme.themeStyle}`'), true);
  assert.equal(preload.includes("value === 'dark' ? 'dark' : value === 'light' ? 'light' : undefined"), true);
  assert.equal(preload.includes("value === 'default' ? 'default' : value === 'nyaa' ? 'nyaa' : undefined"), true);
  assert.equal(rendererMain.includes('document.documentElement.dataset.theme = window.appInfo.initialTheme'), true);
  assert.equal(rendererMain.includes('document.documentElement.dataset.themeStyle = window.appInfo.initialThemeStyle'), true);
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
