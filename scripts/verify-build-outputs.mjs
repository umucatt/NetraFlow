import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const relativePath of ['dist-electron/main.js', 'dist-electron/preload.js']) {
  const filePath = path.join(rootDir, relativePath);
  if (!existsSync(filePath) || !statSync(filePath).isFile() || statSync(filePath).size === 0) {
    throw new Error(`Required build output is missing or empty: ${relativePath}`);
  }
}
const assetsDir = path.join(rootDir, 'dist', 'assets');
const workerFiles = existsSync(assetsDir)
  ? readdirSync(assetsDir).filter((name) => /^searchWorker-[A-Za-z0-9_-]+\.js$/.test(name))
  : [];
if (workerFiles.length !== 1) {
  throw new Error(`Search Worker must remain one independent build artifact; found ${workerFiles.length}.`);
}
console.log(`Verified Electron outputs and independent search Worker: dist/assets/${workerFiles[0]}`);
