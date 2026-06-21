/// <reference types="node" />

import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { pathToFileURL } from 'node:url';

type ArtifactSummary = {
  installerPath: string;
  portablePath: string;
  installerName: string;
  portableName: string;
  assets: Array<{ kind: string; name: string; path: string; relativePath: string }>;
};

type ChecksumSummary = {
  checksumPath: string;
  checksumName: string;
  checksumRelativePath: string;
  text: string;
};

type ReleaseArtifactModule = {
  createSha256SumsText: (summary: ArtifactSummary) => string;
  createWorkflowOutputs: (options: {
    rootDir: string;
    artifactSummary: ArtifactSummary;
    checksumSummary: ChecksumSummary;
  }) => Record<string, string>;
  verifyReleaseArtifacts: (options: {
    rootDir: string;
    productName?: string;
    version: string;
    minSizeBytes?: number;
  }) => ArtifactSummary;
  writeSha256Sums: (options: {
    rootDir: string;
    artifactSummary: ArtifactSummary;
  }) => ChecksumSummary;
};

const projectRootPath = process.cwd();
const logicModuleUrl = pathToFileURL(
  path.join(projectRootPath, 'scripts', 'release-artifact-logic.mjs')
).href;

const loadReleaseArtifactLogic = async () =>
  (await import(logicModuleUrl)) as ReleaseArtifactModule;

const createFixtureRoot = (t: TestContext) => {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'netraflow-release-artifacts-'));

  t.after(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  return rootDir;
};

const writeFixtureFile = (filePath: string, size: number) => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, Buffer.alloc(size, 7));
};

const writeUInt32LE = (buffer: Buffer, value: number, offset: number) => {
  buffer.writeUInt32LE(value >>> 0, offset);
};

const createZip = (zipPath: string, entries: Array<{ name: string; content?: string }>) => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileNameBuffer = Buffer.from(entry.name, 'utf8');
    const contentBuffer = Buffer.from(entry.content ?? 'content', 'utf8');
    const localHeader = Buffer.alloc(30 + fileNameBuffer.length);
    const centralHeader = Buffer.alloc(46 + fileNameBuffer.length);
    const localHeaderOffset = offset;

    writeUInt32LE(localHeader, 0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    writeUInt32LE(localHeader, 0, 14);
    writeUInt32LE(localHeader, contentBuffer.length, 18);
    writeUInt32LE(localHeader, contentBuffer.length, 22);
    localHeader.writeUInt16LE(fileNameBuffer.length, 26);
    fileNameBuffer.copy(localHeader, 30);
    localParts.push(localHeader, contentBuffer);
    offset += localHeader.length + contentBuffer.length;

    writeUInt32LE(centralHeader, 0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    writeUInt32LE(centralHeader, 0, 16);
    writeUInt32LE(centralHeader, contentBuffer.length, 20);
    writeUInt32LE(centralHeader, contentBuffer.length, 24);
    centralHeader.writeUInt16LE(fileNameBuffer.length, 28);
    writeUInt32LE(centralHeader, localHeaderOffset, 42);
    fileNameBuffer.copy(centralHeader, 46);
    centralParts.push(centralHeader);
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);

  writeUInt32LE(endRecord, 0x06054b50, 0);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  writeUInt32LE(endRecord, centralDirectory.length, 12);
  writeUInt32LE(endRecord, offset, 16);
  mkdirSync(path.dirname(zipPath), { recursive: true });
  writeFileSync(zipPath, Buffer.concat([...localParts, centralDirectory, endRecord]));
};

const installerPathFor = (rootDir: string, version = '0.9.6', folder = version) =>
  path.join(rootDir, 'release', 'installer', folder, `NetraFlow_${version}_Setup.exe`);

const portablePathFor = (rootDir: string, version = '0.9.6', folder = version) =>
  path.join(rootDir, 'release', 'portable', folder, `NetraFlow_${version}_Portable.zip`);

