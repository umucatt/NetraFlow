import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import {
  createPersistencePaths,
  getPersistenceDocumentPath,
  getPersistenceDocumentTmpPath,
  getPersistenceTmpPaths
} from './persistencePaths.js';

test('persistence paths resolve the four formal files and tmp candidates only', () => {
  const root = path.join('D:', 'NetraFlow', 'userdata');
  const paths = createPersistencePaths(root);

  assert.equal(paths.root, path.resolve(root));
  assert.equal(paths.core, path.join(path.resolve(root), 'core.json'));
  assert.equal(paths.settings, path.join(path.resolve(root), 'settings.json'));
  assert.equal(paths.state, path.join(path.resolve(root), 'state.json'));
  assert.equal(paths.security, path.join(path.resolve(root), 'security.json'));
  assert.equal(paths.coreTmp, path.join(path.resolve(root), 'core.json.tmp'));
  assert.equal(paths.settingsTmp, path.join(path.resolve(root), 'settings.json.tmp'));
  assert.equal(paths.stateTmp, path.join(path.resolve(root), 'state.json.tmp'));
  assert.equal(paths.securityTmp, path.join(path.resolve(root), 'security.json.tmp'));

  assert.equal(getPersistenceDocumentPath(paths, 'core'), paths.core);
  assert.equal(getPersistenceDocumentTmpPath(paths, 'security'), paths.securityTmp);
  assert.equal(getPersistenceTmpPaths(paths).some((item) => item.includes('previous')), false);
  assert.equal(Object.values(paths).some((item) => item.includes('migration')), false);
});

test('real and demo persistence documents use only their explicit StorageLayout roots', () => {
  const storageRoot = path.join('D:', 'NetraFlow');
  const realPaths = createPersistencePaths(path.join(storageRoot, 'userdata'));
  const demoPaths = createPersistencePaths(path.join(storageRoot, '.demo'));

  assert.equal(realPaths.root, path.resolve(storageRoot, 'userdata'));
  assert.equal(demoPaths.root, path.resolve(storageRoot, '.demo'));
  assert.equal(path.basename(realPaths.core), 'core.json');
  assert.equal(path.basename(demoPaths.core), 'core.json');
  assert.equal(demoPaths.root.startsWith(realPaths.root), false);
});
