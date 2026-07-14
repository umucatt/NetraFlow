import type {
  SearchAmountField,
  SearchAmountFieldRole,
  SearchAmountMatchField,
  SearchCandidate,
  SearchDateField,
  SearchHighlightRange,
  SearchHighlightStrength,
  SearchIndexedTextField,
  SearchLogicMode,
  SearchMatchKind,
  SearchMatchLabel,
  SearchResultCategory,
  SearchResultStrength,
  SearchTerm,
  SearchTermMatch,
  SearchTextFieldRole
} from './searchTypes';
import { SEARCH_STABLE_SORT_DELTA } from './searchTypes';
import {
  SEARCH_AMOUNT_ABSOLUTE_WEIGHTS,
  SEARCH_AMOUNT_EXACT_WEIGHTS,
  SEARCH_MATCH_BASE_WEIGHTS,
  SEARCH_MIN_RESULT_SCORE,
  SEARCH_MULTI_TERM_FACTORS,
  SEARCH_TYPE_SCORE_ADJUSTMENTS,
  getSearchAmountNearMatchMetrics
} from './searchWeights';

const DAY_MS = 24 * 60 * 60 * 1000;

const getFieldWeight = (weight: number | undefined) => weight ?? 1;

const getPositionBonus = (matchIndex: number) =>
  matchIndex <= 0 ? 3 : Math.max(0, 2 - Math.min(matchIndex, 10) * 0.2);

const getHighlightStrength = (kind: SearchMatchKind): SearchHighlightStrength => {
  if (kind === 'exact' || kind === 'prefix' || kind === 'amount-exact' || kind === 'date-day') {
    return 'strong';
  }

  if (
    kind === 'contains' ||
    kind === 'ordered' ||
    kind === 'word-all' ||
    kind === 'amount-absolute' ||
    kind === 'date-compact-day' ||
    kind === 'date-month-day'
  ) {
    return 'medium';
  }

  return 'weak';
};

const getOriginalEndIndex = (text: string, originalStart: number) => {
  const codePoint = text.codePointAt(originalStart);

  if (codePoint === undefined) {
    return originalStart + 1;
  }

  return originalStart + String.fromCodePoint(codePoint).length;
};

const mapIndexedRangeToOriginal = (
  field: SearchIndexedTextField,
  source: 'normalized' | 'compact',
  start: number,
  length: number,
  strength: SearchHighlightStrength
): SearchHighlightRange | null => {
  const mapping =
    source === 'normalized' ? field.index.normalizedToOriginal : field.index.compactToOriginal;
  const text = field.index.original;
  const originalStart = mapping[start];
  const originalLast = mapping[start + length - 1];

  if (originalStart === undefined || originalLast === undefined) {
    return null;
  }

  return {
    start: originalStart,
    end: getOriginalEndIndex(text, originalLast),
    strength
  };
};

const mapIndexedCharactersToOriginal = (
  field: SearchIndexedTextField,
  indexes: number[],
  strength: SearchHighlightStrength
): SearchHighlightRange[] =>
  indexes.flatMap((index) => {
    const range = mapIndexedRangeToOriginal(field, 'compact', index, 1, strength);

    return range ? [range] : [];
  });

const getMatchLabel = (kind: SearchMatchKind): SearchMatchLabel =>
  kind === 'pinyin-full' ||
  kind === 'pinyin-initials' ||
  kind === 'partial-text' ||
  kind === 'typo' ||
  kind === 'amount-near'
    ? 'inferred'
    : 'hit';

const createSearchMatch = (
  kind: SearchMatchKind,
  baseScore: number,
  fieldWeight = 1,
  fuzzyPenalty = 0,
  positionBonus = 0,
  source: SearchTermMatch['source'] = 'text',
  role?: SearchTextFieldRole,
  label = getMatchLabel(kind),
  highlightText?: string,
  highlightRanges: SearchHighlightRange[] = [],
  amountMatch?: {
    field?: SearchAmountMatchField;
    value: number;
    role: SearchAmountFieldRole;
  }
): SearchTermMatch => ({
  kind,
  label,
  baseScore,
  fieldWeight,
  fuzzyPenalty,
  positionBonus,
  highlightStrength: getHighlightStrength(kind),
  source,
  role,
  highlightText,
  highlightRanges: label === 'hit' ? highlightRanges : [],
  amountField: amountMatch?.field,
  amountValue: amountMatch?.value,
  amountRole: amountMatch?.role,
  score: Math.max(0, baseScore * fieldWeight + positionBonus - fuzzyPenalty)
});

