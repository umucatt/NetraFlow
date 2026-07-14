import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyGlobalSearchOutput } from './searchEngine';
import {
  acceptCurrentSearchResult,
  createInitialSearchResultPresentation,
  resolveDisplayedSearchSelection,
  resolveSearchResultDisplay,
  type CurrentSearchRequest
} from './searchResultPresentation';
import type { QueryRequest } from './searchWorkerProtocol';
import type { GlobalSearchOutput, GlobalSearchResult } from './searchTypes';

const DEFAULT_RESULT_LIMITS = {
  all: 20,
  account: 20,
  history: 20,
  snapshot: 20,
  settings: 20
};

const createRequest = (
  overrides: Partial<QueryRequest> = {}
): QueryRequest => ({
  type: 'query',
  requestId: 1,
  revision: 1,
  query: '100',
  searchLogicMode: 'infer',
  resultLimitsByCategory: DEFAULT_RESULT_LIMITS,
  ...overrides
});

const createCurrent = (
  request: QueryRequest,
  overrides: Partial<CurrentSearchRequest> = {}
): CurrentSearchRequest => ({
  revision: request.revision,
  query: request.query,
  selectedCategory: 'all',
  searchLogicMode: request.searchLogicMode,
  resultLimitsByCategory: request.resultLimitsByCategory,
  isOpen: true,
  ...overrides
});

const createSettingsResult = (id: string) => ({
  id: `settings:${id}`,
  category: 'settings',
  target: {
    category: 'settings',
    settingsId: id,
    settingsSection: 'general',
    key: `settings:${id}`,
    isWeakRelated: false
  },
  title: id,
  subtitle: '',
  value: '',
  score: 1,
  matchedTermCount: 1,
  matchLabel: 'hit',
  matchKind: 'exact',
  highlights: { title: [], subtitle: [], value: [] },
  primaryMatch: { field: 'title', label: 'hit', value: id, displayText: id },
  isWeakRelated: false,
  strength: 'strong',
  index: 0,
  item: {
    id,
    title: id,
    group: 'general',
    description: '',
    section: 'general'
  },
  icon: 'settings'
} as GlobalSearchResult);

const createCompletedOutput = (
  query: string,
  resultIds: string[] = []
): GlobalSearchOutput => {
  const empty = createEmptyGlobalSearchOutput(query, 'infer');
  const results = resultIds.map(createSettingsResult);

  return {
    ...empty,
    hasQuery: true,
    allResults: results,
    resultsByCategory: {
      ...empty.resultsByCategory,
      settings: results
    },
    counts: {
      ...empty.counts,
      all: results.length,
      settings: results.length
    },
    strongNavigationTargets: results.map((result) => result.target)
  };
};

test('pending query keeps the last completed output until the current result replaces it', () => {
  const firstRequest = createRequest();
  const firstOutput = createCompletedOutput(firstRequest.query);
  const initial = createInitialSearchResultPresentation('infer');
  const firstPresentation = acceptCurrentSearchResult(
    initial,
    firstOutput,
    firstRequest,
    createCurrent(firstRequest)
  );
  const pendingRequest = createRequest({ requestId: 2, query: '200' });
  const pendingDisplay = resolveSearchResultDisplay(
    firstPresentation,
    createCurrent(pendingRequest),
    'ready',
    null
  );

  assert.equal(pendingDisplay.output, firstOutput);
  assert.equal(pendingDisplay.output.hasQuery, true);
  assert.equal(pendingDisplay.isRefreshing, true);
  assert.equal(pendingDisplay.canInteractWithResults, false);

  const nextOutput = createCompletedOutput(pendingRequest.query);
  const nextPresentation = acceptCurrentSearchResult(
    firstPresentation,
    nextOutput,
    pendingRequest,
    createCurrent(pendingRequest)
  );

  assert.equal(nextPresentation.output, nextOutput);
  assert.equal(nextPresentation.version, firstPresentation.version + 1);
  assert.equal(nextPresentation.completedRequest?.query, '200');
});

test('stale and rapid intermediate responses do not replace output or increment presentation', () => {
  const acceptedRequest = createRequest({ requestId: 3, query: '300' });
  const acceptedOutput = createCompletedOutput(acceptedRequest.query);
  const current = createCurrent(acceptedRequest);
  const initial = createInitialSearchResultPresentation('infer');
  const staleRequest = createRequest({ requestId: 2, query: '200' });
  const afterStale = acceptCurrentSearchResult(
    initial,
    createCompletedOutput(staleRequest.query),
    staleRequest,
    current
  );

  assert.equal(afterStale, initial);
  assert.equal(afterStale.version, 0);

  const accepted = acceptCurrentSearchResult(
    afterStale,
    acceptedOutput,
    acceptedRequest,
    current
  );

  assert.equal(accepted.output, acceptedOutput);
  assert.equal(accepted.version, 1);
});

