import type {
  SearchCategory,
  SearchNavigationTarget,
  SearchResultLimitsByCategory
} from './searchTypes';
import { SEARCH_INITIAL_RESULT_LIMIT, SEARCH_RESULT_LOAD_STEP } from './searchWeights';
import {
  createInitialSearchInputCompositionState,
  reduceSearchInputComposition
} from './searchInputComposition';

export type SearchNavigationState<TSnapshot = unknown> = {
  returnSnapshot: TSnapshot;
  targets: SearchNavigationTarget[];
  currentTargetKey: string;
};

export type SearchState<TSnapshot = unknown> = {
  isOpen: boolean;
  draftQuery: string;
  committedQuery: string;
  isComposing: boolean;
  selectedCategory: SearchCategory;
  categoryLockedByUser: boolean;
  weakMode: boolean;
  selectedResultIdsByCategory: Record<SearchCategory, string>;
  hoveredResultId: string;
  resultLimitsByCategory: SearchResultLimitsByCategory;
  scrollTopByCategory: Record<SearchCategory, number>;
  floatingNavigation: SearchNavigationState<TSnapshot> | null;
  lastOpenedResultId: string;
};

export type SearchStateAction<TSnapshot = unknown> =
  | { type: 'open' }
  | { type: 'close-and-reset' }
  | { type: 'hide-for-navigation' }
  | { type: 'composition-start' }
  | { type: 'draft-query-changed'; query: string }
  | { type: 'commit-query'; query: string }
  | { type: 'composition-end'; query: string }
  | { type: 'clear-query' }
  | { type: 'select-category'; category: SearchCategory; lock: boolean }
  | { type: 'select-item'; itemId: string }
  | { type: 'reconcile-selection'; category: SearchCategory; itemIds: string[] }
  | { type: 'hover-item'; itemId: string }
  | { type: 'clear-hover' }
  | { type: 'load-more-results'; minimum?: number }
  | { type: 'scroll'; scrollTop: number }
  | { type: 'set-weak-mode'; weakMode: boolean }
  | {
      type: 'set-navigation';
      navigation: SearchNavigationState<TSnapshot>;
      openedResultId: string;
    }
  | { type: 'update-navigation-target'; currentTargetKey: string }
  | { type: 'return-from-navigation' }
  | { type: 'clear-navigation' };

const createInitialResultLimitsByCategory = (): SearchResultLimitsByCategory => ({
  all: SEARCH_INITIAL_RESULT_LIMIT,
  account: SEARCH_INITIAL_RESULT_LIMIT,
  history: SEARCH_INITIAL_RESULT_LIMIT,
  snapshot: SEARCH_INITIAL_RESULT_LIMIT,
  settings: SEARCH_INITIAL_RESULT_LIMIT
});

const createInitialScrollTopByCategory = (): Record<SearchCategory, number> => ({
  all: 0,
  account: 0,
  history: 0,
  snapshot: 0,
  settings: 0
});

const createInitialSelectedResultIdsByCategory = (): Record<SearchCategory, string> => ({
  all: '',
  account: '',
  history: '',
  snapshot: '',
  settings: ''
});

export const createInitialSearchState = <TSnapshot = unknown>(): SearchState<TSnapshot> => ({
  isOpen: false,
  ...createInitialSearchInputCompositionState(),
  selectedCategory: 'all',
  categoryLockedByUser: false,
  weakMode: false,
  selectedResultIdsByCategory: createInitialSelectedResultIdsByCategory(),
  hoveredResultId: '',
  resultLimitsByCategory: createInitialResultLimitsByCategory(),
  scrollTopByCategory: createInitialScrollTopByCategory(),
  floatingNavigation: null,
  lastOpenedResultId: ''
});

export const shouldBuildGlobalSearchIndex = (
  state: Pick<SearchState, 'isOpen' | 'floatingNavigation'>
) => state.isOpen || state.floatingNavigation !== null;

const resetSearchState = <TSnapshot>(
  state: SearchState<TSnapshot>
): SearchState<TSnapshot> => ({
  ...state,
  ...createInitialSearchInputCompositionState(),
  selectedCategory: 'all',
  categoryLockedByUser: false,
  weakMode: false,
  selectedResultIdsByCategory: createInitialSelectedResultIdsByCategory(),
  hoveredResultId: '',
  resultLimitsByCategory: createInitialResultLimitsByCategory(),
  scrollTopByCategory: createInitialScrollTopByCategory(),
  lastOpenedResultId: ''
});

