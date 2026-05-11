import type { ReactNode } from 'react';
import type { GlobalSearchResult } from '../../search/searchTypes';
import { getSearchHighlightRanges } from '../../search/searchHighlight';
import { getSearchResultItemId } from '../../search/searchNavigation';

type SearchResultItemProps = {
  result: GlobalSearchResult;
  query: string;
  focused: boolean;
  recentlyOpened: boolean;
  allowInferredHighlights: boolean;
  registerItemRef: (itemId: string) => (element: HTMLButtonElement | null) => void;
  onFocusItem: (itemId: string) => void;
  onPointerIntent: () => void;
  onOpen: (result: GlobalSearchResult) => void;
};

const renderHighlightedText = (
  value: string,
  query: string,
  allowInferredHighlights: boolean
) => {
  const text = String(value);
  const ranges = getSearchHighlightRanges(text, query, {
    allowInferred: allowInferredHighlights
  });

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

const getRelevanceLabel = (result: GlobalSearchResult) => {
  if (result.strength === 'strong') {
    return '强相关';
  }

  if (result.strength === 'medium') {
    return '中相关';
  }

  return '弱相关';
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

const SEARCH_RESULT_TEXT_MARKS = {
  history: '记录',
  snapshot: '快照',
  settings: '设置'
} as const;

function SearchResultMark({ result }: { result: GlobalSearchResult }) {
  if (result.category === 'account') {
    return (
      <span className="search-result-mark search-result-mark--account" aria-hidden="true">
        {result.mark}
      </span>
    );
  }

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
  query,
  focused,
  recentlyOpened,
  allowInferredHighlights,
  registerItemRef,
  onFocusItem,
  onPointerIntent,
  onOpen
}: SearchResultItemProps) {
  const itemId = getSearchResultItemId(result.target);

  return (
    <button
      ref={registerItemRef(itemId)}
      type="button"
      data-search-item-id={itemId}
      className={`search-result-button search-result-button--${result.strength}${
        result.isWeakRelated ? ' search-result-button--weak' : ''
      }${focused ? ' search-result-button--focused' : ''}${
        recentlyOpened ? ' search-result-button--returned' : ''
      }`}
      onFocus={() => onFocusItem(itemId)}
      onMouseDown={onPointerIntent}
      onClick={() => onOpen(result)}
    >
      <SearchResultMark result={result} />
      <span className="search-result-copy">
        <strong>{renderHighlightedText(result.title, query, allowInferredHighlights)}</strong>
        <span>{renderHighlightedText(result.subtitle, query, allowInferredHighlights)}</span>
      </span>
      <span className={`search-result-value${getSignedSearchValueClassName(result)}`}>
        {renderHighlightedText(result.value, query, allowInferredHighlights)}
        <span className={`search-result-relevance search-result-relevance--${result.strength}`}>
          {getRelevanceLabel(result)}
        </span>
      </span>
    </button>
  );
}

export default SearchResultItem;