const createValidArtifacts = (rootDir: string, version = '0.9.6') => {
  const installerPath = installerPathFor(rootDir, version);
  const portablePath = portablePathFor(rootDir, version);

  writeFixtureFile(installerPath, 16);
  createZip(portablePath, [
    { name: `NetraFlow_${version}/NetraFlow.exe` },
    { name: `NetraFlow_${version}/resources/app/dist/index.html` }
  ]);

  return { installerPath, portablePath };
};

const assertRejectsWith = (callback: () => unknown, text: string) => {
  assert.throws(callback, (error) => {
    assert.equal(error instanceof Error, true);
    assert.match((error as Error).message, new RegExp(text));
    return true;
  });
};

test('artifact verifier finds single installer and portable artifacts in versioned folders', async (t) => {
  const { verifyReleaseArtifacts, writeSha256Sums, createWorkflowOutputs } =
    await loadReleaseArtifactLogic();
  const rootDir = createFixtureRoot(t);

  createValidArtifacts(rootDir);
  mkdirSync(path.join(rootDir, 'release', 'portable', '0.9.6', 'NetraFlow_0.9.6'), {
    recursive: true
  });

  const summary = verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 1 });

  assert.equal(summary.installerPath.endsWith('NetraFlow_0.9.6_Setup.exe'), true);
  assert.equal(summary.portablePath.endsWith('NetraFlow_0.9.6_Portable.zip'), true);
  assert.deepEqual(
    summary.assets.map((asset) => asset.name),
    ['NetraFlow_0.9.6_Setup.exe', 'NetraFlow_0.9.6_Portable.zip']
  );

  const checksumSummary = writeSha256Sums({ rootDir, artifactSummary: summary });
  const checksumText = readFileSync(checksumSummary.checksumPath, 'utf8');
  const checksumLines = checksumText.trimEnd().split('\n');

  assert.equal(checksumSummary.checksumRelativePath, 'release/SHA256SUMS.txt');
  assert.equal(checksumLines.length, 2);
  assert.match(checksumLines[0], /^[a-f0-9]{64}  NetraFlow_0\.9\.6_Setup\.exe$/);
  assert.match(checksumLines[1], /^[a-f0-9]{64}  NetraFlow_0\.9\.6_Portable\.zip$/);
  assert.equal(checksumText.includes(rootDir), false);
  assert.equal(checksumText.endsWith('\n'), true);

  const outputs = createWorkflowOutputs({ rootDir, artifactSummary: summary, checksumSummary });

  assert.equal(outputs.installer_path.includes('\\'), false);
  assert.equal(outputs.portable_path.includes('\\'), false);
  assert.equal(outputs.checksum_path, 'release/SHA256SUMS.txt');
});

test('artifact verifier rejects installer sidecar artifacts', async (t) => {
  const { verifyReleaseArtifacts } = await loadReleaseArtifactLogic();
  const rootDir = createFixtureRoot(t);

  createValidArtifacts(rootDir);
  writeFixtureFile(
    path.join(rootDir, 'release', 'installer', '0.9.6', 'NetraFlow_0.9.6_Setup.exe.extra'),
    8
  );

  assertRejectsWith(
    () => verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 1 }),
    'Unexpected installer version artifacts'
  );
});

test('artifact verifier supports suffixed version directories created by repeat packaging', async (t) => {
  const { verifyReleaseArtifacts } = await loadReleaseArtifactLogic();
  const rootDir = createFixtureRoot(t);

  writeFixtureFile(installerPathFor(rootDir, '0.9.6', '0.9.6_1'), 16);
  createZip(portablePathFor(rootDir, '0.9.6', '0.9.6_1'), [
    { name: 'NetraFlow_0.9.6/resources/app/dist/index.html' }
  ]);

  const summary = verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 1 });

  assert.equal(summary.installerPath.includes(`${path.sep}0.9.6_1${path.sep}`), true);
  assert.equal(summary.portablePath.includes(`${path.sep}0.9.6_1${path.sep}`), true);
});

