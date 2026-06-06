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
  SearchPrimaryMatch,
  SearchResultHighlights,
  SearchResultCategory,
  SettingsSearchResult,
  SnapshotSearchResult
} from './searchTypes';
import { parseSearchIntent } from './searchIntent';
import { getNormalizedTextIndex, getPinyinParts } from './searchNormalize';
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

const createIndexedTextField = (
  value: string | null | undefined,
  role: SearchIndexedTextField['role'],
  weight: number,
  inferredKind?: SearchIndexedTextField['inferredKind']
): SearchIndexedTextField => ({
  value,
  role,
  weight,
  inferredKind,
  index: getNormalizedTextIndex(value),
  pinyin: getPinyinParts(String(value ?? ''))
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

const formatSearchCompactAmount = (amount: number, preserveNegativeSign = false) => {
  const formattedAmount = new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(Math.round(Math.abs(amount)));

  return preserveNegativeSign && amount < 0 ? `-${formattedAmount}` : formattedAmount;
};

const formatSearchSignedAmount = (amount: number) => {
  if (amount > 0) {
    return `+${formatSearchCompactAmount(amount)}`;
  }

  if (amount < 0) {
    return `-${formatSearchCompactAmount(amount)}`;
  }

  return '0';
};

const formatSearchBalanceAmount = (
  amount: number | null | undefined,
  preserveNegativeSign = false
) => {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return '-';
  }

  return formatSearchCompactAmount(amount, preserveNegativeSign);
};

const getHistoryBalanceDisplayText = (
  record: HistoryRecord,
  matchedAmount: number,
  preserveNegativeSign = false
) => {
  const beforeAmount = record.beforeAmount;
  const afterAmount = record.afterAmount;

  if (
    typeof beforeAmount === 'number' &&
    Number.isFinite(beforeAmount) &&
    typeof afterAmount === 'number' &&
    Number.isFinite(afterAmount)
  ) {
    return `${formatSearchBalanceAmount(beforeAmount, preserveNegativeSign)} → ${formatSearchBalanceAmount(
      afterAmount,
      preserveNegativeSign
    )}`;
  }

  return formatSearchBalanceAmount(matchedAmount, preserveNegativeSign);
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
  amountDisplay: SearchIndexedData['history'][number]['amountDisplay'],
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
            createIndexedTextField(account.name, 'name', 1),
            createIndexedTextField(group.name, 'detail', 0.7),
            createIndexedTextField(options.getAccountNatureLabel(group.nature), 'detail', 0.6),
            createIndexedTextField(account.alias, 'detail', 0.5),
            createIndexedTextField(options.getAccountMark(account), 'detail', 0.5),
            createIndexedTextField(archiveText, 'detail', 0.5)
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
    const deltaDisplay = formatSearchSignedAmount(delta);
    const preserveBalanceSign = shouldPreserveHistoryBalanceSign(
      historyBalanceSignLookup,
      record
    );
    const balanceBeforeDisplay = formatSearchBalanceAmount(record.beforeAmount, preserveBalanceSign);
    const balanceAfterDisplay = formatSearchBalanceAmount(record.afterAmount, preserveBalanceSign);

    return {
      record,
      title: `${record.groupName} - ${record.accountName}`,
      subtitle: `${options.getHistoryTypeLabel(record.type)} · ${options.formatShortTime(
        record.time
      )}`,
      value: deltaDisplay,
      amountDisplay: {
        delta: deltaDisplay,
        balanceBefore: balanceBeforeDisplay,
        balanceAfter: balanceAfterDisplay,
        balanceRange: getHistoryBalanceDisplayText(record, afterAmount, preserveBalanceSign)
      },
      index,
      candidate: {
        textFields: [
          createIndexedTextField(record.accountName, 'name', 0.9),
          createIndexedTextField(record.groupName, 'detail', 0.7),
          createIndexedTextField(record.type, 'detail', 0.65),
          createIndexedTextField(options.getHistoryTypeLabel(record.type), 'detail', 0.65),
          createIndexedTextField(sourceText, 'detail', 0.58),
          createIndexedTextField(record.note, 'weak', 0.45)
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
    subtitle: options.getBackupMethodLabel(record.method),
    value: `${record.historyCount} / ${record.incrementCount}`,
    index,
    candidate: {
      textFields: [
        createIndexedTextField(options.getBackupMethodLabel(record.method), 'name', 0.85),
        createIndexedTextField('快照', 'name', 0.75),
        createIndexedTextField('快照记录', 'detail', 0.75),
        createIndexedTextField(record.method, 'weak', 0.35)
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
          createIndexedTextField(item.title, 'name', titleWeight),
          createIndexedTextField(sectionTitle, 'detail', sectionWeight),
          createIndexedTextField(item.blockTitle, 'detail', 0.52),
          createIndexedTextField(item.keywords?.join(' '), 'detail', keywordWeight),
          createIndexedTextField(item.weakKeywords?.join(' '), 'weak', 0.24),
          createIndexedTextField(item.description, 'weak', 0.34),
          createIndexedTextField(summary, 'weak', summaryWeight),
          createIndexedTextField(item.pinyinKeywords?.join(' '), 'weak', pinyinWeight, 'pinyin-full'),
          createIndexedTextField(item.pinyinInitials?.join(' '), 'weak', pinyinWeight, 'pinyin-initials')
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
  }
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

const runGlobalSearchCore = (
  index: SearchIndexedData,
  query: string,
  options: RunSearchOptions = {}
): GlobalSearchOutput => {
  const searchLogicMode = options.searchLogicMode ?? 'infer';
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
      const defaultValue = item.value;
      const matchedAmount = getHistoryMatchedAmount(
        item.record,
        scored.bestMatch,
        item.amountDisplay,
        defaultValue
      );
      const display = {
        title: item.title,
        subtitle: item.subtitle,
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

export const runGlobalSearch = (
  index: SearchIndexedData,
  query: string,
  options: RunSearchOptions = {}
): GlobalSearchOutput =>
  measureSearchExecution(() => runGlobalSearchCore(index, query, options));