const getBestSearchMatch = <TMatch extends SearchTermMatch>(matches: Array<TMatch | null>) =>
  matches.reduce<TMatch | null>((bestMatch, match) => {
    if (!match) {
      return bestMatch;
    }

    if (!bestMatch) {
      return match;
    }

    if (match.score !== bestMatch.score) {
      return match.score > bestMatch.score ? match : bestMatch;
    }

    return match.baseScore > bestMatch.baseScore ? match : bestMatch;
  }, null);

const getSequentialMatchInfo = (candidate: string, query: string) => {
  if (query.length < 2) {
    return null;
  }

  let queryIndex = 0;
  let firstIndex = -1;
  let previousIndex = -1;
  let gapPenalty = 0;
  const matchedIndexes: number[] = [];

  for (let index = 0; index < candidate.length && queryIndex < query.length; index += 1) {
    if (candidate[index] !== query[queryIndex]) {
      continue;
    }

    if (firstIndex < 0) {
      firstIndex = index;
    }

    if (previousIndex >= 0) {
      gapPenalty += Math.max(0, index - previousIndex - 1);
    }

    previousIndex = index;
    matchedIndexes.push(index);
    queryIndex += 1;
  }

  return queryIndex === query.length ? { firstIndex, gapPenalty, matchedIndexes } : null;
};

const getPartialSequentialInfo = (candidate: string, query: string) => {
  if (query.length < 3 || candidate.length < 2) {
    return null;
  }

  let matched = 0;
  let firstIndex = -1;
  let candidateIndex = 0;

  for (const character of query) {
    const foundIndex = candidate.indexOf(character, candidateIndex);

    if (foundIndex < 0) {
      continue;
    }

    if (firstIndex < 0) {
      firstIndex = foundIndex;
    }

    matched += 1;
    candidateIndex = foundIndex + 1;
  }

  const coverage = matched / query.length;

  return coverage >= 0.66 ? { firstIndex: Math.max(firstIndex, 0), missing: query.length - matched } : null;
};

const getLevenshteinDistance = (left: string, right: string) => {
  if (!left || !right) {
    return Math.max(left.length, right.length);
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
};

const getValidTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
};

const getDateParts = (value: string | null | undefined) => {
  const timestamp = getValidTimestamp(value);

  if (timestamp === null) {
    return null;
  }

  const date = new Date(timestamp);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return {
    compact: `${year}${month}${day}`,
    shortCompact: `${year.slice(2)}${month}${day}`,
    monthDay: `${month}${day}`,
    year,
    month,
    yearMonth: `${year}${month}`,
    dayTimestamp: new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  };
};

const areAmountsEqual = (left: number, right: number) => Math.abs(left - right) < 0.005;

