import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const dmgPath = path.join(rootDir, 'release', 'macos', packageJson.version, `NetraFlow_${packageJson.version}_arm64.dmg`);
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('macOS artifact verification requires Apple Silicon macOS.');
if (!existsSync(dmgPath) || statSync(dmgPath).size === 0) throw new Error(`DMG is missing or empty: ${dmgPath}`);

const attachOutput = execFileSync('/usr/bin/hdiutil', ['attach', '-readonly', '-nobrowse', dmgPath], { encoding: 'utf8' });
const mountPoint = attachOutput.trim().split(/\r?\n/).map((line) => line.split('\t').at(-1)?.trim()).find((value) => value?.startsWith('/Volumes/'));
if (!mountPoint) throw new Error('Unable to determine mounted DMG path.');
try {
  const appPath = path.join(mountPoint, 'NetraFlow.app');
  const plistPath = path.join(appPath, 'Contents', 'Info.plist');
  if (!existsSync(appPath) || !existsSync(plistPath)) throw new Error('DMG must contain NetraFlow.app with Info.plist.');
  const plistValue = (key) => execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plistPath], { encoding: 'utf8' }).trim();
  if (plistValue('CFBundleShortVersionString') !== packageJson.version) throw new Error('macOS bundle version does not match package.json.');
  if (plistValue('CFBundleIdentifier') !== packageJson.build.appId) throw new Error('macOS bundle identifier does not match package.json.');
  const executablePath = path.join(appPath, 'Contents', 'MacOS', 'NetraFlow');
  const architectures = execFileSync('/usr/bin/lipo', ['-archs', executablePath], { encoding: 'utf8' }).trim();
  if (architectures !== 'arm64') throw new Error(`NetraFlow.app must be arm64 only; found ${architectures}.`);
  const forbidden = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (/^(userdata|runtime|\.tmp-tests|tests?|__tests__)$/i.test(entry.name)) forbidden.push(path.join(directory, entry.name));
      if (entry.isDirectory() && !entry.isSymbolicLink()) visit(path.join(directory, entry.name));
    }
  };
  visit(appPath);
  if (forbidden.length > 0) throw new Error(`macOS bundle contains forbidden data: ${forbidden.join(', ')}`);
  console.log('Verified DMG contents, arm64 architecture, version, bundle identifier, and data exclusions.');
  console.log('Signing status: no Developer ID signing configured; notarization is disabled.');
} finally {
  execFileSync('/usr/bin/hdiutil', ['detach', mountPoint], { stdio: 'inherit' });
}
