import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import {
  createPersistencePaths,
  getPersistenceDocumentPath,
  getPersistenceDocumentTmpPath,
  getPersistenceTmpPaths,
  resolveDemoPersistenceRoot,
  resolvePersistenceRoot,
  resolveRealPersistenceRoot
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

test('real persistence root defaults to exe directory userdata', () => {
  const exePath = path.join('C:', 'Program Files', 'NetraFlow', 'NetraFlow.exe');

  assert.equal(
    resolveRealPersistenceRoot(exePath),
    path.join(path.dirname(exePath), 'userdata')
  );
});

test('demo persistence root defaults to exe directory hidden demo folder', () => {
  const exePath = path.join('C:', 'Program Files', 'NetraFlow', 'NetraFlow.exe');

  assert.equal(
    resolveDemoPersistenceRoot(exePath),
    path.join(path.dirname(exePath), '.demo')
  );
  assert.equal(resolvePersistenceRoot('real', exePath), resolveRealPersistenceRoot(exePath));
  assert.equal(resolvePersistenceRoot('demo', exePath), resolveDemoPersistenceRoot(exePath));
  assert.equal(
    resolveDemoPersistenceRoot(exePath).startsWith(resolveRealPersistenceRoot(exePath)),
    false
  );
});
