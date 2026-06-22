/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { HistoryRecord } from '../../app/types';
import {
  getAccountHistoryGroupSummary,
  sortAccountHistoryRecordsByTimeAsc
} from './accountHistoryLogic';

const HISTORY_TYPE = {
  create: '\u521b\u5efa' as HistoryRecord['type'],
  modify: '\u4fee\u6539' as HistoryRecord['type'],
  restore: '\u91cd\u65b0\u542f\u7528' as HistoryRecord['type']
};

const atTime = (time: string) => `2026-06-03T${time}:00`;

const historyRecord = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: overrides.id ?? `history-${overrides.time ?? 'unknown'}`,
  accountId: 'account-1',
  type: HISTORY_TYPE.modify,
  groupName: 'Assets',
  accountName: 'Cash',
  beforeAmount: 0,
  afterAmount: 0,
  time: atTime('12:00'),
  ...overrides
});

test('summarizes a single create record with create type and original amounts', () => {
  const summary = getAccountHistoryGroupSummary([
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 0,
      afterAmount: 500,
      time: atTime('09:00')
    })
  ]);

  assert.deepEqual(summary, {
    beforeAmount: 0,
    afterAmount: 500,
    delta: 500,
    displayType: HISTORY_TYPE.create
  });
});

test('summarizes create plus modify as modify from first before to last after', () => {
  const summary = getAccountHistoryGroupSummary([
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 0,
      afterAmount: 500,
      time: atTime('09:00')
    }),
    historyRecord({
      id: 'modify',
      type: HISTORY_TYPE.modify,
      beforeAmount: 500,
      afterAmount: 600,
      time: atTime('10:00')
    })
  ]);

  assert.deepEqual(summary, {
    beforeAmount: 0,
    afterAmount: 600,
    delta: 600,
    displayType: HISTORY_TYPE.modify
  });
});

test('summarizes create plus multiple modifies as the full same-day change', () => {
  const summary = getAccountHistoryGroupSummary([
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 0,
      afterAmount: 500,
      time: atTime('09:00')
    }),
    historyRecord({
      id: 'modify-1',
      type: HISTORY_TYPE.modify,
      beforeAmount: 500,
      afterAmount: 600,
      time: atTime('10:00')
    }),
    historyRecord({
      id: 'modify-2',
      type: HISTORY_TYPE.modify,
      beforeAmount: 600,
      afterAmount: 700,
      time: atTime('11:00')
    })
  ]);

  assert.deepEqual(summary, {
    beforeAmount: 0,
    afterAmount: 700,
    delta: 700,
    displayType: HISTORY_TYPE.modify
  });
});

test('sorts same-day account group records by actual occurrence time ascending', () => {
  const records = [
    historyRecord({
      id: 'modify-2',
      type: HISTORY_TYPE.modify,
      beforeAmount: 600,
      afterAmount: 800,
      time: atTime('11:00')
    }),
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 0,
      afterAmount: 500,
      time: atTime('09:00')
    }),
    historyRecord({
      id: 'modify-3',
      type: HISTORY_TYPE.modify,
      beforeAmount: 800,
      afterAmount: 1000,
      time: atTime('12:00')
    }),
    historyRecord({
      id: 'modify-1',
      type: HISTORY_TYPE.modify,
      beforeAmount: 500,
      afterAmount: 600,
      time: atTime('10:00')
    })
  ];

  assert.deepEqual(sortAccountHistoryRecordsByTimeAsc(records).map((record) => record.id), [
    'create',
    'modify-1',
    'modify-2',
    'modify-3'
  ]);
});

test('keeps same-time account group records in their input order as fallback', () => {
  const sameTime = atTime('09:00');
  const records = [
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 0,
      afterAmount: 500,
      time: sameTime
    }),
    historyRecord({
      id: 'modify-1',
      type: HISTORY_TYPE.modify,
      beforeAmount: 500,
      afterAmount: 600,
      time: sameTime
    }),
    historyRecord({
      id: 'modify-2',
      type: HISTORY_TYPE.modify,
      beforeAmount: 600,
      afterAmount: 800,
      time: sameTime
    })
  ];

  assert.deepEqual(sortAccountHistoryRecordsByTimeAsc(records).map((record) => record.id), [
    'create',
    'modify-1',
    'modify-2'
  ]);
});

