import type {
  SearchAmountField,
  SearchCandidate,
  SearchDateField,
  SearchHighlightStrength,
  SearchIndexedTextField,
  SearchResultCategory,
  SearchResultStrength,
  SearchTerm,
  SearchTermMatch,
  SearchTextFieldRole
} from './searchTypes';
import {
  SEARCH_DEFAULT_THRESHOLDS,
  SEARCH_STABLE_SORT_DELTA,
  SEARCH_WEAK_THRESHOLDS
} from './searchTypes';

const DAY_MS = 24 * 60 * 60 * 1000;

type SearchTextScoreTable = Record<
  SearchTextFieldRole,
  {
    exact: number;
    contains: number;
    fuzzy: number;
    pinyinExact: number;
    pinyinPrefix: number;
    pinyinContains: number;
    pinyinWeak: number;
  }
>;

const TEXT_SCORES: SearchTextScoreTable = {
  name: {
    exact: 108,
    contains: 86,
    fuzzy: 42,
    pinyinExact: 52,
    pinyinPrefix: 48,
    pinyinContains: 42,
    pinyinWeak: 30
  },
  detail: {
    exact: 72,
    contains: 62,
    fuzzy: 36,
    pinyinExact: 46,
    pinyinPrefix: 42,
    pinyinContains: 36,
    pinyinWeak: 26
  },
  weak: {
    exact: 42,
    contains: 38,
    fuzzy: 24,
    pinyinExact: 32,
    pinyinPrefix: 28,
    pinyinContains: 24,
    pinyinWeak: 18
  }
};

const SETTINGS_TEXT_SCORES: SearchTextScoreTable = {
  name: {
    exact: 82,
    contains: 70,
    fuzzy: 28,
    pinyinExact: 62,
    pinyinPrefix: 56,
    pinyinContains: 48,
    pinyinWeak: 30
  },
  detail: {
    exact: 64,
    contains: 54,
    fuzzy: 22,
    pinyinExact: 58,
    pinyinPrefix: 52,
    pinyinContains: 44,
    pinyinWeak: 28
  },
  weak: {
    exact: 36,
    contains: 32,
    fuzzy: 16,
    pinyinExact: 30,
    pinyinPrefix: 26,
    pinyinContains: 22,
    pinyinWeak: 14
  }
};

const createSearchMatch = (
  baseScore: number,
  fieldWeight = 0,
  fuzzyPenalty = 0,
  positionBonus = 0,
  highlightStrength: SearchHighlightStrength = 'medium',
  source: SearchTermMatch['source'] = 'text',
  role?: SearchTextFieldRole
): SearchTermMatch => ({
  baseScore,
  fieldWeight,
  fuzzyPenalty,
  positionBonus,
  highlightStrength,
  source,
  role,
  score: Math.max(0, baseScore + fieldWeight + positionBonus - fuzzyPenalty)
});

