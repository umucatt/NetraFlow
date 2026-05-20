/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendFlashInputCharacter,
  backspaceFlashInputValue,
  getFlashDirectionFromDates,
  formatFlashWeekDateLabel,
  getContinuousFlashDates,
  getFlashRangeExcludedDates,
  resolveFlashUndoStep
} from './flashNoteUtils';
import type { FlashCell } from './flashNoteTypes';

const cell = (date: string, value = ''): FlashCell => ({
  date,
  value,
  enabled: true,
  original: true,
  missing: false,
  pendingDelete: false
});

test('flash week date label shows month only for the first visible date and month starts', () => {
  assert.equal(formatFlashWeekDateLabel('2026-09-30', true), '9/30');
  assert.equal(formatFlashWeekDateLabel('2026-10-01', false), '10/1');
  assert.equal(formatFlashWeekDateLabel('2026-10-02', false), '2');
});

test('continuous flash dates can continue without an end date', () => {
  assert.deepEqual(
    getContinuousFlashDates({
      startDate: '2026-05-10',
      direction: 'forward',
      minimumCount: 3
    }),
    ['2026-05-10', '2026-05-11', '2026-05-12']
  );
  assert.deepEqual(
    getContinuousFlashDates({
      startDate: '2026-05-10',
      direction: 'backward',
      minimumCount: 3
    }),
    ['2026-05-10', '2026-05-09', '2026-05-08']
  );
});

test('flash direction is derived from start and end dates', () => {
  assert.equal(getFlashDirectionFromDates('2026-05-10', ''), 'forward');
  assert.equal(getFlashDirectionFromDates('2026-05-10', '2026-05-12'), 'forward');
  assert.equal(getFlashDirectionFromDates('2026-05-10', '2026-05-08'), 'backward');
});

test('flash range excluded dates only apply to filtered bounded ranges', () => {
  const selectedDates = new Set(['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17']);

  assert.deepEqual(
    getFlashRangeExcludedDates({
      activeDateRule: 'weekday',
      endDate: '2026-04-19',
      selectedDates,
      startDate: '2026-04-11'
    }),
    ['2026-04-11', '2026-04-12', '2026-04-18', '2026-04-19']
  );

  assert.deepEqual(
    getFlashRangeExcludedDates({
      activeDateRule: null,
      endDate: '2026-04-19',
      selectedDates,
      startDate: '2026-04-11'
    }),
    []
  );

  assert.deepEqual(
    getFlashRangeExcludedDates({
      activeDateRule: 'weekday',
      endDate: '',
      selectedDates,
      startDate: '2026-04-11'
    }),
    []
  );
});

test('flash amount keyboard helpers handle signs and backspace', () => {
  assert.equal(appendFlashInputCharacter('', '1'), '1');
  assert.equal(appendFlashInputCharacter('1', '2'), '12');
  assert.equal(appendFlashInputCharacter('12', '-'), '-12');
  assert.equal(appendFlashInputCharacter('-12', '+'), '12');
  assert.equal(backspaceFlashInputValue('12.3'), '12.');
});

test('ctrl z clears current value and moves to previous date', () => {
  const trackDates = ['2026-05-10', '2026-05-11', '2026-05-12'];
  const cells = {
    '2026-05-10': cell('2026-05-10', '1'),
    '2026-05-11': cell('2026-05-11', '2')
  };

  assert.deepEqual(
    resolveFlashUndoStep({
      cells,
      currentDate: '2026-05-11',
      currentIndex: 1,
      currentInput: '2',
      trackDates
    }),
    { clearDate: '2026-05-11', nextIndex: 0 }
  );
  assert.deepEqual(
    resolveFlashUndoStep({
      cells,
      currentDate: '2026-05-12',
      currentIndex: 2,
      currentInput: '',
      trackDates
    }),
    { clearDate: '2026-05-11', nextIndex: 1 }
  );
});
