import {
  type KeyboardEvent,
  type MutableRefObject,
  type UIEvent,
  useLayoutEffect,
  useMemo,
  useRef
} from 'react';
import type {
  GlobalSearchOutput,
  GlobalSearchResult,
  SearchCategory
} from '../../search/searchTypes';
import { SEARCH_CATEGORY_TABS } from '../../search/searchTypes';
import {
  getNextKeyboardEntry,
  getSearchEnterResolution,
  getSearchKeyboardEntries,
  getSearchResultsForCategory
} from '../../search/searchNavigation';
import SearchCategoryTabs from './SearchCategoryTabs';
import SearchResultList from './SearchResultList';

export type GlobalSearchPanelProps = {
  output: GlobalSearchOutput;
  query: string;
  isComposing: boolean;
  statusText: string | null;
  isRefreshing: boolean;
  isInitialSearching: boolean;
  canInteractWithResults: boolean;
  resultPresentationVersion: number;
  selectedCategory: SearchCategory;
  visibleCategory: SearchCategory;
  categoryLockedByUser: boolean;
  selectedItemId: string;
  hoveredItemId: string;
  resultLimit: number;
  scrollTop: number;
  lastOpenedResultId: string;
  inputRef: MutableRefObject<HTMLInputElement | null>;
  onQueryChange: (value: string, nativeIsComposing?: boolean) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (value: string) => void;
  onClearQuery: () => void;
  onSelectCategory: (category: SearchCategory) => void;
  onShowAll: () => void;
  onSelectItem: (itemId: string) => void;
  onHoverItem: (itemId: string) => void;
  onClearHover: () => void;
  onLoadMoreResults: (minimum?: number) => void;
  onScrollChange: (scrollTop: number) => void;
  onOpenResult: (result: GlobalSearchResult) => void;
  onPointerIntent: () => void;
};

