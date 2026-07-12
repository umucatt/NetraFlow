import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const rootDir = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const linuxBuild = packageJson.build.linux;

test('Linux builder configuration produces only an x64 AppImage with desktop metadata', () => {
  assert.deepEqual(linuxBuild.target, [{ target: 'AppImage', arch: ['x64'] }]);
  assert.equal(linuxBuild.icon, 'public/icons/linux');
  assert.equal(linuxBuild.category, 'Utility');
  assert.equal(linuxBuild.desktop.entry.StartupWMClass, 'NetraFlow');
  assert.equal(linuxBuild.desktop.entry.Terminal, 'false');
  assert.equal(linuxBuild.artifactName, 'NetraFlow_${version}_${arch}.${ext}');
  assert.equal(packageJson.scripts['dist:linux'], 'node scripts/package-appimage.mjs');
});

test('application source and packaging configuration do not persist a sandbox bypass', () => {
  const forbiddenArgument = ['--no', 'sandbox'].join('-');
  const inspectedSources = [
    readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
    readFileSync(path.join(rootDir, 'scripts', 'package-appimage.mjs'), 'utf8'),
    readFileSync(path.join(rootDir, 'electron', 'mainApplication.ts'), 'utf8')
  ];

  for (const source of inspectedSources) {
    assert.equal(source.includes(forbiddenArgument), false);
  }
});

test('controlled AppImage packaging has an exact desktop entry and native AppRun contract', async (t) => {
  const { APPIMAGE_DESKTOP_ENTRY } = await import(
    path.join(rootDir, 'scripts', 'package-appimage-logic.mjs')
  );
  assert.equal(APPIMAGE_DESKTOP_ENTRY, `[Desktop Entry]\nName=NetraFlow\nExec=AppRun %U\nTerminal=false\nType=Application\nIcon=netraflow\nCategories=Utility;\nStartupWMClass=NetraFlow\n`);
  assert.equal(APPIMAGE_DESKTOP_ENTRY.includes('--no-sandbox'), false);

  if (process.platform !== 'linux' || process.arch !== 'x64') return;
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'nf-launcher-contract-'));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
  const launcherRoot = path.join(rootDir, 'build', 'linux', 'launcher');
  const launcher = path.join(temporaryRoot, 'AppRun');
  const compile = spawnSync('cc', [
    '-std=c11', '-O2', '-Wall', '-Wextra', '-Werror',
    path.join(launcherRoot, 'app_run.c'),
    path.join(launcherRoot, 'sandbox_classifier.c'),
    '-o', launcher
  ], { encoding: 'utf8' });
  assert.equal(compile.status, 0, compile.stderr);
  const fileResult = spawnSync('file', ['--brief', launcher], { encoding: 'utf8' });
  assert.equal(fileResult.status, 0, fileResult.stderr);
  assert.match(fileResult.stdout, /ELF 64-bit LSB.*x86-64/);
  assert.equal(readFileSync(launcher).subarray(0, 2).toString(), String.fromCharCode(0x7f, 0x45));

  const classifierTest = path.join(temporaryRoot, 'classifier-test');
  const classifierCompile = spawnSync('cc', [
    '-std=c11', '-O2', '-Wall', '-Wextra', '-Werror',
    path.join(launcherRoot, 'sandbox_classifier.c'),
    path.join(launcherRoot, 'sandbox_classifier_test.c'),
    '-o', classifierTest
  ], { encoding: 'utf8' });
  assert.equal(classifierCompile.status, 0, classifierCompile.stderr);
  assert.equal(spawnSync(classifierTest, [], { encoding: 'utf8' }).status, 0);
});

test('bootstrap stays isolated from persistence and ordinary crashes cannot trigger fallback', () => {
  const dispatcher = readFileSync(path.join(rootDir, 'electron', 'main.ts'), 'utf8');
  const bootstrap = readFileSync(path.join(rootDir, 'electron', 'sandboxBootstrapMain.ts'), 'utf8');
  const launcher = readFileSync(path.join(rootDir, 'build', 'linux', 'launcher', 'app_run.c'), 'utf8');
  const classifier = readFileSync(path.join(rootDir, 'build', 'linux', 'launcher', 'sandbox_classifier.c'), 'utf8');
  assert.equal(bootstrap.includes('persistence'), false);
  assert.equal(bootstrap.includes('shell'), false);
  assert.equal(bootstrap.includes('openExternal'), false);
  assert.equal(dispatcher.includes("await import('./mainApplication.js')"), true);
  assert.equal(dispatcher.includes("await import('./sandboxBootstrapMain.js')"), true);
  assert.equal(launcher.includes('nf_is_explicit_sandbox_failure'), true);
  assert.equal(classifier.includes('ready_received'), true);
  assert.equal(classifier.includes('elapsed_ms > 15000'), true);
  assert.equal(classifier.includes('strstr(text, "sandbox")'), false);
});

