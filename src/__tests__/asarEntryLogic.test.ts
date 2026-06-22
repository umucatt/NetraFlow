/// <reference types="node" />

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { pathToFileURL } from 'node:url';

type AsarEntryLogicModule = {
  normalizeAsarEntryName: (entryName: string) => string;
  requiredPortableAsarEntries: string[];
  validatePortableAsarEntries: (entries: string[]) => {
    errors: string[];
    normalizedEntries: string[];
  };
};

type AsarModule = {
  createPackage: (src: string, dest: string) => Promise<unknown>;
  listPackage: (archive: string) => string[];
};

const projectRootPath = process.cwd();
const logicModuleUrl = pathToFileURL(
  path.join(projectRootPath, 'scripts', 'asar-entry-logic.mjs')
).href;

const loadAsarEntryLogic = async () => (await import(logicModuleUrl)) as AsarEntryLogicModule;

const loadAsar = async () => (await import('@electron/asar')) as unknown as AsarModule;

const createFixtureRoot = (t: TestContext) => {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'netraflow-asar-entry-'));

  t.after(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  return rootDir;
};

const writeFixtureFile = (rootDir: string, relativePath: string, content = 'fixture') => {
  const filePath = path.join(rootDir, ...relativePath.split('/'));

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
};

test('ASAR entry normalization removes leading separators and keeps POSIX relative paths', async () => {
  const { normalizeAsarEntryName } = await loadAsarEntryLogic();
  const cases = new Map([
    ['\\dist\\index.html', 'dist/index.html'],
    ['/dist/index.html', 'dist/index.html'],
    ['dist\\index.html', 'dist/index.html'],
    ['dist/index.html', 'dist/index.html'],
    ['\\\\dist\\\\index.html', 'dist/index.html'],
    ['\\\\dist\\\\assets\\\\index.js', 'dist/assets/index.js'],
    ['//dist//assets//index.js', 'dist/assets/index.js'],
    ['\\/dist\\//assets\\\\index.js', 'dist/assets/index.js']
  ]);

  for (const [input, expected] of cases) {
    assert.equal(normalizeAsarEntryName(input), expected);
  }
});

test('ASAR entry validation accepts Windows POSIX and mixed required entry output', async () => {
  const { validatePortableAsarEntries } = await loadAsarEntryLogic();
  const entries = [
    '\\dist\\index.html',
    '/dist-electron/main.js',
    'dist-electron\\preload.js',
    '\\\\package.json',
    'public/icons/netraflow.ico'
  ];
  const result = validatePortableAsarEntries(entries);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.normalizedEntries, [
    'dist/index.html',
    'dist-electron/main.js',
    'dist-electron/preload.js',
    'package.json',
    'public/icons/netraflow.ico'
  ]);
});

test('ASAR entry validation rejects missing renderer entry variants', async () => {
  const { requiredPortableAsarEntries, validatePortableAsarEntries } = await loadAsarEntryLogic();
  const withoutRenderer = requiredPortableAsarEntries.filter((entry) => entry !== 'dist/index.html');

  assert.match(
    validatePortableAsarEntries(withoutRenderer).errors.join('\n'),
    /missing required file: dist\/index\.html/
  );

  assert.match(
    validatePortableAsarEntries([...withoutRenderer, 'dist/index.htm']).errors.join('\n'),
    /missing required file: dist\/index\.html/
  );

  assert.match(
    validatePortableAsarEntries([...withoutRenderer, 'resources/app/dist/index.html']).errors.join(
      '\n'
    ),
    /missing required file: dist\/index\.html/
  );
});

test('ASAR entry validation rejects user data source and path traversal entries', async () => {
  const { requiredPortableAsarEntries, validatePortableAsarEntries } = await loadAsarEntryLogic();
  const entries = [
    ...requiredPortableAsarEntries,
    'userdata/core.json',
    '.demo/settings.json',
    'runtime/state.json',
    'storage.json',
    'state.json.tmp',
    'settings.json.previous',
    'src/App.tsx',
    'electron/main.ts',
    'tests/app.test.ts',
    '../dist/index.html',
    './dist/index.html'
  ];
  const errors = validatePortableAsarEntries(entries).errors.join('\n');

  assert.match(errors, /forbidden entries:/);
  assert.match(errors, /userdata\/core\.json/);
  assert.match(errors, /electron\/main\.ts/);
  assert.match(errors, /ASAR entry path must not contain relative segments: \.\.\/dist\/index\.html/);
  assert.match(errors, /ASAR entry path must not contain relative segments: \.\/dist\/index\.html/);
});

test('ASAR entry validation accepts a temporary ASAR fixture created by electron asar', async (t) => {
  const { createPackage, listPackage } = await loadAsar();
  const { validatePortableAsarEntries } = await loadAsarEntryLogic();
  const rootDir = createFixtureRoot(t);
  const sourceDir = path.join(rootDir, 'source');
  const archivePath = path.join(rootDir, 'app.asar');

  for (const requiredPath of [
    'dist/index.html',
    'dist-electron/main.js',
    'dist-electron/preload.js',
    'package.json',
    'public/icons/netraflow.ico'
  ]) {
    writeFixtureFile(sourceDir, requiredPath);
  }

  await createPackage(sourceDir, archivePath);

  const entries = listPackage(archivePath);
  const result = validatePortableAsarEntries(entries);

  assert.deepEqual(result.errors, []);
  assert.equal(result.normalizedEntries.includes('dist/index.html'), true);
  assert.equal(result.normalizedEntries.includes('dist-electron/main.js'), true);
});