const getBestSearchMatch = (matches: Array<SearchTermMatch | null>) =>
  matches.reduce<SearchTermMatch | null>((bestMatch, match) => {
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

const getFieldWeight = (weight: number | undefined) => weight ?? 0;

const getPositionBonus = (matchIndex: number) =>
  matchIndex <= 0 ? 3 : Math.max(0, 2 - Math.min(matchIndex, 10) * 0.2);

const getSequentialMatchInfo = (candidate: string, query: string) => {
  if (query.length < 2) {
    return null;
  }

  let queryIndex = 0;
  let firstIndex = -1;
  let previousIndex = -1;
  let gapPenalty = 0;

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
    queryIndex += 1;
  }

  return queryIndex === query.length ? { firstIndex, gapPenalty } : null;
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
  scoreTable: SearchTextScoreTable = TEXT_SCORES
) => {
  const { normalized, compact } = field.index;
  const scores = scoreTable[role];

  if (!normalized || !compact || !term.normalized || !term.compact) {
    return null;
  }

  const chineseBoost = term.hasChinese ? 8 : 0;

  if (normalized === term.normalized || compact === term.compact) {
    return createSearchMatch(scores.exact + chineseBoost, fieldWeight, 0, 3, 'strong', 'text', role);
  }

  const normalizedIndex = normalized.indexOf(term.normalized);
  const compactIndex = compact.indexOf(term.compact);
  const bestIncludedAt =
    normalizedIndex >= 0 && compactIndex >= 0
      ? Math.min(normalizedIndex, compactIndex)
      : normalizedIndex >= 0
        ? normalizedIndex
        : compactIndex;

  if (bestIncludedAt >= 0) {
    return createSearchMatch(
      scores.contains + chineseBoost,
      fieldWeight,
      0,
      getPositionBonus(bestIncludedAt),
      bestIncludedAt === 0 ? 'strong' : 'medium',
      'text',
      role
    );
  }

  const sequenceMatch = getSequentialMatchInfo(compact, term.compact);

  if (!sequenceMatch) {
    return null;
  }

  const fuzzyPenalty = Math.min(
    18,
    5 + sequenceMatch.gapPenalty * 2 + Math.max(0, compact.length - term.compact.length) * 0.2
  );

  return createSearchMatch(
    scores.fuzzy,
    fieldWeight,
    fuzzyPenalty,
    getPositionBonus(sequenceMatch.firstIndex) * 0.5,
    'weak',
    'text',
    role
  );
};

const getPinyinCandidateMatch = (
  candidate: string,
  query: string,
  role: SearchTextFieldRole,
  fieldWeight: number,
  scoreTable: SearchTextScoreTable = TEXT_SCORES
) => {
  if (!candidate || !query) {
    return null;
  }

  const scores = scoreTable[role];

  if (candidate === query) {
    return createSearchMatch(scores.pinyinExact, fieldWeight, 0, 1.5, 'weak', 'pinyin', role);
  }

  if (candidate.startsWith(query)) {
    return createSearchMatch(scores.pinyinPrefix, fieldWeight, 0, 1.2, 'weak', 'pinyin', role);
  }

  const includedAt = candidate.indexOf(query);

  if (includedAt >= 0) {
    return createSearchMatch(
      scores.pinyinContains,
      fieldWeight,
      0,
      getPositionBonus(includedAt) * 0.35,
      'weak',
      'pinyin',
      role
    );
  }

  const sequenceMatch = getSequentialMatchInfo(candidate, query);

  if (!sequenceMatch) {
    return null;
  }

  return createSearchMatch(
    scores.pinyinWeak,
    fieldWeight,
    Math.min(14, 5 + sequenceMatch.gapPenalty * 1.6),
    getPositionBonus(sequenceMatch.firstIndex) * 0.25,
    'weak',
    'pinyin',
    role
  );
};

const getPinyinTextMatch = (
  field: SearchIndexedTextField,
  term: SearchTerm,
  role: SearchTextFieldRole,
  fieldWeight: number,
  scoreTable: SearchTextScoreTable = TEXT_SCORES
) => {
  const { full, initials } = field.pinyin;

  return getBestSearchMatch([
    getPinyinCandidateMatch(full, term.normalized, role, fieldWeight, scoreTable),
    getPinyinCandidateMatch(initials, term.normalized, role, fieldWeight, scoreTable)
  ]);
};

const getTextFieldScore = (
  term: SearchTerm,
  fields: SearchIndexedTextField[],
  scoreTable: SearchTextScoreTable = TEXT_SCORES
) =>
  getBestSearchMatch(
    fields.flatMap((field) => {
      const value = field.value?.trim();

      if (!value) {
        return [];
      }

      const role = field.role ?? 'detail';
      const fieldWeight = getFieldWeight(field.weight);

      return [
        getDirectTextMatch(field, term, role, fieldWeight, scoreTable),
        term.isPureLetters ? getPinyinTextMatch(field, term, role, fieldWeight, scoreTable) : null
      ];
    })
  );

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
        if (target.kind === 'day' && typeof target.dayTimestamp === 'number') {
          const dayDelta = Math.round(
            Math.abs(parts.dayTimestamp - target.dayTimestamp) / DAY_MS
          );

          if (dayDelta === 0) {
            return [createSearchMatch(96, fieldWeight, 0, 0, 'strong', 'date')];
          }

          if (dayDelta <= 3) {
            const toleranceScore = dayDelta === 1 ? 72 : dayDelta === 2 ? 56 : 42;

            return [
              createSearchMatch(toleranceScore, fieldWeight, dayDelta, 0, 'weak', 'date')
            ];
          }

          return [];
        }

        if (target.kind === 'month-day') {
          return target.monthDay === parts.monthDay
            ? [createSearchMatch(88, fieldWeight, 0, 0, 'medium', 'date')]
            : [];
        }

        if (target.kind === 'year') {
          return target.year === parts.year
            ? [createSearchMatch(44, fieldWeight, 0, 0, 'weak', 'date')]
            : [];
        }

        if (target.kind === 'month') {
          const hasYearMatch = !target.year || target.year === parts.year;

          return hasYearMatch && target.month === parts.month
            ? [createSearchMatch(28, fieldWeight, 0, 0, 'weak', 'date')]
            : [];
        }

        return [];
      });
    })
  );
};

const getAmountMatchBaseScore = (candidateAmount: number, queryAmount: number) => {
  const candidateAbsAmount = Math.abs(candidateAmount);
  const amountDelta = Math.abs(candidateAbsAmount - queryAmount);

  if (areAmountsEqual(candidateAbsAmount, queryAmount)) {
    return { baseScore: 94, fuzzyPenalty: 0, highlightStrength: 'strong' as const };
  }

  if (queryAmount === 0) {
    return null;
  }

  const diffRatio = amountDelta / queryAmount;

  if (diffRatio <= 0.01) {
    return { baseScore: 76, fuzzyPenalty: diffRatio * 4, highlightStrength: 'medium' as const };
  }

  if (diffRatio <= 0.03) {
    return { baseScore: 60, fuzzyPenalty: diffRatio * 8, highlightStrength: 'medium' as const };
  }

  if (diffRatio <= 0.05) {
    return { baseScore: 45, fuzzyPenalty: diffRatio * 10, highlightStrength: 'weak' as const };
  }

  if (diffRatio <= 0.1) {
    return { baseScore: 25, fuzzyPenalty: diffRatio * 12, highlightStrength: 'weak' as const };
  }

  return null;
};

