export type PageScrollMemory = Record<string, number>;

export const readPageScrollTop = (
  scrollPositions: PageScrollMemory,
  pageKey: string,
  defaultScrollTop = 0
): number => {
  const savedScrollTop = scrollPositions[pageKey];

  return typeof savedScrollTop === 'number' ? savedScrollTop : defaultScrollTop;
};

export const rememberPageScrollTop = (
  scrollPositions: PageScrollMemory,
  pageKey: string,
  scrollTop: number
) => {
  scrollPositions[pageKey] = scrollTop;
};

export const forgetPageScrollTop = (
  scrollPositions: PageScrollMemory,
  pageKey: string
) => {
  delete scrollPositions[pageKey];
};
