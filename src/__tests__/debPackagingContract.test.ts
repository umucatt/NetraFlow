/// <reference types="node" />

import assert from 'node:assert/strict';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const rootDir = process.cwd();
const packageJsonSource = readFileSync(path.join(rootDir, 'package.json'), 'utf8');
const packageJson = JSON.parse(packageJsonSource);
const packagingSource = readFileSync(path.join(rootDir, 'scripts', 'package-deb.mjs'), 'utf8');
const normalizeNewlines = (source: string) => source.replace(/\r\n?/g, '\n');
const readText = (...segments: string[]) =>
  normalizeNewlines(readFileSync(path.join(rootDir, ...segments), 'utf8'));
const debLogicUrl = pathToFileURL(path.join(rootDir, 'scripts', 'package-deb-logic.mjs')).href;
const profileSource = readText('build', 'linux', 'deb', 'opt.NetraFlow.netraflow');
const localSource = readText('build', 'linux', 'deb', 'opt.NetraFlow.netraflow.local');
const postinst = readText('build', 'linux', 'deb', 'postinst');
const prerm = readText('build', 'linux', 'deb', 'prerm');

test('DEB metadata and artifact identity are exact and versioned from package.json', async () => {
  const logic = await import(debLogicUrl);
  const control = logic.createDebControl({ version: packageJson.version, installedSizeKiB: 123 });
  assert.equal(packageJson.version, '0.9.10');
  assert.match(control, /^Package: netraflow$/m);
  assert.match(control, /^Version: 0\.9\.10$/m);
  assert.match(control, /^Architecture: amd64$/m);
  assert.match(control, /^Maintainer: umucatt <62979687\+umucatt@users\.noreply\.github\.com>$/m);
  assert.match(control, /^Homepage: https:\/\/github\.com\/umucatt\/NetraFlow$/m);
  assert.match(control, /^Description: \S.+$/m);
  assert.equal(logic.getDebArtifactName({ productName: 'NetraFlow', version: packageJson.version }), 'NetraFlow_0.9.10_x64.deb');
  assert.equal(logic.DEB_DEPENDS.every((dependency: string) => /^[a-z0-9][a-z0-9+.-]*(?::[a-z0-9-]+)?$/.test(dependency)), true);
});

test('DEB file layout, static command link, desktop entry, icons, and conffiles are fixed', async () => {
  const logic = await import(debLogicUrl);
  assert.equal(logic.DEB_EXECUTABLE_PATH, '/opt/NetraFlow/netraflow');
  assert.equal(logic.DEB_DESKTOP_PATH, '/usr/share/applications/netraflow.desktop');
  assert.equal(logic.DEB_APPARMOR_PATH, '/etc/apparmor.d/opt.NetraFlow.netraflow');
  assert.equal(logic.DEB_APPARMOR_LOCAL_PATH, '/etc/apparmor.d/local/opt.NetraFlow.netraflow');
  assert.equal(logic.DEB_DESKTOP_ENTRY, `[Desktop Entry]\nName=NetraFlow\nExec=/opt/NetraFlow/netraflow %U\nTerminal=false\nType=Application\nIcon=netraflow\nCategories=Utility;\nStartupWMClass=NetraFlow\n`);
  assert.equal(packagingSource.includes("symlinkSync(DEB_EXECUTABLE_PATH"), true);
  assert.match(packagingSource, /hicolor\/\$\{size\}x\$\{size\}\/apps\/netraflow\.png/);
  assert.equal(packagingSource.includes("path.join(controlDir, 'conffiles')"), true);
});

test('DEB uses the local Electron distribution and ASAR without AppImage or FPM assembly', () => {
  assert.equal(packageJson.scripts['dist:deb'], 'node scripts/package-deb.mjs');
  assert.equal(packagingSource.includes("node_modules', 'electron', 'dist"), true);
  assert.equal(packagingSource.includes("node_modules', '.bin', 'asar"), true);
  assert.equal(packagingSource.includes("renameSync(path.join(appRoot, 'electron'), path.join(appRoot, 'netraflow'))"), true);
  assert.equal(packagingSource.includes('AppRun'), false);
  assert.equal(/\bfpm\b/i.test(packagingSource), false);
  assert.equal(packagingSource.includes('electron-builder'), false);
  assert.equal(packagingSource.includes('shell: false'), true);
  assert.equal(packagingSource.includes('shell: true'), false);
});

test('DEB desktop and application tree cannot opt out of the Chromium sandbox', async () => {
  const { DEB_DESKTOP_ENTRY } = await import(debLogicUrl);
  assert.equal(DEB_DESKTOP_ENTRY.match(/^Exec=(.+)$/m)?.[1], '/opt/NetraFlow/netraflow %U');
  assert.equal(DEB_DESKTOP_ENTRY.includes('--no-sandbox'), false);
  assert.equal(DEB_DESKTOP_ENTRY.includes('NF_PACKAGE_KIND'), false);
  assert.equal(DEB_DESKTOP_ENTRY.includes('bootstrap'), false);
  assert.equal(packagingSource.includes('NF_PACKAGE_KIND'), false);
  assert.equal(packagingSource.includes('launcher-preferences.json'), false);
});

