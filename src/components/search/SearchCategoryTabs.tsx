import type { SearchCategory, SearchCategoryCounts } from '../../search/searchTypes';
import { SEARCH_CATEGORY_LABELS, SEARCH_CATEGORY_TABS } from '../../search/searchTypes';
import { getSearchCategoryItemId } from '../../search/searchNavigation';

const formatApproxSearchCount = (count: number) => (count > 99 ? '99+' : String(count));

type SearchCategoryTabsProps = {
  counts: SearchCategoryCounts;
  selectedCategory: SearchCategory;
  focusedItemId: string;
  locked: boolean;
  registerItemRef: (itemId: string) => (element: HTMLButtonElement | null) => void;
  onFocusItem: (itemId: string) => void;
  onPointerIntent: () => void;
  onSelectCategory: (category: SearchCategory) => void;
};

function SearchCategoryTabs({
  counts,
  selectedCategory,
  focusedItemId,
  locked,
  registerItemRef,
  onFocusItem,
  onPointerIntent,
  onSelectCategory
}: SearchCategoryTabsProps) {
  return (
    <div
      className="search-categories segmented-control global-search-filter-tabs"
      role="tablist"
      aria-label="搜索分类"
    >
      {SEARCH_CATEGORY_TABS.map((category) => {
        const isActive = selectedCategory === category;
        const itemId = getSearchCategoryItemId(category);
        const isFocused = focusedItemId === itemId;

        return (
          <button
            key={category}
            ref={registerItemRef(itemId)}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-search-item-id={itemId}
            className={`search-category-tab global-search-filter-tab${
              isActive ? ' is-selected search-category-tab--active' : ''
            }${
              isFocused ? ' search-category-tab--focused' : ''
            }${locked && isActive ? ' search-category-tab--locked' : ''}`}
            onFocus={() => onFocusItem(itemId)}
            onMouseDown={onPointerIntent}
            onClick={() => onSelectCategory(category)}
          >
            <span className="search-category-tab__label global-search-filter-tab__label">
              {SEARCH_CATEGORY_LABELS[category]}
            </span>
            <strong className="search-category-tab__badge">
              {formatApproxSearchCount(counts[category])}
            </strong>
          </button>
        );
      })}
    </div>
  );
}

export default SearchCategoryTabs;
