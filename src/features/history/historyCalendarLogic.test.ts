import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getHistoryRecordDensityLevel,
  getHistoryCalendarDateState,
  getVisibleHistoryCalendarSecondMonth,
  isFutureHistoryCalendarDate,
  isHistoryCalendarNextDisabled,
  selectHistoryCalendarDate,
  shiftHistoryCalendarVisibleMonths
} from './historyCalendarLogic';
import { createEmptyHistoryFilterState } from './historyFilterLogic';

const referenceDate = new Date(2026, 5, 5, 10, 0, 0);

const getMonthKey = (date: Date | null) =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : '';

test('history calendar disables future dates and current lead month navigation', () => {
  assert.equal(isFutureHistoryCalendarDate('2026-06-06', referenceDate), true);
  assert.equal(isFutureHistoryCalendarDate('2026-06-05', referenceDate), false);
  assert.equal(isHistoryCalendarNextDisabled(new Date(2026, 4, 1), referenceDate), true);
  assert.equal(isHistoryCalendarNextDisabled(new Date(2026, 3, 1), referenceDate), false);
});

test('history calendar date state marks boundaries, inside range, and record counts', () => {
  const monthDate = new Date(2026, 5, 1);
  const boundary = getHistoryCalendarDateState({
    date: new Date(2026, 5, 1),
    monthDate,
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    dateCounts: { '2026-06-01': 2, '2026-06-02': 1 },
    referenceDate
  });
  const inside = getHistoryCalendarDateState({
    date: new Date(2026, 5, 2),
    monthDate,
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    dateCounts: { '2026-06-01': 2, '2026-06-02': 1 },
    referenceDate
  });

  assert.equal(boundary.isBoundary, true);
  assert.equal(boundary.recordCount, 2);
  assert.equal(boundary.recordDensityLevel, 'medium-low');
  assert.equal(inside.isInsideRange, true);
  assert.equal(inside.recordCount, 1);
  assert.equal(inside.recordDensityLevel, 'low');
});

test('history calendar density levels use fixed quantity buckets', () => {
  assert.equal(getHistoryRecordDensityLevel(0), 'none');
  assert.equal(getHistoryRecordDensityLevel(1), 'low');
  assert.equal(getHistoryRecordDensityLevel(3), 'medium-low');
  assert.equal(getHistoryRecordDensityLevel(7), 'medium-high');
  assert.equal(getHistoryRecordDensityLevel(8), 'full');
});

test('history calendar selection builds a two-click range without selecting future dates or jumping on first click', () => {
  const initialState = createEmptyHistoryFilterState(referenceDate);
  const firstSelection = selectHistoryCalendarDate(
    initialState,
    new Date(2026, 5, 2),
    referenceDate,
    new Date(2026, 5, 1)
  );
  const rangeSelection = selectHistoryCalendarDate(
    firstSelection,
    new Date(2026, 4, 30),
    referenceDate
  );
  const futureSelection = selectHistoryCalendarDate(
    rangeSelection,
    new Date(2026, 5, 6),
    referenceDate
  );

  assert.equal(firstSelection.startDate, '2026-06-02');
  assert.equal(firstSelection.endDate, '');
  assert.equal(getMonthKey(firstSelection.calendarMonth), '2026-05');
  assert.equal(rangeSelection.startDate, '2026-05-30');
  assert.equal(rangeSelection.endDate, '2026-06-02');
  assert.deepEqual(futureSelection, rangeSelection);
});

test('history calendar keeps the first clicked date while browsing before range completion', () => {
  const firstSelection = selectHistoryCalendarDate(
    createEmptyHistoryFilterState(referenceDate),
    new Date(2026, 3, 5),
    referenceDate,
    new Date(2026, 4, 1)
  );
  const browsedState = shiftHistoryCalendarVisibleMonths(firstSelection, -1);
  const rangeSelection = selectHistoryCalendarDate(
    browsedState,
    new Date(2026, 5, 1),
    referenceDate,
    new Date(2026, 5, 1)
  );

  assert.equal(browsedState.startDate, '2026-04-05');
  assert.equal(browsedState.endDate, '');
  assert.equal(rangeSelection.startDate, '2026-04-05');
  assert.equal(rangeSelection.endDate, '2026-06-01');
  assert.equal(getMonthKey(rangeSelection.calendarMonth), '2026-04');
  assert.equal(getMonthKey(rangeSelection.calendarSecondMonth), '2026-06');
});

test('history calendar navigation exits non-adjacent display while keeping the selected range', () => {
  const firstSelection = selectHistoryCalendarDate(
    createEmptyHistoryFilterState(referenceDate),
    new Date(2026, 3, 5),
    referenceDate,
    new Date(2026, 3, 1)
  );
  const nonAdjacentSelection = selectHistoryCalendarDate(
    firstSelection,
    new Date(2026, 5, 1),
    referenceDate,
    new Date(2026, 5, 1)
  );
  const shiftedState = shiftHistoryCalendarVisibleMonths(nonAdjacentSelection, 1);

  assert.equal(getMonthKey(nonAdjacentSelection.calendarMonth), '2026-04');
  assert.equal(getMonthKey(nonAdjacentSelection.calendarSecondMonth), '2026-06');
  assert.equal(shiftedState.startDate, '2026-04-05');
  assert.equal(shiftedState.endDate, '2026-06-01');
  assert.equal(getMonthKey(shiftedState.calendarMonth), '2026-05');
  assert.equal(getMonthKey(getVisibleHistoryCalendarSecondMonth(shiftedState)), '2026-06');
  assert.equal(shiftedState.calendarSecondMonth, null);
});

test('history calendar resets a completed selection to a new first date', () => {
  const completedState = selectHistoryCalendarDate(
    selectHistoryCalendarDate(
      createEmptyHistoryFilterState(referenceDate),
      new Date(2026, 4, 30),
      referenceDate,
      new Date(2026, 4, 1)
    ),
    new Date(2026, 5, 2),
    referenceDate,
    new Date(2026, 5, 1)
  );
  const nextDraftState = selectHistoryCalendarDate(
    completedState,
    new Date(2026, 5, 4),
    referenceDate,
    new Date(2026, 5, 1)
  );

  assert.equal(completedState.startDate, '2026-05-30');
  assert.equal(completedState.endDate, '2026-06-02');
  assert.equal(nextDraftState.startDate, '2026-06-04');
  assert.equal(nextDraftState.endDate, '');
  assert.equal(getMonthKey(nextDraftState.calendarMonth), '2026-05');
});
