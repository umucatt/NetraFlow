import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';

export const DEFAULT_MIN_ARTIFACT_SIZE_BYTES = 1024 * 1024;
export const SHA256SUMS_FILE_NAME = 'SHA256SUMS.txt';

const ZIP_CENTRAL_DIRECTORY_FILE_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP64_SENTINEL_16 = 0xffff;
const ZIP64_SENTINEL_32 = 0xffffffff;

const forbiddenZipFileNames = new Set([
  'storage.json',
  'storage.json.tmp',
  'storage.json.previous',
  'storage.json.previous.tmp'
]);

const forbiddenZipDirectoryNames = new Set([
  'userdata',
  'runtime',
  'appdata',
  '.tmp-tests'
]);

export class ReleaseArtifactVerificationError extends Error {
  constructor(errors) {
    super(`Release artifact verification failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    this.name = 'ReleaseArtifactVerificationError';
    this.errors = errors;
  }
}

export const normalizeRelativePath = (filePath) =>
  String(filePath ?? '').replaceAll('\\', '/').replace(/^\.\//, '');

const toReleaseRelativePath = (rootDir, filePath) =>
  normalizeRelativePath(path.relative(rootDir, filePath));

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getExpectedReleaseArtifactNames = ({ productName = 'NetraFlow', version }) => ({
  installerName: `${productName}_${version}_Setup.exe`,
  portableName: `${productName}_${version}_Portable.zip`
});

const walkFiles = (directoryPath) => {
  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }

    return [entryPath];
  });
};

const findArtifactMatches = ({ rootDir, searchRoot, expectedName }) =>
  walkFiles(searchRoot).filter((filePath) => path.basename(filePath) === expectedName);

const findUnexpectedVersionArtifacts = ({ searchRoot, productName, expectedName, artifactPattern }) =>
  walkFiles(searchRoot).filter((filePath) => {
    const fileName = path.basename(filePath);

    return fileName !== expectedName && artifactPattern.test(fileName);
  });

const assertSingleArtifact = ({ errors, rootDir, label, matches }) => {
  if (matches.length === 0) {
    errors.push(`${label} artifact is missing`);
    return null;
  }

  if (matches.length > 1) {
    errors.push(
      `${label} artifact is duplicated:\n${matches
        .map((filePath) => toReleaseRelativePath(rootDir, filePath))
        .join('\n')}`
    );
    return null;
  }

  return matches[0];
};

const verifyFileSize = ({ errors, rootDir, label, filePath, expectedName, minSizeBytes }) => {
  if (!filePath) {
    return;
  }

  const stats = statSync(filePath);

  if (!stats.isFile()) {
    errors.push(`${label} artifact is not a regular file: ${toReleaseRelativePath(rootDir, filePath)}`);
    return;
  }

  if (path.basename(filePath) !== expectedName) {
    errors.push(`${label} artifact name is unexpected: ${path.basename(filePath)}`);
  }

  if (stats.size <= 0) {
    errors.push(`${label} artifact is empty: ${toReleaseRelativePath(rootDir, filePath)}`);
    return;
  }

  if (stats.size < minSizeBytes) {
    errors.push(
      `${label} artifact is smaller than ${minSizeBytes} bytes: ${toReleaseRelativePath(rootDir, filePath)}`
    );
  }
};

export const listZipEntries = (zipPath) => {
  const buffer = readFileSync(zipPath);

  if (buffer.length < 22) {
    throw new Error(`Zip file is too small to contain an end record: ${zipPath}`);
  }

  const minOffset = Math.max(0, buffer.length - 65557);
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error(`Zip end of central directory was not found: ${zipPath}`);
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (
    totalEntries === ZIP64_SENTINEL_16 ||
    centralDirectorySize === ZIP64_SENTINEL_32 ||
    centralDirectoryOffset === ZIP64_SENTINEL_32
  ) {
    throw new Error(`Zip64 central directories are not supported by this verifier: ${zipPath}`);
  }

  if (centralDirectoryOffset + centralDirectorySize > eocdOffset) {
    throw new Error(`Zip central directory points outside the file: ${zipPath}`);
  }

  const entries = [];
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > buffer.length) {
      throw new Error(`Zip central directory entry is truncated: ${zipPath}`);
    }

    if (buffer.readUInt32LE(cursor) !== ZIP_CENTRAL_DIRECTORY_FILE_HEADER) {
      throw new Error(`Zip central directory entry has an invalid signature: ${zipPath}`);
    }

    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;

    if (fileNameEnd > buffer.length) {
      throw new Error(`Zip central directory entry name is truncated: ${zipPath}`);
    }

    entries.push(buffer.subarray(fileNameStart, fileNameEnd).toString('utf8'));
    cursor = fileNameEnd + extraLength + commentLength;
  }

  return entries;
};

export const findForbiddenZipEntries = (zipEntries) =>
  zipEntries
    .map((entryName) => normalizeRelativePath(entryName))
    .filter((entryName) => {
      const lowerSegments = entryName
        .toLowerCase()
        .split('/')
        .filter(Boolean);

      return lowerSegments.some(
        (segment) =>
          forbiddenZipDirectoryNames.has(segment) ||
          forbiddenZipFileNames.has(segment) ||
          segment.startsWith('.tmp-dev-')
      );
    });

const verifyPortableZipContents = ({ errors, rootDir, portablePath }) => {
  if (!portablePath) {
    return;
  }

  let zipEntries = [];

  try {
    zipEntries = listZipEntries(portablePath);
  } catch (error) {
    errors.push(
      `Portable zip cannot be read: ${toReleaseRelativePath(rootDir, portablePath)} (${error instanceof Error ? error.message : String(error)})`
    );
    return;
  }

  const forbiddenEntries = findForbiddenZipEntries(zipEntries);

  if (forbiddenEntries.length > 0) {
    errors.push(
      `Portable zip contains forbidden entries:\n${forbiddenEntries
        .map((entryName) => `portable:${entryName}`)
        .join('\n')}`
    );
  }
};

const createArtifactSummary = ({ rootDir, installerPath, portablePath, installerName, portableName }) => ({
  installerPath,
  portablePath,
  installerName,
  portableName,
  assets: [
    {
      kind: 'installer',
      name: installerName,
      path: installerPath,
      relativePath: toReleaseRelativePath(rootDir, installerPath)
    },
    {
      kind: 'portable',
      name: portableName,
      path: portablePath,
      relativePath: toReleaseRelativePath(rootDir, portablePath)
    }
  ]
});

export const verifyReleaseArtifacts = ({
  rootDir,
  productName = 'NetraFlow',
  version,
  minSizeBytes = DEFAULT_MIN_ARTIFACT_SIZE_BYTES
}) => {
  const errors = [];
  const releaseRoot = path.join(rootDir, 'release');
  const installerRoot = path.join(releaseRoot, 'installer');
  const portableRoot = path.join(releaseRoot, 'portable');
  const { installerName, portableName } = getExpectedReleaseArtifactNames({ productName, version });
  const installerPattern = new RegExp(`^${escapeRegExp(productName)}_.+_Setup\\.exe(?:\\..+)?$`);
  const portablePattern = new RegExp(`^${escapeRegExp(productName)}_.+_Portable\\.zip$`);
  const unexpectedInstallerArtifacts = findUnexpectedVersionArtifacts({
    searchRoot: installerRoot,
    productName,
    expectedName: installerName,
    artifactPattern: installerPattern
  });
  const unexpectedPortableArtifacts = findUnexpectedVersionArtifacts({
    searchRoot: portableRoot,
    productName,
    expectedName: portableName,
    artifactPattern: portablePattern
  });

  if (unexpectedInstallerArtifacts.length > 0) {
    errors.push(
      `Unexpected installer version artifacts:\n${unexpectedInstallerArtifacts
        .map((filePath) => toReleaseRelativePath(rootDir, filePath))
        .join('\n')}`
    );
  }

  if (unexpectedPortableArtifacts.length > 0) {
    errors.push(
      `Unexpected portable version artifacts:\n${unexpectedPortableArtifacts
        .map((filePath) => toReleaseRelativePath(rootDir, filePath))
        .join('\n')}`
    );
  }

  const installerPath = assertSingleArtifact({
    errors,
    rootDir,
    label: 'Installer',
    matches: findArtifactMatches({ rootDir, searchRoot: installerRoot, expectedName: installerName })
  });
  const portablePath = assertSingleArtifact({
    errors,
    rootDir,
    label: 'Portable',
    matches: findArtifactMatches({ rootDir, searchRoot: portableRoot, expectedName: portableName })
  });

  verifyFileSize({
    errors,
    rootDir,
    label: 'Installer',
    filePath: installerPath,
    expectedName: installerName,
    minSizeBytes
  });
  verifyFileSize({
    errors,
    rootDir,
    label: 'Portable',
    filePath: portablePath,
    expectedName: portableName,
    minSizeBytes
  });
  verifyPortableZipContents({ errors, rootDir, portablePath });

  if (errors.length > 0) {
    throw new ReleaseArtifactVerificationError(errors);
  }

  return createArtifactSummary({
    rootDir,
    installerPath,
    portablePath,
    installerName,
    portableName
  });
};

const sha256File = (filePath) => createHash('sha256').update(readFileSync(filePath)).digest('hex');

export const createSha256SumsText = ({ installerPath, portablePath, installerName, portableName }) =>
  `${sha256File(installerPath)}  ${installerName}\n${sha256File(portablePath)}  ${portableName}\n`;

export const writeSha256Sums = ({ rootDir, artifactSummary }) => {
  const releaseRoot = path.join(rootDir, 'release');
  const checksumPath = path.join(releaseRoot, SHA256SUMS_FILE_NAME);
  const text = createSha256SumsText(artifactSummary);

  mkdirSync(releaseRoot, { recursive: true });
  writeFileSync(checksumPath, text, 'utf8');

  return {
    checksumPath,
    checksumName: SHA256SUMS_FILE_NAME,
    checksumRelativePath: toReleaseRelativePath(rootDir, checksumPath),
    text
  };
};

export const createWorkflowOutputs = ({ rootDir, artifactSummary, checksumSummary }) => ({
  installer_path: toReleaseRelativePath(rootDir, artifactSummary.installerPath),
  portable_path: toReleaseRelativePath(rootDir, artifactSummary.portablePath),
  checksum_path: checksumSummary.checksumRelativePath,
  installer_name: artifactSummary.installerName,
  portable_name: artifactSummary.portableName,
  checksum_name: checksumSummary.checksumName
});
