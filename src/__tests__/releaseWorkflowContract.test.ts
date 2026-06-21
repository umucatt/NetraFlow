/// <reference types="node" />

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

import { normalizeNewlines, readProjectFile } from './contractText';

const releaseWorkflowPath = '.github/workflows/release-windows.yml';
const verifyWorkflowPath = '.github/workflows/verify-windows.yml';

const assertIncludesInOrder = (source: string, snippets: string[]) => {
  let cursor = -1;

  for (const snippet of snippets) {
    const index = source.indexOf(snippet, cursor + 1);

    assert.notEqual(index, -1, `Missing ordered snippet: ${snippet}`);
    assert.equal(index > cursor, true, `Snippet is out of order: ${snippet}`);
    cursor = index;
  }
};

const sliceBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);

  return source.slice(startIndex, endIndex);
};

const sliceFrom = (source: string, start: string) => {
  const startIndex = source.indexOf(start);

  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);

  return source.slice(startIndex);
};

const assertReleaseTriggerContract = (source: string) => {
  const triggerBlock = sliceBetween(source, '\non:', '\npermissions:');

  assert.match(triggerBlock, /^\s+workflow_dispatch:\n/m);
  assert.match(triggerBlock, /^\s+push:\n\s+tags:\n\s+- "v\*\.\*\.\*"\n\s+- "v\*\.\*\.\*-\*"/m);
  assert.equal(/pull_request:/.test(source), false);
  assert.equal(/branches:/.test(triggerBlock), false);
  assert.equal(/paths:/.test(triggerBlock), false);
  assert.equal(/schedule:/.test(triggerBlock), false);
};

test('release workflow trigger contract ignores LF and CRLF source newlines', () => {
  const lfSource = [
    'name: Release Windows',
    'on:',
    '  workflow_dispatch:',
    '  push:',
    '    tags:',
    '      - "v*.*.*"',
    '      - "v*.*.*-*"',
    'permissions:',
    '  contents: write',
    ''
  ].join('\n');
  const crlfSource = lfSource.replace(/\n/g, '\r\n');

  assertReleaseTriggerContract(normalizeNewlines(lfSource));
  assertReleaseTriggerContract(normalizeNewlines(crlfSource));
});

test('release workflow is independent and only runs on manual dispatch or version tags', () => {
  assert.equal(existsSync(new URL(`../../../${releaseWorkflowPath}`, import.meta.url)), true);

  assertReleaseTriggerContract(readProjectFile(releaseWorkflowPath));
});

test('release workflow keeps permissions narrow and uses the Windows Node 22 runner', () => {
  const source = readProjectFile(releaseWorkflowPath);
  const permissionsBlock = sliceBetween(source, '\npermissions:', '\nconcurrency:');

  assert.match(permissionsBlock, /^\s+contents: write$/m);
  assert.equal(/actions:\s*write/.test(permissionsBlock), false);
  assert.equal(/packages:\s*write/.test(permissionsBlock), false);
  assert.equal(/issues:\s*write/.test(permissionsBlock), false);
  assert.equal(/pull-requests:\s*write/.test(permissionsBlock), false);
  assert.equal(/id-token:\s*write/.test(permissionsBlock), false);

  assert.match(source, /runs-on: windows-latest/);
  assert.match(source, /uses: actions\/checkout@v5/);
  assert.match(source, /fetch-depth: 0/);
  assert.match(source, /persist-credentials: false/);
  assert.match(source, /uses: actions\/setup-node@v5/);
  assert.match(source, /node-version: 22/);
  assert.match(source, /cache: npm/);
  assert.match(source, /cancel-in-progress: false/);
  assert.equal(source.includes('actions/checkout@v4'), false);
  assert.equal(source.includes('actions/setup-node@v4'), false);
});

test('release workflow validates tag and existing release before package creation', () => {
  const source = readProjectFile(releaseWorkflowPath);

  assertIncludesInOrder(source, [
    'run: npm ci',
    '$versionPattern =',
    '[regex]::Match($version, $versionPattern)',
    '$isPrerelease = $major -eq 0 -or $suffix -match "(?i)beta|rc"',
    'RELEASE_VERSION=$version',
    'RELEASE_TAG=$releaseTag',
    'NETRAFLOW_RELEASE_TAG=$releaseTag',
    'IS_PRERELEASE=$isPrereleaseText',
    'INSTALLER_NAME=$installerName',
    'PORTABLE_NAME=$portableName',
    'git rev-list -n 1 $env:RELEASE_TAG',
    'gh api --include $apiPath',
    'HTTP/\\S+\\s+404',
    'npm run release:check -- --strict',
    'npm run typecheck',
    'npm test',
    'npm run build',
    'Verify Electron build outputs',
    'dist-electron/main.js',
    'dist-electron/preload.js',
    'npm run dist:installer',
    'npm run dist:portable',
    'npm run release:verify-artifacts',
    'node scripts/create-release-notes.mjs',
    '& gh @arguments'
  ]);

  assert.match(source, /GITHUB_REF_NAME -ne \$env:RELEASE_TAG/);
  assert.match(source, /points to \$tagCommit, expected checkout commit \$headCommit/);
  assert.match(source, /Release \$env:RELEASE_TAG already exists/);
  assert.match(source, /Unable to verify whether Release \$env:RELEASE_TAG exists/);
});

