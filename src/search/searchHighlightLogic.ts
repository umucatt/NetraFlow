import { useCallback, useEffect, useState } from 'react';
import { SEARCH_SCROLL_BLOCK } from './searchNavigation';
import type { SearchNavigationTarget } from './searchTypes';

export const SEARCH_TARGET_SCROLL_DELAY_MS = 80;

export type SearchTargetHighlightIds = {
  historyRecordId: string;
  backupRecordId: string;
};

export type SearchTargetHighlightState = SearchTargetHighlightIds & {
  scrollKey: number;
};

export type UseSearchTargetHighlightControllerOptions = {
  canScrollHistoryTarget: boolean;
  canScrollBackupTarget: boolean;
  historyRenderKey: string | number;
  backupRenderKey: string | number;
};

const EMPTY_SEARCH_TARGET_HIGHLIGHT_IDS: SearchTargetHighlightIds = {
  historyRecordId: '',
  backupRecordId: ''
};

export const getSearchTargetHighlightIds = (
  target: SearchNavigationTarget | null
): SearchTargetHighlightIds => {
  if (target?.category === 'history') {
    return {
      historyRecordId: target.recordId,
      backupRecordId: ''
    };
  }

  if (target?.category === 'snapshot') {
    return {
      historyRecordId: '',
      backupRecordId: target.recordId
    };
  }

  return EMPTY_SEARCH_TARGET_HIGHLIGHT_IDS;
};

export const getSearchTargetElementId = (
  type: keyof SearchTargetHighlightIds,
  id: string
) => {
  if (!id) {
    return '';
  }

  return type === 'historyRecordId' ? `history-record-${id}` : `backup-record-${id}`;
};

const createInitialSearchTargetHighlightState = (): SearchTargetHighlightState => ({
  ...EMPTY_SEARCH_TARGET_HIGHLIGHT_IDS,
  scrollKey: 0
});

const scrollSearchTargetIntoView = (elementId: string) => {
  if (!elementId) {
    return;
  }

  document
    .getElementById(elementId)
    ?.scrollIntoView({ block: SEARCH_SCROLL_BLOCK, behavior: 'smooth' });
};

export const useSearchTargetHighlightController = ({
  canScrollHistoryTarget,
  canScrollBackupTarget,
  historyRenderKey,
  backupRenderKey
}: UseSearchTargetHighlightControllerOptions) => {
  const [highlightState, setHighlightState] = useState(createInitialSearchTargetHighlightState);

  const clearSearchScrollTargets = useCallback(() => {
    setHighlightState((currentState) =>
      currentState.historyRecordId || currentState.backupRecordId
        ? {
            ...currentState,
            ...EMPTY_SEARCH_TARGET_HIGHLIGHT_IDS
          }
        : currentState
    );
  }, []);

  const requestSearchTargetScroll = useCallback((target: SearchNavigationTarget) => {
    const nextIds = getSearchTargetHighlightIds(target);

    setHighlightState((currentState) => ({
      ...nextIds,
      scrollKey:
        nextIds.historyRecordId || nextIds.backupRecordId
          ? currentState.scrollKey + 1
          : currentState.scrollKey
    }));
  }, []);

  useEffect(() => {
    if (!highlightState.historyRecordId || !canScrollHistoryTarget) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      scrollSearchTargetIntoView(
        getSearchTargetElementId('historyRecordId', highlightState.historyRecordId)
      );
    }, SEARCH_TARGET_SCROLL_DELAY_MS);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [
    canScrollHistoryTarget,
    highlightState.historyRecordId,
    highlightState.scrollKey,
    historyRenderKey
  ]);

  useEffect(() => {
    if (!highlightState.backupRecordId || !canScrollBackupTarget) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      scrollSearchTargetIntoView(
        getSearchTargetElementId('backupRecordId', highlightState.backupRecordId)
      );
    }, SEARCH_TARGET_SCROLL_DELAY_MS);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [
    backupRenderKey,
    canScrollBackupTarget,
    highlightState.backupRecordId,
    highlightState.scrollKey
  ]);

  return {
    highlightedHistoryRecordId: highlightState.historyRecordId,
    highlightedBackupRecordId: highlightState.backupRecordId,
    clearSearchScrollTargets,
    requestSearchTargetScroll
  };
};
