/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getFlashSignedAmountParts,
  resolveFlashRightClickSelection,
  resolveFlashSelection
} from '../flashNoteLogic';

const track = ['2026-04-27', '2026-04-28', '2026-04-29', '2026-04-30'];
const valuedDates = new Set(['2026-04-27', '2026-04-28', '2026-04-29']);
const compareByTrack = (left: string, right: string) =>
  track.indexOf(left) - track.indexOf(right);
const isValuedTrackDate = (dateValue: string) =>
  track.includes(dateValue) && valuedDates.has(dateValue);

test('flash correction right click keeps the current selection when the target is already selected', () => {
  const selection = ['2026-04-27', '2026-04-28'];
  const nextSelection = resolveFlashRightClickSelection({
    currentSelection: selection,
    targetDate: '2026-04-28',
    mode: 'subtract',
    isTargetSelected: true,
    compareDates: compareByTrack,
    isCandidateSelectable: isValuedTrackDate
  });

  assert.deepEqual(nextSelection, selection);
});

test('flash correction right click applies the active tool when the target is outside the selection', () => {
  const currentSelection = ['2026-04-27'];

  assert.deepEqual(
    resolveFlashRightClickSelection({
      currentSelection,
      targetDate: '2026-04-29',
      mode: 'union',
      isTargetSelected: false,
      compareDates: compareByTrack,
      isCandidateSelectable: isValuedTrackDate
    }),
    ['2026-04-27', '2026-04-29']
  );

  assert.deepEqual(
    resolveFlashRightClickSelection({
      currentSelection: ['2026-04-27', '2026-04-28'],
      targetDate: '2026-04-29',
      mode: 'intersect',
      isTargetSelected: false,
      compareDates: compareByTrack,
      isCandidateSelectable: isValuedTrackDate
    }),
    []
  );
});

test('flash correction subtract can leave no operable selection', () => {
  assert.deepEqual(
    resolveFlashSelection(['2026-04-28'], ['2026-04-28'], 'subtract', {
      compareDates: compareByTrack,
      isCandidateSelectable: isValuedTrackDate
    }),
    []
  );
});

test('flash confirm signed amount parts keep sign and number separated', () => {
  assert.deepEqual(getFlashSignedAmountParts(200, '200'), {
    sign: '+',
    value: '200'
  });
  assert.deepEqual(getFlashSignedAmountParts(-12, '-12'), {
    sign: '-',
    value: '12'
  });
  assert.deepEqual(getFlashSignedAmountParts(0, '0'), {
    sign: '',
    value: '0'
  });
});
