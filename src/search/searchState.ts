import type { SearchCategory, SearchNavigationTarget } from './searchTypes';

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
  | { type: 'auto-select-category'; category: SearchCategory }
  | { type: 'focus-item'; itemId: string }
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
    case 'query-changed': {
      if (!action.query.trim()) {
        return {
          ...resetSearchState(state),
          isOpen: state.isOpen,
          floatingNavigation: state.floatingNavigation
        };
      }

      return {
        ...state,
        query: action.query,
        weakMode: false,
        focusedResultId: ''
      };
    }
    case 'clear-query':
      return {
        ...resetSearchState(state),
        isOpen: state.isOpen,
        floatingNavigation: state.floatingNavigation
      };
    case 'select-category':
      return {
        ...state,
        selectedCategory: action.category,
        categoryLockedByUser: action.lock,
        focusedResultId: ''
      };
    case 'auto-select-category':
      if (state.categoryLockedByUser) {
        return state;
      }

      return {
        ...state,
        selectedCategory: action.category
      };
    case 'focus-item':
      return {
        ...state,
        focusedResultId: action.itemId
      };
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
