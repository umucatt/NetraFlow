import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialSearchState,
  searchStateReducer,
  shouldBuildGlobalSearchIndex
} from './searchState';

test('global search index is deferred until search or search navigation needs it', () => {
  const initial = createInitialSearchState();
  const open = searchStateReducer(initial, { type: 'open' });
  const navigating = searchStateReducer(open, {
    type: 'set-navigation',
    navigation: {
      returnSnapshot: null,
      targets: [],
      currentTargetKey: 'target'
    },
    openedResultId: 'target'
  });

  assert.equal(shouldBuildGlobalSearchIndex(initial), false);
  assert.equal(shouldBuildGlobalSearchIndex(open), true);
  assert.equal(shouldBuildGlobalSearchIndex(navigating), true);
  assert.equal(shouldBuildGlobalSearchIndex(searchStateReducer(navigating, {
    type: 'clear-navigation'
  })), false);
});

test('pending query and category changes retain the displayed focus and hover selection', () => {
  const initial = createInitialSearchState();
  const open = searchStateReducer(initial, { type: 'open' });
  const focused = searchStateReducer(open, {
    type: 'select-item',
    itemId: 'search-result:settings:focused'
  });
  const hovered = searchStateReducer(focused, {
    type: 'hover-item',
    itemId: 'search-result:settings:hovered'
  });
  const pendingQuery = searchStateReducer(hovered, {
    type: 'draft-query-changed',
    query: 'next'
  });
  const pendingCategory = searchStateReducer(pendingQuery, {
    type: 'select-category',
    category: 'settings',
    lock: true
  });

  assert.equal(
    pendingQuery.selectedResultIdsByCategory.all,
    focused.selectedResultIdsByCategory.all
  );
  assert.equal(pendingQuery.hoveredResultId, hovered.hoveredResultId);
  assert.equal(
    pendingCategory.selectedResultIdsByCategory.all,
    focused.selectedResultIdsByCategory.all
  );
  assert.equal(pendingCategory.hoveredResultId, hovered.hoveredResultId);
});

test('selection reconciliation preserves a valid item and otherwise chooses the first result', () => {
  let state = searchStateReducer(createInitialSearchState(), { type: 'open' });

  state = searchStateReducer(state, {
    type: 'reconcile-selection',
    category: 'all',
    itemIds: ['first', 'second', 'third']
  });
  assert.equal(state.selectedResultIdsByCategory.all, 'first');

  state = searchStateReducer(state, { type: 'select-item', itemId: 'second' });
  state = searchStateReducer(state, {
    type: 'reconcile-selection',
    category: 'all',
    itemIds: ['first', 'second', 'new-third']
  });
  assert.equal(state.selectedResultIdsByCategory.all, 'second');

  state = searchStateReducer(state, {
    type: 'reconcile-selection',
    category: 'all',
    itemIds: ['replacement']
  });
  assert.equal(state.selectedResultIdsByCategory.all, 'replacement');

  state = searchStateReducer(state, {
    type: 'reconcile-selection',
    category: 'all',
    itemIds: []
  });
  assert.equal(state.selectedResultIdsByCategory.all, '');
});

test('each category retains its own selected result', () => {
  let state = searchStateReducer(createInitialSearchState(), { type: 'open' });

  state = searchStateReducer(state, { type: 'select-item', itemId: 'all-second' });
  state = searchStateReducer(state, {
    type: 'select-category',
    category: 'history',
    lock: true
  });
  state = searchStateReducer(state, { type: 'select-item', itemId: 'history-third' });
  state = searchStateReducer(state, {
    type: 'select-category',
    category: 'all',
    lock: false
  });

  assert.equal(state.selectedResultIdsByCategory.all, 'all-second');
  assert.equal(state.selectedResultIdsByCategory.history, 'history-third');
});

test('category switches preserve per-category result limits and scroll positions', () => {
  let state = searchStateReducer(createInitialSearchState(), { type: 'open' });

  state = searchStateReducer(state, { type: 'load-more-results', minimum: 80 });
  state = searchStateReducer(state, { type: 'scroll', scrollTop: 240 });
  const allLimit = state.resultLimitsByCategory.all;
  state = searchStateReducer(state, {
    type: 'select-category',
    category: 'history',
    lock: true
  });
  state = searchStateReducer(state, { type: 'load-more-results', minimum: 120 });
  state = searchStateReducer(state, { type: 'scroll', scrollTop: 640 });
  const historyLimit = state.resultLimitsByCategory.history;
  state = searchStateReducer(state, {
    type: 'select-category',
    category: 'all',
    lock: false
  });

  assert.equal(state.resultLimitsByCategory.all, allLimit);
  assert.equal(state.resultLimitsByCategory.history, historyLimit);
  assert.equal(state.scrollTopByCategory.all, 240);
  assert.equal(state.scrollTopByCategory.history, 640);
});
