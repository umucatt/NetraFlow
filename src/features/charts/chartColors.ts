import { NETRAFLOW_CHART_PALETTE } from '../../chartLogic';

export const CHART_COLORS = {
  empty: 'var(--chart-empty)',
  netLine: 'var(--chart-net-line)',
  compactTrendLine: 'var(--chart-compact-trend-line)',
  compactNetLine: 'var(--chart-compact-net-line)',
  positiveLine: NETRAFLOW_CHART_PALETTE[0],
  negativeLine: NETRAFLOW_CHART_PALETTE[2],
  liabilityOverlay: NETRAFLOW_CHART_PALETTE[2]
};
