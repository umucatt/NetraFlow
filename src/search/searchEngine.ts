import type {
  AccountSearchResult,
  AssetGroup,
  BackupRecord,
  CreateSearchIndexOptions,
  SearchDefaultResultCategory,
  GlobalSearchOutput,
  HistoryRecord,
  HistorySearchResult,
  RunSearchOptions,
  SearchCategory,
  SearchIndexedData,
  SearchIndexedTextField,
  SearchLogicMode,
  SearchResultCategory,
  SettingsSearchResult,
  SearchTermMatch,
  SnapshotSearchResult
} from './searchTypes';
import {
  SEARCH_CATEGORY_SWITCH_DELTA,
  SEARCH_DEFAULT_THRESHOLDS,
  SEARCH_RESULT_CATEGORIES
} from './searchTypes';
import { parseSearchIntent } from './searchIntent';
import { getNormalizedTextIndex, getPinyinParts } from './searchNormalize';
import {
  compareSearchResults,
  getSearchResultStrength,
  passesSearchThreshold,
  scoreSearchCandidate,
  scoreSettingsSearchCandidate
} from './searchScoring';
import { measureSearchExecution } from './searchPerformance';
import {
  createAccountSearchTarget,
  createHistorySearchTarget,
  createSettingsSearchTarget,
  createSnapshotSearchTarget
} from './searchNavigation';

const createIndexedTextField = (
  value: string | null | undefined,
  role: SearchIndexedTextField['role'],
  weight: number
): SearchIndexedTextField => ({
  value,
  role,
  weight,
  index: getNormalizedTextIndex(value),
  pinyin: getPinyinParts(String(value ?? ''))
});

const getTopScore = (results: Array<{ score: number }>) => results[0]?.score ?? 0;

const isStrictSearchMatch = (match: SearchTermMatch) => {
  if (match.source === 'pinyin') {
    return false;
  }

  if (match.source === 'amount') {
    return match.highlightStrength === 'strong' && match.fuzzyPenalty === 0;
  }

  if (match.source === 'date') {
    return match.highlightStrength !== 'weak' && match.fuzzyPenalty === 0;
  }

  return match.highlightStrength !== 'weak' && match.role !== 'weak';
};

const isStrictSearchScore = (
  scored: NonNullable<ReturnType<typeof scoreSearchCandidate>>,
  termCount: number
) => scored.termMatches.length === termCount && scored.termMatches.every(isStrictSearchMatch);

const getBestCategory = (
  counts: Record<SearchDefaultResultCategory, number>,
  topScores: Record<SearchDefaultResultCategory, number>,
  selectedCategory: SearchCategory = 'all'
) => {
  const rankedCategories = SEARCH_RESULT_CATEGORIES.filter((category) => counts[category] > 0).sort(
    (left, right) => {
      const scoreDelta = topScores[right] - topScores[left];

      if (Math.abs(scoreDelta) > SEARCH_CATEGORY_SWITCH_DELTA) {
        return scoreDelta;
      }

      return SEARCH_RESULT_CATEGORIES.indexOf(left) - SEARCH_RESULT_CATEGORIES.indexOf(right);
    }
  );
  const bestCategory = rankedCategories[0] ?? null;

  if (!bestCategory) {
    return null;
  }

  if (
    selectedCategory !== 'all' &&
    selectedCategory !== 'settings' &&
    counts[selectedCategory] > 0 &&
    bestCategory !== selectedCategory
  ) {
    const categoryScoreDelta = topScores[bestCategory] - topScores[selectedCategory];

    if (categoryScoreDelta <= SEARCH_CATEGORY_SWITCH_DELTA) {
      return selectedCategory;
    }
  }

  return bestCategory;
};

