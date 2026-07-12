import { toStoredAmountByNature } from '../../app/accountNature';
import {
  getDateEndTimestamp,
  getDateTimestamp,
  getHistoryDateKey,
  getHistoryTimestamp
} from '../../app/dateUtils';
import type { AccountTypeNature, AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import {
  buildDisplayChartItems,
  getChartRangeDateKeys,
  type BasicCategoryChartSettings,
  type ChartColorAssignmentMode,
  type ChartPointKind
} from '../../chartLogic';
import { getAccountColorRegistry, getGroupDetailHistory } from './groupDetailStructureData';

export type GroupDetailTrendSeries = {
  id: string;
  label: string;
  color: string;
  values: number[];
  archived?: boolean;
};

export type GroupDetailTrendData = {
  dates: string[];
  pointKinds: ChartPointKind[];
  series: GroupDetailTrendSeries[];
  totals: number[];
  nature: AccountTypeNature;
};

export type GroupDetailTrendSettings = Pick<BasicCategoryChartSettings, 'xAxisRange'>;

const getTrendChangeDateKeys = (history: HistoryRecord[]) =>
  Array.from(
    new Set(
      history
        .map((record) => getHistoryDateKey(record.time))
        .filter((date): date is string => Boolean(date))
    )
  ).sort((left, right) => getDateTimestamp(left) - getDateTimestamp(right));

const createCurrentGroupDetailState = (group: AssetGroupWithAccounts) => {
  const state = new Map<string, { label: string; amount: number }>();

  group.accounts.forEach((account) => {
    if (account.archived) {
      return;
    }

    state.set(account.id, {
      label: account.name,
      amount: toStoredAmountByNature(group.nature, account.amount)
    });
  });

  return state;
};

const setGroupDetailStateAmount = (
  state: Map<string, { label: string; amount: number }>,
  group: AssetGroupWithAccounts,
  record: HistoryRecord,
  amount: number | null
) => {
  if (amount === null) {
    state.delete(record.accountId);
    return;
  }

  state.set(record.accountId, {
    label: record.accountName,
    amount: toStoredAmountByNature(group.nature, amount)
  });
};

const rollbackGroupDetailRecordForTrend = (
  state: Map<string, { label: string; amount: number }>,
  group: AssetGroupWithAccounts,
  record: HistoryRecord,
  hasEarlierAccountRecord: boolean
) => {
  if (record.type === '创建') {
    if (hasEarlierAccountRecord) {
      return;
    }

    setGroupDetailStateAmount(state, group, record, record.beforeAmount);
    return;
  }

  if (record.type === '删除' || record.type === '归档') {
    setGroupDetailStateAmount(state, group, record, record.beforeAmount);
    return;
  }

  if (record.type === '重新启用') {
    state.delete(record.accountId);
    return;
  }

  setGroupDetailStateAmount(state, group, record, record.beforeAmount);
};

export const deriveGroupDetailTrendData = (
  group: AssetGroupWithAccounts,
  history: HistoryRecord[],
  settings: GroupDetailTrendSettings,
  colorAssignmentMode: ChartColorAssignmentMode
): GroupDetailTrendData => {
  const relevantHistory = getGroupDetailHistory(group, history);
  const changeDateKeys = getTrendChangeDateKeys(relevantHistory);
  const rangeDateKeys = getChartRangeDateKeys(settings.xAxisRange);
  const rangeStart = rangeDateKeys[0] ?? '';
  const rangeEnd = rangeDateKeys[rangeDateKeys.length - 1] ?? '';
  const changeDateKeysBeforeEnd = changeDateKeys.filter(
    (date) => !rangeEnd || getDateTimestamp(date) <= getDateTimestamp(rangeEnd)
  );

  if (changeDateKeysBeforeEnd.length < 2 || rangeDateKeys.length === 0) {
    return { dates: [], pointKinds: [], series: [], totals: [], nature: group.nature };
  }

  const hasBaselineBeforeRange = changeDateKeysBeforeEnd.some(
    (date) => getDateTimestamp(date) < getDateTimestamp(rangeStart)
  );
  const firstChangeInRange = changeDateKeysBeforeEnd.find(
    (date) => getDateTimestamp(date) >= getDateTimestamp(rangeStart)
  );
  const firstPlotDate = hasBaselineBeforeRange ? rangeStart : firstChangeInRange;

  if (!firstPlotDate) {
    return { dates: [], pointKinds: [], series: [], totals: [], nature: group.nature };
  }

  const dates = rangeDateKeys.filter(
    (date) => getDateTimestamp(date) >= getDateTimestamp(firstPlotDate)
  );
  const changeDateKeySet = new Set(changeDateKeysBeforeEnd);
  const currentState = createCurrentGroupDetailState(group);
  const recordsByTimeDesc = relevantHistory
    .map((record, index) => ({
      record,
      index,
      timestamp: getHistoryTimestamp(record)
    }))
    .filter((entry) => entry.timestamp > 0)
    .sort((left, right) => right.timestamp - left.timestamp || left.index - right.index);
  const earliestTimestampByAccountId = new Map<string, number>();

  recordsByTimeDesc.forEach(({ record, timestamp }) => {
    const current = earliestTimestampByAccountId.get(record.accountId);
    if (current === undefined || timestamp < current) {
      earliestTimestampByAccountId.set(record.accountId, timestamp);
    }
  });

  const state = new Map(currentState);
  const stateByDate = new Map<string, Map<string, { label: string; amount: number }>>();
  let recordIndex = 0;

  [...dates].reverse().forEach((date) => {
    const cutoff = getDateEndTimestamp(date);

    while (
      recordIndex < recordsByTimeDesc.length &&
      recordsByTimeDesc[recordIndex]!.timestamp > cutoff
    ) {
      const entry = recordsByTimeDesc[recordIndex]!;
      rollbackGroupDetailRecordForTrend(
        state,
        group,
        entry.record,
        (earliestTimestampByAccountId.get(entry.record.accountId) ?? Infinity) <= cutoff
      );
      recordIndex += 1;
    }

    stateByDate.set(date, new Map(state));
  });
  const dailyStates = dates.map((date) => stateByDate.get(date) ?? new Map());
  const registry = getAccountColorRegistry(group, history);
  const registryById = new Map(registry.map((item) => [item.id, item]));
  const accountIds = new Set<string>();

  registry.forEach((item) => accountIds.add(item.id));
  dailyStates.forEach((state) => state.forEach((_, accountId) => accountIds.add(accountId)));

  const items = Array.from(accountIds).map((accountId) => {
    const values = dailyStates.map((state) => state.get(accountId)?.amount ?? 0);
    const latestValue = values[values.length - 1] ?? 0;
    const maxHistoricalValue = values.reduce(
      (maxValue, value) => Math.max(maxValue, Math.abs(value)),
      0
    );
    const account = group.accounts.find((currentAccount) => currentAccount.id === accountId);
    const registryItem = registryById.get(accountId);

    return {
      id: accountId,
      label:
        account?.name ??
        registryItem?.label ??
        dailyStates.find((state) => state.has(accountId))?.get(accountId)?.label ??
        accountId,
      archived: Boolean(account?.archived),
      amount:
        Math.abs(latestValue) > 0
          ? Math.abs(latestValue)
          : maxHistoricalValue > 0
            ? Number.EPSILON
            : 0,
      order: registryItem?.order ?? Number.MAX_SAFE_INTEGER,
      values
    };
  });
  const displayItems = buildDisplayChartItems(items, colorAssignmentMode, {
    registry,
    otherId: `${group.name}-trend-other`,
    otherLabel: '其他',
    ...(items.some((item) => item.archived) ? { maxItems: Number.MAX_SAFE_INTEGER } : {})
  });
  const valuesById = new Map(items.map((item) => [item.id, item.values]));
  const archivedById = new Map(items.map((item) => [item.id, item.archived]));
  const series = displayItems
    .map((item) => ({
      id: item.id,
      label: item.label,
      color: item.color,
      archived: item.sourceIds.length === 1 ? archivedById.get(item.sourceIds[0]) : false,
      values: dates.map((_, index) =>
        item.sourceIds.reduce(
          (sum, accountId) => sum + (valuesById.get(accountId)?.[index] ?? 0),
          0
        )
      )
    }))
    .filter((item) => item.values.some((value) => value !== 0));
  const totals = dates.map((_, index) =>
    series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0)
  );

  return {
    dates,
    pointKinds: dates.map((date) =>
      changeDateKeySet.has(date) ? 'change-date' : 'carry-forward'
    ),
    series,
    totals,
    nature: group.nature
  };
};