const getDirectTextMatch = (
  field: SearchIndexedTextField,
  term: SearchTerm,
  role: SearchTextFieldRole,
  fieldWeight: number,
  includeHighlights: boolean,
  allowFuzzy: boolean
) => {
  const { normalized, compact } = field.index;

  if (!normalized || !compact || !term.normalized || !term.compact) {
    return null;
  }

  const inferredKind = field.inferredKind;
  const getKind = (directKind: SearchMatchKind): SearchMatchKind => inferredKind ?? directKind;
  const getLabel = (kind: SearchMatchKind): SearchMatchLabel =>
    inferredKind ? 'inferred' : getMatchLabel(kind);

  if (normalized === term.normalized || compact === term.compact) {
    const kind = getKind('exact');
    const source = normalized === term.normalized ? 'normalized' : 'compact';
    const range = inferredKind || !includeHighlights
      ? null
      : mapIndexedRangeToOriginal(
          field,
          source,
          0,
          source === 'normalized' ? term.normalized.length : term.compact.length,
          getHighlightStrength(kind)
        );

    return createSearchMatch(
      kind,
      inferredKind ? SEARCH_MATCH_BASE_WEIGHTS[inferredKind] : SEARCH_MATCH_BASE_WEIGHTS.exact,
      fieldWeight,
      0,
      3,
      inferredKind ? 'pinyin' : 'text',
      role,
      getLabel(kind),
      field.index.original,
      range ? [range] : []
    );
  }

  const normalizedPrefix = normalized.startsWith(term.normalized);
  const compactPrefix = compact.startsWith(term.compact);

  if (normalizedPrefix || compactPrefix) {
    const kind = getKind('prefix');
    const source = normalizedPrefix ? 'normalized' : 'compact';
    const range = inferredKind || !includeHighlights
      ? null
      : mapIndexedRangeToOriginal(
          field,
          source,
          0,
          source === 'normalized' ? term.normalized.length : term.compact.length,
          getHighlightStrength(kind)
        );

    return createSearchMatch(
      kind,
      inferredKind ? SEARCH_MATCH_BASE_WEIGHTS[inferredKind] : SEARCH_MATCH_BASE_WEIGHTS.prefix,
      fieldWeight,
      0,
      2.5,
      inferredKind ? 'pinyin' : 'text',
      role,
      getLabel(kind),
      field.index.original,
      range ? [range] : []
    );
  }

  const normalizedIndex = normalized.indexOf(term.normalized);
  const compactIndex = compact.indexOf(term.compact);
  const includedSource =
    normalizedIndex >= 0 && (compactIndex < 0 || normalizedIndex <= compactIndex)
      ? 'normalized'
      : 'compact';
  const bestIncludedAt =
    normalizedIndex >= 0 && compactIndex >= 0
      ? Math.min(normalizedIndex, compactIndex)
      : normalizedIndex >= 0
        ? normalizedIndex
        : compactIndex;

  if (bestIncludedAt >= 0) {
    const kind = getKind('contains');
    const rangeStart = includedSource === 'normalized' ? normalizedIndex : compactIndex;
    const range = inferredKind || !includeHighlights
      ? null
      : mapIndexedRangeToOriginal(
          field,
          includedSource,
          rangeStart,
          includedSource === 'normalized' ? term.normalized.length : term.compact.length,
          getHighlightStrength(kind)
        );

    return createSearchMatch(
      kind,
      inferredKind ? SEARCH_MATCH_BASE_WEIGHTS[inferredKind] : SEARCH_MATCH_BASE_WEIGHTS.contains,
      fieldWeight,
      0,
      getPositionBonus(bestIncludedAt),
      inferredKind ? 'pinyin' : 'text',
      role,
      getLabel(kind),
      field.index.original,
      range ? [range] : []
    );
  }

  if (inferredKind) {
    return null;
  }

  if (!allowFuzzy) {
    return null;
  }

  const sequenceMatch = getSequentialMatchInfo(compact, term.compact);

  if (sequenceMatch) {
    const fuzzyPenalty = Math.min(10, sequenceMatch.gapPenalty * 1.2);

    return createSearchMatch(
      'ordered',
      SEARCH_MATCH_BASE_WEIGHTS.ordered,
      fieldWeight,
      fuzzyPenalty,
      getPositionBonus(sequenceMatch.firstIndex) * 0.5,
      'text',
      role,
      getMatchLabel('ordered'),
      field.index.original,
      includeHighlights
        ? mapIndexedCharactersToOriginal(
            field,
            sequenceMatch.matchedIndexes,
            getHighlightStrength('ordered')
          )
        : []
    );
  }

  const partialMatch = getPartialSequentialInfo(compact, term.compact);

  if (partialMatch) {
    return createSearchMatch(
      'partial-text',
      SEARCH_MATCH_BASE_WEIGHTS['partial-text'],
      fieldWeight,
      partialMatch.missing * 4,
      getPositionBonus(partialMatch.firstIndex) * 0.25,
      'text',
      role
    );
  }

  if (term.compact.length >= 2 && compact.length <= 12) {
    const distance = getLevenshteinDistance(compact, term.compact);
    const maxDistance = term.compact.length <= 4 ? 1 : 2;

    if (distance > 0 && distance <= maxDistance) {
      return createSearchMatch(
        'typo',
        SEARCH_MATCH_BASE_WEIGHTS.typo,
        fieldWeight,
        distance * 5,
        0,
        'text',
        role
      );
    }
  }

  return null;
};

