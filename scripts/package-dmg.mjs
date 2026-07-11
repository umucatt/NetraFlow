import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Arch, Platform, build } from 'electron-builder';
import { assertPackagedRendererLoader } from './packaged-renderer-loader-logic.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const version = packageJson.version ?? '0.0.0';
const outputDir = path.join(rootDir, 'release', 'macos', version);
const builtMainPath = path.join(rootDir, 'dist-electron', 'main.js');
const iconPath = path.join(rootDir, 'public', 'icons', 'netraflow.icns');
const appBundlePath = path.join(outputDir, 'mac-arm64', `${productName}.app`);
const dmgPath = path.join(outputDir, `${productName}_${version}_arm64.dmg`);
const macFiles = [
  ...(Array.isArray(packageJson.build?.files) ? packageJson.build.files : [])
];

const assertRegularFile = (filePath, label) => {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
};

const assertArm64Binary = (binaryPath, label) => {
  assertRegularFile(binaryPath, label);

  const architectures = execFileSync('/usr/bin/lipo', ['-archs', binaryPath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();

  if (architectures !== 'arm64') {
    throw new Error(`${label} must be arm64 only, found: ${architectures || '<none>'}`);
  }
};

if (process.platform !== 'darwin' || process.arch !== 'arm64') {
  throw new Error('macOS DMG packaging must run on Apple Silicon macOS.');
}

for (const [requiredPath, label] of [
  [path.join(rootDir, 'dist', 'index.html'), 'Renderer build output'],
  [builtMainPath, 'Electron main build output'],
  [iconPath, 'macOS application icon']
]) {
  assertRegularFile(requiredPath, label);
}

assertPackagedRendererLoader(builtMainPath);
rmSync(outputDir, { recursive: true, force: true });

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
process.env.ELECTRON_BUILDER_DISABLE_BUILD_CACHE = 'true';

for (const signingEnvironmentName of [
  'CSC_LINK',
  'CSC_KEY_PASSWORD',
  'CSC_KEYCHAIN',
  'CSC_NAME'
]) {
  delete process.env[signingEnvironmentName];
}

await build({
  projectDir: rootDir,
  targets: Platform.MAC.createTarget(['dmg'], Arch.arm64),
  publish: 'never',
  config: {
    files: macFiles,
    directories: {
      output: outputDir
    },
    mac: {
      identity: '-',
      notarize: false
    },
    dmg: {
      sign: false,
      writeUpdateInfo: false
    }
  }
});

if (!existsSync(appBundlePath) || !statSync(appBundlePath).isDirectory()) {
  throw new Error(`macOS app bundle was not created: ${appBundlePath}`);
}

assertRegularFile(dmgPath, 'macOS DMG artifact');
assertArm64Binary(
  path.join(appBundlePath, 'Contents', 'MacOS', productName),
  'NetraFlow main executable'
);
assertArm64Binary(
  path.join(
    appBundlePath,
    'Contents',
    'Frameworks',
    'Electron Framework.framework',
    'Versions',
    'A',
    'Electron Framework'
  ),
  'Electron Framework'
);

console.log(`Created ${appBundlePath}`);
console.log(`Created ${dmgPath}`);
console.log('Verified arm64-only NetraFlow executable and Electron Framework.');