test('summarizes same-time records using input order as the stable fallback', () => {
  const sameTime = atTime('09:00');
  const summary = getAccountHistoryGroupSummary([
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 0,
      afterAmount: 500,
      time: sameTime
    }),
    historyRecord({
      id: 'modify-1',
      type: HISTORY_TYPE.modify,
      beforeAmount: 500,
      afterAmount: 600,
      time: sameTime
    }),
    historyRecord({
      id: 'modify-2',
      type: HISTORY_TYPE.modify,
      beforeAmount: 600,
      afterAmount: 800,
      time: sameTime
    })
  ]);

  assert.deepEqual(summary, {
    beforeAmount: 0,
    afterAmount: 800,
    delta: 800,
    displayType: HISTORY_TYPE.modify
  });
});

test('uses restore over create when a group has restore and create records', () => {
  const summary = getAccountHistoryGroupSummary([
    historyRecord({
      id: 'restore',
      type: HISTORY_TYPE.restore,
      beforeAmount: 100,
      afterAmount: 100,
      time: atTime('09:00')
    }),
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 100,
      afterAmount: 300,
      time: atTime('10:00')
    })
  ]);

  assert.equal(summary?.displayType, HISTORY_TYPE.restore);
  assert.equal(summary?.beforeAmount, 100);
  assert.equal(summary?.afterAmount, 300);
  assert.equal(summary?.delta, 200);
});

test('uses modify over restore when a group has restore and modify records', () => {
  const summary = getAccountHistoryGroupSummary([
    historyRecord({
      id: 'restore',
      type: HISTORY_TYPE.restore,
      beforeAmount: 200,
      afterAmount: 200,
      time: atTime('09:00')
    }),
    historyRecord({
      id: 'modify',
      type: HISTORY_TYPE.modify,
      beforeAmount: 200,
      afterAmount: 150,
      time: atTime('10:00')
    })
  ]);

  assert.equal(summary?.displayType, HISTORY_TYPE.modify);
  assert.equal(summary?.beforeAmount, 200);
  assert.equal(summary?.afterAmount, 150);
  assert.equal(summary?.delta, -50);
});

test('sorts unordered input by actual record time before summarizing', () => {
  const summary = getAccountHistoryGroupSummary([
    historyRecord({
      id: 'modify-2',
      type: HISTORY_TYPE.modify,
      beforeAmount: 600,
      afterAmount: 800,
      time: atTime('11:00')
    }),
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 0,
      afterAmount: 500,
      time: atTime('09:00')
    }),
    historyRecord({
      id: 'modify-1',
      type: HISTORY_TYPE.modify,
      beforeAmount: 500,
      afterAmount: 600,
      time: atTime('10:00')
    }),
    historyRecord({
      id: 'modify-3',
      type: HISTORY_TYPE.modify,
      beforeAmount: 800,
      afterAmount: 1000,
      time: atTime('12:00')
    })
  ]);

  assert.deepEqual(summary, {
    beforeAmount: 0,
    afterAmount: 1000,
    delta: 1000,
    displayType: HISTORY_TYPE.modify
  });
});

test('type priority affects only group display type and not record sorting', () => {
  const records = [
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 0,
      afterAmount: 500,
      time: atTime('09:00')
    }),
    historyRecord({
      id: 'restore',
      type: HISTORY_TYPE.restore,
      beforeAmount: 500,
      afterAmount: 500,
      time: atTime('10:00')
    }),
    historyRecord({
      id: 'modify',
      type: HISTORY_TYPE.modify,
      beforeAmount: 500,
      afterAmount: 600,
      time: atTime('11:00')
    })
  ];
  const summary = getAccountHistoryGroupSummary(records);

  assert.deepEqual(sortAccountHistoryRecordsByTimeAsc(records).map((record) => record.id), [
    'create',
    'restore',
    'modify'
  ]);
  assert.equal(summary?.displayType, HISTORY_TYPE.modify);
});

test('does not rewrite original per-record type or amounts', () => {
  const records = [
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 0,
      afterAmount: 500,
      time: atTime('09:00')
    }),
    historyRecord({
      id: 'modify',
      type: HISTORY_TYPE.modify,
      beforeAmount: 500,
      afterAmount: 600,
      time: atTime('10:00')
    })
  ];
  const originalRecords = records.map((record) => ({ ...record }));

  getAccountHistoryGroupSummary(records);

  assert.deepEqual(records, originalRecords);
  assert.equal(records[0]?.type, HISTORY_TYPE.create);
  assert.equal(records[0]?.beforeAmount, 0);
  assert.equal(records[0]?.afterAmount, 500);
  assert.equal(records[1]?.type, HISTORY_TYPE.modify);
  assert.equal(records[1]?.beforeAmount, 500);
  assert.equal(records[1]?.afterAmount, 600);
});