test('native launcher gates one unsandboxed handoff on protocol, validation, ACK, and exit code', () => {
  const launcher = readFileSync(path.join(rootDir, 'build', 'linux', 'launcher', 'app_run.c'), 'utf8');
  assert.equal(launcher.includes('socketpair(AF_UNIX, SOCK_SEQPACKET'), true);
  assert.equal(launcher.includes('#define CONSENT_HANDOFF_EXIT_CODE 73'), true);
  assert.equal(launcher.includes('#define CONSENT_ACCEPTED_MESSAGE "CONSENT_ACCEPTED"'), true);
  assert.equal(launcher.includes('#define CONSENT_ACK_MESSAGE "CONSENT_ACK"'), true);
  assert.match(launcher, /result\.exit_code == CONSENT_HANDOFF_EXIT_CODE &&\s*result\.consent_accepted && result\.consent_validated && result\.consent_ack_sent/);
  assert.equal((launcher.match(/nf_is_explicit_sandbox_failure\(/g) ?? []).length, 1);
  assert.equal((launcher.match(/make_child_argv\(binary, argc, argv, 1, 1\)/g) ?? []).length, 1);
  assert.equal((launcher.match(/make_child_argv\(binary, argc, argv, 1, 0\)/g) ?? []).length, 1);
  assert.equal(launcher.includes('system('), false);
  assert.equal(launcher.includes('popen('), false);
});

test('launcher filters external sandbox and bootstrap flags and adds internal flags once', () => {
  const launcher = readFileSync(path.join(rootDir, 'build', 'linux', 'launcher', 'app_run.c'), 'utf8');
  assert.match(launcher, /if \(unsandboxed\) child_argv\[index\+\+\] = "--no-sandbox"/);
  assert.match(launcher, /if \(bootstrap\) child_argv\[index\+\+\] = "--nf-sandbox-consent-bootstrap"/);
  assert.match(launcher, /strcmp\(argv\[source\], "--no-sandbox"\) == 0 \|\|\s*strcmp\(argv\[source\], "--nf-sandbox-consent-bootstrap"\) == 0/);
  assert.equal(launcher.includes('NF_LAUNCHER_CONSENT_FD'), true);
  assert.equal(launcher.includes('unsetenv("NF_LAUNCHER_CONSENT_FD")'), true);
  for (const internalPrefix of [
    '--nf-launcher-ready-fd=',
    '--nf-launcher-consent-fd=',
    '--nf-launcher-state=',
    '--nf-bootstrap-theme='
  ]) assert.equal(launcher.includes(internalPrefix), true);
});

test('Linux AppImage packaging validates its host before any build work', async () => {
  const { assertLinuxX64BuildHost, getAppImageArtifactName } = await import(
    path.join(rootDir, 'scripts', 'package-appimage-logic.mjs')
  );

  assert.throws(
    () => assertLinuxX64BuildHost({ platform: 'darwin', arch: 'arm64', uid: 501 }),
    /Linux x64 host/
  );
  assert.throws(
    () => assertLinuxX64BuildHost({ platform: 'linux', arch: 'arm64', uid: 1000 }),
    /requires x64/
  );
  assert.throws(
    () => assertLinuxX64BuildHost({ platform: 'linux', arch: 'x64', uid: 0 }),
    /regular user, not root/
  );
  assert.doesNotThrow(() =>
    assertLinuxX64BuildHost({ platform: 'linux', arch: 'x64', uid: 1000 })
  );
  assert.equal(
    getAppImageArtifactName({ productName: 'NetraFlow', version: '0.9.9' }),
    'NetraFlow_0.9.9_x86_64.AppImage'
  );
});

test('custom packaging removes the obsolete window-test artifact from final output', () => {
  const packaging = readFileSync(path.join(rootDir, 'scripts', 'package-appimage.mjs'), 'utf8');
  assert.equal(packaging.includes('obsoleteWindowTestArtifactPath'), true);
  assert.equal(packaging.includes('rmSync(obsoleteWindowTestArtifactPath, { force: true });'), true);
});

test('Linux AppImage command rejects this non-Linux host without generating an artifact', (t) => {
  if (process.platform === 'linux') {
    return;
  }

  const outputDir = path.join(rootDir, 'release', 'linux', packageJson.version);
  const artifactPath = path.join(outputDir, `NetraFlow_${packageJson.version}_x86_64.AppImage`);
  const artifactExistedBefore = existsSync(artifactPath);

  t.after(() => {
    if (!artifactExistedBefore) {
      assert.equal(existsSync(artifactPath), false);
    }
  });

  const result = spawnSync(process.execPath, ['scripts/package-appimage.mjs'], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /Linux AppImage packaging must run on a Linux x64 host/);
});
