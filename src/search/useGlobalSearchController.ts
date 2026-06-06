import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef
} from 'react';
import { createGlobalSearchIndex, runGlobalSearch } from './searchEngine';
import {
  getNextSearchNavigationTarget,
  getSearchNavigationCycle,
  getSearchResultItemId,
  getSearchResultsForCategory
} from './searchNavigation';
import { getSearchNavigationTargetsForResult } from './searchNavigationLogic';
import {
  createInitialSearchState,
  getSearchEscapeAction,
  searchStateReducer
} from './searchState';
import type {
  AssetGroupWithAccounts,
  BackupRecord,
  CreateSearchIndexOptions,
  GlobalSearchResult,
  HistoryRecord,
  SearchCategory,
  SearchLogicMode,
  SearchNavigationTarget
} from './searchTypes';

export type UseGlobalSearchControllerOptions<TSnapshot = unknown> = {
  groups: AssetGroupWithAccounts[];
  historyRecords: HistoryRecord[];
  backupRecords: BackupRecord[];
  createIndexOptions: CreateSearchIndexOptions;
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
  createIndexOptions,
  searchLogicMode,
  createNavigationSnapshot,
  restoreNavigationSnapshot,
  navigateToTarget,
  onExitNavigation
}: UseGlobalSearchControllerOptions<TSnapshot>) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, dispatch] = useReducer(
    searchStateReducer<TSnapshot>,
    undefined,
    createInitialSearchState<TSnapshot>
  );

  const openSearch = useCallback(() => {
    dispatch({ type: 'open' });
  }, []);

  const closeSearch = useCallback(() => {
    dispatch({ type: 'close-and-reset' });
  }, []);

  const clearNavigation = useCallback(() => {
    dispatch({ type: 'clear-navigation' });
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

  const searchIndex = useMemo(
    () => createGlobalSearchIndex(groups, historyRecords, backupRecords, createIndexOptions),
    [backupRecords, createIndexOptions, groups, historyRecords]
  );

  const output = useMemo(
    () =>
      runGlobalSearch(searchIndex, state.query, {
        selectedCategory: state.selectedCategory,
        searchLogicMode
      }),
    [searchIndex, searchLogicMode, state.query, state.selectedCategory]
  );

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
  const activeResults = getSearchResultsForCategory(output, state.selectedCategory);
  const focusedResult =
    activeResults.find(
      (result) => getSearchResultItemId(result.target) === state.hoveredResultId
    ) ??
    activeResults.find(
      (result) => getSearchResultItemId(result.target) === state.focusedResultId
    ) ??
    activeResults[0] ??
    null;

  const markUserInteraction = useCallback(() => undefined, []);

  const startNavigation = useCallback(
    (target: SearchNavigationTarget) => {
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
    [createNavigationSnapshot, navigateToTarget, output.strongNavigationTargets]
  );

  const openResult = useCallback(
    (result: GlobalSearchResult) => {
      startNavigation(result.target);
    },
    [startNavigation]
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

  const handleEscape = useCallback(() => {
    const searchEscapeAction = getSearchEscapeAction(state);

    if (!searchEscapeAction) {
      return false;
    }

    dispatch(searchEscapeAction);

    if (searchEscapeAction.type !== 'close-and-reset') {
      inputRef.current?.focus();
    }

    return true;
  }, [state]);

  const selectCategory = useCallback((category: SearchCategory) => {
    dispatch({ type: 'select-category', category, lock: category !== 'all' });
  }, []);

  return {
    isOpen: state.isOpen,
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
      query: state.query,
      selectedCategory: state.selectedCategory,
      categoryLockedByUser: state.categoryLockedByUser,
      focusedItemId: state.focusedResultId,
      hoveredItemId: state.hoveredResultId,
      resultLimit: state.resultLimit,
      scrollTop: state.scrollTop,
      lastOpenedResultId: state.lastOpenedResultId,
      inputRef,
      onQueryChange: (query: string) => dispatch({ type: 'query-changed', query }),
      onClearQuery: () => dispatch({ type: 'clear-query' }),
      onSelectCategory: selectCategory,
      onShowAll: () => dispatch({ type: 'select-category', category: 'all', lock: false }),
      onFocusItem: (itemId: string) => dispatch({ type: 'focus-item', itemId }),
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
