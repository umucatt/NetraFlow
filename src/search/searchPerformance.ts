let searchPerformanceMeasureId = 0;

const canMeasureSearchPerformance = () =>
  Boolean(
    import.meta.env?.DEV &&
      typeof performance !== 'undefined' &&
      typeof performance.mark === 'function' &&
      typeof performance.measure === 'function'
  );

export const measureSearchExecution = <T>(runSearch: () => T) => {
  if (!canMeasureSearchPerformance()) {
    return runSearch();
  }

  searchPerformanceMeasureId += 1;

  const measureName = 'netraflow:global-search';
  const startMark = `${measureName}:start:${searchPerformanceMeasureId}`;
  const endMark = `${measureName}:end:${searchPerformanceMeasureId}`;

  performance.mark(startMark);
  const output = runSearch();
  performance.mark(endMark);
  performance.measure(measureName, startMark, endMark);

  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);

  return output;
};
