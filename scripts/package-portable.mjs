import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const appName = packageJson.name ?? 'netraflow';
const version = packageJson.version ?? '0.0.0';
const bundleName = `${productName}_${version}`;
const outputRoot = path.join(rootDir, 'release', 'portable');
const portableRootDir = path.join(outputRoot, bundleName);
const zipPath = path.join(outputRoot, `${bundleName}_Portable.zip`);
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const electronExePath = path.join(portableRootDir, 'electron.exe');
const appExePath = path.join(portableRootDir, `${productName}.exe`);
const resourcesDir = path.join(portableRootDir, 'resources');
const appDir = path.join(resourcesDir, 'app');
const builtMainPath = path.join(rootDir, 'dist-electron', 'main.js');
const iconPath = path.join(rootDir, 'public', 'icons', 'netraflow.ico');
const powershell = path.join(
  process.env.SystemRoot ?? 'C:\\Windows',
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe'
);
const notoLicenseFiles = [
  'LICENSE.NotoSansCJK.txt',
  'LICENSE.NotoSansSymbols2.txt'
];
const runtimeDataEntryNames = new Set([
  'userData',
  'Local Storage',
  'IndexedDB',
  'Cache',
  'Code Cache',
  'GPUCache',
  'Session Storage',
  'Preferences',
  'Local State',
  'blob_storage',
  'DawnCache',
  'DawnWebGPUCache',
  'Network',
  'Shared Dictionary',
  'AppData',
  'netraflow-updater'
]);
const installerOnlyEntryNames = new Set([
  'installer.exe',
  `Uninstall ${productName}.exe`,
  'uninstallerIcon.ico',
  'installerIcon.ico'
]);
const forbiddenFileNamePatterns = [
  /\.blockmap$/i,
  /^NetraFlow_.*_Setup\.exe$/i,
  /(^|[-_.])nsis([-_.]|$)/i
];

const removeRuntimeDataEntries = (directory) => {
  if (!existsSync(directory)) {
    return;
  }

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (runtimeDataEntryNames.has(entry.name)) {
      rmSync(entryPath, { recursive: true, force: true });
    } else if (entry.isDirectory()) {
      removeRuntimeDataEntries(entryPath);
    }
  }
};

const assertNoForbiddenPortableEntries = (directory) => {
  const failures = [];
  const visit = (currentDirectory) => {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const entryPath = path.join(currentDirectory, entry.name);
      const relativePath = path.relative(portableRootDir, entryPath);

      if (
        runtimeDataEntryNames.has(entry.name) ||
        installerOnlyEntryNames.has(entry.name) ||
        forbiddenFileNamePatterns.some((pattern) => pattern.test(entry.name))
      ) {
        failures.push(relativePath);
      }

      if (entry.isDirectory()) {
        visit(entryPath);
      }
    }
  };

  visit(directory);

  if (failures.length > 0) {
    throw new Error(`Portable bundle contains forbidden entries:\n${failures.join('\n')}`);
  }
};

const assertPackagedMainLoader = (mainPath) => {
  const mainSource = readFileSync(mainPath, 'utf8');
  const requiredSnippets = [
    'app.isPackaged',
    'process.resourcesPath',
    "'app', 'dist', 'index.html'",
    '!app.isPackaged && devServerUrl'
  ];
  const missingSnippet = requiredSnippets.find((snippet) => !mainSource.includes(snippet));

  if (missingSnippet) {
    throw new Error(`Electron main build is missing packaged loader snippet: ${missingSnippet}`);
  }

  if (mainSource.includes('if (devServerUrl)')) {
    throw new Error('Electron main build still allows packaged fallback to VITE_DEV_SERVER_URL.');
  }
};

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

const patchExecutableMetadata = (exePath) => {
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
};

