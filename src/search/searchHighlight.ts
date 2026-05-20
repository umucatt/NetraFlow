import type { SearchHighlightRange, SearchHighlightStrength } from './searchTypes';
import { getNormalizedTextIndex, getPinyinParts, isPureLetterToken, tokenizeSearchQuery } from './searchNormalize';

export type SearchHighlightOptions = {
  allowInferred?: boolean;
};

const strengthRank: Record<SearchHighlightStrength, number> = {
  weak: 1,
  medium: 2,
  strong: 3
};

const getStrongerStrength = (
  left: SearchHighlightStrength,
  right: SearchHighlightStrength
): SearchHighlightStrength => (strengthRank[left] >= strengthRank[right] ? left : right);

const getOriginalEndIndex = (text: string, originalStart: number) => {
  const codePoint = text.codePointAt(originalStart);

  if (codePoint === undefined) {
    return originalStart + 1;
  }

  return originalStart + String.fromCodePoint(codePoint).length;
};

const mapNormalizedRangeToOriginal = (
  text: string,
  mapping: number[],
  start: number,
  length: number,
  strength: SearchHighlightStrength
): SearchHighlightRange | null => {
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

const getMappedRanges = (
  text: string,
  candidate: string,
  mapping: number[],
  token: string,
  strength: SearchHighlightStrength
) => {
  const ranges: SearchHighlightRange[] = [];

  if (!candidate || !token) {
    return ranges;
  }

  let searchIndex = candidate.indexOf(token);

  while (searchIndex >= 0) {
    const range = mapNormalizedRangeToOriginal(text, mapping, searchIndex, token.length, strength);

    if (range) {
      ranges.push(range);
    }

    searchIndex = candidate.indexOf(token, searchIndex + 1);
  }

  return ranges;
};

const getDigitTokens = (tokenDigits: string) => {
  if (tokenDigits.length === 8) {
    return [tokenDigits, tokenDigits.slice(2)];
  }

  if (tokenDigits.length === 6 && /^20\d{4}$/.test(tokenDigits)) {
    return [tokenDigits, tokenDigits.slice(2)];
  }

  return [tokenDigits];
};

const getDigitRanges = (text: string, token: string) => {
  const tokenDigits = token.replace(/\D/g, '');

  if (tokenDigits.length < 2) {
    return [];
  }

  const digitPositions: number[] = [];
  const textDigits = Array.from(text).reduce((digits, character, index) => {
    if (/\d/.test(character)) {
      digitPositions.push(index);
      return `${digits}${character}`;
    }

    return digits;
  }, '');
  const ranges: SearchHighlightRange[] = [];
  const digitTokens = Array.from(new Set(getDigitTokens(tokenDigits)));

  digitTokens.forEach((digitToken) => {
    let searchIndex = textDigits.indexOf(digitToken);

    while (searchIndex >= 0) {
      const start = digitPositions[searchIndex];
      const end = digitPositions[searchIndex + digitToken.length - 1];

      if (start !== undefined && end !== undefined) {
        ranges.push({ start, end: end + 1, strength: 'medium' });
      }

      searchIndex = textDigits.indexOf(digitToken, searchIndex + 1);
    }
  });

  return ranges;
};

const getPinyinHintRange = (text: string, token: string) => {
  if (!isPureLetterToken(token)) {
    return null;
  }

  const { full, initials } = getPinyinParts(text);

  if (!full.includes(token.toLocaleLowerCase('zh-CN')) && !initials.includes(token.toLocaleLowerCase('zh-CN'))) {
    return null;
  }

  const firstSearchableCharacterIndex = Array.from(text).findIndex((character) =>
    /[\p{L}\p{N}]/u.test(character)
  );

  if (firstSearchableCharacterIndex < 0) {
    return null;
  }

  return {
    start: firstSearchableCharacterIndex,
    end: getOriginalEndIndex(text, firstSearchableCharacterIndex),
    strength: 'weak' as const
  };
};

export const mergeHighlightRanges = (ranges: SearchHighlightRange[]) => {
  const sortedRanges = ranges
    .filter((range) => range.end > range.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const mergedRanges: SearchHighlightRange[] = [];

  sortedRanges.forEach((range) => {
    const previousRange = mergedRanges[mergedRanges.length - 1];

    if (!previousRange || range.start > previousRange.end) {
      mergedRanges.push({ ...range });
      return;
    }

    previousRange.end = Math.max(previousRange.end, range.end);
    previousRange.strength = getStrongerStrength(previousRange.strength, range.strength);
  });

  return mergedRanges;
};

export const getSearchHighlightRanges = (
  value: string,
  query: string,
  options: SearchHighlightOptions = {}
) => {
  const text = String(value);
  const textIndex = getNormalizedTextIndex(text);
  const allowInferred = options.allowInferred ?? true;
  const ranges = tokenizeSearchQuery(query).flatMap((token) => {
    const tokenIndex = getNormalizedTextIndex(token);
    const pinyinHint = allowInferred ? getPinyinHintRange(text, token) : null;

    return [
      ...getMappedRanges(
        text,
        text.toLocaleLowerCase('zh-CN'),
        Array.from(text).map((_, index) => index),
        token.toLocaleLowerCase('zh-CN'),
        'strong'
      ),
      ...getMappedRanges(
        text,
        textIndex.normalized,
        textIndex.normalizedToOriginal,
        tokenIndex.normalized,
        'medium'
      ),
      ...getMappedRanges(
        text,
        textIndex.compact,
        textIndex.compactToOriginal,
        tokenIndex.compact,
        'weak'
      ),
      ...getDigitRanges(text, token),
      ...(pinyinHint ? [pinyinHint] : [])
    ];
  });

  return mergeHighlightRanges(ranges);
};
