import path from 'node:path';

export interface StorageLayout {
  readonly root: string;
  readonly userdata: string;
  readonly runtime: string;
  readonly demo: string;
  readonly sessionData: string;
  readonly cache: string;
  readonly logs: string;
  readonly crashDumps: string;
}

export type StorageLayoutOverrides = Readonly<{
  persistenceRoot?: string;
  userdata?: string;
  runtime?: string;
  demo?: string;
}>;

export type CreateStorageLayoutOptions = Readonly<{
  platform: NodeJS.Platform;
  isPackaged: boolean;
  isPortable: boolean;
  execPath: string;
  appPath: string;
  defaultUserDataPath: string;
  overrides?: StorageLayoutOverrides;
}>;

const USERDATA_DIR_NAME = 'userdata';
const RUNTIME_DIR_NAME = 'runtime';
const DEMO_DIR_NAME = '.demo';
const SESSION_DATA_DIR_NAME = 'sessionData';
const CACHE_DIR_NAME = 'cache';
const LOGS_DIR_NAME = 'logs';
const CRASH_DUMPS_DIR_NAME = 'crashDumps';

const getPlatformPath = (platform: NodeJS.Platform) =>
  platform === 'win32' ? path.win32 : path.posix;

const resolvePlatformRoot = ({
  platform,
  isPackaged,
  execPath,
  appPath,
  defaultUserDataPath
}: CreateStorageLayoutOptions) => {
  const platformPath = getPlatformPath(platform);

  if (!isPackaged) {
    return platformPath.resolve(appPath);
  }

  if (platform === 'win32') {
    // isPortable intentionally does not alter the 0.9.9 executable-relative layout.
    return platformPath.resolve(platformPath.dirname(execPath));
  }

  if (platform === 'darwin' || platform === 'linux') {
    return platformPath.resolve(defaultUserDataPath);
  }

  throw new Error(`Unsupported packaged storage platform: ${platform}`);
};

export const createStorageLayout = (
  options: CreateStorageLayoutOptions
): Readonly<StorageLayout> => {
  const platformPath = getPlatformPath(options.platform);
  const platformRoot = resolvePlatformRoot(options);
  const root = platformPath.resolve(options.overrides?.persistenceRoot ?? platformRoot);
  const userdata = platformPath.resolve(
    options.overrides?.userdata ?? platformPath.join(root, USERDATA_DIR_NAME)
  );
  const runtime = platformPath.resolve(
    options.overrides?.runtime ?? platformPath.join(platformRoot, RUNTIME_DIR_NAME)
  );
  const demo = platformPath.resolve(
    options.overrides?.demo ?? platformPath.join(root, DEMO_DIR_NAME)
  );

  return Object.freeze({
    root,
    userdata,
    runtime,
    demo,
    sessionData: platformPath.join(runtime, SESSION_DATA_DIR_NAME),
    cache: platformPath.join(runtime, CACHE_DIR_NAME),
    logs: platformPath.join(runtime, LOGS_DIR_NAME),
    crashDumps: platformPath.join(runtime, CRASH_DUMPS_DIR_NAME)
  });
};