test('release workflow verifies Electron build outputs after build', () => {
  const source = readProjectFile(releaseWorkflowPath);

  assertIncludesInOrder(source, [
    'npm run build',
    'Verify Electron build outputs',
    'foreach ($buildOutput in @("dist-electron/main.js", "dist-electron/preload.js"))',
    'Test-Path -LiteralPath $buildOutput -PathType Leaf',
    'Get-Item -LiteralPath $buildOutput',
    '$buildOutputItem.Length -le 0',
    'npm run dist:installer'
  ]);
});

test('release workflow creates draft releases with conditional prerelease flag and only installer and portable upload assets', () => {
  const source = readProjectFile(releaseWorkflowPath);
  const releaseBlock = sliceFrom(source, '- name: Create draft GitHub Release');

  assert.match(source, /Verify release artifacts and create SHA256SUMS/);
  assert.match(source, /\$installerPath = "\$\{\{ steps\.artifacts\.outputs\.installer_path \}\}"/);
  assert.match(source, /\$portablePath = "\$\{\{ steps\.artifacts\.outputs\.portable_path \}\}"/);
  assert.match(source, /node scripts\/create-release-notes\.mjs/);
  assert.match(source, /\$releaseNotesPath = "\$\{\{ steps\.release_notes\.outputs\.release_notes_path \}\}"/);
  assert.match(releaseBlock, /"release",\s+"create"/);
  assertIncludesInOrder(releaseBlock, [
    '$env:RELEASE_TAG',
    '$installerPath',
    '$portablePath',
    '"--title"',
    '"NetraFlow $env:RELEASE_VERSION"',
    '"--draft"',
    '"--notes-file"',
    '$releaseNotesPath',
    'if ($env:IS_PRERELEASE -eq "true")',
    '$arguments += "--prerelease"',
    '& gh @arguments'
  ]);
  assert.match(source, /Draft Release creation or asset upload failed/);
  assert.match(source, /does not delete draft Releases or tags/);

  assert.equal(releaseBlock.includes('$checksumPath'), false);
  assert.equal(releaseBlock.includes('SHA256SUMS.txt'), false);
  assert.equal(releaseBlock.includes('.blockmap'), false);
  assert.equal(releaseBlock.includes('--generate-notes'), false);
  assert.match(releaseBlock, /if \(\$env:IS_PRERELEASE -eq "true"\) \{\n\s+\$arguments \+= "--prerelease"/);
  assert.equal(/Invoke-Expression|eval\b/.test(releaseBlock), false);
  assert.equal(source.includes('MANUAL_PRERELEASE'), false);
  assert.equal(source.includes('.blockmap'), false);
  assert.equal(source.includes('release/installer/**'), false);
  assert.equal(source.includes('release/portable/**'), false);
  assert.equal(/\bgit\s+tag\b/.test(source), false);
  assert.equal(/\bgit\s+push\b/.test(source), false);
  assert.equal(source.includes('--latest'), false);
});

test('verify workflow remains read-only and has no release responsibilities', () => {
  const verifySource = readProjectFile(verifyWorkflowPath);
  const verifyPermissionsBlock = sliceBetween(verifySource, '\npermissions:', '\nconcurrency:');

  assert.match(verifySource, /uses: actions\/checkout@v5/);
  assert.match(verifySource, /uses: actions\/setup-node@v5/);
  assert.match(verifySource, /node-version: 22/);
  assert.match(verifySource, /cache: npm/);
  assert.equal(verifySource.includes('actions/checkout@v4'), false);
  assert.equal(verifySource.includes('actions/setup-node@v4'), false);
  assert.match(verifyPermissionsBlock, /^\s+contents: read$/m);
  assert.equal(verifySource.includes('contents: write'), false);
  assert.equal(verifySource.includes('dist:installer'), false);
  assert.equal(verifySource.includes('dist:portable'), false);
  assert.equal(verifySource.includes('release:verify-artifacts'), false);
  assert.equal(verifySource.includes('gh release'), false);
  assert.equal(verifySource.includes('SHA256SUMS'), false);
});
