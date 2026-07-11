import { rm } from 'node:fs/promises';
import path from 'node:path';

import type { StorageLayout } from './storageLayout.js';

export type ManagedDataDirectoryKind = 'demo' | 'userdata' | 'runtime';

export type ManagedDataDeletionTarget = Readonly<{
  kind: ManagedDataDirectoryKind;
  path: string;
}>;

export type ManagedDataDeletionContext = Readonly<{
  layout: StorageLayout;
  platform: NodeJS.Platform;
  appPath: string;
  execPath: string;
  homePath: string;
}>;

export type ElectronSessionCleaner = Readonly<{
  closeAllConnections: () => Promise<void>;
  clearData: () => Promise<void>;
  clearCache: () => Promise<void>;
}>;

export type ManagedDataCleanupFailure = Readonly<{
  stage:
    | 'delete-demo'
    | 'delete-userdata'
    | 'close-session-connections'
    | 'clear-session-data'
    | 'clear-session-cache'
    | 'delete-runtime';
  error: unknown;
}>;

export type ManagedDataCleanupResult = Readonly<{
  ok: boolean;
  failures: readonly ManagedDataCleanupFailure[];
}>;

type RemoveManagedDirectory = (directoryPath: string) => Promise<void>;

const EXPECTED_DIRECTORY_NAMES: Record<ManagedDataDirectoryKind, string> = {
  demo: '.demo',
  userdata: 'userdata',
  runtime: 'runtime'
};

const getPlatformPath = (platform: NodeJS.Platform) =>
  platform === 'win32' ? path.win32 : path.posix;

const normalizeForComparison = (
  filePath: string,
  platformPath: typeof path.posix | typeof path.win32,
  platform: NodeJS.Platform
) => {
  const resolvedPath = platformPath.resolve(filePath);

  return platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
};

const isSamePath = (
  left: string,
  right: string,
  platformPath: typeof path.posix | typeof path.win32,
  platform: NodeJS.Platform
) =>
  normalizeForComparison(left, platformPath, platform) ===
  normalizeForComparison(right, platformPath, platform);

const isPathInside = (
  parentPath: string,
  childPath: string,
  platformPath: typeof path.posix | typeof path.win32,
  platform: NodeJS.Platform
) => {
  const parent = normalizeForComparison(parentPath, platformPath, platform);
  const child = normalizeForComparison(childPath, platformPath, platform);

  return child.startsWith(`${parent}${platformPath.sep}`);
};

const assertSafeLayoutRoot = (context: ManagedDataDeletionContext) => {
  const platformPath = getPlatformPath(context.platform);
  const resolvedRoot = platformPath.resolve(context.layout.root);

  if (isSamePath(resolvedRoot, platformPath.parse(resolvedRoot).root, platformPath, context.platform)) {
    throw new Error('Refusing to clear data from a filesystem-root StorageLayout.');
  }
};

const assertSafeManagedTarget = (
  target: ManagedDataDeletionTarget,
  context: ManagedDataDeletionContext
) => {
  const platformPath = getPlatformPath(context.platform);
  const resolvedTarget = platformPath.resolve(target.path);
  const resolvedRoot = platformPath.resolve(context.layout.root);
  const protectedPaths = [
    platformPath.parse(resolvedTarget).root,
    resolvedRoot,
    platformPath.dirname(resolvedRoot),
    context.homePath,
    context.appPath,
    context.execPath,
    platformPath.dirname(context.execPath)
  ].map((protectedPath) => platformPath.resolve(protectedPath));

  if (platformPath.basename(resolvedTarget) !== EXPECTED_DIRECTORY_NAMES[target.kind]) {
    throw new Error(`Refusing to clear an unexpected ${target.kind} directory name.`);
  }

  if (
    protectedPaths.some((protectedPath) =>
      isSamePath(resolvedTarget, protectedPath, platformPath, context.platform)
    )
  ) {
    throw new Error(`Refusing to clear protected path for ${target.kind}.`);
  }

  if (isPathInside(resolvedTarget, resolvedRoot, platformPath, context.platform)) {
    throw new Error(`Refusing to clear a parent of the StorageLayout root for ${target.kind}.`);
  }
};

