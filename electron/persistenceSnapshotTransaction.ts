import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';

import type { PersistencePaths } from './persistencePaths.js';

const TRANSACTION_DIRECTORY_NAME = '.snapshot-transaction';
const MANIFEST_FILE_NAME = 'manifest.json';

type SnapshotTransactionManifest = {
  version: 1;
  files: Array<{ name: 'core.json' | 'state.json'; existed: boolean }>;
};

const getTransactionDirectory = (paths: PersistencePaths) =>
  path.join(paths.root, TRANSACTION_DIRECTORY_NAME);

const getManifestPath = (paths: PersistencePaths) =>
  path.join(getTransactionDirectory(paths), MANIFEST_FILE_NAME);

const getManagedTransactionFiles = (paths: PersistencePaths) => [
  { name: 'core.json' as const, source: paths.core },
  { name: 'state.json' as const, source: paths.state }
];

export const recoverInterruptedSnapshotTransaction = (paths: PersistencePaths) => {
  const transactionDirectory = getTransactionDirectory(paths);
  const manifestPath = getManifestPath(paths);

  if (!existsSync(manifestPath)) {
    rmSync(transactionDirectory, { recursive: true, force: true });
    return { recovered: false } as const;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as SnapshotTransactionManifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.files)) {
    throw new Error('Persistence snapshot transaction manifest is invalid.');
  }

  getManagedTransactionFiles(paths).forEach(({ name, source }) => {
    const entry = manifest.files.find((item) => item.name === name);
    if (!entry) {
      throw new Error(`Persistence snapshot transaction is missing ${name}.`);
    }

    if (entry.existed) {
      const backup = path.join(transactionDirectory, name);
      if (!existsSync(backup)) {
        throw new Error(`Persistence snapshot transaction backup is missing ${name}.`);
      }
      copyFileSync(backup, source);
      return;
    }

    rmSync(source, { force: true });
  });

  rmSync(transactionDirectory, { recursive: true, force: true });
  return { recovered: true } as const;
};

export const runPersistenceSnapshotTransaction = <T>(
  paths: PersistencePaths,
  commit: () => T,
  isSuccessful: (result: T) => boolean
) => {
  recoverInterruptedSnapshotTransaction(paths);
  const transactionDirectory = getTransactionDirectory(paths);
  mkdirSync(transactionDirectory, { recursive: true });

  const manifest: SnapshotTransactionManifest = {
    version: 1,
    files: getManagedTransactionFiles(paths).map(({ name, source }) => {
      const existed = existsSync(source);
      if (existed) {
        copyFileSync(source, path.join(transactionDirectory, name));
      }
      return { name, existed };
    })
  };
  const temporaryManifestPath = `${getManifestPath(paths)}.tmp`;
  writeFileSync(temporaryManifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');
  renameSync(temporaryManifestPath, getManifestPath(paths));

  try {
    const result = commit();
    if (!isSuccessful(result)) {
      recoverInterruptedSnapshotTransaction(paths);
      return result;
    }

    rmSync(transactionDirectory, { recursive: true, force: true });
    return result;
  } catch (error) {
    recoverInterruptedSnapshotTransaction(paths);
    throw error;
  }
};