test('AppArmor profile has only the named attachment, userns, and local override semantics', () => {
  const meaningfulLines = profileSource.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  assert.deepEqual(meaningfulLines, [
    'profile netraflow /opt/NetraFlow/netraflow flags=(unconfined) {',
    'userns,',
    'include if exists <local/opt.NetraFlow.netraflow>',
    '}'
  ]);
  assert.match(localSource, /^#.*\n$/);
  for (const forbidden of ['/**', 'capability', 'mount', 'network', 'ptrace', 'dbus', 'signal', 'change_profile', '/home']) {
    assert.equal(profileSource.includes(forbidden), false);
  }
});

test('maintainer scripts are minimal, executable, and never touch user data or privilege settings', () => {
  assert.equal(lstatSync(path.join(rootDir, 'build', 'linux', 'deb', 'postinst')).mode & 0o111, 0);
  assert.equal(lstatSync(path.join(rootDir, 'build', 'linux', 'deb', 'prerm')).mode & 0o111, 0);
  assert.match(postinst, /^#!\/bin\/sh\nset -e\n/);
  assert.match(postinst, /"\$\{1:-\}" != "configure"/);
  assert.match(postinst, /\/sys\/module\/apparmor\/parameters\/enabled/);
  assert.match(postinst, /apparmor_parser --replace "\$profile"/);
  assert.match(prerm, /^#!\/bin\/sh\nset -e\n/);
  assert.match(prerm, /remove\|deconfigure/);
  assert.match(prerm, /apparmor_parser --remove "\$profile"/);
  for (const source of [postinst, prerm]) {
    for (const forbidden of ['chmod 4755', 'chown root', 'sudo', 'pkexec', 'sysctl', '/home', '~/.config', 'curl', 'wget', 'NetraFlow/userdata', 'rm -']) {
      assert.equal(source.includes(forbidden), false);
    }
  }
});

test('DEB cannot enter the AppImage consent, preference, warning, or fallback flow', () => {
  const runtime = readFileSync(path.join(rootDir, 'electron', 'linuxAppImageRuntime.ts'), 'utf8');
  const preload = readFileSync(path.join(rootDir, 'electron', 'preload.ts'), 'utf8');
  const dispatcher = readFileSync(path.join(rootDir, 'electron', 'main.ts'), 'utf8');
  assert.match(runtime, /process\.env\.NF_PACKAGE_KIND === APPIMAGE_PACKAGE_KIND/);
  assert.match(preload, /process\.env\.NF_PACKAGE_KIND === 'appimage'/);
  assert.match(dispatcher, /if \(!isLinuxAppImageRuntime\(\)\)/);
  assert.equal(packagingSource.includes('sandboxBootstrapMain'), false);
  assert.equal(packagingSource.includes('linuxAppImagePreferences'), false);
  assert.equal(packagingSource.includes('--no-sandbox'), false);
});

test('DEB build is unprivileged, local-only, narrowly cleaned, and root-owned in the archive', () => {
  assert.match(packagingSource, /assertDebBuildHost\(\)/);
  assert.match(packagingSource, /dpkg-deb[\s\S]+--root-owner-group/);
  assert.match(packagingSource, /apparmor_parser[\s\S]+--skip-kernel-load/);
  assert.equal(packagingSource.includes('rmSync(outputDir'), false);
  assert.equal(packagingSource.includes('npm install'), false);
  assert.equal(packagingSource.includes('npm ci'), false);
  assert.equal(packagingSource.includes('http://'), false);
  assert.equal(packagingSource.includes('https://'), false);
  for (const forbidden of ['sudo', 'pkexec', '4755', '0777', '0o777', 'chown']) {
    assert.equal(packagingSource.includes(forbidden), false);
  }
});

test('DEB host checks reject root, non-x64, non-Linux, and old Node', async () => {
  const { assertDebBuildHost } = await import(debLogicUrl);
  assert.throws(() => assertDebBuildHost({ platform: 'darwin', arch: 'arm64', uid: 501, nodeMajor: 22 }), /Linux x64 host/);
  assert.throws(() => assertDebBuildHost({ platform: 'linux', arch: 'x64', uid: 0, nodeMajor: 22 }), /regular user/);
  assert.throws(() => assertDebBuildHost({ platform: 'linux', arch: 'x64', uid: 1000, nodeMajor: 20 }), /Node\.js 22/);
  assert.doesNotThrow(() => assertDebBuildHost({ platform: 'linux', arch: 'x64', uid: 1000, nodeMajor: 22 }));
});

test('package metadata change adds only the DEB command and no dependencies', () => {
  const withoutDebScript = packageJsonSource.replace(/\n    "dist:deb": "node scripts\/package-deb\.mjs",/, '');
  const parsedWithoutDebScript = JSON.parse(withoutDebScript);
  delete parsedWithoutDebScript.scripts['dist:deb'];
  const baselineShape = JSON.parse(packageJsonSource);
  delete baselineShape.scripts['dist:deb'];
  assert.deepEqual(parsedWithoutDebScript, baselineShape);
});
