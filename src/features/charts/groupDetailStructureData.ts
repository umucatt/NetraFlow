import { toStoredAmountByNature } from '../../app/accountNature';
import { getHistoryOrder } from '../../app/dateUtils';
import type { AccountTypeNature, AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import {
  buildDisplayChartItems,
  type ChartColorAssignmentMode,
  type ChartColorItem
} from '../../chartLogic';
import type { ChartSegment } from './assetStructureData';

export type GroupDetailStructureData = {
  segments: ChartSegment[];
  total: number;
  signedTotal: number;
  nature: AccountTypeNature;
};

export const getGroupDetailHistory = (group: AssetGroupWithAccounts, history: HistoryRecord[]) => {
  const currentAccountIds = new Set(group.accounts.map((account) => account.id));

  return history.filter((record) => currentAccountIds.has(record.accountId));
};

export const getAccountColorRegistry = (group: AssetGroupWithAccounts, history: HistoryRecord[]) => {
  const registry = new Map<string, ChartColorItem>();

  group.accounts.forEach((account, index) => {
    registry.set(account.id, {
      id: account.id,
      label: account.name,
      amount: 0,
      order: getHistoryOrder(account.createdAt, index)
    });
  });

  getGroupDetailHistory(group, history).forEach((record, index) => {
    const order = getHistoryOrder(record.time, Number.MAX_SAFE_INTEGER - index);
    const existing = registry.get(record.accountId);

    if (!existing || order < existing.order) {
      registry.set(record.accountId, {
        id: record.accountId,
        label: record.accountName,
        amount: 0,
        order
      });
    }
  });

  return Array.from(registry.values());
};

export const deriveGroupDetailStructureData = (
  group: AssetGroupWithAccounts,
  history: HistoryRecord[],
  colorAssignmentMode: ChartColorAssignmentMode
): GroupDetailStructureData => {
  const registry = getAccountColorRegistry(group, history);
  const registryById = new Map(registry.map((item) => [item.id, item]));
  const activeAccounts = group.accounts.filter((account) => !account.archived);
  const segments = buildDisplayChartItems(
    activeAccounts.map((account, index) => ({
      id: account.id,
      label: account.name,
      amount: Math.abs(account.amount),
      order: registryById.get(account.id)?.order ?? getHistoryOrder(account.createdAt, index)
    })),
    colorAssignmentMode,
    {
      registry,
      otherId: `${group.name}-account-other`,
      otherLabel: '\u5176\u4ed6'
    }
  );
  const signedTotal = activeAccounts.reduce(
    (sum, account) => sum + toStoredAmountByNature(group.nature, account.amount),
    0
  );

  return {
    segments,
    total: segments.reduce((sum, segment) => sum + segment.amount, 0),
    signedTotal,
    nature: group.nature
  };
};
