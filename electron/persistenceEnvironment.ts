import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';

import {
  resolveDemoPersistenceRoot,
  resolveRealPersistenceRoot,
  type PersistenceEnvironment
} from './persistencePaths.js';

export type { PersistenceEnvironment };

export type PersistenceEnvironmentRoots = {
  root: string;
  execDir: string;
  realRoot: string;
  demoRoot: string;
};

export type DemoDirectoryErrorCode =
  | 'DEMO_PATH_UNSAFE'
  | 'DEMO_CLEANUP_FAILED'
  | 'DEMO_DIRECTORY_NOT_WRITABLE';

export type DemoDirectoryResult =
  | { ok: true; removed?: boolean }
  | { ok: false; code: DemoDirectoryErrorCode; message: string };

const DEMO_DIR_NAME = '.demo';
const DEMO_PREFLIGHT_FILE_NAME = '.preflight-write-test';
const DEMO_DIRECTORY_NOT_WRITABLE_MESSAGE =
  '程序所在目录不可写，无法启动示例模式。请将程序安装或移动到当前用户可写的位置。';

const normalizeForCompare = (filePath: string) => {
  const normalizedPath = path.normalize(path.resolve(filePath));

  return process.platform === 'win32' ? normalizedPath.toLowerCase() : normalizedPath;
};

const isSamePath = (left: string, right: string) =>
  normalizeForCompare(left) === normalizeForCompare(right);

const isPathInside = (parentPath: string, childPath: string) => {
  const parent = normalizeForCompare(parentPath);
  const child = normalizeForCompare(childPath);

  return child.startsWith(`${parent}${path.sep}`);
};

export const createPersistenceEnvironmentRoots = ({
  root,
  execPath = process.execPath,
  execDir,
  realRoot,
  demoRoot
}: {
  root?: string;
  execPath?: string;
  execDir?: string;
  realRoot?: string;
  demoRoot?: string;
} = {}): PersistenceEnvironmentRoots => {
  const resolvedRoot = path.resolve(root ?? execDir ?? path.dirname(execPath));
  const defaultExecPath = path.join(resolvedRoot, path.basename(execPath));

  return {
    root: resolvedRoot,
    execDir: resolvedRoot,
    realRoot: path.resolve(realRoot ?? resolveRealPersistenceRoot(defaultExecPath)),
    demoRoot: path.resolve(demoRoot ?? resolveDemoPersistenceRoot(defaultExecPath))
  };
};

export const assertSafeDemoRoot = ({
  root,
  realRoot,
  demoRoot
}: PersistenceEnvironmentRoots): DemoDirectoryResult => {
  const resolvedRoot = path.resolve(root);
  const resolvedRealRoot = path.resolve(realRoot);
  const resolvedDemoRoot = path.resolve(demoRoot);
  const parsedDemoRoot = path.parse(resolvedDemoRoot).root;
  const expectedDemoRoot = path.join(resolvedRoot, DEMO_DIR_NAME);

  if (!resolvedDemoRoot || isSamePath(resolvedDemoRoot, parsedDemoRoot)) {
    return {
      ok: false,
      code: 'DEMO_PATH_UNSAFE',
      message: 'Refusing to use an unsafe demo directory path.'
    };
  }

  if (!isSamePath(path.basename(resolvedDemoRoot), DEMO_DIR_NAME)) {
    return {
      ok: false,
      code: 'DEMO_PATH_UNSAFE',
      message: 'Demo directory must be named .demo.'
    };
  }

  if (!isSamePath(resolvedDemoRoot, expectedDemoRoot)) {
    return {
      ok: false,
      code: 'DEMO_PATH_UNSAFE',
      message: 'Demo directory must be directly under the application root.'
    };
  }

  if (
    isSamePath(resolvedDemoRoot, resolvedRoot) ||
    isSamePath(resolvedDemoRoot, resolvedRealRoot) ||
    isPathInside(resolvedRealRoot, resolvedDemoRoot) ||
    isPathInside(resolvedDemoRoot, resolvedRealRoot)
  ) {
    return {
      ok: false,
      code: 'DEMO_PATH_UNSAFE',
      message: 'Demo directory overlaps protected persistence paths.'
    };
  }

  return { ok: true };
};

export const cleanupDemoDirectory = (
  roots: PersistenceEnvironmentRoots
): DemoDirectoryResult => {
  const safety = assertSafeDemoRoot(roots);

  if (!safety.ok) {
    return safety;
  }

  if (!existsSync(roots.demoRoot)) {
    return { ok: true, removed: false };
  }

  try {
    rmSync(roots.demoRoot, { recursive: true, force: true });
    return { ok: true, removed: true };
  } catch {
    return {
      ok: false,
      code: 'DEMO_CLEANUP_FAILED',
      message: 'Failed to remove the previous demo environment.'
    };
  }
};

export const preflightDemoDirectory = (
  roots: PersistenceEnvironmentRoots
): DemoDirectoryResult => {
  const cleanup = cleanupDemoDirectory(roots);

  if (!cleanup.ok) {
    return cleanup;
  }

  const probePath = path.join(roots.demoRoot, DEMO_PREFLIGHT_FILE_NAME);

  try {
    mkdirSync(roots.demoRoot);
    writeFileSync(probePath, 'ok', { encoding: 'utf8', flag: 'wx' });

    if (readFileSync(probePath, 'utf8') !== 'ok') {
      throw new Error('Demo preflight readback mismatch.');
    }

    unlinkSync(probePath);
    return { ok: true };
  } catch {
    try {
      if (existsSync(probePath)) {
        unlinkSync(probePath);
      }
    } catch {
      // Best effort cleanup; the final directory removal below is authoritative.
    }

    cleanupDemoDirectory(roots);

    return {
      ok: false,
      code: 'DEMO_DIRECTORY_NOT_WRITABLE',
      message: DEMO_DIRECTORY_NOT_WRITABLE_MESSAGE
    };
  }
};