function GlobalSearchPanel({
  output,
  query,
  isComposing,
  statusText,
  isRefreshing,
  isInitialSearching,
  canInteractWithResults,
  resultPresentationVersion,
  selectedCategory,
  visibleCategory,
  categoryLockedByUser,
  selectedItemId,
  hoveredItemId,
  resultLimit,
  scrollTop,
  lastOpenedResultId,
  inputRef,
  onQueryChange,
  onCompositionStart,
  onCompositionEnd,
  onClearQuery,
  onSelectCategory,
  onShowAll,
  onSelectItem,
  onHoverItem,
  onClearHover,
  onLoadMoreResults,
  onScrollChange,
  onOpenResult,
  onPointerIntent
}: GlobalSearchPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const keyboardEntries = useMemo(
    () => statusText || !canInteractWithResults
      ? []
      : getSearchKeyboardEntries(output, visibleCategory, resultLimit),
    [canInteractWithResults, output, visibleCategory, resultLimit, statusText]
  );
  const fullKeyboardEntries = useMemo(
    () => statusText || !canInteractWithResults
      ? []
      : getSearchKeyboardEntries(output, visibleCategory),
    [canInteractWithResults, output, statusText, visibleCategory]
  );
  const registerItemRef = (itemId: string) => (element: HTMLButtonElement | null) => {
    if (element) {
      itemRefs.current.set(itemId, element);
      return;
    }

    itemRefs.current.delete(itemId);
  };

  const selectItem = (itemId: string) => {
    onSelectItem(itemId);
    window.requestAnimationFrame(() => {
      itemRefs.current.get(itemId)?.focus();
    });
  };

  const switchCategory = (direction: 1 | -1) => {
    const currentIndex = SEARCH_CATEGORY_TABS.indexOf(selectedCategory);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex =
      (safeIndex + direction + SEARCH_CATEGORY_TABS.length) % SEARCH_CATEGORY_TABS.length;
    const nextCategory = SEARCH_CATEGORY_TABS[nextIndex] ?? 'all';

    onSelectCategory(nextCategory);
  };

  useLayoutEffect(() => {
    const resultsElement = resultsRef.current;

    if (!resultsElement) {
      return;
    }

    resultsElement.scrollTo({ top: scrollTop });
  }, [resultPresentationVersion, visibleCategory]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isComposing || event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      onPointerIntent();
      switchCategory(event.key === 'ArrowRight' ? 1 : -1);
      return;
    }

    if (event.key === 'Escape' && selectedCategory !== 'all') {
      event.preventDefault();
      event.stopPropagation();
      onShowAll();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (fullKeyboardEntries.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onPointerIntent();

      const activeItemId = hoveredItemId || selectedItemId;
      const activeIndex = fullKeyboardEntries.findIndex((entry) => entry.id === activeItemId);

      if (
        event.key === 'ArrowDown' &&
        activeIndex === fullKeyboardEntries.length - 1 &&
        fullKeyboardEntries.length < output.counts[visibleCategory]
      ) {
        event.preventDefault();
        event.stopPropagation();
        onLoadMoreResults(fullKeyboardEntries.length + 1);
        return;
      }

      const nextEntry = getNextKeyboardEntry(
        fullKeyboardEntries,
        activeItemId,
        event.key === 'ArrowDown' ? 1 : -1
      );

      if (nextEntry) {
        const nextIndex = fullKeyboardEntries.findIndex((entry) => entry.id === nextEntry.id);

        if (nextIndex >= resultLimit) {
          onLoadMoreResults(nextIndex + 1);
        }

        onClearHover();
        selectItem(nextEntry.id);
      }

      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    const enterResolution = getSearchEnterResolution(
      fullKeyboardEntries,
      hoveredItemId || selectedItemId,
      output
    );

    if (!enterResolution) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onPointerIntent();

    onOpenResult(enterResolution.result);
  };

  const handleResultsScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;

    onScrollChange(element.scrollTop);

    if (element.scrollHeight - element.scrollTop - element.clientHeight <= 120) {
      const totalResults = output.counts[visibleCategory];

      if (resultLimit < totalResults) {
        onLoadMoreResults();
      }
    }
  };

  return (
    <section
      ref={panelRef}
      className="search-panel"
      aria-label="全局搜索"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
      onMouseDown={onPointerIntent}
    >
      <label className="search-field">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <path
            d="M10.7 18.4a7.7 7.7 0 1 1 0-15.4 7.7 7.7 0 0 1 0 15.4zM16.3 16.3L21 21"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          aria-label="搜索账户、历史记录、快照或设置项"
          placeholder="搜索账户、历史记录、快照或设置项"
          value={query}
          onChange={(event) =>
            onQueryChange(
              event.target.value,
              Boolean((event.nativeEvent as InputEvent).isComposing)
            )
          }
          onCompositionStart={onCompositionStart}
          onCompositionEnd={(event) => onCompositionEnd(event.currentTarget.value)}
        />
        {query ? (
          <button
            type="button"
            className="search-field__clear"
            aria-label="清空搜索"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClearQuery}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 7l10 10M17 7L7 17"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </label>

      <SearchCategoryTabs
        counts={output.counts}
        selectedCategory={selectedCategory}
        locked={categoryLockedByUser}
        onPointerIntent={onPointerIntent}
        onSelectCategory={onSelectCategory}
      />

      <div
        ref={resultsRef}
        className="search-results"
        aria-live="polite"
        aria-busy={isRefreshing || isInitialSearching}
        onWheel={onPointerIntent}
        onMouseLeave={onClearHover}
        onScroll={handleResultsScroll}
      >
        <div
          key={resultPresentationVersion}
          className="search-results__content"
          data-result-entering={
            resultPresentationVersion > 0 && !statusText && output.hasQuery
              ? 'true'
              : undefined
          }
        >
          {statusText ? (
            <p className="search-empty">{statusText}</p>
          ) : (
            <SearchResultList
              output={output}
              visibleCategory={visibleCategory}
              selectedItemId={selectedItemId}
              hoveredItemId={hoveredItemId}
              resultLimit={resultLimit}
              lastOpenedResultId={lastOpenedResultId}
              registerItemRef={registerItemRef}
              onSelectItem={onSelectItem}
              onHoverItem={onHoverItem}
              onClearHover={onClearHover}
              onPointerIntent={onPointerIntent}
              onOpenResult={onOpenResult}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default GlobalSearchPanel;