const getDirectNumericTextMatch = (
  field: SearchIndexedTextField,
  term: SearchTerm,
  role: SearchTextFieldRole,
  fieldWeight: number,
  includeHighlights: boolean
) => {
  if (field.inferredKind || !term.isPureNumeric || !term.compact) {
    return null;
  }

  const { compact } = field.index;

  if (!compact) {
    return null;
  }

  const matchIndex = compact.indexOf(term.compact);

  if (matchIndex < 0) {
    return null;
  }

  const kind: SearchMatchKind =
    compact === term.compact ? 'exact' : compact.startsWith(term.compact) ? 'prefix' : 'contains';
  const range = includeHighlights
    ? mapIndexedRangeToOriginal(
        field,
        'compact',
        matchIndex,
        term.compact.length,
        getHighlightStrength(kind)
      )
    : null;

  return createSearchMatch(
    kind,
    SEARCH_MATCH_BASE_WEIGHTS[kind],
    fieldWeight,
    0,
    getPositionBonus(matchIndex),
    'text',
    role,
    'hit',
    field.index.original,
    range ? [range] : []
  );
};

const getPinyinCandidateMatch = (
  candidate: string,
  query: string,
  role: SearchTextFieldRole,
  fieldWeight: number,
  kind: 'pinyin-full' | 'pinyin-initials'
) => {
  if (!candidate || !query) {
    return null;
  }

  if (candidate === query) {
    return createSearchMatch(kind, SEARCH_MATCH_BASE_WEIGHTS[kind], fieldWeight, 0, 1.5, 'pinyin', role);
  }

  if (candidate.startsWith(query)) {
    return createSearchMatch(kind, SEARCH_MATCH_BASE_WEIGHTS[kind], fieldWeight, 0, 1.2, 'pinyin', role);
  }

  const includedAt = candidate.indexOf(query);

  if (includedAt >= 0) {
    return createSearchMatch(
      kind,
      SEARCH_MATCH_BASE_WEIGHTS[kind],
      fieldWeight,
      0,
      getPositionBonus(includedAt) * 0.35,
      'pinyin',
      role
    );
  }

  const sequenceMatch = getSequentialMatchInfo(candidate, query);

  if (!sequenceMatch) {
    return null;
  }

  return createSearchMatch(
    kind,
    SEARCH_MATCH_BASE_WEIGHTS[kind],
    fieldWeight,
    Math.min(14, 5 + sequenceMatch.gapPenalty * 1.6),
    getPositionBonus(sequenceMatch.firstIndex) * 0.25,
    'pinyin',
    role
  );
};

const getPinyinTextMatch = (
  field: SearchIndexedTextField,
  term: SearchTerm,
  role: SearchTextFieldRole,
  fieldWeight: number
) => {
  const { full, initials } = field.pinyin;

  return getBestSearchMatch([
    getPinyinCandidateMatch(full, term.normalized, role, fieldWeight, 'pinyin-full'),
    getPinyinCandidateMatch(initials, term.normalized, role, fieldWeight, 'pinyin-initials')
  ]);
};

const getTextFieldScore = (
  term: SearchTerm,
  fields: SearchIndexedTextField[],
  includeHighlights: boolean
) =>
  getBestSearchMatch(
    fields.flatMap((field) => {
      const value = field.value?.trim();

      if (!value) {
        return [];
      }

      const role = field.role ?? 'detail';
      const fieldWeight = getFieldWeight(field.weight);
      const allowFuzzy = !term.isPureLetters || /[a-z]/i.test(field.index.compact);

      return [
        getDirectTextMatch(
          field,
          term,
          role,
          fieldWeight,
          includeHighlights,
          allowFuzzy
        ),
        term.isPureLetters && !field.inferredKind
          ? getPinyinTextMatch(field, term, role, fieldWeight)
          : null
      ];
    })
  );

const getNumericTextFieldScore = (
  term: SearchTerm,
  fields: SearchIndexedTextField[],
  includeHighlights: boolean
) =>
  getBestSearchMatch(
    fields.flatMap((field) => {
      const value = field.value?.trim();

      if (!value) {
        return [];
      }

      const role = field.role ?? 'detail';
      const fieldWeight = getFieldWeight(field.weight);

      return [getDirectNumericTextMatch(field, term, role, fieldWeight, includeHighlights)];
    })
  );

