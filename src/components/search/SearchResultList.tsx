import type {
  GlobalSearchOutput,
  GlobalSearchResult,
  SearchCategory,
  SearchResultCategory
} from '../../search/searchTypes';
import { SEARCH_CATEGORY_LABELS } from '../../search/searchTypes';
import { getVisibleSearchCategories } from '../../search/searchNavigation';
import SearchResultItem from './SearchResultItem';

const formatApproxSearchCount = (count: number) => (count > 99 ? '99+' : String(count));

type SearchResultListProps = {
  output: GlobalSearchOutput;
  query: string;
  visibleCategory: SearchCategory;
  focusedItemId: string;
  lastOpenedResultId: string;
  registerItemRef: (itemId: string) => (element: HTMLButtonElement | null) => void;
  onFocusItem: (itemId: string) => void;
  onPointerIntent: () => void;
  onOpenResult: (result: GlobalSearchResult) => void;
};

function SearchSection({
  category,
  output,
  query,
  visibleCategory,
  focusedItemId,
  lastOpenedResultId,
  registerItemRef,
  onFocusItem,
  onPointerIntent,
  onOpenResult
}: SearchResultListProps & { category: SearchResultCategory }) {
  const results = output.resultsByCategory[category];

  if (results.length === 0) {
    return null;
  }

  return (
    <section className="search-section">
      {visibleCategory === 'all' ? (
        <div className="search-section__header">
          <h3>{SEARCH_CATEGORY_LABELS[category]}</h3>
          <span>{formatApproxSearchCount(results.length)}</span>
        </div>
      ) : null}
      <div className="search-section__list">
        {results.map((result) => (
          <SearchResultItem
            key={result.target.key}
            result={result}
            query={query}
            focused={focusedItemId === `search-result:${result.target.key}`}
            recentlyOpened={lastOpenedResultId === result.target.key}
            allowInferredHighlights={output.searchLogicMode === 'infer'}
            registerItemRef={registerItemRef}
            onFocusItem={onFocusItem}
            onPointerIntent={onPointerIntent}
            onOpen={onOpenResult}
          />
        ))}
      </div>
    </section>
  );
}

function SearchResultList(props: SearchResultListProps) {
  const { output, visibleCategory } = props;
  const visibleCategories = getVisibleSearchCategories(visibleCategory, output.counts);
  const activeSearchCount = output.counts[visibleCategory];

  if (!output.hasQuery) {
    return null;
  }

  if (activeSearchCount === 0) {
    return <p className="search-empty">未找到相关结果</p>;
  }

  return (
    <>
      {visibleCategories.map((category) => (
        <SearchSection key={category} {...props} category={category} />
      ))}
    </>
  );
}

export default SearchResultList;
