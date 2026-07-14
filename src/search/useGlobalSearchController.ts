import {
  useCallback,
  useEffect,
  useReducer,
  useRef
} from 'react';
import type { SearchIndexConfig } from './searchIndexConfig';
import {
  createSearchQueryCommitScheduler,
  isSearchCompositionActive
} from './searchInputComposition';
import {
  getNextSearchNavigationTarget,
  getSearchResultItemId,
  getSearchNavigationCycle
} from './searchNavigation';
import { getSearchNavigationTargetsForResult } from './searchNavigationLogic';
import {
  resolveDisplayedSearchSelection,
  resolveSearchResultDisplay
} from './searchResultPresentation';
import {
  createInitialSearchState,
  getSearchEscapeAction,
  searchStateReducer
} from './searchState';
import { useGlobalSearchWorker } from './useGlobalSearchWorker';
import type {
  AssetGroupWithAccounts,
  BackupRecord,
  GlobalSearchResult,
  HistoryRecord,
  SearchCategory,
  SearchLogicMode,
  SearchNavigationTarget,
  SettingsSearchItem
} from './searchTypes';

export type UseGlobalSearchControllerOptions<TSnapshot = unknown> = {
  groups: AssetGroupWithAccounts[];
  historyRecords: HistoryRecord[];
  backupRecords: BackupRecord[];
  searchIndexConfig: SearchIndexConfig;
  settingsItems: SettingsSearchItem[];
  searchLogicMode: SearchLogicMode;
  createNavigationSnapshot: () => TSnapshot;
  restoreNavigationSnapshot: (snapshot: TSnapshot) => void;
  navigateToTarget: (target: SearchNavigationTarget) => void;
  onExitNavigation?: () => void;
};

