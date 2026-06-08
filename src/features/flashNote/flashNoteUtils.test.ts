/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  appendFlashInputCharacter,
  backspaceFlashInputValue,
  getFlashDirectionFromDates,
  formatFlashWeekDateLabel,
  getContinuousFlashDates,
  getFlashRangeExcludedDates,
  resolveFlashConfirmNavigationDate,
  resolveFlashCellValueUpdate,
  resolveFlashSelectionBounds,
  resolveFlashSelectionDates,
  resolveFlashUndoStep,
  sortFlashDatesByDirection
} from './flashNoteUtils';
import { resolveFlashKeyboardAction } from './useFlashKeyboardInput';
import type { FlashCell } from './flashNoteTypes';

const readSourceFile = (path: string) =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf8');

const cell = (date: string, value = ''): FlashCell => ({
  date,
  value,
  enabled: true,
  original: true,
  missing: false
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

test('flash selection tools resolve replace, intersect, union, and subtract behavior', () => {
  const selectedDates = ['2026-05-10', '2026-05-11'];
  const candidateDates = ['2026-05-11', '2026-05-12', '2026-05-12', '2099-01-01'];
  const isDateDisabled = (dateValue: string) => dateValue === '2099-01-01';

  assert.deepEqual(
    resolveFlashSelectionDates({
      candidateDates,
      isDateDisabled,
      mode: 'replace',
      selectedDates
    }),
    ['2026-05-11', '2026-05-12']
  );
  assert.deepEqual(
    resolveFlashSelectionDates({
      candidateDates,
      isDateDisabled,
      mode: 'intersect',
      selectedDates
    }),
    ['2026-05-11']
  );
  assert.deepEqual(
    resolveFlashSelectionDates({
      candidateDates,
      isDateDisabled,
      mode: 'union',
      selectedDates
    }),
    ['2026-05-10', '2026-05-11', '2026-05-12']
  );
  assert.deepEqual(
    resolveFlashSelectionDates({
      candidateDates,
      isDateDisabled,
      mode: 'subtract',
      selectedDates
    }),
    ['2026-05-10']
  );
});

test('flash union expands selection without changing start or end anchors', () => {
  const selectedDates = [
    '2026-05-08',
    '2026-05-09',
    '2026-05-10',
    '2026-05-11',
    '2026-05-12',
    '2026-05-13',
    '2026-05-14',
    '2026-05-15',
    '2026-05-16',
    '2026-05-17'
  ];

  const pointSelection = resolveFlashSelectionDates({
    candidateDates: ['2026-05-18'],
    isDateDisabled: () => false,
    mode: 'union',
    selectedDates
  });

  assert.deepEqual(pointSelection, [
    '2026-05-08',
    '2026-05-09',
    '2026-05-10',
    '2026-05-11',
    '2026-05-12',
    '2026-05-13',
    '2026-05-14',
    '2026-05-15',
    '2026-05-16',
    '2026-05-17',
    '2026-05-18'
  ]);
  assert.deepEqual(
    resolveFlashSelectionBounds({
      currentEndDate: '2026-05-17',
      currentStartDate: '2026-05-08',
      mode: 'union',
      nextDates: pointSelection,
      requestedEndDate: '2026-05-18',
      requestedStartDate: '2026-05-18'
    }),
    { startDate: '2026-05-08', endDate: '2026-05-17' }
  );
  assert.deepEqual(sortFlashDatesByDirection(pointSelection, 'forward'), [
    '2026-05-08',
    '2026-05-09',
    '2026-05-10',
    '2026-05-11',
    '2026-05-12',
    '2026-05-13',
    '2026-05-14',
    '2026-05-15',
    '2026-05-16',
    '2026-05-17',
    '2026-05-18'
  ]);

  const dragSelection = resolveFlashSelectionDates({
    candidateDates: ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21'],
    isDateDisabled: () => false,
    mode: 'union',
    selectedDates
  });

  assert.deepEqual(dragSelection, [
    '2026-05-08',
    '2026-05-09',
    '2026-05-10',
    '2026-05-11',
    '2026-05-12',
    '2026-05-13',
    '2026-05-14',
    '2026-05-15',
    '2026-05-16',
    '2026-05-17',
    '2026-05-18',
    '2026-05-19',
    '2026-05-20',
    '2026-05-21'
  ]);
  assert.deepEqual(
    resolveFlashSelectionBounds({
      currentEndDate: '2026-05-17',
      currentStartDate: '2026-05-08',
      mode: 'union',
      nextDates: dragSelection,
      requestedEndDate: '2026-05-21',
      requestedStartDate: '2026-05-18'
    }),
    { startDate: '2026-05-08', endDate: '2026-05-17' }
  );
  assert.deepEqual(sortFlashDatesByDirection(dragSelection, 'forward'), [
    '2026-05-08',
    '2026-05-09',
    '2026-05-10',
    '2026-05-11',
    '2026-05-12',
    '2026-05-13',
    '2026-05-14',
    '2026-05-15',
    '2026-05-16',
    '2026-05-17',
    '2026-05-18',
    '2026-05-19',
    '2026-05-20',
    '2026-05-21'
  ]);
  assert.deepEqual(
    resolveFlashSelectionBounds({
      currentEndDate: '',
      currentStartDate: '',
      mode: 'union',
      nextDates: ['2026-05-18'],
      requestedEndDate: '2026-05-18',
      requestedStartDate: '2026-05-18'
    }),
    { startDate: '', endDate: '' }
  );
});

test('flash subtract and date rules preserve anchors while the input sequence uses selected dates only', () => {
  const selectedDates = [
    '2026-05-08',
    '2026-05-09',
    '2026-05-10',
    '2026-05-11',
    '2026-05-12',
    '2026-05-13',
    '2026-05-14',
    '2026-05-15',
    '2026-05-16',
    '2026-05-17'
  ];
  const removedMiddle = resolveFlashSelectionDates({
    candidateDates: ['2026-05-12', '2026-05-13'],
    isDateDisabled: () => false,
    mode: 'subtract',
    selectedDates
  });

  assert.deepEqual(
    resolveFlashSelectionBounds({
      currentEndDate: '2026-05-17',
      currentStartDate: '2026-05-08',
      mode: 'subtract',
      nextDates: removedMiddle,
      requestedEndDate: '2026-05-13',
      requestedStartDate: '2026-05-12'
    }),
    { startDate: '2026-05-08', endDate: '2026-05-17' }
  );
  assert.deepEqual(removedMiddle, [
    '2026-05-08',
    '2026-05-09',
    '2026-05-10',
    '2026-05-11',
    '2026-05-14',
    '2026-05-15',
    '2026-05-16',
    '2026-05-17'
  ]);
  assert.deepEqual(sortFlashDatesByDirection(removedMiddle, 'forward'), [
    '2026-05-08',
    '2026-05-09',
    '2026-05-10',
    '2026-05-11',
    '2026-05-14',
    '2026-05-15',
    '2026-05-16',
    '2026-05-17'
  ]);

  const weekdays = [
    '2026-05-08',
    '2026-05-11',
    '2026-05-12',
    '2026-05-13',
    '2026-05-14',
    '2026-05-15'
  ];

  assert.deepEqual(
    resolveFlashSelectionBounds({
      currentEndDate: '2026-05-17',
      currentStartDate: '2026-05-08',
      mode: 'replace',
      nextDates: weekdays,
      shouldPreserveBounds: true
    }),
    { startDate: '2026-05-08', endDate: '2026-05-17' }
  );
  assert.deepEqual(sortFlashDatesByDirection(weekdays, 'forward'), weekdays);
  assert.deepEqual(sortFlashDatesByDirection(weekdays, 'backward'), [
    '2026-05-15',
    '2026-05-14',
    '2026-05-13',
    '2026-05-12',
    '2026-05-11',
    '2026-05-08'
  ]);

  const weekends = ['2026-05-09', '2026-05-10', '2026-05-16', '2026-05-17'];
  assert.deepEqual(
    resolveFlashSelectionBounds({
      currentEndDate: '2026-05-17',
      currentStartDate: '2026-05-08',
      mode: 'replace',
      nextDates: weekends,
      shouldPreserveBounds: true
    }),
    { startDate: '2026-05-08', endDate: '2026-05-17' }
  );
  assert.deepEqual(sortFlashDatesByDirection(weekends, 'forward'), weekends);

  assert.deepEqual(
    resolveFlashSelectionBounds({
      currentEndDate: '2026-05-17',
      currentStartDate: '2026-05-08',
      mode: 'replace',
      nextDates: selectedDates,
      shouldPreserveBounds: true
    }),
    { startDate: '2026-05-08', endDate: '2026-05-17' }
  );
  assert.deepEqual(sortFlashDatesByDirection(selectedDates, 'forward'), selectedDates);
});

test('flash confirm navigation moves by date or week only when the target is selectable', () => {
  const selectableDates = [
    '2026-05-08',
    '2026-05-09',
    '2026-05-15',
    '2026-05-16'
  ];

  assert.equal(
    resolveFlashConfirmNavigationDate({
      currentDate: '2026-05-08',
      key: 'ArrowRight',
      selectableDates
    }),
    '2026-05-09'
  );
  assert.equal(
    resolveFlashConfirmNavigationDate({
      currentDate: '2026-05-08',
      key: 'ArrowDown',
      selectableDates
    }),
    '2026-05-15'
  );
  assert.equal(
    resolveFlashConfirmNavigationDate({
      currentDate: '2026-05-09',
      key: 'ArrowRight',
      selectableDates
    }),
    '2026-05-09'
  );
  assert.equal(
    resolveFlashConfirmNavigationDate({
      currentDate: '2026-05-15',
      key: 'ArrowUp',
      selectableDates
    }),
    '2026-05-08'
  );
});

test('flash keyboard action resolver covers enter, backspace, delete, and ctrl z', () => {
  assert.deepEqual(resolveFlashKeyboardAction({ key: 'Enter', step: 'input' }), { type: 'enter' });
  assert.deepEqual(resolveFlashKeyboardAction({ key: 'Backspace', step: 'input' }), { type: 'backspace' });
  assert.deepEqual(resolveFlashKeyboardAction({ key: 'Delete', step: 'confirm' }), { type: 'delete' });
  assert.deepEqual(resolveFlashKeyboardAction({ ctrlKey: true, key: 'z', step: 'input' }), { type: 'ctrl-z' });
  assert.deepEqual(resolveFlashKeyboardAction({ key: 'Escape', step: 'input' }), { type: 'escape' });
  assert.deepEqual(resolveFlashKeyboardAction({ key: 'Escape', step: 'confirm' }), { type: 'escape' });
  assert.deepEqual(resolveFlashKeyboardAction({ key: 'ArrowDown', step: 'input' }), null);
  assert.deepEqual(resolveFlashKeyboardAction({ key: 'ArrowDown', step: 'confirm' }), null);
  assert.deepEqual(
    resolveFlashKeyboardAction({ hasConfirmSelection: true, key: 'ArrowDown', step: 'confirm' }),
    { type: 'move-selection', key: 'ArrowDown' }
  );
  assert.deepEqual(resolveFlashKeyboardAction({ key: '5', step: 'confirm' }), null);
  assert.deepEqual(
    resolveFlashKeyboardAction({ hasConfirmSelection: true, key: '5', step: 'confirm' }),
    { type: 'input-character', key: '5' }
  );
});

test('flash keyboard Escape is wired to existing stage return callbacks', () => {
  const controllerSource = readSourceFile('src/features/flashNote/useFlashNoteController.ts');
  const keyboardSource = readSourceFile('src/features/flashNote/useFlashKeyboardInput.ts');

  assert.match(
    keyboardSource,
    /if \(action\.type === 'escape'\) \{[\s\S]*event\.stopPropagation\(\);[\s\S]*onEscape\(\);/
  );
  assert.match(
    controllerSource,
    /enabled: isOpen && step === 'input'[\s\S]*onEscape: requestReturnDateSelection/
  );
  assert.match(
    controllerSource,
    /enabled: isOpen && step === 'confirm'[\s\S]*onEscape: backToInput/
  );
});

test('flash confirm cell edits normalize values and delete clears the selected cell', () => {
  const editedCell = resolveFlashCellValueUpdate({
    cell: cell('2026-05-10', '12'),
    dateValue: '2026-05-10',
    nextValue: '-12.345'
  });

  assert.equal(editedCell?.value, '-12.34');
  assert.equal(editedCell?.enabled, true);
  assert.equal(editedCell?.missing, false);

  const clearedCell = resolveFlashCellValueUpdate({
    cell: editedCell!,
    dateValue: '2026-05-10',
    nextValue: ''
  });

  assert.equal(clearedCell?.value, '');
  assert.equal(clearedCell?.enabled, true);
  assert.equal(clearedCell?.missing, true);
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
