import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const releaseRootPath = path.join(rootDir, 'release');

export const isFinalRelease = () => {
  const finalFlag = String(process.env.NETRAFLOW_RELEASE_FINAL ?? '').toLowerCase();

  return process.argv.includes('--final') || finalFlag === '1' || finalFlag === 'true';
};

export const assertInsideProjectRelease = (targetPath) => {
  const resolvedReleaseRoot = path.resolve(releaseRootPath);
  const resolvedTarget = path.resolve(targetPath);

  if (
    resolvedTarget !== resolvedReleaseRoot &&
    !resolvedTarget.startsWith(`${resolvedReleaseRoot}${path.sep}`)
  ) {
    throw new Error(`Refusing to touch a path outside project release: ${resolvedTarget}`);
  }
};

const removePathInsideRelease = (targetPath) => {
  assertInsideProjectRelease(targetPath);

  try {
    chmodSync(targetPath, 0o666);
  } catch {
    // Best effort only. rmSync below reports the real failure if the path cannot be removed.
  }

  rmSync(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
};

const emptyDirectoryInsideRelease = (directoryPath) => {
  assertInsideProjectRelease(directoryPath);

  if (!existsSync(directoryPath)) {
    return;
  }

  for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
    removePathInsideRelease(path.join(directoryPath, entry.name));
  }
};

export const cleanReleaseDirectory = () => {
  if (path.resolve(releaseRootPath) !== path.resolve(rootDir, 'release')) {
    throw new Error(`Unexpected release directory: ${releaseRootPath}`);
  }

  mkdirSync(releaseRootPath, { recursive: true });

  for (const entry of readdirSync(releaseRootPath, { withFileTypes: true })) {
    const entryPath = path.join(releaseRootPath, entry.name);

    if ((entry.name === 'installer' || entry.name === 'portable') && entry.isDirectory()) {
      emptyDirectoryInsideRelease(entryPath);
    } else {
      removePathInsideRelease(entryPath);
    }
  }

  mkdirSync(path.join(releaseRootPath, 'installer'), { recursive: true });
  mkdirSync(path.join(releaseRootPath, 'portable'), { recursive: true });
};

export const resolveVersionedReleaseFolderName = (kindRootPath, version, final = false) => {
  const baseFolderName = final ? `${version}_final` : version;

  for (let suffix = 0; ; suffix += 1) {
    const folderName = suffix === 0 ? baseFolderName : `${baseFolderName}_${suffix}`;
    const outputDir = path.join(kindRootPath, folderName);

    assertInsideProjectRelease(outputDir);

    if (!existsSync(outputDir)) {
      return folderName;
    }
  }
};

export const prepareVersionedReleaseDir = (kind, version, final = isFinalRelease()) => {
  if (!/^(?:installer|portable)$/.test(kind)) {
    throw new Error(`Unsupported release kind: ${kind}`);
  }

  const kindRootPath = path.join(releaseRootPath, kind);
  assertInsideProjectRelease(kindRootPath);
  mkdirSync(kindRootPath, { recursive: true });

  const folderName = resolveVersionedReleaseFolderName(kindRootPath, version, final);
  const outputDir = path.join(kindRootPath, folderName);
  mkdirSync(outputDir);

  return { folderName, outputDir };
};

export const listReleaseDirectory = () => {
  if (!existsSync(releaseRootPath)) {
    return [];
  }

  const walk = (directoryPath) =>
    readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      const relativePath = path.relative(releaseRootPath, entryPath).replaceAll(path.sep, '/');

      if (!entry.isDirectory()) {
        return [relativePath];
      }

      return [relativePath, ...walk(entryPath)];
    });

  return walk(releaseRootPath).sort((left, right) => left.localeCompare(right));
};
