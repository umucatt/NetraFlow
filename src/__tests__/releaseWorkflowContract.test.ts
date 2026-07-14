/// <reference types="node" />

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { readProjectFile } from './contractText';

const releasePath = '.github/workflows/release.yml';
const verifyPath = '.github/workflows/verify.yml';

const section = (source: string, start: string, end?: string) => {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section ${start}`);
  const endIndex = end ? source.indexOf(end, startIndex + start.length) : source.length;
  assert.notEqual(endIndex, -1, `Missing section end ${end}`);
  return source.slice(startIndex, endIndex);
};

test('verify workflow runs read-only validation for branch pushes and pull requests on three platforms', () => {
  assert.equal(existsSync(new URL(`../../../${verifyPath}`, import.meta.url)), true);
  const source = readProjectFile(verifyPath);
  const trigger = section(source, '\non:', '\npermissions:');
  assert.match(trigger, /push:\n\s+branches:\n\s+- "\*\*"/);
  assert.match(trigger, /pull_request:/);
  assert.equal(trigger.includes('tags:'), false);
  assert.equal(trigger.includes('workflow_dispatch'), false);
  assert.match(source, /windows-latest/);
  assert.match(source, /macos-14/);
  assert.match(source, /ubuntu-22\.04/);
  assert.match(source, /fail-fast: false/);
  assert.match(source, /contents: read/);
  assert.equal(source.includes('contents: write'), false);
  for (const command of ['dist:installer', 'dist:portable', 'dist:mac', 'dist:linux', 'dist:deb', 'gh release']) {
    assert.equal(source.includes(command), false, `verify.yml must not contain ${command}`);
  }
  for (const command of ['npm ci', 'npm run typecheck', 'npm test', 'npm run build', 'git diff --check', 'verify-build-outputs.mjs']) {
    assert.equal(source.includes(command), true, `verify.yml must contain ${command}`);
  }
});

test('release workflow only accepts version tag pushes and has one guarded publisher', () => {
  assert.equal(existsSync(new URL(`../../../${releasePath}`, import.meta.url)), true);
  const source = readProjectFile(releasePath);
  const trigger = section(source, '\non:', '\npermissions:');
  assert.match(trigger, /push:\n\s+tags:\n\s+- "v\*\.\*\.\*"\n\s+- "v\*\.\*\.\*-\*"/);
  assert.equal(trigger.includes('workflow_dispatch'), false);
  assert.equal(trigger.includes('branches:'), false);
  assert.equal(trigger.includes('pull_request:'), false);
  assert.match(section(source, '\npermissions:', '\nconcurrency:'), /contents: read/);
  assert.match(source, /group: release-\$\{\{ github\.ref \}\}/);
  assert.match(source, /cancel-in-progress: false/);

  for (const job of ['prepare:', 'build-windows:', 'build-macos:', 'build-linux:', 'publish-release:']) {
    assert.equal(source.includes(`  ${job}`), true, `Missing ${job}`);
  }
  for (const job of ['build-windows', 'build-macos', 'build-linux']) {
    const block = section(source, `  ${job}:`, job === 'build-windows' ? '\n  build-macos:' : job === 'build-macos' ? '\n  build-linux:' : '\n  publish-release:');
    assert.match(block, /needs: prepare/);
    assert.equal(block.includes('contents: write'), false);
    assert.equal(block.includes('gh release create'), false);
    assert.match(block, /verify-checkout\.mjs/);
  }
  const publish = section(source, '  publish-release:');
  assert.match(publish, /needs:\n\s+- prepare\n\s+- build-windows\n\s+- build-macos\n\s+- build-linux/);
  assert.match(publish, /permissions:\n\s+contents: write/);
  assert.equal((source.match(/contents: write/g) ?? []).length, 1);
  assert.equal((source.match(/gh release create/g) ?? []).length, 1);
  assert.match(publish, /gh release view/);
  assert.match(publish, /--draft/);
  assert.match(publish, /--prerelease/);
  assert.match(publish, /partial draft may exist/);
  assert.equal(publish.includes('gh release delete'), false);
  assert.equal(publish.includes('git tag'), false);
  assert.equal(publish.includes('git push'), false);
});

test('release workflow stages manifests internally and uploads exactly five named Release assets', () => {
  const source = readProjectFile(releasePath);
  for (const action of ['actions/checkout@v5', 'actions/setup-node@v5', 'actions/upload-artifact@v4', 'actions/download-artifact@v4']) {
    assert.equal(source.includes(action), true, `Missing ${action}`);
  }
  assert.equal(source.includes('persist-credentials: false'), true);
  assert.equal(source.includes('node-version: 22'), true);
  for (const artifact of [
    'NetraFlow_${RELEASE_VERSION}_x64_Setup.exe',
    'NetraFlow_${RELEASE_VERSION}_x64_Portable.zip',
    'NetraFlow_${RELEASE_VERSION}_arm64.dmg',
    'NetraFlow_${RELEASE_VERSION}_x64.AppImage',
    'NetraFlow_${RELEASE_VERSION}_x64.deb'
  ]) assert.equal(source.includes(artifact), true, `Missing asset ${artifact}`);
  const createBlock = section(source, 'if ! gh release create');
  assert.equal((createBlock.match(/"release-bundle\/NetraFlow_/g) ?? []).length, 5);
  for (const forbidden of ['SHA256SUMS', 'manifest-', 'latest.yml', '.blockmap', 'source.zip', 'source.tar.gz']) {
    assert.equal(createBlock.includes(forbidden), false, `Release upload includes ${forbidden}`);
  }
  assert.match(source, /Create release notes with SHA-256/);
  assert.match(source, /bundle-manifest\.json/);
});
