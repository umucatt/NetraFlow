import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
  closeSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { Arch } from 'electron-builder';
import { getAppImageTools } from 'app-builder-lib/out/toolsets/linux.js';
import { assertPackagedRendererLoader } from './packaged-renderer-loader-logic.mjs';
import {
  APPIMAGE_DESKTOP_ENTRY,
  assertLinuxX64BuildHost,
  getAppImageArtifactName
} from './package-appimage-logic.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const version = packageJson.version ?? '0.0.0';
const outputDir = path.join(rootDir, 'release', 'linux', version);
const artifactPath = path.join(outputDir, getAppImageArtifactName({ productName, version }));
const obsoleteWindowTestArtifactPath = path.join(
  outputDir,
  `${productName}_${version}_x86_64.window-test.AppImage`
);
const builtMainPath = path.join(rootDir, 'dist-electron', 'main.js');
const launcherRoot = path.join(rootDir, 'build', 'linux', 'launcher');
const requiredLinuxIconSizes = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512, 1024];

const assertRegularFile = (filePath, label) => {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
};

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${signal ?? code}).`));
    });
  });

assertLinuxX64BuildHost();
for (const [requiredPath, label] of [
  [path.join(rootDir, 'dist', 'index.html'), 'Renderer build output'],
  [builtMainPath, 'Electron main build output'],
  [path.join(launcherRoot, 'app_run.c'), 'Native AppRun source'],
  [path.join(launcherRoot, 'sandbox_classifier.c'), 'Sandbox classifier source'],
  ...requiredLinuxIconSizes.map((size) => [
    path.join(rootDir, 'public', 'icons', 'linux', `${size}x${size}.png`),
    `Linux ${size}x${size} icon`
  ])
]) assertRegularFile(requiredPath, label);

assertPackagedRendererLoader(builtMainPath);
mkdirSync(outputDir, { recursive: true });
rmSync(obsoleteWindowTestArtifactPath, { force: true });
const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'netraflow-appimage-'));

try {
  const packageStage = path.join(temporaryRoot, 'package-source');
  mkdirSync(packageStage, { recursive: true });
  for (const directory of ['dist', 'dist-electron', 'public']) {
    cpSync(path.join(rootDir, directory), path.join(packageStage, directory), { recursive: true });
  }
  cpSync(path.join(rootDir, 'build', 'licenses'), path.join(packageStage, 'build', 'licenses'), {
    recursive: true
  });
  writeFileSync(path.join(packageStage, 'package.json'), `${JSON.stringify({
    name: packageJson.name,
    version,
    private: true,
    productName,
    description: packageJson.description,
    main: 'dist-electron/main.js'
  }, null, 2)}\n`);

  const appDir = path.join(temporaryRoot, 'AppDir');
  cpSync(path.join(rootDir, 'node_modules', 'electron', 'dist'), appDir, { recursive: true });
  renameSync(path.join(appDir, 'electron'), path.join(appDir, 'netraflow'));
  await run(path.join(rootDir, 'node_modules', '.bin', 'asar'), [
    'pack', packageStage, path.join(appDir, 'resources', 'app.asar')
  ]);
  cpSync(path.join(rootDir, 'build', 'licenses'), path.join(appDir, 'licenses'), {
    recursive: true
  });

  const launcherPath = path.join(appDir, 'AppRun');
  await run('cc', [
    '-std=c11', '-O2', '-Wall', '-Wextra', '-Werror',
    path.join(launcherRoot, 'app_run.c'),
    path.join(launcherRoot, 'sandbox_classifier.c'),
    '-o', launcherPath
  ]);
  chmodSync(launcherPath, 0o755);
  writeFileSync(path.join(appDir, 'netraflow.desktop'), APPIMAGE_DESKTOP_ENTRY, { mode: 0o644 });
  const iconPath = path.join(rootDir, 'public', 'icons', 'linux', '512x512.png');
  copyFileSync(iconPath, path.join(appDir, 'netraflow.png'));
  copyFileSync(iconPath, path.join(appDir, '.DirIcon'));

  const appImageTools = await getAppImageTools(Arch.x64);
  const runtimePath = appImageTools.runtime;
  const runtimeSize = statSync(runtimePath).size;
  rmSync(artifactPath, { force: true });
  await run(appImageTools.mksquashfs, [
    appDir,
    artifactPath,
    '-offset', String(runtimeSize),
    '-all-root', '-noappend', '-no-progress', '-quiet', '-no-xattrs', '-no-fragments'
  ]);
  const runtime = readFileSync(runtimePath);
  const descriptor = openSync(artifactPath, 'r+');
  try {
    writeSync(descriptor, runtime, 0, runtime.length, 0);
  } finally {
    closeSync(descriptor);
  }
  chmodSync(artifactPath, 0o755);
  assertRegularFile(artifactPath, 'Linux AppImage artifact');
  console.log(`Created ${artifactPath}`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
