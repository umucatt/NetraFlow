import {
  type KeyboardEvent,
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef
} from 'react';
import type {
  GlobalSearchOutput,
  GlobalSearchResult,
  SearchCategory
} from '../../search/searchTypes';
import {
  getNextKeyboardEntry,
  getSearchEnterResolution,
  getSearchKeyboardEntries
} from '../../search/searchNavigation';
import SearchCategoryTabs from './SearchCategoryTabs';
import SearchResultList from './SearchResultList';

type GlobalSearchPanelProps = {
  output: GlobalSearchOutput;
  query: string;
  selectedCategory: SearchCategory;
  categoryLockedByUser: boolean;
  focusedItemId: string;
  scrollTop: number;
  lastOpenedResultId: string;
  inputRef: MutableRefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  onSelectCategory: (category: SearchCategory) => void;
  onShowAll: () => void;
  onFocusItem: (itemId: string) => void;
  onScrollChange: (scrollTop: number) => void;
  onOpenResult: (result: GlobalSearchResult) => void;
  onPointerIntent: () => void;
};

function GlobalSearchPanel({
  output,
  query,
  selectedCategory,
  categoryLockedByUser,
  focusedItemId,
  scrollTop,
  lastOpenedResultId,
  inputRef,
  onQueryChange,
  onClearQuery,
  onSelectCategory,
  onShowAll,
  onFocusItem,
  onScrollChange,
  onOpenResult,
  onPointerIntent
}: GlobalSearchPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const visibleCategory = selectedCategory;
  const keyboardEntries = useMemo(
    () => getSearchKeyboardEntries(output, visibleCategory),
    [output, visibleCategory]
  );
  const keyboardEntryKey = keyboardEntries.map((entry) => entry.id).join('|');

  const registerItemRef = (itemId: string) => (element: HTMLButtonElement | null) => {
    if (element) {
      itemRefs.current.set(itemId, element);
      return;
    }

    itemRefs.current.delete(itemId);
  };

  const focusItem = (itemId: string) => {
    onFocusItem(itemId);
    window.requestAnimationFrame(() => {
      itemRefs.current.get(itemId)?.focus();
    });
  };

  useEffect(() => {
    if (!focusedItemId) {
      return;
    }

    if (!keyboardEntries.some((entry) => entry.id === focusedItemId)) {
      onFocusItem('');
    }
  }, [focusedItemId, keyboardEntries, keyboardEntryKey, onFocusItem]);

  useEffect(() => {
    const resultsElement = resultsRef.current;

    if (!resultsElement) {
      return;
    }

    resultsElement.scrollTo({ top: scrollTop });
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      return;
    }

    if (event.key === 'Escape' && visibleCategory !== 'all') {
      event.preventDefault();
      event.stopPropagation();
      onShowAll();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (keyboardEntries.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onPointerIntent();

      const nextEntry = getNextKeyboardEntry(
        keyboardEntries,
        focusedItemId,
        event.key === 'ArrowDown' ? 1 : -1
      );

      if (nextEntry) {
        focusItem(nextEntry.id);
      }

      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    const enterResolution = getSearchEnterResolution(keyboardEntries, focusedItemId, output);

    if (!enterResolution) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onPointerIntent();

    if (enterResolution.kind === 'select-category') {
      onSelectCategory(enterResolution.category);
      focusItem(`search-category:${enterResolution.category}`);
      return;
    }

    onOpenResult(enterResolution.result);
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
          onChange={(event) => onQueryChange(event.target.value)}
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
        focusedItemId={focusedItemId}
        locked={categoryLockedByUser}
        registerItemRef={registerItemRef}
        onFocusItem={onFocusItem}
        onPointerIntent={onPointerIntent}
        onSelectCategory={onSelectCategory}
      />

      <div
        ref={resultsRef}
        className="search-results"
        aria-live="polite"
        onWheel={onPointerIntent}
        onScroll={(event) => onScrollChange(event.currentTarget.scrollTop)}
      >
        <SearchResultList
          output={output}
          query={query}
          visibleCategory={visibleCategory}
          focusedItemId={focusedItemId}
          lastOpenedResultId={lastOpenedResultId}
          registerItemRef={registerItemRef}
          onFocusItem={onFocusItem}
          onPointerIntent={onPointerIntent}
          onOpenResult={onOpenResult}
        />
      </div>
    </section>
  );
}

export default GlobalSearchPanel;
