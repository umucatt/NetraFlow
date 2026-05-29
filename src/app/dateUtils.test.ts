import assert from 'node:assert/strict';
import test from 'node:test';
import type { HistoryRecord } from './types';
import {
  compareHistoryByTimeDesc,
  createHistoryTimestampForBusinessDate,
  formatDateRangeDisplay,
  formatHistoryRecordDate,
  getCalendarDays,
  getDateRangeKeys,
  getDateWeekKey,
  getHistoryDateKey,
  getHistoryRangeTokens,
  getSelectedDayCount,
  isWithinDateRange,
  parseDateToken,
  parseHistoryRangeInput,
  toDateInputValue
} from './dateUtils';

const createHistoryRecord = (id: string, time: string): HistoryRecord => ({
  id,
  accountId: `account-${id}`,
  type: '修改',
  groupName: '现金',
  accountName: '钱包',
  beforeAmount: 0,
  afterAmount: 1,
  time
});

test('date range helpers keep natural and reverse date ranges stable', () => {
  assert.deepEqual(getDateRangeKeys('2026-03-01', '2026-03-03'), [
    '2026-03-01',
    '2026-03-02',
    '2026-03-03'
  ]);
  assert.deepEqual(getDateRangeKeys('2026-03-03', '2026-03-01'), [
    '2026-03-03',
    '2026-03-02',
    '2026-03-01'
  ]);
  assert.equal(getSelectedDayCount('2026-03-01', '2026-03-03'), 3);
  assert.equal(formatDateRangeDisplay('2026-03-01', '2026-03-03'), '2026-03-01 至 2026-03-03，共选取 3 天');
});

test('history range input parsing preserves compact and explicit-date behavior', () => {
  assert.deepEqual(parseDateToken('260325'), {
    value: '2026-03-25',
    year: 2026,
    hasExplicitYear: true
  });
  assert.equal(parseDateToken('0230'), null);
  assert.deepEqual(getHistoryRangeTokens('2026-03-25 至 2026-04-21'), ['260325', '260421']);
  assert.deepEqual(parseHistoryRangeInput('260421 260325'), {
    start: '2026-03-25',
    end: '2026-04-21'
  });
});

test('history timestamps sort descending and expose date keys', () => {
  const records = [
    createHistoryRecord('old', '2026-03-25T12:00:00.000Z'),
    createHistoryRecord('new', '2026-03-26T12:00:00.000Z')
  ];

  assert.deepEqual(records.sort(compareHistoryByTimeDesc).map((record) => record.id), ['new', 'old']);
  assert.equal(getHistoryDateKey('2026-03-25T12:00:00'), '2026-03-25');
  assert.equal(isWithinDateRange('2026-03-25T12:00:00', '2026-03-25', '2026-03-25'), true);
});

test('ordinary account history display dates hide the internal time', () => {
  const displayCases: Array<Pick<HistoryRecord, 'type' | 'time' | 'source'>> = [
    { type: '修改', time: '2026-05-12T14:52:30.000', source: undefined },
    { type: '新增', time: '2026-05-12T09:10:00.000', source: undefined },
    { type: '归档', time: '2026-05-12T17:20:00.000', source: undefined },
    { type: '删除', time: '2026-05-12T17:25:00.000', source: undefined },
    { type: '重新启用', time: '2026-05-12T18:34:00.000', source: undefined },
    { type: '修改', time: '2026-05-12T18:34:20.000', source: 'flash-note' },
    { type: '修改', time: '2026-05-12T18:35:20.000', source: 'rollup' }
  ];

  displayCases.forEach((record) => {
    const label = formatHistoryRecordDate(record.time);

    assert.equal(label, '2026-05-12');
    assert.doesNotMatch(label, /\d{1,2}:\d{2}/);
  });
});

test('flash history timestamps keep business dates and actual write times', () => {
  const writeTime = new Date(2026, 4, 29, 18, 34, 20, 321);
  const timestamp = createHistoryTimestampForBusinessDate('2026-05-12', writeTime);
  const date = new Date(timestamp);

  assert.equal(formatHistoryRecordDate(timestamp), '2026-05-12');
  assert.equal(date.getHours(), 18);
  assert.equal(date.getMinutes(), 34);
  assert.equal(date.getSeconds(), 20);
  assert.notEqual(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`, '12:00');
});

test('flash history timestamps use internal time for same-day ordering', () => {
  const earlier = createHistoryRecord(
    'earlier',
    createHistoryTimestampForBusinessDate('2026-05-12', new Date(2026, 4, 29, 18, 34, 20, 0))
  );
  const later = createHistoryRecord(
    'later',
    createHistoryTimestampForBusinessDate('2026-05-12', new Date(2026, 4, 29, 18, 35, 20, 0))
  );
  const sameA = createHistoryRecord(
    'same-a',
    createHistoryTimestampForBusinessDate('2026-05-12', new Date(2026, 4, 29, 18, 36, 20, 0))
  );
  const sameB = createHistoryRecord('same-b', sameA.time);

  assert.deepEqual([earlier, later].sort(compareHistoryByTimeDesc).map((record) => record.id), [
    'later',
    'earlier'
  ]);
  assert.deepEqual([sameA, sameB].sort(compareHistoryByTimeDesc).map((record) => record.id), [
    'same-a',
    'same-b'
  ]);
});

test('calendar helper builds a fixed six-week Monday-first grid', () => {
  const dates = getCalendarDays(new Date(2026, 2, 1)).map(toDateInputValue);

  assert.equal(dates.length, 42);
  assert.equal(dates[0], '2026-02-23');
  assert.equal(dates[dates.length - 1], '2026-04-05');
  assert.equal(getDateWeekKey('2026-03-25'), '2026-03-23');
});
