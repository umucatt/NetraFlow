/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAccountOperationCalendarMonth,
  isFutureAccountOperationDateValue,
  parseAccountOperationDateInput,
  resolveProtectedAccountOperationDateInputState,
  resolveAccountOperationDateInputState,
  shiftAccountOperationCalendarMonth,
  toAccountOperationIsoTime
} from '../accountOperationDate';

test('parses compact account operation dates with current or short years', () => {
  assert.equal(parseAccountOperationDateInput('0328', 2026), '2026-03-28');
  assert.equal(parseAccountOperationDateInput('250207', 2026), '2025-02-07');
});

test('parses dotted and dashed single dates', () => {
  assert.equal(parseAccountOperationDateInput('03-28', 2026), '2026-03-28');
  assert.equal(parseAccountOperationDateInput('3.28', 2026), '2026-03-28');
  assert.equal(parseAccountOperationDateInput('25.02.07', 2026), '2025-02-07');
  assert.equal(parseAccountOperationDateInput('2025-02-07', 2026), '2025-02-07');
  assert.equal(parseAccountOperationDateInput('2025.02.07', 2026), '2025-02-07');
});

test('rejects account operation date input without explicit month and day', () => {
  assert.equal(parseAccountOperationDateInput('28', 2026), null);
  assert.equal(parseAccountOperationDateInput('3', 2026), null);
  assert.equal(parseAccountOperationDateInput('2026', 2026), null);
});

test('rejects ranges and invalid calendar dates', () => {
  assert.equal(parseAccountOperationDateInput('05.01-05.06', 2026), null);
  assert.equal(parseAccountOperationDateInput('2026-02-30', 2026), null);
});

test('creates a date-only account operation timestamp at local noon', () => {
  assert.match(toAccountOperationIsoTime('2026-05-06'), /^2026-05-06T|^2026-05-05T/);
});

test('moves account operation calendar month by one month', () => {
  const may = getAccountOperationCalendarMonth('2026-05-06');

  assert.equal(shiftAccountOperationCalendarMonth(may, -1).getFullYear(), 2026);
  assert.equal(shiftAccountOperationCalendarMonth(may, -1).getMonth(), 3);
  assert.equal(shiftAccountOperationCalendarMonth(may, 1).getFullYear(), 2026);
  assert.equal(shiftAccountOperationCalendarMonth(may, 1).getMonth(), 5);
});

test('syncs valid account operation date input to selected day and visible month', () => {
  const currentMonth = getAccountOperationCalendarMonth('2026-05-06');
  const nextState = resolveAccountOperationDateInputState('0328', currentMonth, 2026);

  assert.equal(nextState.parsedDate, '2026-03-28');
  assert.equal(nextState.selectedDate, '2026-03-28');
  assert.equal(nextState.visibleMonth.getFullYear(), 2026);
  assert.equal(nextState.visibleMonth.getMonth(), 2);
});

test('keeps visible month unchanged when account operation date input is invalid', () => {
  const currentMonth = getAccountOperationCalendarMonth('2026-05-06');
  const nextState = resolveAccountOperationDateInputState('05.01-05.06', currentMonth, 2026);

  assert.equal(nextState.parsedDate, null);
  assert.equal(nextState.selectedDate, null);
  assert.equal(nextState.visibleMonth, currentMonth);
});

test('detects future account operation dates without treating today as future', () => {
  assert.equal(isFutureAccountOperationDateValue('2026-05-07', '2026-05-06'), true);
  assert.equal(isFutureAccountOperationDateValue('2026-05-06', '2026-05-06'), false);
});

test('protects account operation date input from future dates', () => {
  const currentMonth = getAccountOperationCalendarMonth('2026-05-06');
  const nextState = resolveProtectedAccountOperationDateInputState(
    '2026-05-07',
    currentMonth,
    '2026-05-06',
    2026
  );

  assert.equal(nextState.isFutureDate, true);
  assert.equal(nextState.parsedDate, '2026-05-06');
  assert.equal(nextState.selectedDate, '2026-05-06');
  assert.equal(nextState.visibleMonth.getMonth(), 4);
});
