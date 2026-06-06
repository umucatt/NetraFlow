/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSearchTargetElementId,
  getSearchTargetHighlightIds
} from '../searchHighlightLogic';
import {
  createAccountSearchTarget,
  createHistorySearchTarget,
  createSnapshotSearchTarget
} from '../searchNavigation';

test('derives history highlight targets from search navigation targets', () => {
  assert.deepEqual(getSearchTargetHighlightIds(createHistorySearchTarget('history-a')), {
    historyRecordId: 'history-a',
    backupRecordId: ''
  });
  assert.equal(getSearchTargetElementId('historyRecordId', 'history-a'), 'history-record-history-a');
});

test('derives snapshot highlight targets from search navigation targets', () => {
  assert.deepEqual(getSearchTargetHighlightIds(createSnapshotSearchTarget('backup-a')), {
    historyRecordId: '',
    backupRecordId: 'backup-a'
  });
  assert.equal(getSearchTargetElementId('backupRecordId', 'backup-a'), 'backup-record-backup-a');
});

test('non-scrollable search targets clear highlight ids safely', () => {
  assert.deepEqual(getSearchTargetHighlightIds(createAccountSearchTarget('group-a', 'account-a')), {
    historyRecordId: '',
    backupRecordId: ''
  });
  assert.equal(getSearchTargetElementId('historyRecordId', ''), '');
});
