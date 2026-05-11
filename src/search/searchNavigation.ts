import type {
  GlobalSearchOutput,
  GlobalSearchResult,
  SearchCategory,
  SearchKeyboardEntry,
  SearchNavigationTarget,
  SearchNavigationTargetInput,
  SearchResultCategory
} from './searchTypes';
import { SEARCH_CATEGORY_TABS, SEARCH_RESULT_CATEGORIES } from './searchTypes';

export const SEARCH_TARGET_HIGHLIGHT_MS = 2600;
export const SEARCH_RETURN_HIGHLIGHT_MS = 1000;
export const SEARCH_SCROLL_BLOCK: ScrollLogicalPosition = 'center';

export type SearchTargetPresentation = {
  destination: 'account-detail' | 'history-panel' | 'snapshot-panel' | 'global-settings';
  shouldHighlight: boolean;
  highlightMs: number;
  scrollBlock: ScrollLogicalPosition | null;
};

export const getSearchTargetPresentation = (
  target: SearchNavigationTarget
): SearchTargetPresentation => {
  if (target.category === 'account') {
    return {
      destination: 'account-detail',
      shouldHighlight: false,
      highlightMs: 0,
      scrollBlock: null
    };
  }

  if (target.category === 'settings') {
    return {
      destination: 'global-settings',
      shouldHighlight: false,
      highlightMs: 0,
      scrollBlock: null
    };
  }

  return {
    destination: target.category === 'history' ? 'history-panel' : 'snapshot-panel',
    shouldHighlight: true,
    highlightMs: SEARCH_TARGET_HIGHLIGHT_MS,
    scrollBlock: SEARCH_SCROLL_BLOCK
  };
};

export const getSearchTargetKey = (target: SearchNavigationTargetInput) => {
  if (target.category === 'account') {
    return `account:${target.groupName}:${target.accountId}`;
  }

  if (target.category === 'history') {
    return `history:${target.recordId}`;
  }

  if (target.category === 'snapshot') {
    return `snapshot:${target.recordId}`;
  }

  return `settings:${target.settingsId}`;
};

export const createAccountSearchTarget = (
  groupName: string,
  accountId: string,
  isWeakRelated = false
): SearchNavigationTarget => ({
  category: 'account',
  groupName,
  accountId,
  isWeakRelated,
  key: getSearchTargetKey({ category: 'account', groupName, accountId })
});

export const createHistorySearchTarget = (
  recordId: string,
  isWeakRelated = false
): SearchNavigationTarget => ({
  category: 'history',
  recordId,
  isWeakRelated,
  key: getSearchTargetKey({ category: 'history', recordId })
});

export const createSnapshotSearchTarget = (
  recordId: string,
  isWeakRelated = false
): SearchNavigationTarget => ({
  category: 'snapshot',
  recordId,
  isWeakRelated,
  key: getSearchTargetKey({ category: 'snapshot', recordId })
});

export const createSettingsSearchTarget = (
  settingsId: string,
  settingsSection: string,
  blockId?: string,
  isWeakRelated = false
): SearchNavigationTarget => ({
  category: 'settings',
  settingsId,
  settingsSection,
  blockId,
  isWeakRelated,
  key: getSearchTargetKey({ category: 'settings', settingsId, settingsSection, blockId })
});

export const getSearchCategoryItemId = (category: SearchCategory) =>
  `search-category:${category}`;

export const getSearchResultItemId = (target: SearchNavigationTarget) =>
  `search-result:${target.key}`;

export const getVisibleSearchCategories = (
  visibleCategory: SearchCategory,
  counts: Record<SearchCategory, number>
): SearchResultCategory[] =>
  visibleCategory === 'all'
    ? SEARCH_RESULT_CATEGORIES.filter((category) => counts[category] > 0)
    : [visibleCategory];

export const getSearchResultsForCategory = (
  output: GlobalSearchOutput,
  category: SearchResultCategory
) => output.resultsByCategory[category];

export const getSearchKeyboardEntries = (
  output: GlobalSearchOutput,
  visibleCategory: SearchCategory
): SearchKeyboardEntry[] => {
  const visibleCategories = getVisibleSearchCategories(visibleCategory, output.counts);
  const resultEntries = visibleCategories.flatMap((category) =>
    output.resultsByCategory[category].map((result) => ({
      id: getSearchResultItemId(result.target),
      kind: 'result' as const,
      target: result.target
    }))
  );

  return [
    ...SEARCH_CATEGORY_TABS.map((category) => ({
      id: getSearchCategoryItemId(category),
      kind: 'category' as const,
      category
    })),
    ...resultEntries
  ];
};

export const getNextKeyboardEntry = (
  entries: SearchKeyboardEntry[],
  focusedItemId: string,
  direction: 1 | -1
) => {
  if (entries.length === 0) {
    return null;
  }

  const currentIndex = entries.findIndex((entry) => entry.id === focusedItemId);
  const safeIndex = currentIndex >= 0 ? currentIndex : direction > 0 ? -1 : 0;

  return entries[(safeIndex + direction + entries.length) % entries.length] ?? null;
};

export type SearchEnterResolution =
  | { kind: 'select-category'; category: SearchCategory }
  | { kind: 'open-result'; result: GlobalSearchResult };

export const getSearchEnterResolution = (
  entries: SearchKeyboardEntry[],
  focusedItemId: string,
  output: GlobalSearchOutput
): SearchEnterResolution | null => {
  const activeEntry =
    entries.find((entry) => entry.id === focusedItemId) ??
    entries.find((entry) => entry.kind === 'result');

  if (!activeEntry) {
    return null;
  }

  if (activeEntry.kind === 'category') {
    return { kind: 'select-category', category: activeEntry.category };
  }

  const result = Object.values(output.resultsByCategory)
    .flat()
    .find((currentResult) => currentResult.target.key === activeEntry.target.key);

  return result ? { kind: 'open-result', result } : null;
};

export const getSearchNavigationCycle = (
  targets: SearchNavigationTarget[],
  currentTarget: SearchNavigationTarget | null
) => {
  if (!currentTarget || currentTarget.isWeakRelated) {
    return [];
  }

  const strongTargets = targets.filter((target) => !target.isWeakRelated);
  const sameCategoryTargets = strongTargets.filter(
    (target) => target.category === currentTarget.category
  );

  return sameCategoryTargets.length > 1 ? sameCategoryTargets : strongTargets;
};

export const getNextSearchNavigationTarget = (
  cycle: SearchNavigationTarget[],
  currentTarget: SearchNavigationTarget,
  direction: 1 | -1
) => {
  if (cycle.length === 0) {
    return null;
  }

  const currentIndex = cycle.findIndex((target) => target.key === currentTarget.key);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  return cycle[(safeIndex + direction + cycle.length) % cycle.length] ?? null;
};
