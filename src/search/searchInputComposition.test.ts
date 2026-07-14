import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEARCH_QUERY_DEBOUNCE_MS,
  createInitialSearchInputCompositionState,
  createSearchQueryCommitScheduler,
  isSearchCompositionActive,
  reduceSearchInputComposition
} from './searchInputComposition';

test('composition keeps draft text live and commits only the final selected value', () => {
  let state = createInitialSearchInputCompositionState();

  state = reduceSearchInputComposition(state, { type: 'composition-start' });
  state = reduceSearchInputComposition(state, { type: 'draft-changed', query: 'x' });
  state = reduceSearchInputComposition(state, { type: 'draft-changed', query: 'xian' });

  assert.equal(state.draftQuery, 'xian');
  assert.equal(state.committedQuery, '');
  assert.equal(state.isComposing, true);

  state = reduceSearchInputComposition(state, { type: 'composition-end', query: '现金' });

  assert.deepEqual(state, {
    draftQuery: '现金',
    committedQuery: '现金',
    isComposing: false
  });
});

test('composition guard honors both controlled and native event state', () => {
  assert.equal(isSearchCompositionActive(true, false), true);
  assert.equal(isSearchCompositionActive(false, true), true);
  assert.equal(isSearchCompositionActive(false, false), false);
});

test('ordinary input is debounced and newer input replaces the pending commit', () => {
  const callbacks = new Map<number, () => void>();
  const cleared: number[] = [];
  const commits: string[] = [];
  let nextTimer = 0;
  let observedDelay = 0;
  const scheduler = createSearchQueryCommitScheduler({
    setTimer: (callback, delayMs) => {
      nextTimer += 1;
      observedDelay = delayMs;
      callbacks.set(nextTimer, callback);
      return nextTimer;
    },
    clearTimer: (timer) => {
      cleared.push(timer);
      callbacks.delete(timer);
    },
    onCommit: (query) => commits.push(query)
  });

  scheduler.schedule('x');
  scheduler.schedule('xian');
  callbacks.get(2)?.();

  assert.equal(observedDelay, SEARCH_QUERY_DEBOUNCE_MS);
  assert.deepEqual(cleared, [1]);
  assert.deepEqual(commits, ['xian']);
});

test('composition completion commits once and clear cancels pending debounce', () => {
  const callbacks = new Map<number, () => void>();
  const commits: string[] = [];
  let nextTimer = 0;
  const scheduler = createSearchQueryCommitScheduler({
    setTimer: (callback) => {
      nextTimer += 1;
      callbacks.set(nextTimer, callback);
      return nextTimer;
    },
    clearTimer: (timer) => callbacks.delete(timer),
    onCommit: (query) => commits.push(query)
  });

  scheduler.schedule('pin');
  scheduler.commitImmediately('拼音');
  scheduler.schedule('stale');
  scheduler.cancel();
  callbacks.forEach((callback) => callback());

  assert.deepEqual(commits, ['拼音']);
});
