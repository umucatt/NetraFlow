import type { SearchCategory, SearchNavigationTarget } from './searchTypes';
import { SEARCH_INITIAL_RESULT_LIMIT, SEARCH_RESULT_LOAD_STEP } from './searchWeights';

export type SearchNavigationState<TSnapshot = unknown> = {
  returnSnapshot: TSnapshot;
  targets: SearchNavigationTarget[];
  currentTargetKey: string;
};

export type SearchState<TSnapshot = unknown> = {
  isOpen: boolean;
  query: string;
  selectedCategory: SearchCategory;
  categoryLockedByUser: boolean;
  weakMode: boolean;
  focusedResultId: string;
  hoveredResultId: string;
  resultLimit: number;
  scrollTop: number;
  floatingNavigation: SearchNavigationState<TSnapshot> | null;
  lastOpenedResultId: string;
};

export type SearchStateAction<TSnapshot = unknown> =
  | { type: 'open' }
  | { type: 'close-and-reset' }
  | { type: 'hide-for-navigation' }
  | { type: 'query-changed'; query: string }
  | { type: 'clear-query' }
  | { type: 'select-category'; category: SearchCategory; lock: boolean }
  | { type: 'focus-item'; itemId: string }
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

export const createInitialSearchState = <TSnapshot = unknown>(): SearchState<TSnapshot> => ({
  isOpen: false,
  query: '',
  selectedCategory: 'all',
  categoryLockedByUser: false,
  weakMode: false,
  focusedResultId: '',
  hoveredResultId: '',
  resultLimit: SEARCH_INITIAL_RESULT_LIMIT,
  scrollTop: 0,
  floatingNavigation: null,
  lastOpenedResultId: ''
});

const resetSearchState = <TSnapshot>(
  state: SearchState<TSnapshot>
): SearchState<TSnapshot> => ({
  ...state,
  query: '',
  selectedCategory: 'all',
  categoryLockedByUser: false,
  weakMode: false,
  focusedResultId: '',
  hoveredResultId: '',
  resultLimit: SEARCH_INITIAL_RESULT_LIMIT,
  scrollTop: 0,
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
    case 'query-changed':
      return {
        ...state,
        query: action.query,
        weakMode: false,
        focusedResultId: '',
        hoveredResultId: '',
        resultLimit: SEARCH_INITIAL_RESULT_LIMIT,
        scrollTop: 0
      };
    case 'clear-query':
      return {
        ...state,
        query: '',
        weakMode: false,
        focusedResultId: '',
        hoveredResultId: '',
        resultLimit: SEARCH_INITIAL_RESULT_LIMIT,
        scrollTop: 0
      };
    case 'select-category':
      return {
        ...state,
        selectedCategory: action.category,
        categoryLockedByUser: action.lock,
        focusedResultId: '',
        hoveredResultId: '',
        resultLimit: SEARCH_INITIAL_RESULT_LIMIT,
        scrollTop: 0
      };
    case 'focus-item':
      return {
        ...state,
        focusedResultId: action.itemId,
        hoveredResultId: ''
      };
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
        state.resultLimit + SEARCH_RESULT_LOAD_STEP,
        action.minimum ?? 0
      );

      return {
        ...state,
        resultLimit: nextLimit
      };
    }
    case 'scroll':
      return {
        ...state,
        scrollTop: action.scrollTop
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

  if (state.query.length > 0) {
    return { type: 'clear-query' };
  }

  return { type: 'close-and-reset' };
};