export const useGlobalSearchController = <TSnapshot = unknown>({
  groups,
  historyRecords,
  backupRecords,
  searchIndexConfig,
  settingsItems,
  searchLogicMode,
  createNavigationSnapshot,
  restoreNavigationSnapshot,
  navigateToTarget,
  onExitNavigation
}: UseGlobalSearchControllerOptions<TSnapshot>) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const composingRef = useRef(false);
  const draftQueryRef = useRef('');
  const committedQueryRef = useRef('');
  const resetPresentationRef = useRef<() => void>(() => undefined);
  const [state, dispatch] = useReducer(
    searchStateReducer<TSnapshot>,
    undefined,
    createInitialSearchState<TSnapshot>
  );

  const commitQueryRef = useRef<(query: string) => void>(() => undefined);
  const queryCommitSchedulerRef = useRef<ReturnType<typeof createSearchQueryCommitScheduler<number>> | null>(null);

  if (!queryCommitSchedulerRef.current) {
    queryCommitSchedulerRef.current = createSearchQueryCommitScheduler<number>({
      setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimer: (timer) => window.clearTimeout(timer),
      onCommit: (query) => commitQueryRef.current(query)
    });
  }

  const resetInputRefs = useCallback(() => {
    composingRef.current = false;
    draftQueryRef.current = '';
    committedQueryRef.current = '';
    queryCommitSchedulerRef.current?.cancel();
    resetPresentationRef.current();
  }, []);

  const openSearch = useCallback(() => {
    resetInputRefs();
    dispatch({ type: 'open' });
  }, [resetInputRefs]);

  const closeSearch = useCallback(() => {
    resetInputRefs();
    dispatch({ type: 'close-and-reset' });
  }, [resetInputRefs]);

  const clearNavigation = useCallback(() => {
    dispatch({ type: 'clear-navigation' });
  }, []);

  useEffect(() => {
    return () => {
      queryCommitSchedulerRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    const handleSearchShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLocaleLowerCase() !== 'k') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openSearch();
    };

    document.addEventListener('keydown', handleSearchShortcut, true);

    return () => {
      document.removeEventListener('keydown', handleSearchShortcut, true);
    };
  }, [openSearch]);

  useEffect(() => {
    if (!state.isOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [state.isOpen]);

  const workerSearch = useGlobalSearchWorker({
    groups,
    historyRecords,
    backupRecords,
    config: searchIndexConfig,
    settingsItems,
    query: state.committedQuery,
    searchLogicMode,
    resultLimitsByCategory: state.resultLimitsByCategory,
    isOpen: state.isOpen
  });
  resetPresentationRef.current = workerSearch.resetPresentation;
  const resultDisplay = resolveSearchResultDisplay(
    workerSearch.presentation,
    {
      revision: workerSearch.revision,
      query: state.committedQuery,
      selectedCategory: state.selectedCategory,
      searchLogicMode,
      resultLimitsByCategory: state.resultLimitsByCategory,
      isOpen: state.isOpen
    },
    workerSearch.lifecycle,
    workerSearch.statusText
  );
  const output = resultDisplay.displayedOutput;
  const canNavigateCurrentOutput =
    workerSearch.canNavigate && resultDisplay.canInteractWithResults;

  useEffect(() => {
    if (state.weakMode !== output.weakMode) {
      dispatch({ type: 'set-weak-mode', weakMode: output.weakMode });
    }
  }, [output.weakMode, state.weakMode]);

  const currentNavigationTarget = state.floatingNavigation?.targets.find(
    (target) => target.key === state.floatingNavigation?.currentTargetKey
  ) ?? null;

  const navigationCycle = getSearchNavigationCycle(
    state.floatingNavigation?.targets ?? [],
    currentNavigationTarget
  );
  const canMoveNavigation = navigationCycle.length > 1;
  const displayedSelection = resolveDisplayedSearchSelection(
    output,
    resultDisplay.displayedCategory,
    state.selectedResultIdsByCategory[resultDisplay.displayedCategory],
    state.hoveredResultId
  );
  const activeResults = displayedSelection.displayedResults;
  const focusedResult = displayedSelection.displayedPreviewResult;
  const displayedResultItemIds = activeResults.map((result) =>
    getSearchResultItemId(result.target)
  );
  const displayedResultItemIdsKey = displayedResultItemIds.join('|');

  useEffect(() => {
    if (!resultDisplay.canInteractWithResults) {
      return;
    }

    dispatch({
      type: 'reconcile-selection',
      category: resultDisplay.displayedCategory,
      itemIds: displayedResultItemIds
    });
  }, [
    displayedResultItemIdsKey,
    resultDisplay.canInteractWithResults,
    resultDisplay.displayedCategory,
    resultDisplay.resultPresentationVersion
  ]);

  const markUserInteraction = useCallback(() => undefined, []);

  const startNavigation = useCallback(
    (target: SearchNavigationTarget) => {
      if (!canNavigateCurrentOutput) {
        return;
      }

      const targets = getSearchNavigationTargetsForResult(
        target,
        output.strongNavigationTargets
      );

      dispatch({
        type: 'set-navigation',
        navigation: {
          returnSnapshot: createNavigationSnapshot(),
          targets,
          currentTargetKey: target.key
        },
        openedResultId: target.key
      });
      navigateToTarget(target);
    },
    [
      createNavigationSnapshot,
      navigateToTarget,
      output.strongNavigationTargets,
      canNavigateCurrentOutput
    ]
  );

  const openResult = useCallback(
    (result: GlobalSearchResult) => {
      if (!activeResults.some((activeResult) => activeResult.target.key === result.target.key)) {
        return;
      }

      startNavigation(result.target);
    },
    [activeResults, startNavigation]
  );

  const moveToNavigationTarget = useCallback(
    (direction: 1 | -1) => {
      if (!state.floatingNavigation || !currentNavigationTarget) {
        return;
      }

      const nextTarget = getNextSearchNavigationTarget(
        navigationCycle,
        currentNavigationTarget,
        direction
      );

      if (!nextTarget) {
        return;
      }

      dispatch({
        type: 'update-navigation-target',
        currentTargetKey: nextTarget.key
      });
      navigateToTarget(nextTarget);
    },
    [currentNavigationTarget, navigateToTarget, navigationCycle, state.floatingNavigation]
  );

  const returnFromNavigation = useCallback(() => {
    const navigationState = state.floatingNavigation;

    if (!navigationState) {
      return;
    }

    dispatch({ type: 'return-from-navigation' });
    restoreNavigationSnapshot(navigationState.returnSnapshot);
  }, [restoreNavigationSnapshot, state.floatingNavigation]);

  const exitNavigation = useCallback(() => {
    dispatch({ type: 'clear-navigation' });
    onExitNavigation?.();
  }, [onExitNavigation]);

  const clearQuery = useCallback(() => {
    composingRef.current = false;
    draftQueryRef.current = '';
    committedQueryRef.current = '';
    queryCommitSchedulerRef.current?.cancel();
    resetPresentationRef.current();
    dispatch({ type: 'clear-query' });
  }, []);

  const commitQuery = useCallback((query: string) => {
    if (query === committedQueryRef.current) {
      return;
    }

    committedQueryRef.current = query;

    if (query.length === 0) {
      resetPresentationRef.current();
    }

    dispatch({ type: 'commit-query', query });
  }, []);

  commitQueryRef.current = commitQuery;

  const changeDraftQuery = useCallback((query: string, nativeIsComposing = false) => {
    draftQueryRef.current = query;
    dispatch({ type: 'draft-query-changed', query });

    if (isSearchCompositionActive(composingRef.current, nativeIsComposing)) {
      queryCommitSchedulerRef.current?.cancel();
      return;
    }

    if (query === committedQueryRef.current) {
      queryCommitSchedulerRef.current?.cancel();
      return;
    }

    if (query.length === 0) {
      queryCommitSchedulerRef.current?.commitImmediately(query);
      return;
    }

    queryCommitSchedulerRef.current?.schedule(query);
  }, []);

  const startComposition = useCallback(() => {
    composingRef.current = true;
    queryCommitSchedulerRef.current?.cancel();
    dispatch({ type: 'composition-start' });
  }, []);

  const endComposition = useCallback((query: string) => {
    composingRef.current = false;
    draftQueryRef.current = query;
    queryCommitSchedulerRef.current?.cancel();

    if (query === committedQueryRef.current) {
      dispatch({ type: 'composition-end', query });
      return;
    }

    committedQueryRef.current = query;

    if (query.length === 0) {
      resetPresentationRef.current();
    }

    dispatch({ type: 'composition-end', query });
  }, []);

  const handleEscape = useCallback((nativeIsComposing = false) => {
    if (isSearchCompositionActive(composingRef.current, nativeIsComposing)) {
      return false;
    }

    const searchEscapeAction = getSearchEscapeAction(state);

    if (!searchEscapeAction) {
      return false;
    }

    if (searchEscapeAction.type === 'clear-query') {
      clearQuery();
    } else {
      dispatch(searchEscapeAction);
    }

    if (searchEscapeAction.type !== 'close-and-reset') {
      inputRef.current?.focus();
    }

    return true;
  }, [clearQuery, state]);

  const selectCategory = useCallback((category: SearchCategory) => {
    dispatch({ type: 'select-category', category, lock: category !== 'all' });
  }, []);

  return {
    isOpen: state.isOpen,
    isRefreshing: resultDisplay.isRefreshing,
    isPreparing: resultDisplay.isPreparing,
    isInitialSearching: resultDisplay.isInitialSearching,
    latestCompletedQuery: resultDisplay.latestCompletedQuery,
    hasFloatingNavigation: Boolean(state.floatingNavigation),
    output,
    focusedResult,
    currentNavigationTarget,
    canMoveNavigation,
    inputRef,
    openSearch,
    closeSearch,
    clearNavigation,
    openResult,
    moveToPreviousTarget: () => moveToNavigationTarget(-1),
    moveToNextTarget: () => moveToNavigationTarget(1),
    returnFromNavigation,
    exitNavigation,
    handleEscape,
    panelProps: {
      output,
      query: state.draftQuery,
      isComposing: state.isComposing,
      statusText: resultDisplay.statusText,
      isRefreshing: resultDisplay.isRefreshing,
      isInitialSearching: resultDisplay.isInitialSearching,
      canInteractWithResults: resultDisplay.canInteractWithResults,
      resultPresentationVersion: resultDisplay.resultPresentationVersion,
      selectedCategory: state.selectedCategory,
      visibleCategory: resultDisplay.displayedCategory,
      categoryLockedByUser: state.categoryLockedByUser,
      selectedItemId: displayedSelection.displayedSelectedItemId,
      hoveredItemId: displayedSelection.displayedHoveredItemId,
      resultLimit: state.resultLimitsByCategory[state.selectedCategory],
      scrollTop: state.scrollTopByCategory[state.selectedCategory],
      lastOpenedResultId: state.lastOpenedResultId,
      inputRef,
      onQueryChange: changeDraftQuery,
      onCompositionStart: startComposition,
      onCompositionEnd: endComposition,
      onClearQuery: clearQuery,
      onSelectCategory: selectCategory,
      onShowAll: () => dispatch({ type: 'select-category', category: 'all', lock: false }),
      onSelectItem: (itemId: string) => dispatch({ type: 'select-item', itemId }),
      onHoverItem: (itemId: string) => dispatch({ type: 'hover-item', itemId }),
      onClearHover: () => dispatch({ type: 'clear-hover' }),
      onLoadMoreResults: (minimum?: number) =>
        dispatch({ type: 'load-more-results', minimum }),
      onScrollChange: (scrollTop: number) => dispatch({ type: 'scroll', scrollTop }),
      onOpenResult: openResult,
      onPointerIntent: markUserInteraction
    }
  };
};
