import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { findForbiddenZipEntries, listZipEntries, normalizeRelativePath } from './release-artifact-logic.mjs';

export const RELEASE_MANIFEST_SCHEMA = 1;
export const DEFAULT_MIN_RELEASE_ARTIFACT_SIZE = 1024 * 1024;

export const getReleaseArtifactNames = (version) => ({
  windows: [
    `NetraFlow_${version}_x64_Setup.exe`,
    `NetraFlow_${version}_x64_Portable.zip`
  ],
  macos: [`NetraFlow_${version}_arm64.dmg`],
  linux: [
    `NetraFlow_${version}_x64.AppImage`,
    `NetraFlow_${version}_x64.deb`
  ]
});

const platformArchitecture = {
  windows: 'x64',
  macos: 'arm64',
  linux: 'x64'
};

const formalAssetPattern = /^NetraFlow_.+\.(?:exe|zip|dmg|AppImage|deb)$/;
const sha256File = (filePath) => createHash('sha256').update(readFileSync(filePath)).digest('hex');

const walkFiles = (directoryPath) => {
  if (!existsSync(directoryPath)) return [];
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
};

const assertSafeFreshDirectory = (directoryPath, label) => {
  if (existsSync(directoryPath) && readdirSync(directoryPath).length > 0) {
    throw new Error(`${label} must be a fresh empty directory: ${directoryPath}`);
  }
  mkdirSync(directoryPath, { recursive: true });
};

const assertVersionTagCommit = ({ version, tag, commit }) => {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?$/.test(version)) {
    throw new Error(`Invalid release version: ${version}`);
  }
  if (tag !== `v${version}`) throw new Error(`Release tag ${tag} does not match version ${version}.`);
  if (!/^[0-9a-f]{40}$/i.test(commit)) throw new Error(`Invalid release commit SHA: ${commit}`);
};

const verifyPortableZip = (zipPath, version) => {
  const entries = listZipEntries(zipPath).map(normalizeRelativePath);
  const root = `NetraFlow_${version}_x64/`;
  if (!entries.includes(`${root}NetraFlow.exe`)) {
    throw new Error(`Portable ZIP is missing ${root}NetraFlow.exe.`);
  }
  if (entries.some((entry) => /(^|\/)Electron\.exe$/i.test(entry))) {
    throw new Error('Portable ZIP contains Electron.exe as a product executable.');
  }
  const forbidden = findForbiddenZipEntries(entries);
  if (forbidden.length > 0) {
    throw new Error(`Portable ZIP contains forbidden data: ${forbidden.join(', ')}`);
  }
  if (entries.some((entry) => /^[A-Za-z]:[\\/]|^\//.test(entry))) {
    throw new Error('Portable ZIP contains an absolute path.');
  }
  if (entries.some((entry) => entry.split('/').some((segment) => /^(?:src|electron|tests?|__tests__)$/.test(segment.toLowerCase())))) {
    throw new Error('Portable ZIP contains source or test data.');
  }
};

export const collectPlatformReleaseArtifacts = ({
  platform,
  inputDir,
  outputDir,
  version,
  tag,
  commit,
  minSizeBytes = DEFAULT_MIN_RELEASE_ARTIFACT_SIZE,
  macosSigning = 'unsigned; not notarized'
}) => {
  assertVersionTagCommit({ version, tag, commit });
  const expectedNames = getReleaseArtifactNames(version)[platform];
  if (!expectedNames) throw new Error(`Unsupported release platform: ${platform}`);
  assertSafeFreshDirectory(outputDir, 'Platform artifact output');

  const files = walkFiles(inputDir);
  const formalFiles = files.filter((filePath) => formalAssetPattern.test(path.basename(filePath)));
  const unexpectedNames = [...new Set(formalFiles.map((filePath) => path.basename(filePath)))]
    .filter((name) => !expectedNames.includes(name));
  if (unexpectedNames.length > 0) {
    throw new Error(`Unexpected formal release artifacts for ${platform}: ${unexpectedNames.join(', ')}`);
  }

  const assets = expectedNames.map((name) => {
    const matches = files.filter((filePath) => path.basename(filePath) === name);
    if (matches.length !== 1) {
      throw new Error(`${name} must exist exactly once; found ${matches.length}.`);
    }
    const sourcePath = matches[0];
    const stats = statSync(sourcePath);
    if (!stats.isFile() || stats.size === 0) throw new Error(`${name} is empty or not a regular file.`);
    if (stats.size < minSizeBytes) throw new Error(`${name} is smaller than ${minSizeBytes} bytes.`);
    if (name.endsWith('_Portable.zip')) verifyPortableZip(sourcePath, version);
    const destinationPath = path.join(outputDir, name);
    copyFileSync(sourcePath, destinationPath);
    return { name, size: stats.size, sha256: sha256File(destinationPath) };
  });

  const manifest = {
    schema: RELEASE_MANIFEST_SCHEMA,
    version,
    tag,
    commit,
    platform,
    architecture: platformArchitecture[platform],
    ...(platform === 'macos' ? { signing: macosSigning } : {}),
    assets
  };
  const manifestName = `manifest-${platform}.json`;
  const manifestPath = path.join(outputDir, manifestName);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { manifest, manifestPath, assetPaths: assets.map(({ name }) => path.join(outputDir, name)) };
};

const readManifest = (manifestPath) => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.schema !== RELEASE_MANIFEST_SCHEMA) {
    throw new Error(`Unsupported manifest schema in ${manifestPath}.`);
  }
  return manifest;
};

