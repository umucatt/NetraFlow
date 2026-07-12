import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
    readFileSync(path.join(rootDir, 'electron', 'main.ts'), 'utf8')
  ];

  for (const source of inspectedSources) {
    assert.equal(source.includes(forbiddenArgument), false);
  }
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