const copyNotoLicenses = () => {
  const targetLicenseDir = path.join(portableRootDir, 'licenses');

  mkdirSync(targetLicenseDir, { recursive: true });

  for (const fileName of notoLicenseFiles) {
    cpSync(path.join(rootDir, 'build', 'licenses', fileName), path.join(targetLicenseDir, fileName));
  }
};

const copyElectronLicenses = () => {
  cpSync(path.join(electronDistDir, 'LICENSE'), path.join(portableRootDir, 'LICENSE.electron.txt'));
  cpSync(path.join(electronDistDir, 'LICENSES.chromium.html'), path.join(portableRootDir, 'LICENSES.chromium.html'));
};

const assertPortableBundle = () => {
  for (const requiredPath of [
    appExePath,
    path.join(appDir, 'portable.flag'),
    path.join(appDir, 'dist', 'index.html'),
    path.join(appDir, 'dist-electron', 'main.js'),
    path.join(appDir, 'public', 'icons', 'netraflow.ico'),
    path.join(portableRootDir, 'LICENSE.electron.txt'),
    path.join(portableRootDir, 'LICENSES.chromium.html'),
    ...notoLicenseFiles.map((fileName) => path.join(portableRootDir, 'licenses', fileName))
  ]) {
    if (!existsSync(requiredPath)) {
      throw new Error(`Portable bundle is missing required file: ${requiredPath}`);
    }
  }

  assertNoForbiddenPortableEntries(portableRootDir);
};

const psQuote = (value) => `'${value.replaceAll("'", "''")}'`;

const compressPortableBundle = () => {
  rmSync(zipPath, { force: true });
  execFileSync(powershell, [
    '-NoProfile',
    '-Command',
    `Compress-Archive -LiteralPath ${psQuote(portableRootDir)} -DestinationPath ${psQuote(zipPath)} -Force`
  ], {
    stdio: 'inherit'
  });

  if (!existsSync(zipPath)) {
    throw new Error(`Portable zip was not created: ${zipPath}`);
  }
};

if (process.platform !== 'win32') {
  throw new Error('Portable Windows packaging must run on Windows.');
}

for (const requiredPath of [
  path.join(rootDir, 'dist', 'index.html'),
  builtMainPath,
  electronDistDir,
  iconPath,
  powershell,
  ...notoLicenseFiles.map((fileName) => path.join(rootDir, 'build', 'licenses', fileName))
]) {
  if (!existsSync(requiredPath)) {
    throw new Error(`Missing required portable build input: ${requiredPath}`);
  }
}

assertPackagedMainLoader(builtMainPath);
rmSync(portableRootDir, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(outputRoot, { recursive: true });
cpSync(electronDistDir, portableRootDir, { recursive: true });
rmSync(path.join(resourcesDir, 'default_app.asar'), { force: true });
rmSync(appDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });
cpSync(path.join(rootDir, 'dist'), path.join(appDir, 'dist'), { recursive: true });
cpSync(path.join(rootDir, 'dist-electron'), path.join(appDir, 'dist-electron'), { recursive: true });
cpSync(path.join(rootDir, 'public'), path.join(appDir, 'public'), { recursive: true });
writeFileSync(path.join(appDir, 'portable.flag'), 'NETRAFLOW_PORTABLE=1\n', 'utf8');
writeFileSync(
  path.join(appDir, 'package.json'),
  JSON.stringify(
    {
      name: appName,
      productName,
      version,
      type: 'module',
      main: 'dist-electron/main.js'
    },
    null,
    2
  )
);
removeRuntimeDataEntries(appDir);
removeRuntimeDataEntries(portableRootDir);
assertPackagedMainLoader(path.join(appDir, 'dist-electron', 'main.js'));
renameSync(electronExePath, appExePath);
patchExecutableMetadata(appExePath);
copyElectronLicenses();
copyNotoLicenses();
assertPortableBundle();
compressPortableBundle();
console.log(`Created ${portableRootDir}`);
console.log(`Created ${zipPath}`);