export const verifyAndCollectReleaseBundle = ({
  inputDir,
  outputDir,
  version,
  tag,
  commit,
  minSizeBytes = DEFAULT_MIN_RELEASE_ARTIFACT_SIZE
}) => {
  assertVersionTagCommit({ version, tag, commit });
  assertSafeFreshDirectory(outputDir, 'Release bundle output');
  const files = walkFiles(inputDir);
  const manifestPaths = files.filter((filePath) => /^manifest-(windows|macos|linux)\.json$/.test(path.basename(filePath)));
  if (manifestPaths.length !== 3) throw new Error(`Release bundle requires exactly three manifests; found ${manifestPaths.length}.`);

  const manifests = manifestPaths.map(readManifest);
  for (const platform of ['windows', 'macos', 'linux']) {
    const matching = manifests.filter((manifest) => manifest.platform === platform);
    if (matching.length !== 1) throw new Error(`Release bundle requires one ${platform} manifest; found ${matching.length}.`);
  }

  const expectedNames = Object.values(getReleaseArtifactNames(version)).flat();
  const manifestAssets = [];
  for (const manifest of manifests) {
    if (manifest.version !== version || manifest.tag !== tag || manifest.commit !== commit) {
      throw new Error(`Manifest identity mismatch for ${manifest.platform}.`);
    }
    if (manifest.architecture !== platformArchitecture[manifest.platform]) {
      throw new Error(`Manifest architecture mismatch for ${manifest.platform}.`);
    }
    const expectedPlatformNames = getReleaseArtifactNames(version)[manifest.platform];
    if (manifest.assets.length !== expectedPlatformNames.length) {
      throw new Error(`Manifest asset count mismatch for ${manifest.platform}.`);
    }
    for (const asset of manifest.assets) {
      if (!expectedPlatformNames.includes(asset.name)) throw new Error(`Unexpected manifest asset: ${asset.name}`);
      manifestAssets.push({ ...asset, platform: manifest.platform });
    }
  }
  if (manifestAssets.length !== 5 || new Set(manifestAssets.map(({ name }) => name)).size !== 5) {
    throw new Error('Release manifests must describe exactly five unique assets.');
  }

  const formalFiles = files.filter((filePath) => formalAssetPattern.test(path.basename(filePath)));
  const formalNames = formalFiles.map((filePath) => path.basename(filePath));
  const unexpected = formalNames.filter((name) => !expectedNames.includes(name));
  if (unexpected.length > 0) throw new Error(`Release bundle contains extra formal assets: ${unexpected.join(', ')}`);

  const assets = expectedNames.map((name) => {
    const matches = formalFiles.filter((filePath) => path.basename(filePath) === name);
    if (matches.length !== 1) throw new Error(`${name} must exist exactly once in the bundle; found ${matches.length}.`);
    const sourcePath = matches[0];
    const stats = statSync(sourcePath);
    if (!stats.isFile() || stats.size === 0) throw new Error(`${name} is empty or not a regular file.`);
    if (stats.size < minSizeBytes) throw new Error(`${name} is smaller than ${minSizeBytes} bytes.`);
    const actualHash = sha256File(sourcePath);
    const manifestAsset = manifestAssets.find((asset) => asset.name === name);
    if (!manifestAsset || manifestAsset.size !== stats.size || manifestAsset.sha256 !== actualHash) {
      throw new Error(`Manifest size or SHA-256 mismatch for ${name}.`);
    }
    const destinationPath = path.join(outputDir, name);
    copyFileSync(sourcePath, destinationPath);
    return { name, size: stats.size, sha256: actualHash, path: destinationPath };
  });

  if (readdirSync(outputDir).length !== 5) throw new Error('Final release bundle must contain exactly five files.');
  const bundleManifest = {
    schema: RELEASE_MANIFEST_SCHEMA,
    version,
    tag,
    commit,
    manifests,
    assets: assets.map(({ name, size, sha256 }) => ({ name, size, sha256 }))
  };
  return { assets, bundleManifest };
};