test('artifact verifier preserves release suffixes in installer and portable asset names', async (t) => {
  const { verifyReleaseArtifacts } = await loadReleaseArtifactLogic();
  const rootDir = createFixtureRoot(t);

  createValidArtifacts(rootDir, '0.9.8-rc1');

  const summary = verifyReleaseArtifacts({ rootDir, version: '0.9.8-rc1', minSizeBytes: 1 });

  assert.deepEqual(
    summary.assets.map((asset) => asset.name),
    ['NetraFlow_0.9.8-rc1_Setup.exe', 'NetraFlow_0.9.8-rc1_Portable.zip']
  );
  assert.equal(summary.installerName, 'NetraFlow_0.9.8-rc1_Setup.exe');
  assert.equal(summary.portableName, 'NetraFlow_0.9.8-rc1_Portable.zip');
});

test('artifact verifier rejects missing and wrong-version artifacts', async (t) => {
  const { verifyReleaseArtifacts } = await loadReleaseArtifactLogic();
  const rootDir = createFixtureRoot(t);

  assertRejectsWith(
    () => verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 1 }),
    'Installer artifact is missing'
  );

  writeFixtureFile(installerPathFor(rootDir, '0.9.5'), 16);
  createZip(portablePathFor(rootDir, '0.9.5'), [{ name: 'NetraFlow_0.9.5/NetraFlow.exe' }]);

  assertRejectsWith(
    () => verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 1 }),
    'Unexpected installer version artifacts'
  );
});

test('artifact verifier rejects missing portable and duplicate core artifacts', async (t) => {
  const { verifyReleaseArtifacts } = await loadReleaseArtifactLogic();
  const rootDir = createFixtureRoot(t);

  writeFixtureFile(installerPathFor(rootDir), 16);

  assertRejectsWith(
    () => verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 1 }),
    'Portable artifact is missing'
  );

  createZip(portablePathFor(rootDir), [{ name: 'NetraFlow_0.9.6/NetraFlow.exe' }]);
  writeFixtureFile(installerPathFor(rootDir, '0.9.6', '0.9.6_1'), 16);
  createZip(portablePathFor(rootDir, '0.9.6', '0.9.6_1'), [
    { name: 'NetraFlow_0.9.6/resources/app/dist/index.html' }
  ]);

  assertRejectsWith(
    () => verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 1 }),
    'Installer artifact is duplicated'
  );
  assertRejectsWith(
    () => verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 1 }),
    'Portable artifact is duplicated'
  );
});

test('artifact verifier rejects empty or undersized files', async (t) => {
  const { verifyReleaseArtifacts } = await loadReleaseArtifactLogic();
  const rootDir = createFixtureRoot(t);

  writeFixtureFile(installerPathFor(rootDir), 0);
  createZip(portablePathFor(rootDir), [{ name: 'NetraFlow_0.9.6/NetraFlow.exe' }]);

  assertRejectsWith(
    () => verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 1 }),
    'Installer artifact is empty'
  );

  writeFixtureFile(installerPathFor(rootDir), 16);

  assertRejectsWith(
    () => verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 4096 }),
    'Installer artifact is smaller'
  );
});

test('artifact verifier rejects forbidden portable zip entries at any depth and case', async (t) => {
  const { verifyReleaseArtifacts } = await loadReleaseArtifactLogic();
  const forbiddenEntries = [
    'NetraFlow_0.9.6/userdata/storage.json',
    'NetraFlow_0.9.6/resources/runtime/session/file',
    'NetraFlow_0.9.6/resources/UserData/file',
    'NetraFlow_0.9.6/resources/app/storage.json.previous',
    'NetraFlow_0.9.6/resources/.tmp-tests/output',
    'NetraFlow_0.9.6/resources/.tmp-dev-runtime/cache',
    'NetraFlow_0.9.6/resources/AppData/NetraFlow/file'
  ];

  for (const [index, forbiddenEntry] of forbiddenEntries.entries()) {
    const rootDir = createFixtureRoot(t);

    writeFixtureFile(installerPathFor(rootDir), 16);
    createZip(portablePathFor(rootDir), [
      { name: 'NetraFlow_0.9.6/NetraFlow.exe' },
      { name: forbiddenEntry }
    ]);

    assertRejectsWith(
      () => verifyReleaseArtifacts({ rootDir, version: '0.9.6', minSizeBytes: 1 }),
      'Portable zip contains forbidden entries'
    );

    assert.equal(index >= 0, true);
  }
});