export const searchStateReducer = <TSnapshot>(
  state: SearchState<TSnapshot>,
  action: SearchStateAction<TSnapshot>
): SearchState<TSnapshot> => {
  switch (action.type) {
    case 'open':
      return {
        ...resetSearchState(state),
        isOpen: true,
        floatingNavigation: null
      };
    case 'close-and-reset':
      return {
        ...resetSearchState(state),
        isOpen: false
      };
    case 'hide-for-navigation':
      return {
        ...state,
        isOpen: false
      };
    case 'composition-start':
      return {
        ...state,
        ...reduceSearchInputComposition(state, { type: 'composition-start' })
      };
    case 'draft-query-changed':
      return {
        ...state,
        ...reduceSearchInputComposition(state, {
          type: 'draft-changed',
          query: action.query
        }),
        weakMode: false,
        resultLimitsByCategory: createInitialResultLimitsByCategory(),
        scrollTopByCategory: createInitialScrollTopByCategory()
      };
    case 'commit-query':
      return {
        ...state,
        ...reduceSearchInputComposition(state, { type: 'commit', query: action.query })
      };
    case 'composition-end':
      return {
        ...state,
        ...reduceSearchInputComposition(state, {
          type: 'composition-end',
          query: action.query
        }),
        weakMode: false,
        resultLimitsByCategory: createInitialResultLimitsByCategory(),
        scrollTopByCategory: createInitialScrollTopByCategory()
      };
    case 'clear-query':
      return {
        ...state,
        ...reduceSearchInputComposition(state, { type: 'clear' }),
        weakMode: false,
        selectedResultIdsByCategory: createInitialSelectedResultIdsByCategory(),
        hoveredResultId: '',
        resultLimitsByCategory: createInitialResultLimitsByCategory(),
        scrollTopByCategory: createInitialScrollTopByCategory()
      };
    case 'select-category':
      return {
        ...state,
        selectedCategory: action.category,
        categoryLockedByUser: action.lock
      };
    case 'select-item':
      return {
        ...state,
        selectedResultIdsByCategory: {
          ...state.selectedResultIdsByCategory,
          [state.selectedCategory]: action.itemId
        },
        hoveredResultId: ''
      };
    case 'reconcile-selection': {
      const currentItemId = state.selectedResultIdsByCategory[action.category];
      const nextItemId = action.itemIds.includes(currentItemId)
        ? currentItemId
        : action.itemIds[0] ?? '';

      if (nextItemId === currentItemId) {
        return state;
      }

      return {
        ...state,
        selectedResultIdsByCategory: {
          ...state.selectedResultIdsByCategory,
          [action.category]: nextItemId
        }
      };
    }
    case 'hover-item':
      return {
        ...state,
        hoveredResultId: action.itemId
      };
    case 'clear-hover':
      return {
        ...state,
        hoveredResultId: ''
      };
    case 'load-more-results': {
      const nextLimit = Math.max(
        state.resultLimitsByCategory[state.selectedCategory] + SEARCH_RESULT_LOAD_STEP,
        action.minimum ?? 0
      );

      return {
        ...state,
        resultLimitsByCategory: {
          ...state.resultLimitsByCategory,
          [state.selectedCategory]: nextLimit
        }
      };
    }
    case 'scroll':
      return {
        ...state,
        scrollTopByCategory: {
          ...state.scrollTopByCategory,
          [state.selectedCategory]: action.scrollTop
        }
      };
    case 'set-weak-mode':
      return {
        ...state,
        weakMode: action.weakMode
      };
    case 'set-navigation':
      return {
        ...state,
        isOpen: false,
        hoveredResultId: '',
        floatingNavigation: action.navigation,
        lastOpenedResultId: action.openedResultId
      };
    case 'update-navigation-target':
      return state.floatingNavigation
        ? {
            ...state,
            floatingNavigation: {
              ...state.floatingNavigation,
              currentTargetKey: action.currentTargetKey
            }
          }
        : state;
    case 'return-from-navigation':
      return {
        ...state,
        isOpen: true,
        hoveredResultId: '',
        floatingNavigation: null
      };
    case 'clear-navigation':
      return {
        ...state,
        floatingNavigation: null
      };
    default:
      return state;
  }
};

export const getSearchEscapeAction = <TSnapshot>(
  state: SearchState<TSnapshot>
): SearchStateAction<TSnapshot> | null => {
  if (!state.isOpen) {
    return null;
  }

  if (state.selectedCategory !== 'all' || state.categoryLockedByUser) {
    return { type: 'select-category', category: 'all', lock: false };
  }

  if (state.draftQuery.length > 0) {
    return { type: 'clear-query' };
  }

  return { type: 'close-and-reset' };
};
