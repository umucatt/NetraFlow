import type {
  AccountSearchResult,
  AssetGroupWithAccounts,
  BackupRecord,
  CreateSearchIndexOptions,
  GlobalSearchOutput,
  GlobalSearchResult,
  HistoryRecord,
  HistorySearchResult,
  RunSearchOptions,
  SearchCandidate,
  SearchDisplayField,
  SearchHighlightRange,
  SearchIndexedData,
  SearchIndexedTextField,
  SearchLogicMode,
  SearchMatchedAmount,
  SearchNavigationTarget,
  SearchPrimaryMatch,
  SearchResultHighlights,
  SearchResultCategory,
  SettingsSearchResult,
  SnapshotSearchResult
} from './searchTypes';
import { parseSearchIntent } from './searchIntent';
import { createSearchTextIndexer, type SearchTextIndexer } from './searchNormalize';
import {
  applySearchTypeAdjustment,
  compareSearchResults,
  getSearchResultStrength,
  passesSearchThreshold,
  scoreSearchCandidate
} from './searchScoring';
import { getSearchHighlightRanges, mergeHighlightRanges } from './searchHighlight';
import { measureSearchExecution } from './searchPerformance';
import {
  createAccountSearchTarget,
  createHistorySearchTarget,
  createSettingsSearchTarget,
  createSnapshotSearchTarget
} from './searchNavigation';

type SearchScoredCandidate = NonNullable<ReturnType<typeof scoreSearchCandidate>>;
type SearchScoredTermMatch = SearchScoredCandidate['termMatches'][number];
type HistoryBalanceSignLookup = {
  accountIds: Set<string>;
  accountNames: Set<string>;
};
type HistoryAmountDisplay = {
  delta: string;
  balanceBefore: string;
  balanceAfter: string;
  balanceRange: string;
};

const createIndexedTextField = (
  value: string | null | undefined,
  role: SearchIndexedTextField['role'],
  weight: number,
  inferredKind: SearchIndexedTextField['inferredKind'] | undefined,
  textIndexer: SearchTextIndexer
): SearchIndexedTextField => ({
  value,
  role,
  weight,
  inferredKind,
  index: textIndexer.getNormalizedTextIndex(value),
  pinyin: textIndexer.getPinyinParts(String(value ?? ''))
});

const getTopScore = (results: Array<{ score: number }>) => results[0]?.score ?? 0;

const SEARCH_DISPLAY_FIELDS: SearchDisplayField[] = ['title', 'subtitle', 'value'];

const createEmptyResultHighlights = (): SearchResultHighlights => ({
  title: [],
  subtitle: [],
  value: []
});

const offsetHighlightRanges = (
  ranges: SearchHighlightRange[],
  offset: number
): SearchHighlightRange[] =>
  ranges.map((range) => ({
    ...range,
    start: range.start + offset,
    end: range.end + offset
  }));

const getTextMatchDisplayRanges = (value: string, match: SearchScoredTermMatch) => {
  if (match.label !== 'hit' || match.source !== 'text' || !match.highlightText) {
    return [];
  }

  const sourceIndex = value.indexOf(match.highlightText);

  if (sourceIndex < 0) {
    return [];
  }

  return offsetHighlightRanges(match.highlightRanges, sourceIndex);
};

const getStructuredMatchDisplayRanges = (
  field: SearchDisplayField,
  value: string,
  match: SearchScoredTermMatch
) => {
  if (match.label !== 'hit') {
    return [];
  }

  if (match.source === 'date' && field !== 'value') {
    return getSearchHighlightRanges(value, match.term.raw, { allowInferred: false });
  }

  if (match.source === 'amount' && field === 'value') {
    return getSearchHighlightRanges(value, match.term.raw, { allowInferred: false });
  }

  return [];
};

const getResultHighlights = (
  display: Record<SearchDisplayField, string>,
  termMatches: SearchScoredTermMatch[]
): SearchResultHighlights =>
  SEARCH_DISPLAY_FIELDS.reduce<SearchResultHighlights>((highlights, field) => {
    const value = display[field];
    const ranges = termMatches.flatMap((match) => [
      ...getTextMatchDisplayRanges(value, match),
      ...getStructuredMatchDisplayRanges(field, value, match)
    ]);

    highlights[field] = mergeHighlightRanges(ranges);
    return highlights;
  }, createEmptyResultHighlights());

const getResultMatchFields = (
  scored: SearchScoredCandidate,
  termCount: number,
  display: Record<SearchDisplayField, string>
) => ({
  matchLabel: scored.matchLabel,
  matchKind: scored.matchKind,
  highlights: getResultHighlights(display, scored.termMatches),
  isWeakRelated: false,
  strength: getSearchResultStrength(scored.matchLabel, scored.matchedTermCount, termCount)
});

const createSourceText = (record: HistoryRecord) =>
  record.relatedTime ? '汇总导入' : record.note?.includes('闪记') ? '闪记' : '';

const createSearchCompactAmountFormatter = () => {
  const formatter = new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  });

  return (amount: number, preserveNegativeSign = false) => {
    const formattedAmount = formatter.format(Math.round(Math.abs(amount)));

    return preserveNegativeSign && amount < 0 ? `-${formattedAmount}` : formattedAmount;
  };
};

