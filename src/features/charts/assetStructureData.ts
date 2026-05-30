import { getHistoryOrder } from '../../app/dateUtils';
import { isPositiveNature, toStoredAmountByNature } from '../../app/accountNature';
import type { AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import {
  buildDisplayChartItems,
  type ChartColorAssignmentMode,
  type ChartColorItem
} from '../../chartLogic';

export type ChartSegment = {
  id: string;
  label: string;
  amount: number;
  color: string;
  sourceIds?: string[];
  archived?: boolean;
};

export type AssetStructureChartData = {
  positiveSegments: ChartSegment[];
  negativeSegments: ChartSegment[];
  positiveTotal: number;
  negativeTotal: number;
  debtRatio: number;
};

export const getGroupColorRegistry = (groups: AssetGroupWithAccounts[], history: HistoryRecord[]) => {
  const registry = new Map<string, ChartColorItem>();

  groups.forEach((group, index) => {
    registry.set(group.name, {
      id: group.name,
      label: group.name,
      amount: 0,
      order: Number.MAX_SAFE_INTEGER - groups.length + index
    });
  });

  history.forEach((record, index) => {
    const order = getHistoryOrder(record.time, Number.MAX_SAFE_INTEGER - index);
    const existing = registry.get(record.groupName);

    if (!existing || order < existing.order) {
      registry.set(record.groupName, {
        id: record.groupName,
        label: record.groupName,
        amount: 0,
        order
      });
    }
  });

  return Array.from(registry.values());
};

export const getActiveGroupTotal = (group: AssetGroupWithAccounts) =>
  toStoredAmountByNature(
    group.nature,
    group.accounts
      .filter((account) => !account.archived)
      .reduce((sum, account) => sum + account.amount, 0)
  );

export const deriveAssetStructureData = (
  groups: AssetGroupWithAccounts[],
  history: HistoryRecord[],
  colorAssignmentMode: ChartColorAssignmentMode
): AssetStructureChartData => {
  const includedGroups = groups.filter((group) => group.includeInStats);
  const positiveSegments: ChartSegment[] = [];
  const negativeSegments: ChartSegment[] = [];
  const groupByName = new Map(includedGroups.map((group) => [group.name, group]));
  const displayItems = buildDisplayChartItems(
    includedGroups.map((group) => ({
      id: group.name,
      label: group.name,
      amount: Math.abs(getActiveGroupTotal(group)),
      order: group.sortOrder
    })),
    colorAssignmentMode,
    {
      registry: getGroupColorRegistry(groups, history),
      otherId: 'group-other',
      otherLabel: '其他'
    }
  );

  displayItems.forEach((item) => {
    const sourceGroups = item.sourceIds
      .map((sourceId) => groupByName.get(sourceId))
      .filter((group): group is AssetGroupWithAccounts => Boolean(group));
    const positiveAmount = sourceGroups
      .filter((group) => isPositiveNature(group.nature))
      .reduce((sum, group) => sum + Math.abs(getActiveGroupTotal(group)), 0);
    const negativeAmount = sourceGroups
      .filter((group) => !isPositiveNature(group.nature))
      .reduce((sum, group) => sum + Math.abs(getActiveGroupTotal(group)), 0);

    if (positiveAmount > 0) {
      positiveSegments.push({
        id: `${item.id}-positive`,
        label: item.label,
        amount: positiveAmount,
        color: item.color,
        sourceIds: item.sourceIds
      });
    }

    if (negativeAmount > 0) {
      negativeSegments.push({
        id: `${item.id}-negative`,
        label: item.label,
        amount: negativeAmount,
        color: item.color,
        sourceIds: item.sourceIds
      });
    }
  });

  const positiveTotal = positiveSegments.reduce((sum, segment) => sum + segment.amount, 0);
  const negativeTotal = negativeSegments.reduce((sum, segment) => sum + segment.amount, 0);

  return {
    positiveSegments,
    negativeSegments,
    positiveTotal,
    negativeTotal,
    debtRatio:
      positiveTotal > 0
        ? negativeTotal / positiveTotal
        : negativeTotal > 0
          ? Number.POSITIVE_INFINITY
          : 0
  };
};
