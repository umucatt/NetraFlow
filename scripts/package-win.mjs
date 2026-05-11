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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const appName = packageJson.name ?? 'netraflow';
const version = packageJson.version ?? '0.0.0';
const bundleName = `${productName}_${version}`;
const powershell = path.join(
  process.env.SystemRoot ?? 'C:\\Windows',
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe'
);

const getDesktopPath = () => {
  try {
    const desktop = execFileSync(
      powershell,
      ['-NoProfile', '-Command', '[Environment]::GetFolderPath("Desktop")'],
      { encoding: 'utf8' }
    ).trim();

    if (desktop) {
      return desktop;
    }
  } catch {
    // Fall back to the conventional Windows desktop path when PowerShell is unavailable.
  }

  return path.join(os.homedir(), 'Desktop');
};

const writeUInt16 = (value) => {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
};

const writeUInt32 = (value) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
};

const utf16 = (value) => Buffer.from(`${value}\0`, 'utf16le');

const alignDword = (buffer) => {
  const padding = (4 - (buffer.length % 4)) % 4;
  return padding === 0 ? buffer : Buffer.concat([buffer, Buffer.alloc(padding)]);
};

const createVersionBlock = ({ key, type = 1, value = Buffer.alloc(0), valueLength, children = [] }) => {
  const header = Buffer.alloc(6);
  let block = Buffer.concat([header, utf16(key)]);
  block = alignDword(block);
  block = alignDword(Buffer.concat([block, value]));
  block = Buffer.concat([block, ...children]);
  block.writeUInt16LE(block.length, 0);
  block.writeUInt16LE(valueLength ?? (type === 1 ? value.length / 2 : value.length), 2);
  block.writeUInt16LE(type, 4);
  return block;
};

const createVersionResource = () => {
  const [major = 0, minor = 0, patch = 0, build = 0] = version
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
  const versionMs = ((major & 0xffff) << 16) | (minor & 0xffff);
  const versionLs = ((patch & 0xffff) << 16) | (build & 0xffff);
  const fixedInfo = Buffer.concat([
    writeUInt32(0xfeef04bd),
    writeUInt32(0x00010000),
    writeUInt32(versionMs),
    writeUInt32(versionLs),
    writeUInt32(versionMs),
    writeUInt32(versionLs),
    writeUInt32(0x0000003f),
    writeUInt32(0),
    writeUInt32(0x00040004),
    writeUInt32(0x00000001),
    writeUInt32(0),
    writeUInt32(0),
    writeUInt32(0)
  ]);
  const strings = {
    CompanyName: productName,
    FileDescription: productName,
    FileVersion: version,
    InternalName: productName,
    OriginalFilename: `${productName}.exe`,
    ProductName: productName,
    ProductVersion: version
  };
  const stringEntries = Object.entries(strings).map(([key, value]) =>
    createVersionBlock({ key, value: utf16(value), valueLength: value.length + 1 })
  );
  const stringTable = createVersionBlock({ key: '040904B0', children: stringEntries });
  const stringFileInfo = createVersionBlock({ key: 'StringFileInfo', children: [stringTable] });
  const translation = Buffer.concat([writeUInt16(0x0409), writeUInt16(0x04b0)]);
  const translationBlock = createVersionBlock({
    key: 'Translation',
    type: 0,
    value: translation,
    valueLength: translation.length
  });
  const varFileInfo = createVersionBlock({ key: 'VarFileInfo', type: 1, children: [translationBlock] });

  return createVersionBlock({
    key: 'VS_VERSION_INFO',
    type: 0,
    value: fixedInfo,
    valueLength: fixedInfo.length,
    children: [stringFileInfo, varFileInfo]
  });
};

const readResourceDirectoryEntries = (buffer, directoryOffset) => {
  const namedCount = buffer.readUInt16LE(directoryOffset + 12);
  const idCount = buffer.readUInt16LE(directoryOffset + 14);
  const entryCount = namedCount + idCount;

  return Array.from({ length: entryCount }, (_, index) => {
    const entryOffset = directoryOffset + 16 + index * 8;
    const rawName = buffer.readUInt32LE(entryOffset);
    const rawData = buffer.readUInt32LE(entryOffset + 4);

    return {
      id: rawName & 0xffff,
      isNamed: Boolean(rawName & 0x80000000),
      isDirectory: Boolean(rawData & 0x80000000),
      offset: rawData & 0x7fffffff
    };
  });
};

const findResourceEntry = (buffer, resourceBaseOffset, directoryOffset, id) => {
  const entries = readResourceDirectoryEntries(buffer, directoryOffset);
  return entries.find((entry) => !entry.isNamed && entry.id === id) ?? null;
};

const getFirstResourceEntry = (buffer, directoryOffset) =>
  readResourceDirectoryEntries(buffer, directoryOffset)[0] ?? null;

