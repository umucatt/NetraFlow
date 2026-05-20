import type { SearchCategory, SearchCategoryCounts } from '../../search/searchTypes';
import { SEARCH_CATEGORY_LABELS, SEARCH_CATEGORY_TABS } from '../../search/searchTypes';

const formatApproxSearchCount = (count: number) => (count > 99 ? '99+' : String(count));

type SearchCategoryTabsProps = {
  counts: SearchCategoryCounts;
  selectedCategory: SearchCategory;
  locked: boolean;
  onPointerIntent: () => void;
  onSelectCategory: (category: SearchCategory) => void;
};

function SearchCategoryTabs({
  counts,
  selectedCategory,
  locked,
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

        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`search-category-tab global-search-filter-tab${
              isActive ? ' is-selected search-category-tab--active' : ''
            }${locked && isActive ? ' search-category-tab--locked' : ''}`}
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
