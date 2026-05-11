import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const version = packageJson.version ?? '0.0.0';

const findRcedit = () => {
  const candidates = [
    path.join(rootDir, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe')
  ];

  const found = candidates.find((candidate) => existsSync(candidate));

  if (!found) {
    throw new Error('rcedit.exe was not found in node_modules/electron-winstaller/vendor.');
  }

  return found;
};

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const exePath = path.join(context.appOutDir, `${productName}.exe`);
  const iconPath = path.join(rootDir, 'public', 'icons', 'netraflow.ico');

  if (!existsSync(exePath)) {
    throw new Error(`Packed executable was not found: ${exePath}`);
  }

  if (!existsSync(iconPath)) {
    throw new Error(`NetraFlow icon was not found: ${iconPath}`);
  }

  execFileSync(findRcedit(), [
    exePath,
    '--set-icon',
    iconPath,
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
}