test('loading more replaces the bounded output without replaying the result transition', () => {
  const initialRequest = createRequest();
  const initial = acceptCurrentSearchResult(
    createInitialSearchResultPresentation('infer'),
    createCompletedOutput(initialRequest.query),
    initialRequest,
    createCurrent(initialRequest)
  );
  const expandedRequest = createRequest({
    requestId: 2,
    resultLimitsByCategory: { ...DEFAULT_RESULT_LIMITS, history: 40 }
  });
  const expandedOutput = createCompletedOutput(expandedRequest.query);
  const expanded = acceptCurrentSearchResult(
    initial,
    expandedOutput,
    expandedRequest,
    createCurrent(expandedRequest)
  );

  assert.equal(expanded.output, expandedOutput);
  assert.equal(expanded.version, initial.version);
});

test('category switch changes only the visible category and preserves the accepted query snapshot', () => {
  const allRequest = createRequest();
  const allPresentation = acceptCurrentSearchResult(
    createInitialSearchResultPresentation('infer'),
    createCompletedOutput(allRequest.query),
    allRequest,
    createCurrent(allRequest)
  );
  const accountDisplay = resolveSearchResultDisplay(
    allPresentation,
    createCurrent(allRequest, { selectedCategory: 'account' }),
    'ready',
    null
  );

  assert.equal(accountDisplay.visibleCategory, 'account');
  assert.equal(accountDisplay.displayedOutput, allPresentation.output);
  assert.equal(accountDisplay.displayedRequestId, allRequest.requestId);
  assert.equal(accountDisplay.resultPresentationVersion, allPresentation.version);
  assert.equal(accountDisplay.isRefreshing, false);
  assert.equal(accountDisplay.isInitialSearching, false);
  assert.equal(accountDisplay.canInteractWithResults, true);
});

test('clearing the query immediately resolves to the formal empty-query state', () => {
  const request = createRequest();
  const presentation = acceptCurrentSearchResult(
    createInitialSearchResultPresentation('infer'),
    createCompletedOutput(request.query),
    request,
    createCurrent(request)
  );
  const display = resolveSearchResultDisplay(
    presentation,
    createCurrent(request, { query: '' }),
    'ready',
    null
  );

  assert.equal(display.output.query, '');
  assert.equal(display.output.hasQuery, false);
  assert.equal(display.visibleCategory, 'all');
  assert.equal(display.isRefreshing, false);
  assert.equal(display.statusText, null);
});

test('clearing the presentation prevents pre-clear results from resurfacing', () => {
  const request = createRequest();
  const presentation = acceptCurrentSearchResult(
    createInitialSearchResultPresentation('infer'),
    createCompletedOutput(request.query),
    request,
    createCurrent(request)
  );
  const clearedPresentation = createInitialSearchResultPresentation('infer');
  const nextRequest = createRequest({ requestId: 2, query: '200' });
  const nextDisplay = resolveSearchResultDisplay(
    clearedPresentation,
    createCurrent(nextRequest),
    'ready',
    null
  );

  assert.notEqual(presentation.output, clearedPresentation.output);
  assert.equal(nextDisplay.output.hasQuery, false);
  assert.equal(nextDisplay.isInitialSearching, true);
  assert.equal(nextDisplay.isRefreshing, false);
});

test('initial preparation, initial query, and worker error keep distinct display states', () => {
  const request = createRequest();
  const initial = createInitialSearchResultPresentation('infer');
  const preparing = resolveSearchResultDisplay(
    initial,
    createCurrent(request),
    'building',
    '正在准备搜索'
  );
  const searching = resolveSearchResultDisplay(
    initial,
    createCurrent(request),
    'ready',
    null
  );

  assert.equal(preparing.isPreparing, true);
  assert.equal(preparing.statusText, '正在准备搜索');
  assert.equal(searching.isInitialSearching, true);
  assert.equal(searching.statusText, '正在搜索');

  const completed = acceptCurrentSearchResult(
    initial,
    createCompletedOutput(request.query),
    request,
    createCurrent(request)
  );
  const failedRefresh = resolveSearchResultDisplay(
    completed,
    createCurrent(request, { query: '200' }),
    'error',
    '搜索暂时不可用'
  );

  assert.equal(failedRefresh.output, completed.output);
  assert.equal(failedRefresh.statusText, null);
  assert.equal(failedRefresh.canInteractWithResults, false);
});

test('displayed preview stays on the accepted snapshot while the next query is pending', () => {
  const firstRequest = createRequest({ query: 'A' });
  const firstOutput = createCompletedOutput(firstRequest.query, ['a', 'shared']);
  const firstPresentation = acceptCurrentSearchResult(
    createInitialSearchResultPresentation('infer'),
    firstOutput,
    firstRequest,
    createCurrent(firstRequest)
  );
  const pendingRequest = createRequest({ requestId: 2, query: 'B' });
  const pendingDisplay = resolveSearchResultDisplay(
    firstPresentation,
    createCurrent(pendingRequest),
    'ready',
    null
  );
  const pendingSelection = resolveDisplayedSearchSelection(
    pendingDisplay.displayedOutput,
    pendingDisplay.displayedCategory,
    'search-result:settings:shared',
    ''
  );

  assert.equal(pendingDisplay.displayedQuery, 'A');
  assert.equal(pendingDisplay.displayedRevision, firstRequest.revision);
  assert.equal(pendingDisplay.displayedRequestId, firstRequest.requestId);
  assert.equal(pendingSelection.displayedPreviewResult?.target.key, 'settings:shared');
  assert.equal(pendingSelection.displayedResults, firstOutput.allResults);
});

