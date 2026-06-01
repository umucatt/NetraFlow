import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const findRcedit = () => {
  const rceditPath = path.join(rootDir, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');

  if (!existsSync(rceditPath)) {
    throw new Error(`rcedit.exe was not found: ${rceditPath}`);
  }

  return rceditPath;
};

export const patchExecutableResources = (exePath, { iconPath, productName, version }) => {
  for (const requiredPath of [exePath, iconPath]) {
    if (!existsSync(requiredPath)) {
      throw new Error(`Missing executable resource input: ${requiredPath}`);
    }
  }

  execFileSync(findRcedit(), [
    exePath,
    '--set-icon',
    iconPath,
    '--set-version-string',
    'CompanyName',
    productName,
    '--set-version-string',
    'FileDescription',
    productName,
    '--set-version-string',
    'ProductName',
    productName,
    '--set-version-string',
    'InternalName',
    productName,
    '--set-version-string',
    'OriginalFilename',
    `${productName}.exe`,
    '--set-file-version',
    version,
    '--set-product-version',
    version
  ], {
    stdio: 'inherit'
  });
};
