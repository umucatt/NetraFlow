import type {
  SearchAmountFieldRole,
  SearchMatchKind,
  SearchResultCategory
} from './searchTypes';

export const SEARCH_INITIAL_RESULT_LIMIT = 99;
export const SEARCH_RESULT_LOAD_STEP = 99;
export const SEARCH_MIN_RESULT_SCORE = 18;

export const SEARCH_MATCH_BASE_WEIGHTS: Record<SearchMatchKind, number> = {
  exact: 100,
  prefix: 92,
  contains: 85,
  ordered: 75,
  'word-all': 75,
  'amount-exact': 80,
  'amount-absolute': 70,
  'amount-near': 25,
  'date-day': 90,
  'date-compact-day': 88,
  'date-month-day': 70,
  'date-month': 55,
  'date-year': 30,
  'pinyin-full': 48,
  'pinyin-initials': 42,
  'partial-text': 38,
  typo: 28
};

export const SEARCH_TYPE_SCORE_ADJUSTMENTS: Record<SearchResultCategory, number> = {
  account: 8,
  settings: 5,
  history: 3,
  snapshot: 0
};

export const SEARCH_MULTI_TERM_FACTORS = {
  all: 1,
  most: 0.65,
  single: 0.35
} as const;

export const SEARCH_DATE_INPUT_WEIGHTS = {
  fullDay: SEARCH_MATCH_BASE_WEIGHTS['date-day'],
  compactDay: SEARCH_MATCH_BASE_WEIGHTS['date-compact-day'],
  monthDay: SEARCH_MATCH_BASE_WEIGHTS['date-month-day'],
  month: SEARCH_MATCH_BASE_WEIGHTS['date-month'],
  year: SEARCH_MATCH_BASE_WEIGHTS['date-year']
} as const;

export const SEARCH_AMOUNT_EXACT_WEIGHTS: Record<SearchAmountFieldRole, number> = {
  'history-delta': 90,
  'history-balance': 80,
  'account-balance': 65,
  'snapshot-count': 35
};

export const SEARCH_AMOUNT_ABSOLUTE_WEIGHTS: Record<SearchAmountFieldRole, number> = {
  'history-delta': 70,
  'history-balance': 70,
  'account-balance': 65,
  'snapshot-count': 35
};

export type SearchAmountNearMatchMetrics = {
  amountDelta: number;
  diffRatio: number;
  magnitudeRatio: number;
  digitDelta: number;
};

export const getSearchAmountApproximationLimits = (queryAmount: number) => {
  if (queryAmount < 1000) {
    return null;
  }

  if (queryAmount < 10000) {
    return { maxRatio: 0.005, maxDelta: 20 };
  }

  if (queryAmount < 100000) {
    return { maxRatio: 0.003, maxDelta: 50 };
  }

  return { maxRatio: 0.002, maxDelta: 200 };
};

const getSearchAmountDigitCount = (amount: number) => {
  const integerPart = Math.floor(Math.abs(amount));

  return String(integerPart).length;
};

export const getSearchAmountNearMatchMetrics = (
  candidateAmount: number,
  queryAmount: number
): SearchAmountNearMatchMetrics | null => {
  const limits = getSearchAmountApproximationLimits(queryAmount);
  const candidateAbs = Math.abs(candidateAmount);

  if (!limits || candidateAbs === 0 || queryAmount <= 0) {
    return null;
  }

  const amountDelta = Math.abs(candidateAbs - queryAmount);
  const diffRatio = amountDelta / queryAmount;
  const magnitudeRatio = Math.min(candidateAbs, queryAmount) / Math.max(candidateAbs, queryAmount);
  const digitDelta = Math.abs(
    getSearchAmountDigitCount(candidateAbs) - getSearchAmountDigitCount(queryAmount)
  );

  if (
    diffRatio > limits.maxRatio ||
    amountDelta > limits.maxDelta ||
    magnitudeRatio < 0.95 ||
    digitDelta > 1
  ) {
    return null;
  }

  return {
    amountDelta,
    diffRatio,
    magnitudeRatio,
    digitDelta
  };
};
