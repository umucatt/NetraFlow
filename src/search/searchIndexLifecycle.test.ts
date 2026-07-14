import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasSearchRevisionIdentityChanged,
  shouldBuildSearchRevision,
  type SearchRevisionIdentity
} from './searchIndexLifecycle';

const groups: unknown[] = [];
const historyRecords: unknown[] = [];
const backupRecords: unknown[] = [];
const config = {};
const settingsItems: unknown[] = [];
const identity: SearchRevisionIdentity = {
  groups,
  historyRecords,
  backupRecords,
  config,
  settingsItems
};

test('search revision changes only when searchable data or stable configuration identity changes', () => {
  assert.equal(hasSearchRevisionIdentityChanged(identity, { ...identity }), false);
  assert.equal(
    hasSearchRevisionIdentityChanged(identity, { ...identity, historyRecords: [] }),
    true
  );
  assert.equal(hasSearchRevisionIdentityChanged(identity, { ...identity, config: {} }), true);
});

test('first revision builds while ready or already-building revisions are reused', () => {
  assert.equal(shouldBuildSearchRevision(1, 0, 0), true);
  assert.equal(shouldBuildSearchRevision(1, 1, 0), false);
  assert.equal(shouldBuildSearchRevision(1, 0, 1), false);
  assert.equal(shouldBuildSearchRevision(2, 1, 0), true);
});