const formatSearchSignedAmount = (
  amount: number,
  formatCompactAmount: ReturnType<typeof createSearchCompactAmountFormatter>
) => {
  if (amount > 0) {
    return `+${formatCompactAmount(amount)}`;
  }

  if (amount < 0) {
    return `-${formatCompactAmount(amount)}`;
  }

  return '0';
};

const formatSearchBalanceAmount = (
  amount: number | null | undefined,
  preserveNegativeSign = false,
  formatCompactAmount: ReturnType<typeof createSearchCompactAmountFormatter>
) => {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return '-';
  }

  return formatCompactAmount(amount, preserveNegativeSign);
};

const getHistoryBalanceDisplayText = (
  record: HistoryRecord,
  matchedAmount: number,
  preserveNegativeSign: boolean,
  formatCompactAmount: ReturnType<typeof createSearchCompactAmountFormatter>
) => {
  const beforeAmount = record.beforeAmount;
  const afterAmount = record.afterAmount;

  if (
    typeof beforeAmount === 'number' &&
    Number.isFinite(beforeAmount) &&
    typeof afterAmount === 'number' &&
    Number.isFinite(afterAmount)
  ) {
    return `${formatSearchBalanceAmount(beforeAmount, preserveNegativeSign, formatCompactAmount)} → ${formatSearchBalanceAmount(
      afterAmount,
      preserveNegativeSign,
      formatCompactAmount
    )}`;
  }

  return formatSearchBalanceAmount(matchedAmount, preserveNegativeSign, formatCompactAmount);
};

const getHistoryAccountLookupKey = (groupName: string, accountName: string) =>
  `${groupName}\u0000${accountName}`;

const createHistoryBalanceSignLookup = (groups: AssetGroupWithAccounts[]): HistoryBalanceSignLookup => {
  const accountIds = new Set<string>();
  const accountNames = new Set<string>();

  groups.forEach((group) => {
    if (group.nature !== 'liability') {
      return;
    }

    group.accounts.forEach((account) => {
      accountIds.add(account.id);
      accountNames.add(getHistoryAccountLookupKey(group.name, account.name));
    });
  });

  return { accountIds, accountNames };
};

const shouldPreserveHistoryBalanceSign = (
  lookup: HistoryBalanceSignLookup,
  record: HistoryRecord
) =>
  lookup.accountIds.has(record.accountId) ||
  lookup.accountNames.has(getHistoryAccountLookupKey(record.groupName, record.accountName));

const getHistoryMatchedAmount = (
  record: HistoryRecord,
  match: SearchScoredTermMatch,
  amountDisplay: HistoryAmountDisplay,
  defaultValue: string
): SearchMatchedAmount | null => {
  if (
    match.source !== 'amount' ||
    typeof match.amountValue !== 'number' ||
    !Number.isFinite(match.amountValue) ||
    !match.amountField
  ) {
    return null;
  }

  if (match.amountField === 'delta') {
    return {
      field: 'delta',
      value: match.amountValue,
      label: match.label,
      displayMode: 'delta',
      displayText: defaultValue
    };
  }

  if (match.amountField === 'balanceBefore' || match.amountField === 'balanceAfter') {
    return {
      field: match.amountField,
      value: match.amountValue,
      label: match.label,
      displayMode:
        typeof record.beforeAmount === 'number' && typeof record.afterAmount === 'number'
          ? 'balance-range'
          : 'balance',
      displayText:
        typeof record.beforeAmount === 'number' && typeof record.afterAmount === 'number'
          ? amountDisplay.balanceRange
          : match.amountField === 'balanceBefore'
            ? amountDisplay.balanceBefore
            : amountDisplay.balanceAfter
    };
  }

  return null;
};

const getGenericMatchedAmount = (
  match: SearchScoredTermMatch,
  displayText: string
): SearchMatchedAmount | null => {
  if (
    match.source !== 'amount' ||
    typeof match.amountValue !== 'number' ||
    !Number.isFinite(match.amountValue) ||
    !match.amountField
  ) {
    return null;
  }

  return {
    field: match.amountField,
    value: match.amountValue,
    label: match.label,
    displayMode: match.amountField === 'delta' ? 'delta' : 'balance',
    displayText
  };
};

const getPrimaryMatch = (
  match: SearchScoredTermMatch,
  display: Record<SearchDisplayField, string>,
  matchedAmount: SearchMatchedAmount | null
): SearchPrimaryMatch => {
  if (matchedAmount) {
    return {
      field: matchedAmount.field,
      label: matchedAmount.label,
      value: matchedAmount.value,
      displayText: matchedAmount.displayText
    };
  }

  if (match.source === 'date') {
    return {
      field: 'date',
      label: match.label,
      value: match.term.raw,
      displayText: display.subtitle
    };
  }

  const field = match.source === 'text' && match.role === 'name' ? 'title' : 'subtitle';

  return {
    field,
    label: match.label,
    value: field === 'title' ? display.title : display.subtitle,
    displayText: field === 'title' ? display.title : display.subtitle
  };
};

