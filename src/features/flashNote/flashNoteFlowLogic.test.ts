/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFlashInitialInputCells,
  getFlashDateRuleCandidateDates,
  getFlashTrackDates,
  resolveFlashDateSelection,
  resolveFlashSequenceCommit
} from './flashNoteFlowLogic';

const selectedSet = (dates: string[]) => new Set(dates);

test('flash flow keeps a single start date in forward open sequence', () => {
  const trackDates = getFlashTrackDates({
    cells: {},
    endDate: '',
    inputCursor: 0,
    selectedDates: ['2026-05-10'],
    startDate: '2026-05-10'
  });

  assert.deepEqual(trackDates.slice(0, 3), [
    '2026-05-10',
    '2026-05-11',
    '2026-05-12'
  ]);
});

test('flash flow uses backward order when end date is earlier than start date', () => {
  assert.deepEqual(
    getFlashTrackDates({
      cells: {},
      endDate: '2026-05-08',
      inputCursor: 0,
      selectedDates: ['2026-05-08', '2026-05-09', '2026-05-10'],
      startDate: '2026-05-10'
    }),
    ['2026-05-10', '2026-05-09', '2026-05-08']
  );
});

test('flash date selection rejects future dates', () => {
  const result = resolveFlashDateSelection({
    candidateDates: ['2999-01-01'],
    currentEndDate: '',
    currentStartDate: '',
    mode: 'replace',
    selectedDates: [],
    visibleSelectableDates: ['2999-01-01']
  });

  assert.deepEqual(result, {
    endDate: '',
    selectedDates: [],
    startDate: ''
  });
});

test('flash date rules keep weekday weekend and all candidate behavior', () => {
  const visibleSelectableDates = [
    '2026-05-08',
    '2026-05-09',
    '2026-05-10',
    '2026-05-11'
  ];

  assert.deepEqual(
    getFlashDateRuleCandidateDates({
      endDate: '2026-05-11',
      rule: 'weekday',
      startDate: '2026-05-08'
    }),
    ['2026-05-08', '2026-05-11']
  );
  assert.deepEqual(
    getFlashDateRuleCandidateDates({
      endDate: '2026-05-11',
      rule: 'weekend',
      startDate: '2026-05-08'
    }),
    ['2026-05-09', '2026-05-10']
  );
  assert.deepEqual(
    getFlashDateRuleCandidateDates({
      endDate: '2026-05-11',
      rule: 'all',
      startDate: '2026-05-08'
    }),
    visibleSelectableDates
  );
  assert.deepEqual(
    getFlashDateRuleCandidateDates({
      endDate: '',
      rule: 'all',
      startDate: '2026-05-08'
    }),
    ['2026-05-08']
  );
  assert.deepEqual(
    getFlashDateRuleCandidateDates({
      endDate: '',
      rule: 'weekend',
      startDate: '2026-05-08'
    }),
    []
  );
});

test('flash drag date selection replaces old anchors and keeps single clicks as start only', () => {
  const visibleSelectableDates = [
    '2026-05-07',
    '2026-05-08',
    '2026-05-09',
    '2026-05-10',
    '2026-05-11',
    '2026-05-12'
  ];

  assert.deepEqual(
    resolveFlashDateSelection({
      bounds: { start: '2026-05-07', end: '2026-05-07' },
      candidateDates: ['2026-05-07'],
      currentEndDate: '2026-05-10',
      currentStartDate: '2026-05-08',
      mode: 'replace',
      selectedDates: ['2026-05-08', '2026-05-09', '2026-05-10'],
      visibleSelectableDates
    }),
    {
      endDate: '',
      selectedDates: ['2026-05-07'],
      startDate: '2026-05-07'
    }
  );

  assert.deepEqual(
    resolveFlashDateSelection({
      bounds: { start: '2026-05-11', end: '2026-05-09' },
      candidateDates: ['2026-05-09', '2026-05-10', '2026-05-11'],
      currentEndDate: '2026-05-10',
      currentStartDate: '2026-05-08',
      mode: 'replace',
      selectedDates: ['2026-05-08', '2026-05-09', '2026-05-10'],
      visibleSelectableDates
    }),
    {
      endDate: '2026-05-09',
      selectedDates: ['2026-05-09', '2026-05-10', '2026-05-11'],
      startDate: '2026-05-11'
    }
  );
});

test('flash sequence commit locks the tail after the last valid input', () => {
  const trackDates = ['2026-05-10', '2026-05-11'];
  const cells = createFlashInitialInputCells({
    endDate: '2026-05-11',
    selectedDates: trackDates,
    startDate: '2026-05-10',
    trackDates
  });

  const result = resolveFlashSequenceCommit({
    cells,
    currentInput: '12.345',
    inputCursor: 1,
    selectedDates: selectedSet(trackDates),
    trackDates
  });

  assert.equal(result?.inputCursor, 1);
  assert.equal(result?.currentInput, '12.34');
  assert.equal(result?.isTailLocked, true);
  assert.equal(result?.cells['2026-05-11']?.value, '12.34');
});
