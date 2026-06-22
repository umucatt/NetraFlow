/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('rollup import writes hash only after latest-core commit succeeds', () => {
  const source = readFileSync('src/features/rollupImport/useRollupImportController.ts', 'utf8');
  const commitIndex = source.indexOf('const result = commitAppDataUpdate');
  const hashIndex = source.indexOf('if (importHash)');
  const hashBlock = source.slice(hashIndex, source.indexOf('closeSession();', hashIndex));

  assert.notEqual(commitIndex, -1);
  assert.notEqual(hashIndex, -1);
  assert.equal(commitIndex < hashIndex, true);
  assert.equal(hashBlock.includes('persistImportedHashes(nextHashes);'), true);
  assert.equal(hashBlock.includes('setImportedHashes(nextHashes);'), true);
  assert.equal(
    hashBlock.indexOf('persistImportedHashes(nextHashes);') <
      hashBlock.indexOf('setImportedHashes(nextHashes);'),
    true
  );
  assert.equal(hashBlock.includes('commitAppDataUpdate'), false);
  assert.equal(hashBlock.includes('!isExampleMode'), false);
});