export const createGlobalSearchIndex = (
  groups: AssetGroupWithAccounts[],
  historyRecords: HistoryRecord[],
  snapshots: BackupRecord[],
  options: CreateSearchIndexOptions
): SearchIndexedData => {
  const historyBalanceSignLookup = createHistoryBalanceSignLookup(groups);
  const textIndexer = createSearchTextIndexer();
  const formatCompactAmount = createSearchCompactAmountFormatter();
  const accountNatureLabels = new Map<AssetGroupWithAccounts['nature'], string>();
  const historyTypeLabels = new Map<HistoryRecord['type'], string>();
  const backupMethodLabels = new Map<BackupRecord['method'], string>();
  const indexTextField = (
    value: string | null | undefined,
    role: SearchIndexedTextField['role'],
    weight: number,
    inferredKind?: SearchIndexedTextField['inferredKind']
  ) => createIndexedTextField(value, role, weight, inferredKind, textIndexer);
  const getAccountNatureLabel = (nature: AssetGroupWithAccounts['nature']) => {
    const cached = accountNatureLabels.get(nature);

    if (cached !== undefined) {
      return cached;
    }

    const label = options.getAccountNatureLabel(nature);
    accountNatureLabels.set(nature, label);
    return label;
  };
  const getHistoryTypeLabel = (type: HistoryRecord['type']) => {
    const cached = historyTypeLabels.get(type);

    if (cached !== undefined) {
      return cached;
    }

    const label = options.getHistoryTypeLabel(type);
    historyTypeLabels.set(type, label);
    return label;
  };
  const getBackupMethodLabel = (method: BackupRecord['method']) => {
    const cached = backupMethodLabels.get(method);

    if (cached !== undefined) {
      return cached;
    }

    const label = options.getBackupMethodLabel(method);
    backupMethodLabels.set(method, label);
    return label;
  };

  return {
  accounts: groups.flatMap((group, groupIndex) =>
    group.accounts.map((account, accountIndex) => {
      const archiveText = account.archived ? '已归档' : '账户';
      const subtitle = group.name;

      return {
        group,
        account,
        title: account.name,
        subtitle,
        value: options.formatMoney(account.amount),
        mark: options.getAccountMark(account),
        index: groupIndex * 1000 + accountIndex,
        candidate: {
          textFields: [
            indexTextField(account.name, 'name', 1),
            indexTextField(group.name, 'detail', 0.7),
            indexTextField(getAccountNatureLabel(group.nature), 'detail', 0.6),
            indexTextField(account.alias, 'detail', 0.5),
            indexTextField(options.getAccountMark(account), 'detail', 0.5),
            indexTextField(archiveText, 'detail', 0.5)
          ],
          dateFields: [
            { value: account.createdAt, weight: 0.35 },
            { value: account.archivedAt, weight: 0.35 }
          ],
          amountFields: [
            {
              value: account.amount,
              weight: 1,
              role: 'account-balance',
              matchField: 'accountBalance'
            }
          ],
          recencyDate: account.archivedAt ?? account.createdAt
        }
      };
    })
  ),
  history: historyRecords.map((record, index) => {
    const beforeAmount = record.beforeAmount ?? 0;
    const afterAmount = record.afterAmount ?? 0;
    const delta = afterAmount - beforeAmount;
    const sourceText = createSourceText(record);
    const preserveBalanceSign = shouldPreserveHistoryBalanceSign(
      historyBalanceSignLookup,
      record
    );
    const historyTypeLabel = getHistoryTypeLabel(record.type);

    return {
      record,
      historyTypeLabel,
      preserveBalanceSign,
      index,
      candidate: {
        textFields: [
          indexTextField(record.accountName, 'name', 0.9),
          indexTextField(record.groupName, 'detail', 0.7),
          indexTextField(record.type, 'detail', 0.65),
          indexTextField(historyTypeLabel, 'detail', 0.65),
          indexTextField(sourceText, 'detail', 0.58),
          indexTextField(record.note, 'weak', 0.45)
        ],
        dateFields: [
          { value: record.time, weight: 0.78 },
          { value: record.relatedTime, weight: 0.5 }
        ],
        amountFields: [
          {
            value: record.beforeAmount,
            weight: 0.85,
            role: 'history-balance',
            matchField: 'balanceBefore'
          },
          {
            value: record.afterAmount,
            weight: 0.85,
            role: 'history-balance',
            matchField: 'balanceAfter'
          },
          { value: delta, weight: 1, role: 'history-delta', matchField: 'delta' }
        ],
        recencyDate: record.time
      }
    };
  }),
  snapshots: snapshots.map((record, index) => ({
    record,
    title: options.formatPreciseBackupTime(record.backedUpAt),
    subtitle: getBackupMethodLabel(record.method),
    value: `${record.historyCount} / ${record.incrementCount}`,
    index,
    candidate: {
      textFields: [
        indexTextField(getBackupMethodLabel(record.method), 'name', 0.85),
        indexTextField('快照', 'name', 0.75),
        indexTextField('快照记录', 'detail', 0.75),
        indexTextField(record.method, 'weak', 0.35)
      ],
      dateFields: [{ value: record.backedUpAt, weight: 0.8 }],
      amountFields: [
        {
          value: record.historyCount,
          weight: 1,
          role: 'snapshot-count',
          matchField: 'historyCount'
        },
        {
          value: record.incrementCount,
          weight: 1,
          role: 'snapshot-count',
          matchField: 'incrementCount'
        }
      ],
      recencyDate: record.backedUpAt
    }
  })),
  settings: (options.settingsItems ?? []).map((item, index) => {
    const isSectionItem = item.id === item.section;
    const sectionTitle = item.sectionTitle ?? item.group;
    const summary = item.summary ?? item.description;
    const value = item.blockTitle ? `${sectionTitle} / ${item.blockTitle}` : sectionTitle;
    const titleWeight = isSectionItem ? 0.82 : 0.7;
    const sectionWeight = isSectionItem ? 0.68 : 0.62;
    const keywordWeight = isSectionItem ? 0.54 : 0.58;
    const summaryWeight = isSectionItem ? 0.34 : 0.38;
    const pinyinWeight = isSectionItem ? 0.3 : 0.36;

    return {
      item,
      title: item.title,
      subtitle: `${sectionTitle} · ${item.description}`,
      value,
      index,
      candidate: {
        textFields: [
          indexTextField(item.title, 'name', titleWeight),
          indexTextField(sectionTitle, 'detail', sectionWeight),
          indexTextField(item.blockTitle, 'detail', 0.52),
          indexTextField(item.keywords?.join(' '), 'detail', keywordWeight),
          indexTextField(item.weakKeywords?.join(' '), 'weak', 0.24),
          indexTextField(item.description, 'weak', 0.34),
          indexTextField(summary, 'weak', summaryWeight),
          indexTextField(item.pinyinKeywords?.join(' '), 'weak', pinyinWeight, 'pinyin-full'),
          indexTextField(item.pinyinInitials?.join(' '), 'weak', pinyinWeight, 'pinyin-initials')
        ],
        recencyDate: null
      }
    };
  }),
  totals: {
    account: groups.reduce((count, group) => count + group.accounts.length, 0),
    history: historyRecords.length,
    snapshot: snapshots.length,
    settings: options.settingsItems?.length ?? 0
  },
  formatters: {
    formatShortTime: options.formatShortTime,
    formatCompactAmount
  }
  };
};

