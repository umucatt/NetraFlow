import assert from 'node:assert/strict';
import test from 'node:test';
import type { HistoryRecord } from '../../app/types';
import {
  createAccountHistoryRecordListProps,
  createHistoryRecordListProps,
  getAccountHistoryRecordListGroupSummary,
  prepareAccountHistoryDisplayRecords,
  prepareAccountHistorySummaryRecords
} from './historyGroupLogic';

const HISTORY_TYPE = {
  create: '\u521b\u5efa' as HistoryRecord['type'],
  modify: '\u4fee\u6539' as HistoryRecord['type'],
  restore: '\u91cd\u65b0\u542f\u7528' as HistoryRecord['type']
};

const historyRecord = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: overrides.id ?? 'history-record',
  accountId: 'account-1',
  type: HISTORY_TYPE.modify,
  groupName: 'Assets',
  accountName: 'Cash',
  beforeAmount: 0,
  afterAmount: 0,
  time: '2026-06-03T12:00:00',
  ...overrides
});

const records = [
  historyRecord({
    id: 'create',
    type: HISTORY_TYPE.create,
    beforeAmount: 0,
    afterAmount: 500,
    time: '2026-06-03T09:00:00'
  }),
  historyRecord({
    id: 'modify-1',
    beforeAmount: 500,
    afterAmount: 600,
    time: '2026-06-03T10:00:00'
  }),
  historyRecord({
    id: 'modify-2',
    beforeAmount: 600,
    afterAmount: 800,
    time: '2026-06-03T11:00:00'
  }),
  historyRecord({
    id: 'modify-3',
    beforeAmount: 800,
    afterAmount: 850,
    time: '2026-06-03T12:00:00'
  })
];

test('account history summary uses time ascending while expanded display uses time descending', () => {
  const displayRecords = prepareAccountHistoryDisplayRecords(records);
  const summaryRecords = prepareAccountHistorySummaryRecords(displayRecords);
  const summary = getAccountHistoryRecordListGroupSummary(summaryRecords);

  assert.deepEqual(displayRecords.map((record) => record.id), [
    'modify-3',
    'modify-2',
    'modify-1',
    'create'
  ]);
  assert.deepEqual(summaryRecords.map((record) => record.id), [
    'create',
    'modify-1',
    'modify-2',
    'modify-3'
  ]);
  assert.deepEqual(summary, {
    beforeAmount: 0,
    afterAmount: 850,
    displayType: HISTORY_TYPE.modify
  });
});

test('account history list props keep summary and display record ordering independent', () => {
  const baseProps = createHistoryRecordListProps<HistoryRecord>({
    getTypeLabel: (type) => type,
    getTone: () => ({
      background: '',
      border: '',
      emphasisBorder: '',
      divider: '',
      nestedBackground: '',
      text: '',
      labelBackground: ''
    }),
    getAmountChange: () => ({
      label: '0',
      color: '',
      background: '',
      kind: 'neutral'
    }),
    formatAmount: (amount) => `${amount ?? 0}`,
    formatShortTime: (time) => time,
    renderFlashSourceIcon: () => null
  });
  const accountProps = createAccountHistoryRecordListProps(baseProps);
  const displayRecords = accountProps.getGroupDisplayRecords?.(records) ?? [];
  const summaryRecords = accountProps.getGroupSummaryRecords?.(displayRecords) ?? [];
  const summary = accountProps.getGroupSummary?.(summaryRecords);

  assert.deepEqual(displayRecords.map((record) => record.id), [
    'modify-3',
    'modify-2',
    'modify-1',
    'create'
  ]);
  assert.deepEqual(summaryRecords.map((record) => record.id), [
    'create',
    'modify-1',
    'modify-2',
    'modify-3'
  ]);
  assert.equal(summary?.beforeAmount, 0);
  assert.equal(summary?.afterAmount, 850);
});

test('type priority still prefers modify over restore over create for group badge only', () => {
  const summary = getAccountHistoryRecordListGroupSummary([
    historyRecord({
      id: 'create',
      type: HISTORY_TYPE.create,
      beforeAmount: 0,
      afterAmount: 500,
      time: '2026-06-03T09:00:00'
    }),
    historyRecord({
      id: 'restore',
      type: HISTORY_TYPE.restore,
      beforeAmount: 500,
      afterAmount: 500,
      time: '2026-06-03T10:00:00'
    }),
    historyRecord({
      id: 'modify',
      type: HISTORY_TYPE.modify,
      beforeAmount: 500,
      afterAmount: 600,
      time: '2026-06-03T11:00:00'
    })
  ]);

  assert.equal(summary?.displayType, HISTORY_TYPE.modify);
});
