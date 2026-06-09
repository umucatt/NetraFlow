export type PageCoverage = 'full' | 'right-panel-only' | 'none';

export type PageCoveragePanel = 'main' | 'right';

export const getPageCoverage = (
  previousPageKey: string,
  nextPageKey: string,
  panel: PageCoveragePanel
): PageCoverage => {
  if (previousPageKey === nextPageKey) {
    return 'none';
  }

  return panel === 'main' ? 'full' : 'right-panel-only';
};
