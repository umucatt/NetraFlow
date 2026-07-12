import { randomUUID } from 'node:crypto';
import { access, lstat, readdir, rename, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { StorageLayout } from './storageLayout.js';

const TRANSACTION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const USERDATA_DELETING_PREFIX = '.userdata.deleting-';
const RUNTIME_DELETING_PREFIX = '.runtime.deleting-';
const RUNTIME_PENDING_PREFIX = '.runtime.delete-pending-';

export type ResetLifecycleLog = (event: string, details?: Record<string, unknown>) => void;

export type ResetTransaction = Readonly<{
  id: string;
  root: string;
  userdata: string;
  userdataDeleting: string;
  runtime: string;
  runtimeDeleting: string;
  runtimePending: string;
}>;

const doesNotExist = async (target: string) => {
  try {
    await access(target);
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true;
    throw error;
  }
};

const assertDirectChild = (root: string, candidate: string, expectedName: string) => {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (
    resolvedRoot === path.parse(resolvedRoot).root ||
    path.dirname(resolvedCandidate) !== resolvedRoot ||
    path.basename(resolvedCandidate) !== expectedName
  ) {
    throw new Error('Refusing unsafe reset lifecycle path');
  }
};

const assertNotSymlink = async (target: string) => {
  try {
    if ((await lstat(target)).isSymbolicLink()) {
      throw new Error('Refusing reset lifecycle symlink target');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};

const removeWithRetry = async (target: string) => {
  await rm(target, { recursive: true, force: true, maxRetries: 4, retryDelay: 40 });
};

export const createResetTransaction = (
  layout: StorageLayout,
  id: string = randomUUID()
): ResetTransaction => {
  if (!TRANSACTION_ID_PATTERN.test(id)) throw new Error('Invalid reset transaction id');
  const root = path.resolve(layout.root);
  const userdata = path.resolve(layout.userdata);
  const runtime = path.resolve(layout.runtime);
  const userdataDeleting = path.join(root, `${USERDATA_DELETING_PREFIX}${id}`);
  const runtimeDeleting = path.join(root, `${RUNTIME_DELETING_PREFIX}${id}`);
  const runtimePending = path.join(root, `${RUNTIME_PENDING_PREFIX}${id}`);
  assertDirectChild(root, userdata, 'userdata');
  assertDirectChild(root, runtime, 'runtime');
  assertDirectChild(root, userdataDeleting, `${USERDATA_DELETING_PREFIX}${id}`);
  assertDirectChild(root, runtimeDeleting, `${RUNTIME_DELETING_PREFIX}${id}`);
  assertDirectChild(root, runtimePending, `${RUNTIME_PENDING_PREFIX}${id}`);
  return Object.freeze({ id, root, userdata, userdataDeleting, runtime, runtimeDeleting, runtimePending });
};

export const invalidateAndDeleteUserdata = async (
  transaction: ResetTransaction,
  log: ResetLifecycleLog
) => {
  await assertNotSymlink(transaction.userdata);
  if (!(await doesNotExist(transaction.userdata))) {
    await rename(transaction.userdata, transaction.userdataDeleting);
    log('userdata-renamed');
  }
  log('userdata-delete-started');
  await assertNotSymlink(transaction.userdataDeleting);
  await removeWithRetry(transaction.userdataDeleting);
  const verificationTargets = [
    transaction.userdata,
    transaction.userdataDeleting,
    path.join(transaction.userdata, 'core.json'),
    path.join(transaction.userdata, 'state.json'),
    path.join(transaction.userdata, 'settings.json'),
    path.join(transaction.userdata, '.snapshot-transaction.json'),
    path.join(transaction.userdata, '.snapshot-transaction-backup')
  ];
  if (!(await Promise.all(verificationTargets.map(doesNotExist))).every(Boolean)) {
    throw new Error('Userdata deletion verification failed');
  }
  log('userdata-delete-verified');
};

export const createRuntimePendingMarker = async (
  transaction: ResetTransaction,
  log: ResetLifecycleLog
) => {
  await writeFile(transaction.runtimePending, `${transaction.id}\n`, { flag: 'wx' });
  log('runtime-pending-marker-created');
};

export const isolateAndDeleteRuntime = async (
  transaction: ResetTransaction,
  log: ResetLifecycleLog
) => {
  try {
    await assertNotSymlink(transaction.runtime);
    const alreadyIsolated = !(await doesNotExist(transaction.runtimeDeleting));
    if (!alreadyIsolated && !(await doesNotExist(transaction.runtime))) {
      await rename(transaction.runtime, transaction.runtimeDeleting);
      log('runtime-renamed');
    }
    log('runtime-delete-started');
    await assertNotSymlink(transaction.runtimeDeleting);
    await removeWithRetry(transaction.runtimeDeleting);
    await unlink(transaction.runtimePending).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
    log('runtime-delete-completed');
    return true;
  } catch (error) {
    log('runtime-delete-deferred', { code: (error as NodeJS.ErrnoException).code ?? 'UNKNOWN' });
    return false;
  }
};

const parseControlledName = (name: string) => {
  for (const [kind, prefix] of [
    ['userdata', USERDATA_DELETING_PREFIX],
    ['runtime', RUNTIME_DELETING_PREFIX],
    ['pending', RUNTIME_PENDING_PREFIX]
  ] as const) {
    if (name.startsWith(prefix)) {
      const id = name.slice(prefix.length);
      return TRANSACTION_ID_PATTERN.test(id) ? { kind, id } : null;
    }
  }
  return null;
};

export const runStartupDeletePreflight = async (
  layout: StorageLayout,
  log: ResetLifecycleLog = () => undefined
) => {
  log('startup-delete-preflight-started');
  const root = path.resolve(layout.root);
  let names: string[] = [];
  try {
    names = await readdir(root);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const controlled = names.map(parseControlledName).filter((value): value is NonNullable<typeof value> => value !== null);
  for (const entry of controlled.filter((value) => value.kind === 'userdata')) {
    const transaction = createResetTransaction(layout, entry.id);
    await assertNotSymlink(transaction.userdataDeleting);
    await removeWithRetry(transaction.userdataDeleting).catch(() => undefined);
  }
  for (const entry of controlled.filter((value) => value.kind === 'pending')) {
    const transaction = createResetTransaction(layout, entry.id);
    await assertNotSymlink(transaction.runtime);
    if (!(await doesNotExist(transaction.runtime)) && (await doesNotExist(transaction.runtimeDeleting))) {
      await rename(transaction.runtime, transaction.runtimeDeleting);
    }
  }
  for (const entry of controlled.filter((value) => value.kind === 'runtime')) {
    const transaction = createResetTransaction(layout, entry.id);
    await assertNotSymlink(transaction.runtimeDeleting);
    const removed = await removeWithRetry(transaction.runtimeDeleting).then(() => true, () => false);
    if (removed) await unlink(transaction.runtimePending).catch(() => undefined);
  }
  for (const entry of controlled.filter((value) => value.kind === 'pending')) {
    const transaction = createResetTransaction(layout, entry.id);
    const removed = await isolateAndDeleteRuntime(transaction, log);
    if (removed) await unlink(transaction.runtimePending).catch(() => undefined);
  }
  log('startup-delete-preflight-completed');
};