const getPeResourceContext = (buffer) => {
  const peOffset = buffer.readUInt32LE(0x3c);

  if (buffer.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0') {
    throw new Error('Target executable is not a PE file.');
  }

  const sectionCount = buffer.readUInt16LE(peOffset + 6);
  const optionalHeaderSize = buffer.readUInt16LE(peOffset + 20);
  const optionalHeaderOffset = peOffset + 24;
  const optionalMagic = buffer.readUInt16LE(optionalHeaderOffset);
  const dataDirectoryOffset = optionalHeaderOffset + (optionalMagic === 0x20b ? 112 : 96);
  const resourceRva = buffer.readUInt32LE(dataDirectoryOffset + 16);
  const sectionTableOffset = optionalHeaderOffset + optionalHeaderSize;
  const sections = Array.from({ length: sectionCount }, (_, index) => {
    const offset = sectionTableOffset + index * 40;
    return {
      virtualSize: buffer.readUInt32LE(offset + 8),
      virtualAddress: buffer.readUInt32LE(offset + 12),
      rawSize: buffer.readUInt32LE(offset + 16),
      rawAddress: buffer.readUInt32LE(offset + 20)
    };
  });
  const rvaToOffset = (rva) => {
    const section = sections.find((item) => {
      const sectionSize = Math.max(item.virtualSize, item.rawSize);
      return rva >= item.virtualAddress && rva < item.virtualAddress + sectionSize;
    });

    if (!section) {
      throw new Error(`Cannot resolve RVA ${rva}.`);
    }

    return section.rawAddress + (rva - section.virtualAddress);
  };

  return {
    resourceBaseOffset: rvaToOffset(resourceRva),
    rvaToOffset
  };
};

const patchExecutableMetadata = (exePath) => {
  const buffer = readFileSync(exePath);
  const nextVersionResource = createVersionResource();
  const { resourceBaseOffset, rvaToOffset } = getPeResourceContext(buffer);
  const versionTypeEntry = findResourceEntry(buffer, resourceBaseOffset, resourceBaseOffset, 16);

  if (!versionTypeEntry?.isDirectory) {
    throw new Error('Version resource type was not found in the executable.');
  }

  const versionNameDirectoryOffset = resourceBaseOffset + versionTypeEntry.offset;
  const versionNameEntry =
    findResourceEntry(buffer, resourceBaseOffset, versionNameDirectoryOffset, 1) ??
    getFirstResourceEntry(buffer, versionNameDirectoryOffset);

  if (!versionNameEntry?.isDirectory) {
    throw new Error('Version resource name was not found in the executable.');
  }

  const versionLanguageDirectoryOffset = resourceBaseOffset + versionNameEntry.offset;
  const versionLanguageEntry = getFirstResourceEntry(buffer, versionLanguageDirectoryOffset);

  if (!versionLanguageEntry || versionLanguageEntry.isDirectory) {
    throw new Error('Version resource language was not found in the executable.');
  }

  const dataEntryOffset = resourceBaseOffset + versionLanguageEntry.offset;
  const dataRva = buffer.readUInt32LE(dataEntryOffset);
  const currentSize = buffer.readUInt32LE(dataEntryOffset + 4);

  if (nextVersionResource.length > currentSize) {
    throw new Error(
      `New version resource is ${nextVersionResource.length} bytes, but only ${currentSize} bytes are available.`
    );
  }

  const dataOffset = rvaToOffset(dataRva);
  buffer.fill(0, dataOffset, dataOffset + currentSize);
  nextVersionResource.copy(buffer, dataOffset);
  buffer.writeUInt32LE(nextVersionResource.length, dataEntryOffset + 4);
  writeFileSync(exePath, buffer);

  return [`FileDescription=${productName}`, `ProductName=${productName}`].join('\n');
};

const outputRoot = process.env.NETRAFLOW_DIST_ROOT
  ? path.resolve(process.env.NETRAFLOW_DIST_ROOT)
  : path.join(getDesktopPath(), productName);
const targetDir = path.join(outputRoot, bundleName);
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const electronExePath = path.join(targetDir, 'electron.exe');
const appExePath = path.join(targetDir, `${productName}.exe`);
const resourcesDir = path.join(targetDir, 'resources');
const appDir = path.join(resourcesDir, 'app');
const builtMainPath = path.join(rootDir, 'dist-electron', 'main.js');
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
  'Shared Dictionary'
]);

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

if (process.platform !== 'win32') {
  throw new Error('Windows packaging must run on Windows.');
}

for (const requiredPath of [
  path.join(rootDir, 'dist', 'index.html'),
  builtMainPath,
  electronDistDir
]) {
  if (!existsSync(requiredPath)) {
    throw new Error(`Missing required build input: ${requiredPath}`);
  }
}

assertPackagedMainLoader(builtMainPath);

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });
cpSync(electronDistDir, targetDir, { recursive: true });

rmSync(path.join(resourcesDir, 'default_app.asar'), { force: true });
rmSync(appDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });
cpSync(path.join(rootDir, 'dist'), path.join(appDir, 'dist'), { recursive: true });
cpSync(path.join(rootDir, 'dist-electron'), path.join(appDir, 'dist-electron'), { recursive: true });
cpSync(path.join(rootDir, 'public'), path.join(appDir, 'public'), { recursive: true });
removeRuntimeDataEntries(appDir);
assertPackagedMainLoader(path.join(appDir, 'dist-electron', 'main.js'));
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

renameSync(electronExePath, appExePath);
const metadata = patchExecutableMetadata(appExePath);
rmSync(path.join(targetDir, 'userData'), { recursive: true, force: true });

console.log(`Created ${targetDir}`);
console.log(`Executable ${appExePath}`);
console.log(metadata);
