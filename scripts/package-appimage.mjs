import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Arch, Platform, build } from 'electron-builder';
import { assertPackagedRendererLoader } from './packaged-renderer-loader-logic.mjs';
import { assertLinuxX64BuildHost, getAppImageArtifactName } from './package-appimage-logic.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const version = packageJson.version ?? '0.0.0';
const outputDir = path.join(rootDir, 'release', 'linux', version);
const builtMainPath = path.join(rootDir, 'dist-electron', 'main.js');
const artifactPath = path.join(
  outputDir,
  getAppImageArtifactName({ productName, version })
);
const requiredLinuxIconSizes = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512, 1024];

const assertRegularFile = (filePath, label) => {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
};

assertLinuxX64BuildHost();

for (const [requiredPath, label] of [
  [path.join(rootDir, 'dist', 'index.html'), 'Renderer build output'],
  [builtMainPath, 'Electron main build output'],
  ...requiredLinuxIconSizes.map((size) => [
    path.join(rootDir, 'public', 'icons', 'linux', `${size}x${size}.png`),
    `Linux ${size}x${size} icon`
  ])
]) {
  assertRegularFile(requiredPath, label);
}

assertPackagedRendererLoader(builtMainPath);
mkdirSync(outputDir, { recursive: true });

process.env.ELECTRON_BUILDER_DISABLE_BUILD_CACHE = 'true';

await build({
  projectDir: rootDir,
  targets: Platform.LINUX.createTarget(['AppImage'], Arch.x64),
  publish: 'never',
  config: {
    directories: {
      output: outputDir
    }
  }
});

assertRegularFile(artifactPath, 'Linux AppImage artifact');

if ((statSync(artifactPath).mode & 0o111) === 0) {
  throw new Error(`Linux AppImage artifact is not executable: ${artifactPath}`);
}

console.log(`Created ${artifactPath}`);