export const createManagedDataDeletionPlan = (
  context: ManagedDataDeletionContext
): readonly ManagedDataDeletionTarget[] => {
  assertSafeLayoutRoot(context);

  const plan: readonly ManagedDataDeletionTarget[] = [
    { kind: 'demo', path: context.layout.demo },
    { kind: 'userdata', path: context.layout.userdata },
    { kind: 'runtime', path: context.layout.runtime }
  ];

  plan.forEach((target) => assertSafeManagedTarget(target, context));

  const platformPath = getPlatformPath(context.platform);

  for (let index = 0; index < plan.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < plan.length; otherIndex += 1) {
      const left = plan[index];
      const right = plan[otherIndex];

      if (
        isSamePath(left.path, right.path, platformPath, context.platform) ||
        isPathInside(left.path, right.path, platformPath, context.platform) ||
        isPathInside(right.path, left.path, platformPath, context.platform)
      ) {
        throw new Error(`Refusing to clear overlapping ${left.kind} and ${right.kind} paths.`);
      }
    }
  }

  return plan.map((target) => Object.freeze({
    ...target,
    path: platformPath.resolve(target.path)
  }));
};

export const assertAllowedManagedDataDeletionPath = (
  candidatePath: string,
  context: ManagedDataDeletionContext
) => {
  const plan = createManagedDataDeletionPlan(context);
  const platformPath = getPlatformPath(context.platform);
  const target = plan.find((entry) =>
    isSamePath(entry.path, candidatePath, platformPath, context.platform)
  );

  if (!target) {
    throw new Error('Refusing to clear a path outside the managed StorageLayout directories.');
  }

  return target;
};

const defaultRemoveManagedDirectory: RemoveManagedDirectory = async (directoryPath) => {
  await rm(directoryPath, {
    recursive: true,
    force: true,
    maxRetries: 2,
    retryDelay: 50
  });
};

export const clearManagedLocalData = async ({
  plan,
  session,
  removeManagedDirectory = defaultRemoveManagedDirectory
}: {
  plan: readonly ManagedDataDeletionTarget[];
  session: ElectronSessionCleaner;
  removeManagedDirectory?: RemoveManagedDirectory;
}): Promise<ManagedDataCleanupResult> => {
  const failures: ManagedDataCleanupFailure[] = [];
  const targetByKind = new Map(plan.map((target) => [target.kind, target.path]));
  const getTargetPath = (kind: ManagedDataDirectoryKind) => {
    const targetPath = targetByKind.get(kind);

    if (!targetPath) {
      throw new Error(`Managed data deletion plan is missing ${kind}.`);
    }

    return targetPath;
  };
  const demoPath = getTargetPath('demo');
  const userdataPath = getTargetPath('userdata');
  const runtimePath = getTargetPath('runtime');
  const attempt = async (
    stage: ManagedDataCleanupFailure['stage'],
    action: () => Promise<void>
  ) => {
    try {
      await action();
    } catch (error) {
      failures.push({ stage, error });
    }
  };

  await attempt('delete-demo', () => removeManagedDirectory(demoPath));
  await attempt('delete-userdata', () => removeManagedDirectory(userdataPath));
  await attempt('close-session-connections', () => session.closeAllConnections());
  await attempt('clear-session-data', () => session.clearData());
  await attempt('clear-session-cache', () => session.clearCache());
  await attempt('delete-runtime', () => removeManagedDirectory(runtimePath));

  return {
    ok: failures.length === 0,
    failures
  };
};

export const createSingleRunCleanupCoordinator = <TInput, TResult>(
  run: (input: TInput) => Promise<TResult>
) => {
  let cleanupPromise: Promise<TResult> | null = null;

  return {
    hasStarted: () => cleanupPromise !== null,
    request: (input: TInput) => {
      cleanupPromise ??= (async () => run(input))();
      return cleanupPromise;
    }
  };
};