const makeScoredResults = <TInput, TResult extends { score: number; index: number }>(
  inputs: TInput[],
  getScoredResult: (input: TInput, score: number, matchedTermCount: number) => TResult | null,
  getCandidate: (input: TInput) => Parameters<typeof scoreSearchCandidate>[1],
  termCount: number,
  category: SearchResultCategory,
  isWeakMode: boolean,
  searchLogicMode: SearchLogicMode,
  terms: Parameters<typeof scoreSearchCandidate>[0],
  scoreCandidate: typeof scoreSearchCandidate = scoreSearchCandidate
) =>
  inputs
    .flatMap((input) => {
      const scored = scoreCandidate(terms, getCandidate(input));

      if (
        !scored ||
        (searchLogicMode === 'strict' && !isStrictSearchScore(scored, termCount)) ||
        !passesSearchThreshold(
          scored.score,
          scored.matchedTermCount,
          termCount,
          category,
          isWeakMode
        )
      ) {
        return [];
      }

      const result = getScoredResult(input, scored.score, scored.matchedTermCount);

      return result ? [result] : [];
    })
    .sort(compareSearchResults);

export const createGlobalSearchIndex = (
  groups: AssetGroup[],
  historyRecords: HistoryRecord[],
  snapshots: BackupRecord[],
  options: CreateSearchIndexOptions
): SearchIndexedData => ({
  accounts: groups.flatMap((group, groupIndex) =>
    group.accounts.map((account, accountIndex) => {
      const archiveText = account.archived ? '已归档账户' : '账户';
      const subtitle = `${group.name} · ${options.getAccountNatureLabel(group.nature)}${
        account.alias ? ` · ${account.alias}` : ''
      }${account.archived ? ' · 已归档' : ''}`;

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
            createIndexedTextField(account.name, 'name', 6),
            createIndexedTextField(account.alias, 'name', 4),
            createIndexedTextField(group.name, 'detail', 3),
            createIndexedTextField(options.getAccountNatureLabel(group.nature), 'detail', 2),
            createIndexedTextField(archiveText, 'weak', 0)
          ],
          dateFields: [
            { value: account.createdAt, weight: 2 },
            { value: account.archivedAt, weight: 1 }
          ],
          amountFields: [{ value: account.amount, weight: 4 }],
          recencyDate: account.archivedAt ?? account.createdAt
        }
      };
    })
  ),
  history: historyRecords.map((record, index) => {
    const beforeAmount = record.beforeAmount ?? 0;
    const afterAmount = record.afterAmount ?? 0;
    const delta = afterAmount - beforeAmount;
    const changeText = delta > 0 ? '增加' : delta < 0 ? '减少' : '无变化';

    return {
      record,
      title: `${record.groupName} - ${record.accountName}`,
      subtitle: `${options.getHistoryTypeLabel(record.type)} · ${options.formatShortTime(
        record.time
      )}`,
      value: options.getHistoryChangeLabel(record),
      index,
      candidate: {
        textFields: [
          createIndexedTextField(record.accountName, 'name', 6),
          createIndexedTextField(record.groupName, 'detail', 4),
          createIndexedTextField(record.type, 'detail', 3),
          createIndexedTextField(options.getHistoryTypeLabel(record.type), 'detail', 3),
          createIndexedTextField(record.note, 'detail', 5),
          createIndexedTextField(changeText, 'detail', 2),
          createIndexedTextField('历史记录', 'weak', 0)
        ],
        dateFields: [
          { value: record.time, weight: 3 },
          { value: record.relatedTime, weight: 1 }
        ],
        amountFields: [
          { value: record.beforeAmount, weight: 2 },
          { value: record.afterAmount, weight: 3 },
          { value: delta, weight: 4 }
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
        createIndexedTextField('快照', 'name', 5),
        createIndexedTextField('快照记录', 'name', 4),
        createIndexedTextField(options.getBackupMethodLabel(record.method), 'detail', 3),
        createIndexedTextField(record.method, 'weak', 0),
        createIndexedTextField('历史记录', 'weak', 0),
        createIndexedTextField('增量记录', 'weak', 0)
      ],
      dateFields: [{ value: record.backedUpAt, weight: 3 }],
      amountFields: [
        { value: record.historyCount, weight: 1 },
        { value: record.incrementCount, weight: 1 }
      ],
      recencyDate: record.backedUpAt
    }
  })),
  settings: (options.settingsItems ?? []).map((item, index) => ({
    item,
    title: item.title,
    subtitle: `${item.group} · ${item.description}`,
    value: item.group,
    index,
    candidate: {
      textFields: [
        createIndexedTextField(item.title, 'name', 8),
        createIndexedTextField(item.group, 'weak', 1),
        createIndexedTextField(item.description, 'detail', 3),
        createIndexedTextField(item.keywords?.join(' '), 'detail', 4),
        createIndexedTextField(item.pinyinKeywords?.join(' '), 'detail', 5),
        createIndexedTextField(item.pinyinInitials?.join(' '), 'detail', 5)
      ],
      recencyDate: null
    }
  })),
  totals: {
    account: groups.reduce((count, group) => count + group.accounts.length, 0),
    history: historyRecords.length,
    snapshot: snapshots.length,
    settings: options.settingsItems?.length ?? 0
  }
});

