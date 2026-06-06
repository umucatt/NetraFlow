import assert from 'node:assert/strict';
import test from 'node:test';
import type { HistoryRecord } from '../../app/types';
import {
  applyHistoryRangeInput,
  clearHistoryFilterState,
  confirmSingleHistoryDateInput,
  createEmptyHistoryFilterState,
  createRecent7HistoryFilterState,
  filterHistoryRecordsByDate,
  getHistoryFilterStatus,
  getLastWeekHistoryRange,
  getRecent7HistoryRange
} from './historyFilterLogic';

const referenceDate = new Date(2026, 5, 5, 10, 0, 0);

const getMonthKey = (date: Date | null) =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : '';

const historyRecord = (id: string, time: string): HistoryRecord => ({
  id,
  accountId: 'account-1',
  type: '\u4fee\u6539',
  groupName: 'Assets',
  accountName: 'Cash',
  beforeAmount: 0,
  afterAmount: 1,
  time
});

test('history date range input filters records inclusively', () => {
  const state = applyHistoryRangeInput(
    createEmptyHistoryFilterState(referenceDate),
    '260601 260603',
    referenceDate
  );
  const records = [
    historyRecord('before', '2026-05-31T23:59:59'),
    historyRecord('start', '2026-06-01T00:00:00'),
    historyRecord('middle', '2026-06-02T12:00:00'),
    historyRecord('end', '2026-06-03T23:59:59'),
    historyRecord('after', '2026-06-04T00:00:00')
  ];

  assert.equal(state.startDate, '2026-06-01');
  assert.equal(state.endDate, '2026-06-03');
  assert.deepEqual(
    filterHistoryRecordsByDate(records, {
      start: state.startDate,
      end: state.endDate
    }).map((record) => record.id),
    ['start', 'middle', 'end']
  );
});

test('last week and recent seven day quick ranges are derived from the reference date', () => {
  assert.deepEqual(getLastWeekHistoryRange(referenceDate), {
    start: '2026-05-25',
    end: '2026-05-31'
  });
  assert.deepEqual(getRecent7HistoryRange(referenceDate), {
    start: '2026-05-30',
    end: '2026-06-05'
  });
});

test('single date confirmation and clear filter keep range state explicit', () => {
  const draftState = applyHistoryRangeInput(
    createEmptyHistoryFilterState(referenceDate),
    '0601',
    referenceDate
  );
  const confirmedState = confirmSingleHistoryDateInput(draftState, referenceDate);
  const clearedState = clearHistoryFilterState(referenceDate);
  const fallbackStatus = getHistoryFilterStatus(clearedState, referenceDate);

  assert.equal(draftState.startDate, '2026-06-01');
  assert.equal(draftState.endDate, '');
  assert.equal(confirmedState.startDate, '2026-06-01');
  assert.equal(confirmedState.endDate, '2026-06-01');
  assert.equal(clearedState.startDate, '');
  assert.equal(clearedState.endDate, '');
  assert.equal(fallbackStatus.hasDateFilter, false);
  assert.equal(fallbackStatus.effectiveStartDate, '2026-05-30');
  assert.equal(fallbackStatus.effectiveEndDate, '2026-06-05');
});

test('recent seven day filter state formats the derived range', () => {
  const state = createRecent7HistoryFilterState(referenceDate);

  assert.equal(state.startDate, '2026-05-30');
  assert.equal(state.endDate, '2026-06-05');
  assert.equal(state.rangeInput.includes('2026-05-30'), true);
  assert.equal(state.rangeInput.includes('2026-06-05'), true);
});

test('history range input rejects a first future date without clamping it to today', () => {
  const state = applyHistoryRangeInput(
    createEmptyHistoryFilterState(referenceDate),
    '260616',
    referenceDate
  );

  assert.equal(state.startDate, '');
  assert.equal(state.endDate, '');
  assert.equal(state.rangeInput, '');
  assert.equal(state.rangeInputNotice, 'future-date');
  assert.equal(getMonthKey(state.calendarMonth), '2026-05');
});

test('history range input clamps only the second future date to today', () => {
  const state = applyHistoryRangeInput(
    createEmptyHistoryFilterState(referenceDate),
    '260501 260616',
    referenceDate
  );

  assert.equal(state.startDate, '2026-05-01');
  assert.equal(state.endDate, '2026-06-05');
  assert.equal(state.rangeInputNotice, '');
  assert.equal(getMonthKey(state.calendarMonth), '2026-05');
  assert.equal(state.calendarSecondMonth, null);
});

test('history range input normalizes reversed ranges and non-adjacent month display', () => {
  const reversedState = applyHistoryRangeInput(
    createEmptyHistoryFilterState(referenceDate),
    '260512 260501',
    referenceDate
  );
  const nonAdjacentState = applyHistoryRangeInput(
    createEmptyHistoryFilterState(referenceDate),
    '260405 20260601',
    referenceDate
  );

  assert.equal(reversedState.startDate, '2026-05-01');
  assert.equal(reversedState.endDate, '2026-05-12');
  assert.equal(getMonthKey(reversedState.calendarMonth), '2026-05');
  assert.equal(reversedState.calendarSecondMonth, null);
  assert.equal(nonAdjacentState.startDate, '2026-04-05');
  assert.equal(nonAdjacentState.endDate, '2026-06-01');
  assert.equal(getMonthKey(nonAdjacentState.calendarMonth), '2026-04');
  assert.equal(getMonthKey(nonAdjacentState.calendarSecondMonth), '2026-06');
});

test('history range input treats two future dates as a first future date rejection', () => {
  const state = applyHistoryRangeInput(
    createEmptyHistoryFilterState(referenceDate),
    '260616 260617',
    referenceDate
  );

  assert.equal(state.startDate, '');
  assert.equal(state.endDate, '');
  assert.equal(state.rangeInput, '');
  assert.equal(state.rangeInputNotice, 'future-date');
});

test('single future date confirmation clears the draft and shows notice', () => {
  const draftState = {
    ...createEmptyHistoryFilterState(referenceDate),
    rangeInput: '260616'
  };
  const state = confirmSingleHistoryDateInput(draftState, referenceDate);

  assert.equal(state.startDate, '');
  assert.equal(state.endDate, '');
  assert.equal(state.rangeInput, '');
  assert.equal(state.rangeInputNotice, 'future-date');
});
