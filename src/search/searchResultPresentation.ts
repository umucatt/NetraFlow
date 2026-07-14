import { createEmptyGlobalSearchOutput } from './searchEngine';
import { getSearchResultItemId, getSearchResultsForCategory } from './searchNavigation';
import type { QueryRequest } from './searchWorkerProtocol';
import type {
  GlobalSearchOutput,
  SearchCategory,
  SearchLogicMode,
  SearchResultLimitsByCategory
} from './searchTypes';

export type SearchIndexLifecycleState =
  | 'idle'
  | 'scheduled'
  | 'building'
  | 'ready'
  | 'stale'
  | 'error';

export type SearchResultPresentationState = {
  output: GlobalSearchOutput;
  completedRequest: QueryRequest | null;
  version: number;
};

export type CurrentSearchRequest = {
  revision: number;
  query: string;
  selectedCategory: SearchCategory;
  searchLogicMode: SearchLogicMode;
  resultLimitsByCategory: SearchResultLimitsByCategory;
  isOpen: boolean;
};

type CurrentSearchRequestIdentity = Omit<CurrentSearchRequest, 'selectedCategory'>;

export const createInitialSearchResultPresentation = (
  searchLogicMode: SearchLogicMode
): SearchResultPresentationState => ({
  output: createEmptyGlobalSearchOutput('', searchLogicMode),
  completedRequest: null,
  version: 0
});

export const isSearchResultRequestCurrent = (
  request: QueryRequest,
  current: CurrentSearchRequestIdentity
) =>
  current.isOpen &&
  request.revision === current.revision &&
  request.query === current.query &&
  request.searchLogicMode === current.searchLogicMode &&
  request.resultLimitsByCategory.all === current.resultLimitsByCategory.all &&
  request.resultLimitsByCategory.account === current.resultLimitsByCategory.account &&
  request.resultLimitsByCategory.history === current.resultLimitsByCategory.history &&
  request.resultLimitsByCategory.snapshot === current.resultLimitsByCategory.snapshot &&
  request.resultLimitsByCategory.settings === current.resultLimitsByCategory.settings;

const hasPresentationIdentityChanged = (
  previous: QueryRequest | null,
  next: QueryRequest
) =>
  !previous ||
  previous.revision !== next.revision ||
  previous.query !== next.query ||
  previous.searchLogicMode !== next.searchLogicMode;

export const acceptCurrentSearchResult = (
  state: SearchResultPresentationState,
  output: GlobalSearchOutput,
  request: QueryRequest,
  current: CurrentSearchRequestIdentity
): SearchResultPresentationState => {
  if (!isSearchResultRequestCurrent(request, current)) {
    return state;
  }

  return {
    output,
    completedRequest: request,
    version: hasPresentationIdentityChanged(state.completedRequest, request)
      ? state.version + 1
      : state.version
  };
};

const isCompletedPresentationCurrent = (
  completedRequest: QueryRequest | null,
  current: CurrentSearchRequest
) =>
  Boolean(
    completedRequest &&
    completedRequest.revision === current.revision &&
    completedRequest.query === current.query &&
    completedRequest.searchLogicMode === current.searchLogicMode
  );

export const resolveSearchResultDisplay = (
  presentation: SearchResultPresentationState,
  current: CurrentSearchRequest,
  lifecycle: SearchIndexLifecycleState,
  lifecycleStatusText: string | null
) => {
  const completedRequest = presentation.completedRequest;
  const showFormalEmptyQuery = Boolean(
    current.query.length === 0 &&
    completedRequest &&
    completedRequest.query.length > 0
  );
  const output = showFormalEmptyQuery
    ? createEmptyGlobalSearchOutput('', current.searchLogicMode)
    : presentation.output;
  const visibleCategory = current.selectedCategory;
  const hasDisplayableOutput = Boolean(
    !showFormalEmptyQuery && completedRequest && output.hasQuery
  );
  const isCurrent = !showFormalEmptyQuery &&
    isCompletedPresentationCurrent(completedRequest, current);
  const isPreparing =
    !showFormalEmptyQuery &&
    !hasDisplayableOutput &&
    lifecycle !== 'ready' &&
    lifecycle !== 'error';
  const isInitialSearching =
    current.query.length > 0 &&
    !hasDisplayableOutput &&
    !isCurrent &&
    lifecycle === 'ready';
  const isRefreshing =
    hasDisplayableOutput &&
    !isCurrent &&
    lifecycle !== 'error';
  const statusText = showFormalEmptyQuery || hasDisplayableOutput
    ? null
    : lifecycle === 'ready'
      ? isInitialSearching
        ? '正在搜索'
        : null
      : lifecycleStatusText;

  return {
    output,
    displayedOutput: output,
    displayedQuery: showFormalEmptyQuery
      ? ''
      : completedRequest?.query ?? output.query,
    displayedCategory: visibleCategory,
    displayedMode: showFormalEmptyQuery
      ? current.searchLogicMode
      : completedRequest?.searchLogicMode ?? output.searchLogicMode,
    displayedRevision: showFormalEmptyQuery
      ? current.revision
      : completedRequest?.revision ?? current.revision,
    displayedRequestId: showFormalEmptyQuery
      ? null
      : completedRequest?.requestId ?? null,
    visibleCategory,
    latestCompletedQuery: completedRequest?.query ?? null,
    resultPresentationVersion: presentation.version,
    isPreparing,
    isInitialSearching,
    isRefreshing,
    canInteractWithResults: isCurrent && lifecycle === 'ready',
    statusText
  };
};

export const resolveDisplayedSearchSelection = (
  output: GlobalSearchOutput,
  displayedCategory: SearchCategory,
  selectedItemId: string,
  hoveredItemId: string
) => {
  const displayedResults = getSearchResultsForCategory(output, displayedCategory);
  const selectedResult = displayedResults.find(
    (result) => getSearchResultItemId(result.target) === selectedItemId
  ) ?? null;
  const hoveredResult = displayedResults.find(
    (result) => getSearchResultItemId(result.target) === hoveredItemId
  ) ?? null;
  const displayedPreviewResult = hoveredResult ?? selectedResult ?? displayedResults[0] ?? null;
  const fallbackSelectedItemId = displayedPreviewResult
    ? getSearchResultItemId(displayedPreviewResult.target)
    : '';

  return {
    displayedResults,
    displayedPreviewResult,
    displayedSelectedItemId: selectedResult ? selectedItemId : fallbackSelectedItemId,
    displayedHoveredItemId: hoveredResult ? hoveredItemId : ''
  };
};