const getDateMatchKind = (targetScore: number): SearchMatchKind => {
  if (targetScore >= SEARCH_MATCH_BASE_WEIGHTS['date-day']) {
    return 'date-day';
  }

  if (targetScore >= SEARCH_MATCH_BASE_WEIGHTS['date-compact-day']) {
    return 'date-compact-day';
  }

  if (targetScore >= SEARCH_MATCH_BASE_WEIGHTS['date-month-day']) {
    return 'date-month-day';
  }

  if (targetScore >= SEARCH_MATCH_BASE_WEIGHTS['date-month']) {
    return 'date-month';
  }

  return 'date-year';
};

const getDateFieldScore = (term: SearchTerm, fields: SearchDateField[] = []) => {
  if (term.dateTargets.length === 0) {
    return null;
  }

  return getBestSearchMatch(
    fields.flatMap((field) => {
      const parts = getDateParts(field.value);

      if (!parts) {
        return [];
      }

      const fieldWeight = getFieldWeight(field.weight);

      return term.dateTargets.flatMap((target) => {
        if (
          target.kind === 'day' &&
          typeof target.dayTimestamp === 'number' &&
          parts.dayTimestamp === target.dayTimestamp
        ) {
          const kind = getDateMatchKind(target.score);

          return [createSearchMatch(kind, target.score, fieldWeight, 0, 0, 'date')];
        }

        if (target.kind === 'month-day' && target.monthDay === parts.monthDay) {
          return [
            createSearchMatch('date-month-day', target.score, fieldWeight, 0, 0, 'date')
          ];
        }

        if (target.kind === 'year' && target.year === parts.year) {
          return [createSearchMatch('date-year', target.score, fieldWeight, 0, 0, 'date')];
        }

        if (target.kind === 'month') {
          const hasYearMatch = !target.year || target.year === parts.year;

          return hasYearMatch && target.month === parts.month
            ? [createSearchMatch('date-month', target.score, fieldWeight, 0, 0, 'date')]
            : [];
        }

        return [];
      });
    })
  );
};

const getAmountNearMatch = (
  field: SearchAmountField,
  candidateAmount: number,
  queryAmount: number,
  querySign: 1 | -1 | null,
  role: SearchAmountFieldRole
) => {
  if (querySign && Math.sign(candidateAmount) !== querySign) {
    return null;
  }

  const nearMetrics = getSearchAmountNearMatchMetrics(candidateAmount, queryAmount);

  if (!nearMetrics) {
    return null;
  }

  return createSearchMatch(
    'amount-near',
    SEARCH_MATCH_BASE_WEIGHTS['amount-near'],
    getFieldWeight(field.weight),
    nearMetrics.diffRatio * 12,
    0,
    'amount',
    undefined,
    undefined,
    undefined,
    [],
    {
      field: field.matchField,
      value: candidateAmount,
      role
    }
  );
};

const getAmountFieldScore = (term: SearchTerm, fields: SearchAmountField[] = []) => {
  const queryAmount = term.amountValue;

  if (queryAmount === null) {
    return null;
  }

  return getBestSearchMatch(
    fields.flatMap((field) => {
      const value = field.value;

      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return [];
      }

      const role = field.role ?? 'account-balance';
      const fieldWeight = getFieldWeight(field.weight);
      const matches: SearchTermMatch[] = [];

      if (term.amountSign) {
        const signedQueryValue = term.amountSign * queryAmount;

        if (areAmountsEqual(value, signedQueryValue)) {
          matches.push(
            createSearchMatch(
              'amount-exact',
              SEARCH_AMOUNT_EXACT_WEIGHTS[role],
              fieldWeight,
              0,
              role === 'history-delta' ? 2 : 0,
              'amount',
              undefined,
              undefined,
              undefined,
              [],
              {
                field: field.matchField,
                value,
                role
              }
            )
          );
        }
      } else if (areAmountsEqual(Math.abs(value), queryAmount)) {
        matches.push(
          createSearchMatch(
            role === 'history-delta' ? 'amount-absolute' : 'amount-exact',
            SEARCH_AMOUNT_ABSOLUTE_WEIGHTS[role],
            fieldWeight,
            0,
            0,
            'amount',
            undefined,
            undefined,
            undefined,
            [],
            {
              field: field.matchField,
              value,
              role
            }
          )
        );
      }

      const nearMatch = getAmountNearMatch(field, value, queryAmount, term.amountSign, role);

      if (nearMatch) {
        matches.push(nearMatch);
      }

      return matches;
    })
  );
};

