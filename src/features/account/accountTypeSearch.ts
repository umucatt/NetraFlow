import type { AssetGroup } from '../../app/types';

export const normalizeTypeSearchText = (value: string) => value.trim().toLocaleLowerCase('zh-CN');

const getSubsequenceMatchScore = (candidate: string, query: string) => {
  let queryIndex = 0;
  let score = 0;

  for (const character of candidate) {
    if (character === query[queryIndex]) {
      queryIndex += 1;
      score += 1;
    }
  }

  return queryIndex === query.length ? score : null;
};

export const getAccountTypeMatchScore = (name: string, query: string) => {
  const candidate = normalizeTypeSearchText(name);

  if (!query || !candidate) {
    return -1;
  }

  if (candidate === query) {
    return 1000;
  }

  if (candidate.startsWith(query)) {
    return 900 - (candidate.length - query.length);
  }

  const includedAt = candidate.indexOf(query);

  if (includedAt >= 0) {
    return 700 - includedAt - (candidate.length - query.length) * 0.1;
  }

  const subsequenceScore = getSubsequenceMatchScore(candidate, query);

  if (subsequenceScore !== null) {
    return 500 + subsequenceScore;
  }

  const queryCharacters = Array.from(new Set(query));
  const overlapCount = queryCharacters.filter((character) => candidate.includes(character)).length;

  return overlapCount > 0 ? 100 + overlapCount / queryCharacters.length : -1;
};

export const findBestAccountTypeMatch = (groups: AssetGroup[], input: string) => {
  const query = normalizeTypeSearchText(input);

  if (!query) {
    return null;
  }

  return groups
    .map((group, index) => ({
      group,
      index,
      score: getAccountTypeMatchScore(group.name, query)
    }))
    .filter((result) => result.score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.group ?? null;
};

export const getAccountTypeGhostText = (input: string, match: AssetGroup | null) => {
  const trimmedInput = input.trim();

  if (!trimmedInput || !match) {
    return '';
  }

  const normalizedInput = normalizeTypeSearchText(trimmedInput);
  const normalizedMatch = normalizeTypeSearchText(match.name);

  if (normalizedInput === normalizedMatch) {
    return '';
  }

  if (normalizedMatch.startsWith(normalizedInput)) {
    return match.name.slice(trimmedInput.length);
  }

  return ` → ${match.name}`;
};