type AccountIndexItem = SearchIndexedData['accounts'][number];
type HistoryIndexItem = SearchIndexedData['history'][number];
type SnapshotIndexItem = SearchIndexedData['snapshots'][number];
type SettingsIndexItem = SearchIndexedData['settings'][number];

const createAccountResult = (
  item: AccountIndexItem,
  score: number,
  scored: SearchScoredCandidate,
  termCount: number
): AccountSearchResult => {
  const display = { title: item.title, subtitle: item.subtitle, value: item.value };
  const matchedAmount = getGenericMatchedAmount(scored.bestMatch, display.value);

  return {
    id: item.account.id,
    category: 'account',
    group: item.group,
    account: item.account,
    target: createAccountSearchTarget(item.group.id, item.account.id),
    title: display.title,
    subtitle: display.subtitle,
    value: display.value,
    mark: item.mark,
    score,
    matchedTermCount: scored.matchedTermCount,
    ...getResultMatchFields(scored, termCount, display),
    primaryMatch: getPrimaryMatch(scored.bestMatch, display, matchedAmount),
    ...(matchedAmount ? { matchedAmount } : {}),
    index: item.index
  };
};

const createHistoryResult = (
  index: SearchIndexedData,
  item: HistoryIndexItem,
  score: number,
  scored: SearchScoredCandidate,
  termCount: number
): HistorySearchResult => {
  const beforeAmount = item.record.beforeAmount ?? 0;
  const afterAmount = item.record.afterAmount ?? 0;
  const defaultValue = formatSearchSignedAmount(
    afterAmount - beforeAmount,
    index.formatters.formatCompactAmount
  );
  const amountDisplay: HistoryAmountDisplay = {
    delta: defaultValue,
    balanceBefore: formatSearchBalanceAmount(
      item.record.beforeAmount,
      item.preserveBalanceSign,
      index.formatters.formatCompactAmount
    ),
    balanceAfter: formatSearchBalanceAmount(
      item.record.afterAmount,
      item.preserveBalanceSign,
      index.formatters.formatCompactAmount
    ),
    balanceRange: getHistoryBalanceDisplayText(
      item.record,
      afterAmount,
      item.preserveBalanceSign,
      index.formatters.formatCompactAmount
    )
  };
  const matchedAmount = getHistoryMatchedAmount(
    item.record,
    scored.bestMatch,
    amountDisplay,
    defaultValue
  );
  const display = {
    title: `${item.record.groupName} - ${item.record.accountName}`,
    subtitle: `${item.historyTypeLabel} · ${index.formatters.formatShortTime(item.record.time)}`,
    value: matchedAmount?.displayText ?? defaultValue
  };

  return {
    id: item.record.id,
    category: 'history',
    record: item.record,
    icon: 'history',
    target: createHistorySearchTarget(item.record.id),
    title: display.title,
    subtitle: display.subtitle,
    value: display.value,
    score,
    matchedTermCount: scored.matchedTermCount,
    ...getResultMatchFields(scored, termCount, display),
    primaryMatch: getPrimaryMatch(scored.bestMatch, display, matchedAmount),
    ...(matchedAmount ? { matchedAmount } : {}),
    index: item.index
  };
};