test('accepting a new result snapshot replaces list and preview together without a null selection', () => {
  const firstRequest = createRequest({ query: 'A' });
  const firstPresentation = acceptCurrentSearchResult(
    createInitialSearchResultPresentation('infer'),
    createCompletedOutput(firstRequest.query, ['a']),
    firstRequest,
    createCurrent(firstRequest)
  );
  const nextRequest = createRequest({ requestId: 2, query: 'B' });
  const nextOutput = createCompletedOutput(nextRequest.query, ['b']);
  const nextPresentation = acceptCurrentSearchResult(
    firstPresentation,
    nextOutput,
    nextRequest,
    createCurrent(nextRequest)
  );
  const nextDisplay = resolveSearchResultDisplay(
    nextPresentation,
    createCurrent(nextRequest),
    'ready',
    null
  );
  const nextSelection = resolveDisplayedSearchSelection(
    nextDisplay.displayedOutput,
    nextDisplay.displayedCategory,
    'search-result:settings:a',
    ''
  );

  assert.equal(nextSelection.displayedResults[0]?.target.key, 'settings:b');
  assert.equal(nextSelection.displayedPreviewResult?.target.key, 'settings:b');
  assert.equal(nextSelection.displayedSelectedItemId, 'search-result:settings:b');
});

test('hover temporarily overrides selection and mouseleave restores the selected result', () => {
  const output = createCompletedOutput('A', ['first', 'second', 'third']);
  const selectedItemId = 'search-result:settings:second';
  const hovered = resolveDisplayedSearchSelection(
    output,
    'all',
    selectedItemId,
    'search-result:settings:third'
  );
  const restored = resolveDisplayedSearchSelection(output, 'all', selectedItemId, '');

  assert.equal(hovered.displayedPreviewResult?.target.key, 'settings:third');
  assert.equal(hovered.displayedSelectedItemId, selectedItemId);
  assert.equal(restored.displayedPreviewResult?.target.key, 'settings:second');
  assert.equal(restored.displayedSelectedItemId, selectedItemId);
});

test('a formally accepted zero-result snapshot is the only transition that clears preview', () => {
  const firstRequest = createRequest({ query: 'A' });
  const firstPresentation = acceptCurrentSearchResult(
    createInitialSearchResultPresentation('infer'),
    createCompletedOutput(firstRequest.query, ['a']),
    firstRequest,
    createCurrent(firstRequest)
  );
  const emptyRequest = createRequest({ requestId: 2, query: 'missing' });
  const pendingDisplay = resolveSearchResultDisplay(
    firstPresentation,
    createCurrent(emptyRequest),
    'ready',
    null
  );
  const pendingSelection = resolveDisplayedSearchSelection(
    pendingDisplay.displayedOutput,
    pendingDisplay.displayedCategory,
    '',
    ''
  );
  const emptyPresentation = acceptCurrentSearchResult(
    firstPresentation,
    createCompletedOutput(emptyRequest.query),
    emptyRequest,
    createCurrent(emptyRequest)
  );
  const emptyDisplay = resolveSearchResultDisplay(
    emptyPresentation,
    createCurrent(emptyRequest),
    'ready',
    null
  );
  const emptySelection = resolveDisplayedSearchSelection(
    emptyDisplay.displayedOutput,
    emptyDisplay.displayedCategory,
    '',
    ''
  );

  assert.equal(pendingSelection.displayedPreviewResult?.target.key, 'settings:a');
  assert.equal(emptyDisplay.isRefreshing, false);
  assert.equal(emptySelection.displayedResults.length, 0);
  assert.equal(emptySelection.displayedPreviewResult, null);
});

test('worker error retains the displayed list and preview snapshot', () => {
  const request = createRequest({ query: 'A' });
  const output = createCompletedOutput(request.query, ['a']);
  const presentation = acceptCurrentSearchResult(
    createInitialSearchResultPresentation('infer'),
    output,
    request,
    createCurrent(request)
  );
  const nextRequest = createRequest({ requestId: 2, query: 'B' });
  const failedDisplay = resolveSearchResultDisplay(
    presentation,
    createCurrent(nextRequest),
    'error',
    '搜索暂时不可用'
  );
  const failedSelection = resolveDisplayedSearchSelection(
    failedDisplay.displayedOutput,
    failedDisplay.displayedCategory,
    '',
    ''
  );

  assert.equal(failedDisplay.displayedOutput, output);
  assert.equal(failedSelection.displayedPreviewResult?.target.key, 'settings:a');
});
