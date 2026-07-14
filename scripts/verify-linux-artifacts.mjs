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
if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Linux artifact verification requires Linux x64.');
for (const filePath of [appImagePath, debPath]) {
  if (!existsSync(filePath) || !statSync(filePath).isFile() || statSync(filePath).size === 0) throw new Error(`Linux artifact is missing or empty: ${filePath}`);
}
const debField = (field) => execFileSync('dpkg-deb', ['-f', debPath, field], { encoding: 'utf8' }).trim();
if (debField('Architecture') !== 'amd64') throw new Error('DEB Architecture must be amd64.');
if (debField('Version') !== packageJson.version) throw new Error('DEB version does not match package.json.');

const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'netraflow-linux-verify-'));
try {
  const debExtract = path.join(temporaryRoot, 'deb');
  execFileSync('dpkg-deb', ['-x', debPath, debExtract]);
  for (const required of ['opt/NetraFlow/netraflow', 'usr/share/applications/netraflow.desktop']) {
    if (!existsSync(path.join(debExtract, required))) throw new Error(`DEB is missing ${required}.`);
  }
  const appImageExtract = path.join(temporaryRoot, 'appimage');
  mkdirSync(appImageExtract);
  execFileSync(appImagePath, ['--appimage-extract'], { cwd: appImageExtract, stdio: 'ignore' });
  const appDir = path.join(appImageExtract, 'squashfs-root');
  for (const required of ['AppRun', 'netraflow', 'netraflow.desktop']) {
    if (!existsSync(path.join(appDir, required))) throw new Error(`AppImage is missing ${required}.`);
  }
  const forbidden = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (/^(userdata|runtime|\.tmp-tests|\.git|tests?|__tests__)$/i.test(entry.name)) forbidden.push(path.join(directory, entry.name));
      if (entry.isDirectory() && !entry.isSymbolicLink()) visit(path.join(directory, entry.name));
    }
  };
  visit(debExtract);
  visit(appDir);
  if (forbidden.length > 0) throw new Error(`Linux artifacts contain forbidden data: ${forbidden.join(', ')}`);
  console.log('Verified AppImage and DEB architecture, version, executable, desktop entry, and data exclusions.');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
