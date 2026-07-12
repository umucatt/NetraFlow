import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const bootstrap = readFileSync(path.join(root, 'electron', 'sandboxBootstrapMain.ts'), 'utf8');
const preload = readFileSync(path.join(root, 'electron', 'preload.ts'), 'utf8');
const renderer = readFileSync(path.join(root, 'src', 'main.tsx'), 'utf8');
const gate = readFileSync(path.join(root, 'src', 'app', 'sandboxCompatibility', 'SandboxCompatibilityGate.tsx'), 'utf8');

test('bootstrap resolves native light or dark theme before creating its window', () => {
  assert.match(bootstrap, /const initialTheme = getBootstrapTheme\(\);\s*const window = new BrowserWindow/);
  assert.equal(bootstrap.includes("nativeTheme.shouldUseDarkColors ? 'dark' : 'light'"), true);
  assert.equal(bootstrap.includes('backgroundColor: BOOTSTRAP_BACKGROUND_COLORS[initialTheme]'), true);
  assert.equal(bootstrap.includes("light: '#f6f3ea'"), true);
  assert.equal(bootstrap.includes("dark: '#171a1f'"), true);
  assert.equal(bootstrap.includes('persistence'), false);
  assert.equal(bootstrap.includes('settings'), false);
});

test('bootstrap stays hidden until its loaded renderer reports a painted first frame', () => {
  assert.equal(bootstrap.includes('show: false'), true);
  assert.equal(bootstrap.includes("ipcMain.on('bootstrap-first-frame-ready'"), true);
  assert.equal(bootstrap.includes("event.sender !== window.webContents"), true);
  assert.match(bootstrap, /pageLoaded && rendererReady && !didShow/);
  assert.equal(bootstrap.includes("window.webContents.once('did-finish-load'"), true);
  assert.equal(bootstrap.includes("ipcMain.removeListener('bootstrap-first-frame-ready'"), true);
  assert.equal(bootstrap.includes('window.show();'), true);
  assert.equal(bootstrap.includes('ready-to-show'), false);
  assert.equal(gate.match(/requestAnimationFrame/g)?.length, 2);
  assert.equal(gate.includes('document.fonts?.ready'), true);
  assert.equal(gate.includes('firstFrameReady()'), true);
  assert.match(bootstrap, /first frame did not become ready[\s\S]*app\.exit\(1\)/);
});

test('preload exposes a strict initial theme and renderer applies it before React mounts', () => {
  assert.equal(preload.includes("const initialTheme: BootstrapTheme = themeValue === 'dark' ? 'dark' : 'light'"), true);
  assert.equal(preload.includes("if (theme === 'light' || theme === 'dark') listener(theme)"), true);
  assert.ok(renderer.indexOf('document.documentElement.dataset.theme =') < renderer.indexOf('ReactDOM.createRoot('));
});

test('native theme changes update both window background and renderer and listener is removed', () => {
  assert.equal(bootstrap.includes("nativeTheme.on('updated', syncTheme)"), true);
  assert.equal(bootstrap.includes("window.webContents.send('sandbox-bootstrap:theme-changed', theme)"), true);
  assert.equal(bootstrap.includes('window.setBackgroundColor(BOOTSTRAP_BACKGROUND_COLORS[theme])'), true);
  assert.equal(bootstrap.includes("nativeTheme.removeListener('updated', syncTheme)"), true);
  assert.equal(preload.includes("ipcRenderer.on('sandbox-bootstrap:theme-changed'"), true);
});

test('bootstrap handoff requires fixed protocol, rollback support, and dedicated exit', () => {
  assert.equal(bootstrap.includes("const CONSENT_HANDOFF_EXIT_CODE = 73"), true);
  assert.equal(bootstrap.includes("const CONSENT_ACCEPTED_MESSAGE = 'CONSENT_ACCEPTED'"), true);
  assert.equal(bootstrap.includes("const CONSENT_ACK_MESSAGE = 'CONSENT_ACK'"), true);
  assert.match(bootstrap, /writeLinuxAppImageUnsandboxedConsent\(\);[\s\S]*requestLauncherConsentAcknowledgement\(\)/);
  assert.equal(bootstrap.includes('clearLinuxAppImageUnsandboxedConsent();'), true);
  assert.equal(bootstrap.includes('app.relaunch'), false);
  assert.equal(bootstrap.includes("import('./mainApplication.js')"), false);
});
