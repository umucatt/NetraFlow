import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { Arch, Platform, build } from 'electron-builder';
import { patchExecutableResources } from './patch-executable-resources.mjs';
import { prepareVersionedReleaseDir } from './release-utils.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const version = packageJson.version ?? '0.0.0';
const bundleName = `${productName}_${version}`;
let folderName = '';
let outputRoot = '';
let portableRootDir = '';
let zipPath = '';
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
let appExePath = '';
let resourcesDir = '';
let appDir = '';
let stagingOutputDir = '';
let packagedAppDir = '';
const builtMainPath = path.join(rootDir, 'dist-electron', 'main.js');
const iconPath = path.join(rootDir, 'public', 'icons', 'netraflow.ico');
const notoLicenseFiles = [
  'LICENSE.NotoSansCJK.txt',
  'LICENSE.NotoSansSymbols2.txt'
];
const runtimeDataEntryNames = new Set([
  'userData',
  'userdata',
  'runtime',
  'logs',
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

const makeCrc32Table = () => {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
};

const crc32Table = makeCrc32Table();

const crc32 = (buffer) => {
  let value = 0xffffffff;

  for (const byte of buffer) {
    value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8);
  }

  return (value ^ 0xffffffff) >>> 0;
};

const getZipDateParts = (date) => {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
    dosTime: (hours << 11) | (minutes << 5) | seconds
  };
};

const collectZipEntries = (entryPath, basePath) => {
  const stats = statSync(entryPath);
  const entryName = path.relative(basePath, entryPath).replaceAll(path.sep, '/');

  if (stats.isDirectory()) {
    const directoryEntryName = `${entryName}/`;
    const children = readdirSync(entryPath)
      .sort((left, right) => left.localeCompare(right))
      .flatMap((entry) => collectZipEntries(path.join(entryPath, entry), basePath));

    return [
      {
        entryName: directoryEntryName,
        sourcePath: entryPath,
        stats,
        isDirectory: true
      },
      ...children
    ];
  }

  if (!stats.isFile()) {
    return [];
  }

  return [
    {
      entryName,
      sourcePath: entryPath,
      stats,
      isDirectory: false
    }
  ];
};

const writeUInt32LE = (buffer, value, offset) => {
  buffer.writeUInt32LE(value >>> 0, offset);
};

