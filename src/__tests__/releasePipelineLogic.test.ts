/// <reference types="node" />

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'release-pipeline-logic.mjs')).href;
const loadLogic = async () => await import(moduleUrl) as {
  collectPlatformReleaseArtifacts: (options: Record<string, unknown>) => { manifestPath: string };
  verifyAndCollectReleaseBundle: (options: Record<string, unknown>) => { assets: Array<{ name: string }> };
};
const version = '0.9.9';
const tag = `v${version}`;
const commit = 'a'.repeat(40);

const rootFor = (t: TestContext) => {
  const root = mkdtempSync(path.join(tmpdir(), 'netraflow-release-pipeline-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

const writeZip = (zipPath: string) => {
  const names = [`NetraFlow_${version}_x64/NetraFlow.exe`, `NetraFlow_${version}_x64/resources/app.asar`];
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const name of names) {
    const fileName = Buffer.from(name);
    const content = Buffer.from('fixture');
    const local = Buffer.alloc(30 + fileName.length);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(content.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(fileName.length, 26); fileName.copy(local, 30);
    const central = Buffer.alloc(46 + fileName.length);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(content.length, 20); central.writeUInt32LE(content.length, 24); central.writeUInt16LE(fileName.length, 28); central.writeUInt32LE(offset, 42); fileName.copy(central, 46);
    localParts.push(local, content); centralParts.push(central); offset += local.length + content.length;
  }
  const directory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  writeFileSync(zipPath, Buffer.concat([...localParts, directory, end]));
};

const createInput = (root: string) => {
  const input = path.join(root, 'input');
  for (const platform of ['windows', 'macos', 'linux']) mkdirSync(path.join(input, platform), { recursive: true });
  writeFileSync(path.join(input, 'windows', `NetraFlow_${version}_x64_Setup.exe`), 'installer');
  writeZip(path.join(input, 'windows', `NetraFlow_${version}_x64_Portable.zip`));
  writeFileSync(path.join(input, 'macos', `NetraFlow_${version}_arm64.dmg`), 'dmg');
  writeFileSync(path.join(input, 'linux', `NetraFlow_${version}_x64.AppImage`), 'appimage');
  writeFileSync(path.join(input, 'linux', `NetraFlow_${version}_x64.deb`), 'deb');
  return input;
};

const createBundleFixture = async (t: TestContext) => {
  const logic = await loadLogic();
  const root = rootFor(t);
  const input = createInput(root);
  const downloads = path.join(root, 'downloads');
  for (const platform of ['windows', 'macos', 'linux']) {
    logic.collectPlatformReleaseArtifacts({ platform, inputDir: path.join(input, platform), outputDir: path.join(downloads, platform), version, tag, commit, minSizeBytes: 1 });
  }
  return { logic, root, downloads };
};

test('bundle verifier accepts exactly five matching platform artifacts', async (t) => {
  const { logic, root, downloads } = await createBundleFixture(t);
  const result = logic.verifyAndCollectReleaseBundle({ inputDir: downloads, outputDir: path.join(root, 'bundle'), version, tag, commit, minSizeBytes: 1 });
  assert.deepEqual(result.assets.map(({ name }) => name), [
    `NetraFlow_${version}_x64_Setup.exe`, `NetraFlow_${version}_x64_Portable.zip`, `NetraFlow_${version}_arm64.dmg`, `NetraFlow_${version}_x64.AppImage`, `NetraFlow_${version}_x64.deb`
  ]);
});

test('bundle verifier rejects missing extra and empty formal assets', async (t) => {
  for (const mutation of ['missing', 'extra', 'empty']) {
    const { logic, root, downloads } = await createBundleFixture(t);
    if (mutation === 'missing') rmSync(path.join(downloads, 'linux', `NetraFlow_${version}_x64.deb`));
    if (mutation === 'extra') writeFileSync(path.join(downloads, 'linux', 'NetraFlow_0.9.8_x64.deb'), 'extra');
    if (mutation === 'empty') writeFileSync(path.join(downloads, 'linux', `NetraFlow_${version}_x64.deb`), '');
    assert.throws(() => logic.verifyAndCollectReleaseBundle({ inputDir: downloads, outputDir: path.join(root, 'bundle'), version, tag, commit, minSizeBytes: 1 }));
  }
});

test('bundle verifier rejects manifest version commit and SHA-256 mismatches', async (t) => {
  for (const mutation of ['version', 'commit', 'sha256']) {
    const { logic, root, downloads } = await createBundleFixture(t);
    const manifestPath = path.join(downloads, 'linux', 'manifest-linux.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (mutation === 'version') manifest.version = '0.9.8';
    if (mutation === 'commit') manifest.commit = 'b'.repeat(40);
    if (mutation === 'sha256') manifest.assets[0].sha256 = '0'.repeat(64);
    writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.throws(() => logic.verifyAndCollectReleaseBundle({ inputDir: downloads, outputDir: path.join(root, 'bundle'), version, tag, commit, minSizeBytes: 1 }));
  }
});