const runCategorySearch = (
  index: SearchIndexedData,
  query: string,
  isWeakMode: boolean,
  searchLogicMode: SearchLogicMode
) => {
  const intent = parseSearchIntent(query);
  const termCount = intent.terms.length;

  if (termCount === 0) {
    return {
      intent,
      accountResults: [] as AccountSearchResult[],
      historyResults: [] as HistorySearchResult[],
      snapshotResults: [] as SnapshotSearchResult[],
      settingsResults: [] as SettingsSearchResult[]
    };
  }

  const accountResults = makeScoredResults(
    index.accounts,
    (item, score, matchedTermCount): AccountSearchResult => ({
      id: item.account.id,
      category: 'account',
      group: item.group,
      account: item.account,
      target: createAccountSearchTarget(item.group.name, item.account.id, isWeakMode),
      title: item.title,
      subtitle: item.subtitle,
      value: item.value,
      mark: item.mark,
      score,
      matchedTermCount,
      isWeakRelated: isWeakMode,
      strength: getSearchResultStrength(score, 'account', isWeakMode),
      index: item.index
    }),
    (item) => item.candidate,
    termCount,
    'account',
    isWeakMode,
    searchLogicMode,
    intent.terms
  );
  const historyResults = makeScoredResults(
    index.history,
    (item, score, matchedTermCount): HistorySearchResult => ({
      id: item.record.id,
      category: 'history',
      record: item.record,
      icon: 'history',
      target: createHistorySearchTarget(item.record.id, isWeakMode),
      title: item.title,
      subtitle: item.subtitle,
      value: item.value,
      score,
      matchedTermCount,
      isWeakRelated: isWeakMode,
      strength: getSearchResultStrength(score, 'history', isWeakMode),
      index: item.index
    }),
    (item) => item.candidate,
    termCount,
    'history',
    isWeakMode,
    searchLogicMode,
    intent.terms
  );
  const snapshotResults = makeScoredResults(
    index.snapshots,
    (item, score, matchedTermCount): SnapshotSearchResult => ({
      id: item.record.id,
      category: 'snapshot',
      record: item.record,
      icon: 'snapshot',
      target: createSnapshotSearchTarget(item.record.id, isWeakMode),
      title: item.title,
      subtitle: item.subtitle,
      value: item.value,
      score,
      matchedTermCount,
      isWeakRelated: isWeakMode,
      strength: getSearchResultStrength(score, 'snapshot', isWeakMode),
      index: item.index
    }),
    (item) => item.candidate,
    termCount,
    'snapshot',
    isWeakMode,
    searchLogicMode,
    intent.terms
  );
  const settingsResults = makeScoredResults(
    index.settings,
    (item, score, matchedTermCount): SettingsSearchResult => ({
      id: item.item.id,
      category: 'settings',
      item: item.item,
      icon: 'settings',
      target: createSettingsSearchTarget(
        item.item.id,
        item.item.section,
        item.item.blockId,
        isWeakMode
      ),
      title: item.title,
      subtitle: item.subtitle,
      value: item.value,
      score,
      matchedTermCount,
      isWeakRelated: isWeakMode,
      strength: getSearchResultStrength(score, 'settings', isWeakMode),
      index: item.index
    }),
    (item) => item.candidate,
    termCount,
    'settings',
    isWeakMode,
    searchLogicMode,
    intent.terms,
    scoreSettingsSearchCandidate
  );

  return {
    intent,
    accountResults,
    historyResults,
    snapshotResults,
    settingsResults
  };
};