const getMultiKeywordFactor = (matchedTermCount: number, totalTermCount: number) => {
  if (totalTermCount <= 1 || matchedTermCount === totalTermCount) {
    return SEARCH_MULTI_TERM_FACTORS.all;
  }

  if (matchedTermCount > 1 && matchedTermCount / totalTermCount >= 0.6) {
    return SEARCH_MULTI_TERM_FACTORS.most;
  }

  return SEARCH_MULTI_TERM_FACTORS.single;
};

const getRecencyBonus = (value: string | null | undefined) => {
  const timestamp = getValidTimestamp(value);

  if (timestamp === null) {
    return 0;
  }

  const ageDays = (Date.now() - timestamp) / DAY_MS;

  if (ageDays <= 7) {
    return 2;
  }

  if (ageDays <= 30) {
    return 1;
  }

  return 0;
};

const getTermMatch = (
  term: SearchTerm,
  candidate: SearchCandidate,
  includeHighlights: boolean
) =>
  getBestSearchMatch([
    term.isPureNumeric
      ? getNumericTextFieldScore(term, candidate.textFields, includeHighlights)
      : term.isNumericIntent
        ? null
        : getTextFieldScore(term, candidate.textFields, includeHighlights),
    getDateFieldScore(term, candidate.dateFields),
    getAmountFieldScore(term, candidate.amountFields)
  ]);

export const scoreSearchCandidate = (
  terms: SearchTerm[],
  candidate: SearchCandidate,
  searchLogicMode: SearchLogicMode = 'infer',
  options: { includeHighlights?: boolean } = {}
) => {
  if (terms.length === 0) {
    return null;
  }

  const includeHighlights = options.includeHighlights ?? true;
  const termMatches = terms.flatMap((term) => {
    const match = getTermMatch(term, candidate, includeHighlights);

    return match ? [{ ...match, term }] : [];
  });

  if (termMatches.length === 0) {
    return null;
  }

  if (searchLogicMode === 'strict' && termMatches.some((match) => match.label === 'inferred')) {
    return null;
  }

  const bestMatch = getBestSearchMatch(termMatches);

  if (!bestMatch) {
    return null;
  }

  const matchLabel: SearchMatchLabel = termMatches.some((match) => match.label === 'hit')
    ? 'hit'
    : 'inferred';
  const coverageFactor = getMultiKeywordFactor(termMatches.length, terms.length);
  const summedScore = termMatches.reduce((total, match) => total + match.score, 0);

  return {
    score: summedScore * coverageFactor + getRecencyBonus(candidate.recencyDate),
    matchedTermCount: termMatches.length,
    matchLabel,
    matchKind: bestMatch.kind,
    bestMatch,
    termMatches
  };
};

export const applySearchTypeAdjustment = (score: number, category: SearchResultCategory) =>
  score + SEARCH_TYPE_SCORE_ADJUSTMENTS[category];

export const compareSearchResults = <
  T extends { score: number; index: number; category?: SearchResultCategory }
>(
  left: T,
  right: T
) => {
  const scoreDelta = right.score - left.score;

  if (Math.abs(scoreDelta) > SEARCH_STABLE_SORT_DELTA) {
    return scoreDelta;
  }

  const leftCategoryRank = left.category
    ? Object.keys(SEARCH_TYPE_SCORE_ADJUSTMENTS).indexOf(left.category)
    : 0;
  const rightCategoryRank = right.category
    ? Object.keys(SEARCH_TYPE_SCORE_ADJUSTMENTS).indexOf(right.category)
    : 0;

  if (leftCategoryRank !== rightCategoryRank) {
    return leftCategoryRank - rightCategoryRank;
  }

  return left.index - right.index;
};

export const getSearchResultStrength = (
  matchLabel: SearchMatchLabel,
  matchedTermCount: number,
  termCount: number
): SearchResultStrength => {
  if (matchLabel === 'inferred') {
    return 'weak';
  }

  return matchedTermCount === termCount ? 'strong' : 'medium';
};

export const passesSearchThreshold = (score: number) => score >= SEARCH_MIN_RESULT_SCORE;
