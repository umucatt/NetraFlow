import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const releaseDir = path.join(rootDir, 'release', 'linux', packageJson.version);
const appImagePath = path.join(releaseDir, `NetraFlow_${packageJson.version}_x64.AppImage`);
const debPath = path.join(releaseDir, `NetraFlow_${packageJson.version}_x64.deb`);
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--mode' || !['appimage', 'deb'].includes(args[1])) {
  throw new Error('Linux artifact verification requires --mode appimage or --mode deb.');
}
const mode = args[1];
if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Linux artifact verification requires Linux x64.');
const artifactPath = mode === 'appimage' ? appImagePath : debPath;
if (!existsSync(artifactPath) || !statSync(artifactPath).isFile() || statSync(artifactPath).size === 0) {
  throw new Error(`Linux artifact is missing or empty: ${artifactPath}`);
}

const findForbiddenPaths = (directory) => {
  const forbidden = [];
  const visit = (currentDirectory) => {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      if (/^(userdata|runtime|src|electron|\.tmp-tests|\.git|tests?|__tests__)$/i.test(entry.name)) {
        forbidden.push(path.join(currentDirectory, entry.name));
      }
      if (entry.isDirectory() && !entry.isSymbolicLink()) visit(path.join(currentDirectory, entry.name));
    }
  };
  visit(directory);
  return forbidden;
};

const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'netraflow-linux-verify-'));
try {
  if (mode === 'appimage') {
    const appImageExtract = path.join(temporaryRoot, 'appimage');
    mkdirSync(appImageExtract);
    execFileSync(appImagePath, ['--appimage-extract'], { cwd: appImageExtract, stdio: 'ignore' });
    const appDir = path.join(appImageExtract, 'squashfs-root');
    for (const required of ['AppRun', 'netraflow', 'netraflow.desktop']) {
      if (!existsSync(path.join(appDir, required))) throw new Error(`AppImage is missing ${required}.`);
    }
    const forbidden = findForbiddenPaths(appDir);
    if (forbidden.length > 0) throw new Error(`AppImage contains forbidden data: ${forbidden.join(', ')}`);
    console.log('Verified AppImage executable, desktop entry, and data exclusions.');
  } else {
    const debField = (field) => execFileSync('dpkg-deb', ['-f', debPath, field], { encoding: 'utf8' }).trim();
    if (debField('Architecture') !== 'amd64') throw new Error('DEB Architecture must be amd64.');
    if (debField('Version') !== packageJson.version) throw new Error('DEB version does not match package.json.');
    const debExtract = path.join(temporaryRoot, 'deb');
    execFileSync('dpkg-deb', ['-x', debPath, debExtract]);
    for (const required of [
      'opt/NetraFlow/netraflow',
      'usr/share/applications/netraflow.desktop',
      'etc/apparmor.d/opt.NetraFlow.netraflow'
    ]) {
      if (!existsSync(path.join(debExtract, required))) throw new Error(`DEB is missing ${required}.`);
    }
    const forbidden = findForbiddenPaths(debExtract);
    if (forbidden.length > 0) throw new Error(`DEB contains forbidden data: ${forbidden.join(', ')}`);
    console.log('Verified DEB architecture, version, executable, desktop entry, AppArmor profile, and data exclusions.');
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