const createSnapshotResult = (
  item: SnapshotIndexItem,
  score: number,
  scored: SearchScoredCandidate,
  termCount: number
): SnapshotSearchResult => {
  const display = { title: item.title, subtitle: item.subtitle, value: item.value };
  const matchedAmount = getGenericMatchedAmount(scored.bestMatch, display.value);

  return {
    id: item.record.id,
    category: 'snapshot',
    record: item.record,
    icon: 'snapshot',
    target: createSnapshotSearchTarget(item.record.id),
    title: display.title,
    subtitle: display.subtitle,
    value: display.value,
    score,
    matchedTermCount: scored.matchedTermCount,
    ...getResultMatchFields(scored, termCount, display),
    primaryMatch: getPrimaryMatch(scored.bestMatch, display, matchedAmount),
    ...(matchedAmount ? { matchedAmount } : {}),
    index: item.index
  };
};

const createSettingsResult = (
  item: SettingsIndexItem,
  score: number,
  scored: SearchScoredCandidate,
  termCount: number
): SettingsSearchResult => {
  const display = { title: item.title, subtitle: item.subtitle, value: item.value };

  return {
    id: item.item.id,
    category: 'settings',
    item: item.item,
    icon: 'settings',
    target: createSettingsSearchTarget(item.item.id, item.item.section, item.item.blockId),
    title: display.title,
    subtitle: display.subtitle,
    value: display.value,
    score,
    matchedTermCount: scored.matchedTermCount,
    ...getResultMatchFields(scored, termCount, display),
    primaryMatch: getPrimaryMatch(scored.bestMatch, display, null),
    index: item.index
  };
};

const makeScoredResults = <TInput, TResult extends GlobalSearchResult>(
  inputs: TInput[],
  getScoredResult: (
    input: TInput,
    score: number,
    scored: SearchScoredCandidate
  ) => TResult | null,
  getCandidate: (input: TInput) => SearchCandidate,
  category: SearchResultCategory,
  searchLogicMode: SearchLogicMode,
  terms: Parameters<typeof scoreSearchCandidate>[0]
) =>
  inputs
    .flatMap((input) => {
      const scored = scoreSearchCandidate(terms, getCandidate(input), searchLogicMode);

      if (!scored) {
        return [];
      }

      const score = applySearchTypeAdjustment(scored.score, category);

      if (!passesSearchThreshold(score)) {
        return [];
      }

      const result = getScoredResult(
        input,
        score,
        scored
      );

      return result ? [result] : [];
    })
    .sort(compareSearchResults);

type SearchMatchSummary = {
  id: string;
  category: SearchResultCategory;
  target: SearchNavigationTarget;
  score: number;
  index: number;
  matchLabel: SearchScoredCandidate['matchLabel'];
};

type BoundedSearchMatch =
  | (SearchMatchSummary & {
      category: 'account';
      item: AccountIndexItem;
      scored: SearchScoredCandidate;
    })
  | (SearchMatchSummary & {
      category: 'history';
      item: HistoryIndexItem;
      scored: SearchScoredCandidate;
    })
  | (SearchMatchSummary & {
      category: 'snapshot';
      item: SnapshotIndexItem;
      scored: SearchScoredCandidate;
    })
  | (SearchMatchSummary & {
      category: 'settings';
      item: SettingsIndexItem;
      scored: SearchScoredCandidate;
    });

