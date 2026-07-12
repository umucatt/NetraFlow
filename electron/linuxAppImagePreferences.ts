import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PREFERENCES_FILE_NAME = 'launcher-preferences.json';
const MAX_PREFERENCES_BYTES = 128;
const PREFERENCES_SCHEMA_VERSION = 1;

export const getLinuxAppImagePreferencesPath = ({
  xdgConfigHome = process.env.XDG_CONFIG_HOME,
  home = os.homedir()
}: { xdgConfigHome?: string; home?: string } = {}) =>
  path.join(
    xdgConfigHome && path.isAbsolute(xdgConfigHome)
      ? xdgConfigHome
      : path.join(home, '.config'),
    'NetraFlow',
    PREFERENCES_FILE_NAME
  );

const isOwnedRegularFile = (filePath: string) => {
  const stat = lstatSync(filePath);
  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;

  return stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0 &&
    (uid === undefined || stat.uid === uid);
};

export const readLinuxAppImageUnsandboxedConsent = (filePath = getLinuxAppImagePreferencesPath()) => {
  try {
    if (!isOwnedRegularFile(filePath)) {
      return false;
    }

    const stat = lstatSync(filePath);

    if (stat.size <= 0 || stat.size > MAX_PREFERENCES_BYTES) {
      return false;
    }

    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));

    return Boolean(
      parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        Object.keys(parsed).length === 2 &&
        (parsed as Record<string, unknown>).schemaVersion === PREFERENCES_SCHEMA_VERSION &&
        (parsed as Record<string, unknown>).linuxAppImageUnsandboxedConsent === true
    );
  } catch {
    return false;
  }
};

export const writeLinuxAppImageUnsandboxedConsent = (
  filePath = getLinuxAppImagePreferencesPath()
) => {
  const parent = path.dirname(filePath);
  const payload = `${JSON.stringify({
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    linuxAppImageUnsandboxedConsent: true
  })}\n`;

  mkdirSync(parent, { recursive: true, mode: 0o700 });

  if (existsSync(filePath) && !isOwnedRegularFile(filePath)) {
    throw new Error('Refusing to replace an unsafe launcher preference file.');
  }

  const temporaryPath = path.join(parent, `.${PREFERENCES_FILE_NAME}.${process.pid}.tmp`);
  let descriptor: number | undefined;

  try {
    descriptor = openSync(
      temporaryPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    writeFileSync(descriptor, payload, 'utf8');
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, filePath);
    chmodSync(filePath, 0o600);
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    rmSync(temporaryPath, { force: true });
  }
};

export const clearLinuxAppImageUnsandboxedConsent = (
  filePath = getLinuxAppImagePreferencesPath()
) => {
  if (!existsSync(filePath)) {
    return;
  }

  if (!isOwnedRegularFile(filePath)) {
    throw new Error('Refusing to remove an unsafe launcher preference file.');
  }

  rmSync(filePath, { force: true });
};