const runGlobalSearchCore = (
  index: SearchIndexedData,
  query: string,
  options: RunSearchOptions = {}
): GlobalSearchOutput => {
  const searchLogicMode = options.searchLogicMode ?? 'infer';
  const standardResults = runCategorySearch(index, query, false, searchLogicMode);
  const hasQuery = standardResults.intent.terms.length > 0;
  const standardResultCount =
    standardResults.accountResults.length +
    standardResults.historyResults.length +
    standardResults.snapshotResults.length;
  const weakMode = searchLogicMode === 'infer' && hasQuery && standardResultCount === 0;
  const defaultResults = weakMode
    ? runCategorySearch(index, query, true, searchLogicMode)
    : standardResults;
  const settingsResults = standardResults.settingsResults;
  const counts = {
    all: hasQuery
      ? defaultResults.accountResults.length +
        defaultResults.historyResults.length +
        defaultResults.snapshotResults.length
      : index.totals.account + index.totals.history + index.totals.snapshot,
    account: hasQuery ? defaultResults.accountResults.length : index.totals.account,
    history: hasQuery ? defaultResults.historyResults.length : index.totals.history,
    snapshot: hasQuery ? defaultResults.snapshotResults.length : index.totals.snapshot,
    settings: hasQuery ? settingsResults.length : index.totals.settings
  };
  const topScores = {
    account: getTopScore(defaultResults.accountResults),
    history: getTopScore(defaultResults.historyResults),
    snapshot: getTopScore(defaultResults.snapshotResults)
  };
  const bestCategory = hasQuery
    ? getBestCategory(
        {
          account: counts.account,
          history: counts.history,
          snapshot: counts.snapshot
        },
        topScores,
        options.selectedCategory
      )
    : null;
  const resultsByCategory = {
    account: defaultResults.accountResults,
    history: defaultResults.historyResults,
    snapshot: defaultResults.snapshotResults,
    settings: settingsResults
  };
  const strongNavigationTargets = SEARCH_RESULT_CATEGORIES.flatMap((category) =>
    resultsByCategory[category]
      .filter((result) => !result.isWeakRelated)
      .map((result) => result.target)
  );
  const focusTarget =
    bestCategory && resultsByCategory[bestCategory][0]
      ? resultsByCategory[bestCategory][0].target
      : null;

  return {
    intent: standardResults.intent,
    query,
    hasQuery,
    searchLogicMode,
    accountResults: defaultResults.accountResults,
    historyResults: defaultResults.historyResults,
    snapshotResults: defaultResults.snapshotResults,
    settingsResults,
    resultsByCategory,
    counts,
    topScores,
    bestCategory,
    focusTarget,
    weakMode,
    sortedResultIds: {
      account: defaultResults.accountResults.map((result) => result.id),
      history: defaultResults.historyResults.map((result) => result.id),
      snapshot: defaultResults.snapshotResults.map((result) => result.id),
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
  measureSearchExecution(
    {
      query,
      totalCandidates:
        index.totals.account +
        index.totals.history +
        index.totals.snapshot +
        index.totals.settings
    },
    () => runGlobalSearchCore(index, query, options)
  );

export const shouldAutoSelectSearchCategory = (
  output: GlobalSearchOutput,
  currentCategory: SearchCategory
) => {
  if (!output.hasQuery || output.weakMode || !output.bestCategory) {
    return null;
  }

  if (currentCategory === output.bestCategory) {
    return null;
  }

  if (currentCategory === 'settings') {
    return null;
  }

  const currentScore =
    currentCategory === 'all'
      ? SEARCH_DEFAULT_THRESHOLDS[output.bestCategory]
      : output.topScores[currentCategory];
  const preferredScore = output.topScores[output.bestCategory];

  return preferredScore > currentScore + SEARCH_CATEGORY_SWITCH_DELTA
    ? output.bestCategory
    : null;
};
