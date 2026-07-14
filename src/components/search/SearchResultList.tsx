import type { GlobalSearchOutput, GlobalSearchResult, SearchCategory } from '../../search/searchTypes';
import { getSearchResultItemId, getSearchResultsForCategory } from '../../search/searchNavigation';
import SearchResultItem from './SearchResultItem';

type SearchResultListProps = {
  output: GlobalSearchOutput;
  visibleCategory: SearchCategory;
  selectedItemId: string;
  hoveredItemId: string;
  resultLimit: number;
  lastOpenedResultId: string;
  registerItemRef: (itemId: string) => (element: HTMLButtonElement | null) => void;
  onSelectItem: (itemId: string) => void;
  onHoverItem: (itemId: string) => void;
  onClearHover: () => void;
  onPointerIntent: () => void;
  onOpenResult: (result: GlobalSearchResult) => void;
};

function SearchResultList({
  output,
  visibleCategory,
  selectedItemId,
  hoveredItemId,
  resultLimit,
  lastOpenedResultId,
  registerItemRef,
  onSelectItem,
  onHoverItem,
  onClearHover,
  onPointerIntent,
  onOpenResult
}: SearchResultListProps) {
  const allResults = getSearchResultsForCategory(output, visibleCategory);
  const visibleResults = allResults.slice(0, resultLimit);
  const activeSearchCount = allResults.length;
  const activeItemId = hoveredItemId || selectedItemId;
  const emptyText =
    output.searchLogicMode === 'strict'
      ? '没有找到命中结果，可在全局设置中开启推断匹配'
      : '未找到相关结果';

  if (!output.hasQuery) {
    return null;
  }

  if (activeSearchCount === 0) {
    return <p className="search-empty">{emptyText}</p>;
  }

  return (
    <div className="search-section__list search-section__list--unified">
      {visibleResults.map((result) => {
        const itemId = getSearchResultItemId(result.target);

        return (
          <SearchResultItem
            key={result.target.key}
            result={result}
            active={activeItemId === itemId}
            recentlyOpened={lastOpenedResultId === result.target.key}
            registerItemRef={registerItemRef}
            onSelectItem={onSelectItem}
            onHoverItem={onHoverItem}
            onClearHover={onClearHover}
            onPointerIntent={onPointerIntent}
            onOpen={onOpenResult}
          />
        );
      })}
    </div>
  );
}

export default SearchResultList;