const getAmountFieldScore = (term: SearchTerm, fields: SearchAmountField[] = []) => {
  if (term.amountValue === null) {
    return null;
  }

  return getBestSearchMatch(
    fields.flatMap((field) => {
      const value = field.value;

      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return [];
      }

      const amountMatch = getAmountMatchBaseScore(value, term.amountValue ?? 0);

      return amountMatch
        ? [
            createSearchMatch(
              amountMatch.baseScore,
              getFieldWeight(field.weight),
              amountMatch.fuzzyPenalty,
              0,
              amountMatch.highlightStrength,
              'amount'
            )
          ]
        : [];
    })
  );
};

const getMultiKeywordBonus = (matchedTermCount: number, totalTermCount: number) => {
  if (totalTermCount < 2 || matchedTermCount < 2) {
    return 0;
  }

  if (matchedTermCount === totalTermCount) {
    return 50;
  }

  if (matchedTermCount >= 3) {
    return 35;
  }

  return 20;
};

const getRecencyBonus = (value: string | null | undefined) => {
  const timestamp = getValidTimestamp(value);

  if (timestamp === null) {
    return 0;
  }

  const ageDays = (Date.now() - timestamp) / DAY_MS;

  if (ageDays <= 7) {
    return 10;
  }

  if (ageDays <= 30) {
    return 5;
  }

  return 0;
};

const getTermMatch = (term: SearchTerm, candidate: SearchCandidate) =>
  getBestSearchMatch([
    term.isNumericIntent ? null : getTextFieldScore(term, candidate.textFields),
    getDateFieldScore(term, candidate.dateFields),
    getAmountFieldScore(term, candidate.amountFields)
  ]);

const getSettingsTermMatch = (term: SearchTerm, candidate: SearchCandidate) =>
  getTextFieldScore(term, candidate.textFields, SETTINGS_TEXT_SCORES);

export const scoreSearchCandidate = (terms: SearchTerm[], candidate: SearchCandidate) => {
  if (terms.length === 0) {
    return null;
  }

  const termMatches = terms
    .map((term) => getTermMatch(term, candidate))
    .filter((match): match is SearchTermMatch => match !== null);

  if (termMatches.length === 0) {
    return null;
  }

  const bestMatch = getBestSearchMatch(termMatches);

  if (!bestMatch) {
    return null;
  }

  return {
    score:
      bestMatch.score +
      getMultiKeywordBonus(termMatches.length, terms.length) +
      getRecencyBonus(candidate.recencyDate),
    matchedTermCount: termMatches.length,
    bestMatch,
    termMatches
  };
};

const getSettingsMultiKeywordBonus = (matchedTermCount: number, totalTermCount: number) => {
  if (totalTermCount < 2 || matchedTermCount < 2) {
    return 0;
  }

  return matchedTermCount === totalTermCount ? 42 : 18;
};

export const scoreSettingsSearchCandidate = (terms: SearchTerm[], candidate: SearchCandidate) => {
  if (terms.length === 0) {
    return null;
  }

  const termMatches = terms
    .map((term) => getSettingsTermMatch(term, candidate))
    .filter((match): match is SearchTermMatch => match !== null);

  if (termMatches.length === 0) {
    return null;
  }

  const bestMatch = getBestSearchMatch(termMatches);

  if (!bestMatch) {
    return null;
  }

  return {
    score: bestMatch.score + getSettingsMultiKeywordBonus(termMatches.length, terms.length),
    matchedTermCount: termMatches.length,
    bestMatch,
    termMatches
  };
};

export const compareSearchResults = <T extends { score: number; index: number }>(
  left: T,
  right: T
) => {
  const scoreDelta = right.score - left.score;

  if (Math.abs(scoreDelta) > SEARCH_STABLE_SORT_DELTA) {
    return scoreDelta;
  }

  return left.index - right.index;
};

export const getSearchResultStrength = (
  score: number,
  category: SearchResultCategory,
  isWeakRelated: boolean
): SearchResultStrength => {
  if (isWeakRelated) {
    return 'weak';
  }

  const threshold = SEARCH_DEFAULT_THRESHOLDS[category];

  return score >= threshold + 42 ? 'strong' : 'medium';
};

export const passesSearchThreshold = (
  score: number,
  matchedTermCount: number,
  termCount: number,
  category: SearchResultCategory,
  isWeakMode: boolean
) => {
  const threshold = isWeakMode
    ? SEARCH_WEAK_THRESHOLDS[category]
    : SEARCH_DEFAULT_THRESHOLDS[category];

  if (score < threshold) {
    return false;
  }

  return isWeakMode || matchedTermCount === termCount;
};
