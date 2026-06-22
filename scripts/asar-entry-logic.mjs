const forbiddenRuntimeEntryNames = new Set([
  'userdata',
  'userData',
  '.demo',
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

const forbiddenRuntimeEntryNameKeys = new Set(
  [...forbiddenRuntimeEntryNames].map((entryName) => entryName.toLowerCase())
);

const forbiddenRuntimeFileNames = new Set([
  'core.json',
  'core.json.tmp',
  'settings.json',
  'settings.json.tmp',
  'state.json',
  'state.json.tmp',
  'security.json',
  'security.json.tmp',
  'storage.json',
  'storage.json.tmp',
  'storage.json.previous',
  'storage.json.previous.tmp'
]);

const forbiddenSourceDirectoryNames = new Set(['src', '__tests__', 'tests']);

export const requiredPortableAsarEntries = [
  'dist/index.html',
  'dist-electron/main.js',
  'dist-electron/preload.js',
  'package.json',
  'public/icons/netraflow.ico'
];

export const normalizeAsarEntryName = (entryName) => {
  const normalizedEntryName = String(entryName ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
  const segments = normalizedEntryName.split('/').filter(Boolean);

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`ASAR entry path must not contain relative segments: ${entryName}`);
  }

  return normalizedEntryName;
};

const isForbiddenAsarEntry = (entryName) => {
  const lowerEntryName = entryName.toLowerCase();
  const segments = lowerEntryName.split('/').filter(Boolean);
  const fileName = segments.at(-1) ?? '';

  return (
    segments.some(
      (segment) =>
        forbiddenRuntimeEntryNameKeys.has(segment) || forbiddenSourceDirectoryNames.has(segment)
    ) ||
    forbiddenRuntimeFileNames.has(fileName) ||
    lowerEntryName.endsWith('.tmp') ||
    lowerEntryName.endsWith('.previous') ||
    /^electron\/.+\.ts$/.test(lowerEntryName)
  );
};

export const validatePortableAsarEntries = (asarEntries) => {
  const errors = [];
  const normalizedEntries = [];

  for (const entryName of asarEntries) {
    try {
      normalizedEntries.push(normalizeAsarEntryName(entryName));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const entrySet = new Set(normalizedEntries);

  for (const requiredAsarEntry of requiredPortableAsarEntries) {
    if (!entrySet.has(requiredAsarEntry)) {
      errors.push(`missing required file: ${requiredAsarEntry}`);
    }
  }

  const forbiddenEntries = normalizedEntries.filter(isForbiddenAsarEntry);

  if (forbiddenEntries.length > 0) {
    errors.push(`forbidden entries:\n${forbiddenEntries.join('\n')}`);
  }

  return {
    errors,
    normalizedEntries
  };
};
