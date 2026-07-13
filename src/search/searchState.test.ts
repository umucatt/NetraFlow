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
