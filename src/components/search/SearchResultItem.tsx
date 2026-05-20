import type { ReactNode } from 'react';
import type { GlobalSearchResult, SearchHighlightRange } from '../../search/searchTypes';
import { getSearchResultItemId } from '../../search/searchNavigation';

type SearchResultItemProps = {
  result: GlobalSearchResult;
  selected: boolean;
  hovered: boolean;
  recentlyOpened: boolean;
  registerItemRef: (itemId: string) => (element: HTMLButtonElement | null) => void;
  onSelectItem: (itemId: string) => void;
  onHoverItem: (itemId: string) => void;
  onClearHover: () => void;
  onPointerIntent: () => void;
  onOpen: (result: GlobalSearchResult) => void;
};

const renderHighlightedText = (value: string, ranges: SearchHighlightRange[]) => {
  const text = String(value);

  if (ranges.length === 0) {
    return text;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      parts.push(text.slice(cursor, range.start));
    }

    parts.push(
      <mark
        key={`${range.start}-${range.end}-${index}`}
        className={`search-highlight search-highlight--${range.strength}`}
      >
        {text.slice(range.start, range.end)}
      </mark>
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
};

const getSignedSearchValueClassName = (result: GlobalSearchResult) => {
  if (result.category === 'account') {
    if (result.account.amount > 0) {
      return ' signed-amount signed-amount--positive';
    }

    if (result.account.amount < 0) {
      return ' signed-amount signed-amount--negative';
    }
  }

  if (result.category === 'history') {
    if (result.matchedAmount && result.matchedAmount.displayMode !== 'delta') {
      return ' search-result-value--balance';
    }

    const beforeAmount = result.record.beforeAmount ?? 0;
    const afterAmount = result.record.afterAmount ?? 0;
    const delta = afterAmount - beforeAmount;

    if (delta > 0) {
      return ' signed-amount signed-amount--positive';
    }

    if (delta < 0) {
      return ' signed-amount signed-amount--negative';
    }
  }

  const value = result.value.trim();

  if (value.startsWith('+')) {
    return ' signed-amount signed-amount--positive';
  }

  if (value.startsWith('-')) {
    return ' signed-amount signed-amount--negative';
  }

  return '';
};

const getSearchValueClassName = (result: GlobalSearchResult) => {
  const classes = ['search-result-value'];
  const signedClassName = getSignedSearchValueClassName(result).trim();

  if (signedClassName) {
    classes.push(signedClassName);
  }

  if (result.matchedAmount?.displayMode === 'balance-range') {
    classes.push('search-result-value--range');
  }

  return classes.join(' ');
};

const SEARCH_RESULT_TEXT_MARKS = {
  account: '账户',
  history: '记录',
  snapshot: '快照',
  settings: '设置'
} as const;

function SearchResultMark({ result }: { result: GlobalSearchResult }) {
  return (
    <span
      className={`search-result-mark search-result-mark--text search-result-mark--${result.category}`}
      aria-hidden="true"
    >
      {SEARCH_RESULT_TEXT_MARKS[result.category]}
    </span>
  );
}

function SearchResultItem({
  result,
  selected,
  hovered,
  registerItemRef,
  onSelectItem,
  onHoverItem,
  onClearHover,
  onPointerIntent,
  onOpen
}: SearchResultItemProps) {
  const itemId = getSearchResultItemId(result.target);
  const isPreviewed = selected || hovered;
  const matchText = result.matchLabel === 'hit' ? '命中' : '推断';

  return (
    <button
      ref={registerItemRef(itemId)}
      type="button"
      data-search-item-id={itemId}
      className={`search-result-button search-result-button--${result.matchLabel}${
        isPreviewed ? ' search-result-button--focused' : ''
      }${hovered ? ' search-result-button--hovered' : ''}`}
      onFocus={() => onSelectItem(itemId)}
      onMouseEnter={() => onHoverItem(itemId)}
      onMouseLeave={onClearHover}
      onMouseDown={onPointerIntent}
      onClick={() => onSelectItem(itemId)}
      onDoubleClick={() => onOpen(result)}
    >
      <SearchResultMark result={result} />
      <span className="search-result-copy">
        <strong>{renderHighlightedText(result.title, result.highlights.title)}</strong>
        <span>{renderHighlightedText(result.subtitle, result.highlights.subtitle)}</span>
      </span>
      <span className={getSearchValueClassName(result)}>
        <span className="search-result-value__amount">
          {renderHighlightedText(result.value, result.highlights.value)}
        </span>
        <span className={`search-result-match search-result-match--${result.matchLabel}`}>
          {matchText}
        </span>
      </span>
    </button>
  );
}

export default SearchResultItem;
