import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { assertPackagedRendererLoader } from './packaged-renderer-loader-logic.mjs';
import {
  DEB_APPARMOR_LOCAL_PATH,
  DEB_APPARMOR_PATH,
  DEB_DESKTOP_ENTRY,
  DEB_DESKTOP_PATH,
  DEB_EXECUTABLE_PATH,
  assertDebBuildHost,
  createDebControl,
  getDebArtifactName,
  toStagePath
} from './package-deb-logic.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const version = packageJson.version;
const outputDir = path.join(rootDir, 'release', 'linux', version);
const artifactPath = path.join(outputDir, getDebArtifactName({ productName, version }));
const debSourceDir = path.join(rootDir, 'build', 'linux', 'deb');
const builtMainPath = path.join(rootDir, 'dist-electron', 'main.js');
const iconDir = path.join(rootDir, 'public', 'icons', 'linux');
const requiredIconSizes = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512, 1024];

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

const assertCommand = async (command, args = ['--version']) => {
  try {
    await run(command, args, { stdio: 'ignore' });
  } catch {
    throw new Error(`Required local tool is unavailable: ${command}`);
  }
};

const normalizeTreePermissions = (targetPath) => {
  const stat = lstatSync(targetPath);
  if (stat.isSymbolicLink()) return;
  if (stat.isDirectory()) {
    chmodSync(targetPath, 0o755);
    for (const entry of readdirSync(targetPath)) {
      normalizeTreePermissions(path.join(targetPath, entry));
    }
    return;
  }
  chmodSync(targetPath, stat.mode & 0o111 ? 0o755 : 0o644);
};

const directorySize = (targetPath) => {
  const stat = lstatSync(targetPath);
  if (stat.isSymbolicLink()) return 0;
  if (stat.isDirectory()) {
    return readdirSync(targetPath).reduce(
      (total, entry) => total + directorySize(path.join(targetPath, entry)), 0
    );
  }
  return stat.size;
};

assertDebBuildHost();
if (version !== '0.9.9') throw new Error(`Expected package.json version 0.9.9; received ${version}.`);
for (const [requiredPath, label] of [
  [path.join(rootDir, 'dist', 'index.html'), 'Renderer build output'],
  [builtMainPath, 'Electron main build output'],
  [path.join(rootDir, 'dist-electron', 'preload.js'), 'Electron preload build output'],
  [path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron'), 'Electron distribution'],
  [path.join(rootDir, 'node_modules', '.bin', 'asar'), 'ASAR tool'],
  [path.join(debSourceDir, 'opt.NetraFlow.netraflow'), 'AppArmor profile'],
  [path.join(debSourceDir, 'opt.NetraFlow.netraflow.local'), 'AppArmor local override'],
  [path.join(debSourceDir, 'postinst'), 'DEB postinst'],
  [path.join(debSourceDir, 'prerm'), 'DEB prerm'],
  ...requiredIconSizes.map((size) => [path.join(iconDir, `${size}x${size}.png`), `${size}px icon`])
]) assertRegularFile(requiredPath, label);

assertPackagedRendererLoader(builtMainPath);
await assertCommand('dpkg-deb');
await assertCommand('apparmor_parser');
await run('apparmor_parser', ['--skip-kernel-load', '--skip-cache', '-I', '/etc/apparmor.d', path.join(debSourceDir, 'opt.NetraFlow.netraflow')]);

mkdirSync(outputDir, { recursive: true });
rmSync(artifactPath, { force: true });
const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'netraflow-deb-'));

try {
  const stageRoot = path.join(temporaryRoot, 'stage');
  const packageStage = path.join(temporaryRoot, 'package-source');
  mkdirSync(packageStage, { recursive: true });
  for (const directory of ['dist', 'dist-electron', 'public']) {
    cpSync(path.join(rootDir, directory), path.join(packageStage, directory), { recursive: true });
  }
  cpSync(path.join(rootDir, 'build', 'licenses'), path.join(packageStage, 'build', 'licenses'), { recursive: true });
  writeFileSync(path.join(packageStage, 'package.json'), `${JSON.stringify({
    name: packageJson.name,
    version,
    private: true,
    productName,
    description: packageJson.description,
    main: 'dist-electron/main.js'
  }, null, 2)}\n`);

  const appRoot = toStagePath(stageRoot, '/opt/NetraFlow');
  cpSync(path.join(rootDir, 'node_modules', 'electron', 'dist'), appRoot, { recursive: true });
  renameSync(path.join(appRoot, 'electron'), path.join(appRoot, 'netraflow'));
  await run(path.join(rootDir, 'node_modules', '.bin', 'asar'), ['pack', packageStage, path.join(appRoot, 'resources', 'app.asar')]);
  cpSync(path.join(rootDir, 'build', 'licenses'), path.join(appRoot, 'licenses'), { recursive: true });

  mkdirSync(path.dirname(toStagePath(stageRoot, '/usr/bin/netraflow')), { recursive: true });
  symlinkSync(DEB_EXECUTABLE_PATH, toStagePath(stageRoot, '/usr/bin/netraflow'));
  mkdirSync(path.dirname(toStagePath(stageRoot, DEB_DESKTOP_PATH)), { recursive: true });
  writeFileSync(toStagePath(stageRoot, DEB_DESKTOP_PATH), DEB_DESKTOP_ENTRY);
  for (const size of requiredIconSizes) {
    const destination = toStagePath(stageRoot, `/usr/share/icons/hicolor/${size}x${size}/apps/netraflow.png`);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(path.join(iconDir, `${size}x${size}.png`), destination);
  }
  for (const [sourceName, destination] of [
    ['opt.NetraFlow.netraflow', DEB_APPARMOR_PATH],
    ['opt.NetraFlow.netraflow.local', DEB_APPARMOR_LOCAL_PATH]
  ]) {
    const target = toStagePath(stageRoot, destination);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(debSourceDir, sourceName), target);
  }

  const controlDir = path.join(stageRoot, 'DEBIAN');
  mkdirSync(controlDir, { recursive: true });
  for (const script of ['postinst', 'prerm']) copyFileSync(path.join(debSourceDir, script), path.join(controlDir, script));
  normalizeTreePermissions(stageRoot);
  chmodSync(path.join(controlDir, 'postinst'), 0o755);
  chmodSync(path.join(controlDir, 'prerm'), 0o755);
  chmodSync(toStagePath(stageRoot, DEB_EXECUTABLE_PATH), 0o755);
  chmodSync(path.join(appRoot, 'chrome-sandbox'), 0o755);
  const installedSizeKiB = Math.max(1, Math.ceil(directorySize(stageRoot) / 1024));
  writeFileSync(path.join(controlDir, 'control'), createDebControl({ version, installedSizeKiB }), { mode: 0o644 });
  writeFileSync(path.join(controlDir, 'conffiles'), `${DEB_APPARMOR_PATH}\n${DEB_APPARMOR_LOCAL_PATH}\n`, { mode: 0o644 });

  await run('dpkg-deb', ['--root-owner-group', '--build', stageRoot, artifactPath]);
  assertRegularFile(artifactPath, 'Linux DEB artifact');
  console.log(`Created ${artifactPath}`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
