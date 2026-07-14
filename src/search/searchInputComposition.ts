export const SEARCH_QUERY_DEBOUNCE_MS = 100;

export type SearchInputCompositionState = {
  draftQuery: string;
  committedQuery: string;
  isComposing: boolean;
};

export type SearchInputCompositionAction =
  | { type: 'composition-start' }
  | { type: 'draft-changed'; query: string }
  | { type: 'commit'; query: string }
  | { type: 'composition-end'; query: string }
  | { type: 'clear' }
  | { type: 'reset' };

export const createInitialSearchInputCompositionState = (): SearchInputCompositionState => ({
  draftQuery: '',
  committedQuery: '',
  isComposing: false
});

export const reduceSearchInputComposition = (
  state: SearchInputCompositionState,
  action: SearchInputCompositionAction
): SearchInputCompositionState => {
  switch (action.type) {
    case 'composition-start':
      return { ...state, isComposing: true };
    case 'draft-changed':
      return { ...state, draftQuery: action.query };
    case 'commit':
      return { ...state, committedQuery: action.query };
    case 'composition-end':
      return {
        draftQuery: action.query,
        committedQuery: action.query,
        isComposing: false
      };
    case 'clear':
    case 'reset':
      return createInitialSearchInputCompositionState();
    default:
      return state;
  }
};

export const isSearchCompositionActive = (
  isComposing: boolean,
  nativeIsComposing = false
) => isComposing || nativeIsComposing;

export type SearchQueryCommitScheduler = {
  schedule: (query: string) => void;
  commitImmediately: (query: string) => void;
  cancel: () => void;
  dispose: () => void;
};

export type CreateSearchQueryCommitSchedulerOptions<TTimer> = {
  delayMs?: number;
  setTimer: (callback: () => void, delayMs: number) => TTimer;
  clearTimer: (timer: TTimer) => void;
  onCommit: (query: string) => void;
};

export const createSearchQueryCommitScheduler = <TTimer>({
  delayMs = SEARCH_QUERY_DEBOUNCE_MS,
  setTimer,
  clearTimer,
  onCommit
}: CreateSearchQueryCommitSchedulerOptions<TTimer>): SearchQueryCommitScheduler => {
  let pendingTimer: TTimer | null = null;
  let disposed = false;

  const cancel = () => {
    if (pendingTimer === null) {
      return;
    }

    clearTimer(pendingTimer);
    pendingTimer = null;
  };

  const commit = (query: string) => {
    if (!disposed) {
      onCommit(query);
    }
  };

  return {
    schedule: (query) => {
      cancel();

      if (disposed) {
        return;
      }

      pendingTimer = setTimer(() => {
        pendingTimer = null;
        commit(query);
      }, delayMs);
    },
    commitImmediately: (query) => {
      cancel();
      commit(query);
    },
    cancel,
    dispose: () => {
      cancel();
      disposed = true;
    }
  };
};