const createZipFromDirectory = (sourceDirectory, targetZipPath, basePath) => {
  const archiveParts = [];
  const centralDirectoryParts = [];
  let offset = 0;

  for (const entry of collectZipEntries(sourceDirectory, basePath)) {
    const fileNameBuffer = Buffer.from(entry.entryName, 'utf8');
    const sourceBuffer = entry.isDirectory ? Buffer.alloc(0) : readFileSync(entry.sourcePath);
    const compressedBuffer = entry.isDirectory ? sourceBuffer : deflateRawSync(sourceBuffer);
    const useDeflate = !entry.isDirectory && compressedBuffer.length < sourceBuffer.length;
    const dataBuffer = useDeflate ? compressedBuffer : sourceBuffer;
    const compressionMethod = useDeflate ? 8 : 0;
    const checksum = crc32(sourceBuffer);
    const { dosDate, dosTime } = getZipDateParts(entry.stats.mtime);
    const flags = 0x0800;
    const localHeader = Buffer.alloc(30 + fileNameBuffer.length);
    const localHeaderOffset = offset;

    writeUInt32LE(localHeader, 0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(flags, 6);
    localHeader.writeUInt16LE(compressionMethod, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    writeUInt32LE(localHeader, checksum, 14);
    writeUInt32LE(localHeader, dataBuffer.length, 18);
    writeUInt32LE(localHeader, sourceBuffer.length, 22);
    localHeader.writeUInt16LE(fileNameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    fileNameBuffer.copy(localHeader, 30);

    archiveParts.push(localHeader, dataBuffer);
    offset += localHeader.length + dataBuffer.length;

    const centralHeader = Buffer.alloc(46 + fileNameBuffer.length);
    writeUInt32LE(centralHeader, 0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(flags, 8);
    centralHeader.writeUInt16LE(compressionMethod, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    writeUInt32LE(centralHeader, checksum, 16);
    writeUInt32LE(centralHeader, dataBuffer.length, 20);
    writeUInt32LE(centralHeader, sourceBuffer.length, 24);
    centralHeader.writeUInt16LE(fileNameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    writeUInt32LE(centralHeader, entry.isDirectory ? 0x10 : 0, 38);
    writeUInt32LE(centralHeader, localHeaderOffset, 42);
    fileNameBuffer.copy(centralHeader, 46);
    centralDirectoryParts.push(centralHeader);
  }

  const centralDirectory = Buffer.concat(centralDirectoryParts);
  const centralDirectoryOffset = offset;
  const entryCount = centralDirectoryParts.length;

  if (entryCount > 0xffff) {
    throw new Error(`Portable zip has too many entries: ${entryCount}`);
  }

  const endOfCentralDirectory = Buffer.alloc(22);
  writeUInt32LE(endOfCentralDirectory, 0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entryCount, 8);
  endOfCentralDirectory.writeUInt16LE(entryCount, 10);
  writeUInt32LE(endOfCentralDirectory, centralDirectory.length, 12);
  writeUInt32LE(endOfCentralDirectory, centralDirectoryOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  writeFileSync(targetZipPath, Buffer.concat([...archiveParts, centralDirectory, endOfCentralDirectory]));
};

const compressPortableBundle = () => {
  rmSync(zipPath, { force: true });
  createZipFromDirectory(portableRootDir, zipPath, outputRoot);

  if (!existsSync(zipPath)) {
    throw new Error(`Portable zip was not created: ${zipPath}`);
  }
};

const buildPortableAppSource = async () => {
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  process.env.ELECTRON_BUILDER_DISABLE_BUILD_CACHE = 'true';

  rmSync(stagingOutputDir, { recursive: true, force: true });

  await build({
    projectDir: rootDir,
    targets: Platform.WINDOWS.createTarget(['dir'], Arch.x64),
    publish: 'never',
    config: {
      directories: {
        output: stagingOutputDir
      }
    }
  });

  packagedAppDir = path.join(stagingOutputDir, 'win-unpacked');

  if (!existsSync(path.join(packagedAppDir, `${productName}.exe`))) {
    throw new Error(`Portable app source was not created: ${packagedAppDir}`);
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
  ...notoLicenseFiles.map((fileName) => path.join(rootDir, 'build', 'licenses', fileName))
]) {
  if (!existsSync(requiredPath)) {
    throw new Error(`Missing required portable build input: ${requiredPath}`);
  }
}

assertPackagedMainLoader(builtMainPath);
({ folderName, outputDir: outputRoot } = prepareVersionedReleaseDir('portable', version));
portableRootDir = path.join(outputRoot, bundleName);
zipPath = path.join(outputRoot, `${bundleName}_Portable.zip`);
appExePath = path.join(portableRootDir, `${productName}.exe`);
resourcesDir = path.join(portableRootDir, 'resources');
appDir = path.join(resourcesDir, 'app');
stagingOutputDir = path.join(outputRoot, '.win-unpacked-source');
rmSync(portableRootDir, { recursive: true, force: true });
rmSync(zipPath, { force: true });
await buildPortableAppSource();
cpSync(packagedAppDir, portableRootDir, { recursive: true });
rmSync(stagingOutputDir, { recursive: true, force: true });
writeFileSync(path.join(appDir, 'portable.flag'), 'NETRAFLOW_PORTABLE=1\n', 'utf8');
removeRuntimeDataEntries(appDir);
removeRuntimeDataEntries(portableRootDir);
assertPackagedMainLoader(path.join(appDir, 'dist-electron', 'main.js'));
patchExecutableResources(appExePath, { iconPath, productName, version });
copyElectronLicenses();
copyNotoLicenses();
assertPortableBundle();
compressPortableBundle();
console.log(`Created ${portableRootDir}`);
console.log(`Created ${zipPath}`);
console.log(`Portable release folder ${folderName}`);
