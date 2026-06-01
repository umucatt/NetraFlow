import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchExecutableResources } from './patch-executable-resources.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const version = packageJson.version ?? '0.0.0';
const iconPath = path.join(rootDir, 'public', 'icons', 'netraflow.ico');

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const exePath = path.join(context.appOutDir, `${productName}.exe`);

  if (!existsSync(exePath)) {
    throw new Error(`Packed executable was not found: ${exePath}`);
  }

  patchExecutableResources(exePath, { iconPath, productName, version });
}