const insertBoundedSearchMatch = (
  matches: BoundedSearchMatch[],
  match: BoundedSearchMatch,
  limit: number
) => {
  let low = 0;
  let high = matches.length;

  while (low < high) {
    const middle = (low + high) >>> 1;

    if (compareSearchResults(match, matches[middle]) < 0) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  if (low >= limit) {
    return;
  }

  matches.splice(low, 0, match);

  if (matches.length > limit) {
    matches.pop();
  }
};

const runBoundedGlobalSearch = (
  index: SearchIndexedData,
  query: string,
  options: RunSearchOptions,
  intent: ReturnType<typeof parseSearchIntent>
): GlobalSearchOutput => {
  const searchLogicMode = options.searchLogicMode ?? 'infer';
  const fallbackResultLimit = Math.max(1, Math.floor(options.resultLimit ?? 1));
  const resultLimitsByCategory = {
    all: Math.max(1, Math.floor(options.resultLimitsByCategory?.all ?? fallbackResultLimit)),
    account: Math.max(1, Math.floor(options.resultLimitsByCategory?.account ?? fallbackResultLimit)),
    history: Math.max(1, Math.floor(options.resultLimitsByCategory?.history ?? fallbackResultLimit)),
    snapshot: Math.max(1, Math.floor(options.resultLimitsByCategory?.snapshot ?? fallbackResultLimit)),
    settings: Math.max(1, Math.floor(options.resultLimitsByCategory?.settings ?? fallbackResultLimit))
  };
  const termCount = intent.terms.length;
  const allTopMatches: BoundedSearchMatch[] = [];
  const topMatchesByCategory: Record<SearchResultCategory, BoundedSearchMatch[]> = {
    account: [],
    history: [],
    snapshot: [],
    settings: []
  };
  const diagnostics = options.diagnostics;
  const matchCounts: Record<SearchResultCategory, number> = {
    account: 0,
    history: 0,
    snapshot: 0,
    settings: 0
  };
  const bestByCategory: Record<SearchResultCategory, SearchMatchSummary | null> = {
    account: null,
    history: null,
    snapshot: null,
    settings: null
  };

  const addMatch = (match: BoundedSearchMatch) => {
    matchCounts[match.category] += 1;
    const summary: SearchMatchSummary = {
      id: match.id,
      category: match.category,
      target: match.target,
      score: match.score,
      index: match.index,
      matchLabel: match.matchLabel
    };
    const currentBest = bestByCategory[match.category];

    if (!currentBest || compareSearchResults(summary, currentBest) < 0) {
      bestByCategory[match.category] = summary;
    }

    insertBoundedSearchMatch(allTopMatches, match, resultLimitsByCategory.all);
    insertBoundedSearchMatch(
      topMatchesByCategory[match.category],
      match,
      resultLimitsByCategory[match.category]
    );
  };

  index.accounts.forEach((item) => {
      if (diagnostics) {
        diagnostics.scanned.account += 1;
      }
      const scored = scoreSearchCandidate(intent.terms, item.candidate, searchLogicMode, {
        includeHighlights: false
      });

      if (!scored) {
        return;
      }

      const score = applySearchTypeAdjustment(scored.score, 'account');

      if (!passesSearchThreshold(score)) {
        return;
      }

      addMatch({
        id: item.account.id,
        category: 'account',
        target: createAccountSearchTarget(item.group.id, item.account.id),
        score,
        index: item.index,
        matchLabel: scored.matchLabel,
        item,
        scored
      });
  });

  index.history.forEach((item) => {
      if (diagnostics) {
        diagnostics.scanned.history += 1;
      }
      const scored = scoreSearchCandidate(intent.terms, item.candidate, searchLogicMode, {
        includeHighlights: false
      });

      if (!scored) {
        return;
      }

      const score = applySearchTypeAdjustment(scored.score, 'history');

      if (!passesSearchThreshold(score)) {
        return;
      }

      addMatch({
        id: item.record.id,
        category: 'history',
        target: createHistorySearchTarget(item.record.id),
        score,
        index: item.index,
        matchLabel: scored.matchLabel,
        item,
        scored
      });
  });

  index.snapshots.forEach((item) => {
      if (diagnostics) {
        diagnostics.scanned.snapshot += 1;
      }
      const scored = scoreSearchCandidate(intent.terms, item.candidate, searchLogicMode, {
        includeHighlights: false
      });

      if (!scored) {
        return;
      }

      const score = applySearchTypeAdjustment(scored.score, 'snapshot');

      if (!passesSearchThreshold(score)) {
        return;
      }

      addMatch({
        id: item.record.id,
        category: 'snapshot',
        target: createSnapshotSearchTarget(item.record.id),
        score,
        index: item.index,
        matchLabel: scored.matchLabel,
        item,
        scored
      });
  });

  index.settings.forEach((item) => {
      if (diagnostics) {
        diagnostics.scanned.settings += 1;
      }
      const scored = scoreSearchCandidate(intent.terms, item.candidate, searchLogicMode, {
        includeHighlights: false
      });

      if (!scored) {
        return;
      }

      const score = applySearchTypeAdjustment(scored.score, 'settings');

      if (!passesSearchThreshold(score)) {
        return;
      }

      addMatch({
        id: item.item.id,
        category: 'settings',
        target: createSettingsSearchTarget(item.item.id, item.item.section, item.item.blockId),
        score,
        index: item.index,
        matchLabel: scored.matchLabel,
        item,
        scored
      });
  });

  const hydrateMatch = (match: BoundedSearchMatch): GlobalSearchResult => {
    const rescored = scoreSearchCandidate(
      intent.terms,
      match.item.candidate,
      searchLogicMode
    ) ?? match.scored;

    switch (match.category) {
      case 'account':
        return createAccountResult(match.item, match.score, rescored, termCount);
      case 'history':
        return createHistoryResult(index, match.item, match.score, rescored, termCount);
      case 'snapshot':
        return createSnapshotResult(match.item, match.score, rescored, termCount);
      case 'settings':
        return createSettingsResult(match.item, match.score, rescored, termCount);
    }
  };
  const hydratedResultsByTarget = new Map<string, GlobalSearchResult>();
  [
    ...allTopMatches,
    ...topMatchesByCategory.account,
    ...topMatchesByCategory.history,
    ...topMatchesByCategory.snapshot,
    ...topMatchesByCategory.settings
  ].forEach((match) => {
    if (!hydratedResultsByTarget.has(match.target.key)) {
      hydratedResultsByTarget.set(match.target.key, hydrateMatch(match));
    }
  });
  const getHydratedResults = (matches: BoundedSearchMatch[]) =>
    matches.map((match) => hydratedResultsByTarget.get(match.target.key) as GlobalSearchResult);
  const allResults = getHydratedResults(allTopMatches);
  const accountResults = getHydratedResults(topMatchesByCategory.account).filter(
    (result): result is AccountSearchResult => result.category === 'account'
  );
  const historyResults = getHydratedResults(topMatchesByCategory.history).filter(
    (result): result is HistorySearchResult => result.category === 'history'
  );
  const snapshotResults = getHydratedResults(topMatchesByCategory.snapshot).filter(
    (result): result is SnapshotSearchResult => result.category === 'snapshot'
  );
  const settingsResults = getHydratedResults(topMatchesByCategory.settings).filter(
    (result): result is SettingsSearchResult => result.category === 'settings'
  );
  if (diagnostics) {
    diagnostics.hydrated = hydratedResultsByTarget.size;
  }
  const counts = matchCounts;
  const resultsByCategory = {
    account: accountResults,
    history: historyResults,
    snapshot: snapshotResults,
    settings: settingsResults
  };

  return {
    intent,
    query,
    hasQuery: true,
    searchLogicMode,
    allResults,
    accountResults,
    historyResults,
    snapshotResults,
    settingsResults,
    resultsByCategory,
    counts: {
      all: counts.account + counts.history + counts.snapshot + counts.settings,
      ...counts
    },
    topScores: {
      account: bestByCategory.account?.score ?? 0,
      history: bestByCategory.history?.score ?? 0,
      snapshot: bestByCategory.snapshot?.score ?? 0,
      settings: bestByCategory.settings?.score ?? 0
    },
    bestCategory: allTopMatches[0]?.category ?? null,
    focusTarget: allResults[0]?.target ?? null,
    weakMode: false,
    sortedResultIds: {
      all: allResults.map((result) => result.id),
      account: accountResults.map((result) => result.id),
      history: historyResults.map((result) => result.id),
      snapshot: snapshotResults.map((result) => result.id),
      settings: settingsResults.map((result) => result.id)
    },
    strongNavigationTargets: [...hydratedResultsByTarget.values()]
      .sort(compareSearchResults)
      .filter((result) => result.matchLabel === 'hit')
      .map((result) => result.target)
  };
};

const runGlobalSearchCore = (
  index: SearchIndexedData,
  query: string,
  options: RunSearchOptions = {}
): GlobalSearchOutput => {
  const searchLogicMode = options.searchLogicMode ?? 'infer';
  if (options.diagnostics) {
    options.diagnostics.scanned.account = 0;
    options.diagnostics.scanned.history = 0;
    options.diagnostics.scanned.snapshot = 0;
    options.diagnostics.scanned.settings = 0;
    options.diagnostics.hydrated = 0;
  }
  const intent = parseSearchIntent(query);
  const termCount = intent.terms.length;

  if (termCount === 0) {
    return {
      intent,
      query,
      hasQuery: false,
      searchLogicMode,
      allResults: [],
      accountResults: [],
      historyResults: [],
      snapshotResults: [],
      settingsResults: [],
      resultsByCategory: {
        account: [],
        history: [],
        snapshot: [],
        settings: []
      },
      counts: {
        all: index.totals.account + index.totals.history + index.totals.snapshot + index.totals.settings,
        account: index.totals.account,
        history: index.totals.history,
        snapshot: index.totals.snapshot,
        settings: index.totals.settings
      },
      topScores: {
        account: 0,
        history: 0,
        snapshot: 0,
        settings: 0
      },
      bestCategory: null,
      focusTarget: null,
      weakMode: false,
      sortedResultIds: {
        all: [],
        account: [],
        history: [],
        snapshot: [],
        settings: []
      },
      strongNavigationTargets: []
    };
  }

  if (
    options.resultLimitsByCategory ||
    (
      typeof options.resultLimit === 'number' &&
      Number.isFinite(options.resultLimit) &&
      options.resultLimit > 0
    )
  ) {
    return runBoundedGlobalSearch(index, query, options, intent);
  }

  const accountResults = makeScoredResults(
    index.accounts,
    (item, score, scored): AccountSearchResult => {
      const display = {
        title: item.title,
        subtitle: item.subtitle,
        value: item.value
      };
      const matchedAmount = getGenericMatchedAmount(scored.bestMatch, display.value);

      return {
        id: item.account.id,
        category: 'account',
        group: item.group,
        account: item.account,
        target: createAccountSearchTarget(item.group.id, item.account.id),
        title: display.title,
        subtitle: display.subtitle,
        value: display.value,
        mark: item.mark,
        score,
        matchedTermCount: scored.matchedTermCount,
        ...getResultMatchFields(scored, termCount, display),
        primaryMatch: getPrimaryMatch(scored.bestMatch, display, matchedAmount),
        ...(matchedAmount ? { matchedAmount } : {}),
        index: item.index
      };
    },
    (item) => item.candidate,
    'account',
    searchLogicMode,
    intent.terms
  );
  const historyResults = makeScoredResults(
    index.history,
    (item, score, scored): HistorySearchResult => {
      const beforeAmount = item.record.beforeAmount ?? 0;
      const afterAmount = item.record.afterAmount ?? 0;
      const defaultValue = formatSearchSignedAmount(
        afterAmount - beforeAmount,
        index.formatters.formatCompactAmount
      );
      const amountDisplay: HistoryAmountDisplay = {
        delta: defaultValue,
        balanceBefore: formatSearchBalanceAmount(
          item.record.beforeAmount,
          item.preserveBalanceSign,
          index.formatters.formatCompactAmount
        ),
        balanceAfter: formatSearchBalanceAmount(
          item.record.afterAmount,
          item.preserveBalanceSign,
          index.formatters.formatCompactAmount
        ),
        balanceRange: getHistoryBalanceDisplayText(
          item.record,
          afterAmount,
          item.preserveBalanceSign,
          index.formatters.formatCompactAmount
        )
      };
      const matchedAmount = getHistoryMatchedAmount(
        item.record,
        scored.bestMatch,
        amountDisplay,
        defaultValue
      );
      const display = {
        title: `${item.record.groupName} - ${item.record.accountName}`,
        subtitle: `${item.historyTypeLabel} · ${index.formatters.formatShortTime(
          item.record.time
        )}`,
        value: matchedAmount?.displayText ?? defaultValue
      };

      return {
        id: item.record.id,
        category: 'history',
        record: item.record,
        icon: 'history',
        target: createHistorySearchTarget(item.record.id),
        title: display.title,
        subtitle: display.subtitle,
        value: display.value,
        score,
        matchedTermCount: scored.matchedTermCount,
        ...getResultMatchFields(scored, termCount, display),
        primaryMatch: getPrimaryMatch(scored.bestMatch, display, matchedAmount),
        ...(matchedAmount ? { matchedAmount } : {}),
        index: item.index
      };
    },
    (item) => item.candidate,
    'history',
    searchLogicMode,
    intent.terms
  );
  const snapshotResults = makeScoredResults(
    index.snapshots,
    (item, score, scored): SnapshotSearchResult => {
      const display = {
        title: item.title,
        subtitle: item.subtitle,
        value: item.value
      };
      const matchedAmount = getGenericMatchedAmount(scored.bestMatch, display.value);

      return {
        id: item.record.id,
        category: 'snapshot',
        record: item.record,
        icon: 'snapshot',
        target: createSnapshotSearchTarget(item.record.id),
        title: display.title,
        subtitle: display.subtitle,
        value: display.value,
        score,
        matchedTermCount: scored.matchedTermCount,
        ...getResultMatchFields(scored, termCount, display),
        primaryMatch: getPrimaryMatch(scored.bestMatch, display, matchedAmount),
        ...(matchedAmount ? { matchedAmount } : {}),
        index: item.index
      };
    },
    (item) => item.candidate,
    'snapshot',
    searchLogicMode,
    intent.terms
  );
  const settingsResults = makeScoredResults(
    index.settings,
    (item, score, scored): SettingsSearchResult => {
      const display = {
        title: item.title,
        subtitle: item.subtitle,
        value: item.value
      };

      return {
        id: item.item.id,
        category: 'settings',
        item: item.item,
        icon: 'settings',
        target: createSettingsSearchTarget(item.item.id, item.item.section, item.item.blockId),
        title: display.title,
        subtitle: display.subtitle,
        value: display.value,
        score,
        matchedTermCount: scored.matchedTermCount,
        ...getResultMatchFields(scored, termCount, display),
        primaryMatch: getPrimaryMatch(scored.bestMatch, display, null),
        index: item.index
      };
    },
    (item) => item.candidate,
    'settings',
    searchLogicMode,
    intent.terms
  );
  const resultsByCategory = {
    account: accountResults,
    history: historyResults,
    snapshot: snapshotResults,
    settings: settingsResults
  };
  const allResults: GlobalSearchResult[] = [
    ...accountResults,
    ...historyResults,
    ...snapshotResults,
    ...settingsResults
  ].sort(compareSearchResults);
  const topScores = {
    account: getTopScore(accountResults),
    history: getTopScore(historyResults),
    snapshot: getTopScore(snapshotResults),
    settings: getTopScore(settingsResults)
  };
  const bestCategory = allResults[0]?.category ?? null;
  const focusTarget = allResults[0]?.target ?? null;
  const strongNavigationTargets = allResults
    .filter((result) => result.matchLabel === 'hit')
    .map((result) => result.target);

  return {
    intent,
    query,
    hasQuery: true,
    searchLogicMode,
    allResults,
    accountResults,
    historyResults,
    snapshotResults,
    settingsResults,
    resultsByCategory,
    counts: {
      all: allResults.length,
      account: accountResults.length,
      history: historyResults.length,
      snapshot: snapshotResults.length,
      settings: settingsResults.length
    },
    topScores,
    bestCategory,
    focusTarget,
    weakMode: false,
    sortedResultIds: {
      all: allResults.map((result) => result.id),
      account: accountResults.map((result) => result.id),
      history: historyResults.map((result) => result.id),
      snapshot: snapshotResults.map((result) => result.id),
      settings: settingsResults.map((result) => result.id)
    },
    strongNavigationTargets
  };
};

export const createEmptyGlobalSearchOutput = (
  query = '',
  searchLogicMode: SearchLogicMode = 'infer',
  totals: SearchIndexedData['totals'] = {
    account: 0,
    history: 0,
    snapshot: 0,
    settings: 0
  }
): GlobalSearchOutput => ({
  intent: parseSearchIntent(query),
  query,
  hasQuery: false,
  searchLogicMode,
  allResults: [],
  accountResults: [],
  historyResults: [],
  snapshotResults: [],
  settingsResults: [],
  resultsByCategory: {
    account: [],
    history: [],
    snapshot: [],
    settings: []
  },
  counts: {
    all: totals.account + totals.history + totals.snapshot + totals.settings,
    account: totals.account,
    history: totals.history,
    snapshot: totals.snapshot,
    settings: totals.settings
  },
  topScores: {
    account: 0,
    history: 0,
    snapshot: 0,
    settings: 0
  },
  bestCategory: null,
  focusTarget: null,
  weakMode: false,
  sortedResultIds: {
    all: [],
    account: [],
    history: [],
    snapshot: [],
    settings: []
  },
  strongNavigationTargets: []
});

export const runGlobalSearch = (
  index: SearchIndexedData,
  query: string,
  options: RunSearchOptions = {}
): GlobalSearchOutput =>
  measureSearchExecution(() => runGlobalSearchCore(index, query, options));
