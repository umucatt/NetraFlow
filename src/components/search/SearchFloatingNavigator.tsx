import type { SearchNavigationTarget } from '../../search/searchTypes';
import { SEARCH_CATEGORY_LABELS } from '../../search/searchTypes';

type SearchFloatingNavigatorProps = {
  currentTarget: SearchNavigationTarget;
  canMove: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onReturn: () => void;
  onExit: () => void;
};

function SearchFloatingNavigator({
  currentTarget,
  canMove,
  onPrevious,
  onNext,
  onReturn,
  onExit
}: SearchFloatingNavigatorProps) {
  return (
    <div className="search-floating-navigation" role="navigation" aria-label="搜索结果导航">
      <span className="search-floating-navigation__label">
        {SEARCH_CATEGORY_LABELS[currentTarget.category]}
      </span>
      <button type="button" disabled={!canMove} onClick={onPrevious}>
        上一条
      </button>
      <button type="button" disabled={!canMove} onClick={onNext}>
        下一条
      </button>
      <button type="button" onClick={onReturn}>
        返回
      </button>
      <button type="button" onClick={onExit}>
        退出
      </button>
    </div>
  );
}

export default SearchFloatingNavigator;
