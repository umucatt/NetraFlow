import type {
  GlobalSearchOutput,
  GlobalSearchResult,
  SearchCategory,
  SearchKeyboardEntry,
  SearchNavigationTarget,
  SearchNavigationTargetInput,
  SearchResultCategory
} from './searchTypes';
import { SEARCH_FILTERABLE_RESULT_CATEGORIES } from './searchTypes';

export const SEARCH_SCROLL_BLOCK: ScrollLogicalPosition = 'center';

export type SearchTargetPresentation = {
  destination: 'account-detail' | 'snapshot-panel' | 'global-settings';
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
    destination: target.category === 'history' ? 'account-detail' : 'snapshot-panel',
    shouldHighlight: false,
    highlightMs: 0,
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
    ? SEARCH_FILTERABLE_RESULT_CATEGORIES.filter((category) => counts[category] > 0)
    : [visibleCategory];

export const getSearchResultsForCategory = (
  output: GlobalSearchOutput,
  category: SearchCategory,
  limit?: number
) => {
  const results = category === 'all' ? output.allResults : output.resultsByCategory[category];

  return typeof limit === 'number' ? results.slice(0, limit) : results;
};

export const getSearchKeyboardEntries = (
  output: GlobalSearchOutput,
  visibleCategory: SearchCategory,
  limit?: number
): SearchKeyboardEntry[] => {
  const results = getSearchResultsForCategory(output, visibleCategory, limit);

  return results.map((result) => ({
    id: getSearchResultItemId(result.target),
    kind: 'result' as const,
    target: result.target
  }));
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
  const safeIndex = currentIndex >= 0 ? currentIndex : direction > 0 ? -1 : entries.length;
  const nextIndex = safeIndex + direction;

  if (nextIndex < 0) {
    return entries[0] ?? null;
  }

  if (nextIndex >= entries.length) {
    return entries[entries.length - 1] ?? null;
  }

  return entries[nextIndex] ?? null;
};

export type SearchEnterResolution = { kind: 'open-result'; result: GlobalSearchResult };

export const getSearchEnterResolution = (
  entries: SearchKeyboardEntry[],
  focusedItemId: string,
  output: GlobalSearchOutput
): SearchEnterResolution | null => {
  const activeEntry = entries.find((entry) => entry.id === focusedItemId) ?? entries[0];

  if (!activeEntry) {
    return null;
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
