import {
  getDateEndTimestamp,
  getDateTimestamp,
  getHistoryDateKey,
  getHistoryTimestamp
} from '../../app/dateUtils';
import {
  getLegacyNature,
  isPositiveNature,
  toStoredAmountByNature
} from '../../app/accountNature';
import type { AccountTypeNature, AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import {
  getChartRangeDateKeys,
  type ChartPointKind,
  type ChartXAxisRange
} from '../../chartLogic';

export type AssetTrendSettings = {
  xAxisRange: ChartXAxisRange;
};

export type TrendChartPoint = {
  date: string;
  kind: ChartPointKind;
  net: number;
  positive: number;
  negative: number;
};

type ChartAccountState = {
  groupName: string;
  nature: AccountTypeNature;
  amount: number;
};

const createCurrentChartState = (groups: AssetGroupWithAccounts[]) => {
  const state = new Map<string, ChartAccountState>();

  groups.forEach((group) => {
    if (!group.includeInStats) {
      return;
    }

    group.accounts.forEach((account) => {
      if (account.archived) {
        return;
      }

      state.set(account.id, {
        groupName: group.name,
        nature: group.nature,
        amount: toStoredAmountByNature(group.nature, account.amount)
      });
    });
  });

  return state;
};

const getChartGroupMeta = (groups: AssetGroupWithAccounts[], groupName: string) => {
  const group = groups.find((currentGroup) => currentGroup.name === groupName);

  return {
    nature: group?.nature ?? getLegacyNature(groupName),
    includeInStats: group?.includeInStats ?? true
  };
};

const setChartStateAmount = (
  state: Map<string, ChartAccountState>,
  groups: AssetGroupWithAccounts[],
  record: HistoryRecord,
  amount: number | null
) => {
  const meta = getChartGroupMeta(groups, record.groupName);

  if (!meta.includeInStats || amount === null) {
    state.delete(record.accountId);
    return;
  }

  state.set(record.accountId, {
    groupName: record.groupName,
    nature: meta.nature,
    amount: toStoredAmountByNature(meta.nature, amount)
  });
};

const rollbackHistoryRecordForTrend = (
  state: Map<string, ChartAccountState>,
  groups: AssetGroupWithAccounts[],
  record: HistoryRecord
) => {
  if (record.type === '新增') {
    setChartStateAmount(state, groups, record, record.beforeAmount);
    return;
  }

  if (record.type === '删除' || record.type === '归档') {
    setChartStateAmount(state, groups, record, record.beforeAmount);
    return;
  }

  if (record.type === '重新启用') {
    state.delete(record.accountId);
    return;
  }

  setChartStateAmount(state, groups, record, record.beforeAmount);
};

const sumChartState = (state: Map<string, ChartAccountState>) => {
  let positive = 0;
  let negative = 0;

  state.forEach((account) => {
    if (isPositiveNature(account.nature)) {
      positive += Math.abs(account.amount);
      return;
    }

    negative += Math.abs(account.amount);
  });

  return {
    positive,
    negative,
    net: positive - negative
  };
};

const getAssetTrendChangeDateKeys = (history: HistoryRecord[]) =>
  Array.from(
    new Set(
      history
        .map((record) => getHistoryDateKey(record.time))
        .filter((date): date is string => Boolean(date))
    )
  ).sort((left, right) => getDateTimestamp(left) - getDateTimestamp(right));

export const deriveAssetTrendPoints = (
  groups: AssetGroupWithAccounts[],
  history: HistoryRecord[],
  settings: AssetTrendSettings
): TrendChartPoint[] => {
  const includedAccountIds = new Set(
    groups
      .filter((group) => group.includeInStats)
      .flatMap((group) => group.accounts.map((account) => account.id))
  );
  const relevantHistory = history.filter((record) => includedAccountIds.has(record.accountId));
  const changeDateKeys = getAssetTrendChangeDateKeys(relevantHistory);
  const rangeDateKeys = getChartRangeDateKeys(settings.xAxisRange);
  const rangeStart = rangeDateKeys[0] ?? '';
  const rangeEnd = rangeDateKeys[rangeDateKeys.length - 1] ?? '';
  const changeDateKeysBeforeEnd = changeDateKeys.filter(
    (date) => !rangeEnd || getDateTimestamp(date) <= getDateTimestamp(rangeEnd)
  );

  if (changeDateKeysBeforeEnd.length < 2 || rangeDateKeys.length === 0) {
    return [];
  }

  const hasBaselineBeforeRange = changeDateKeysBeforeEnd.some(
    (date) => getDateTimestamp(date) < getDateTimestamp(rangeStart)
  );
  const firstChangeInRange = changeDateKeysBeforeEnd.find(
    (date) => getDateTimestamp(date) >= getDateTimestamp(rangeStart)
  );
  const firstPlotDate = hasBaselineBeforeRange ? rangeStart : firstChangeInRange;

  if (!firstPlotDate) {
    return [];
  }

  const pointDateKeys = rangeDateKeys.filter(
    (date) => getDateTimestamp(date) >= getDateTimestamp(firstPlotDate)
  );
  const changeDateKeySet = new Set(changeDateKeysBeforeEnd);
  const currentState = createCurrentChartState(groups);
  const recordsByTimeDesc = relevantHistory
    .map((record, index) => ({
      record,
      index,
      timestamp: getHistoryTimestamp(record)
    }))
    .filter((entry) => entry.timestamp > 0)
    .sort((left, right) => right.timestamp - left.timestamp || left.index - right.index);

  return pointDateKeys.map((date) => {
    const state = new Map(currentState);
    const cutoff = getDateEndTimestamp(date);

    recordsByTimeDesc.forEach((entry) => {
      if (entry.timestamp > cutoff) {
        rollbackHistoryRecordForTrend(state, groups, entry.record);
      }
    });

    return {
      date,
      kind: changeDateKeySet.has(date) ? 'change-date' : 'carry-forward',
      ...sumChartState(state)
    };
  });
};
