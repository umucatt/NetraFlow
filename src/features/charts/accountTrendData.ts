import {
  getDateEndTimestamp,
  getDateTimestamp,
  getHistoryDateKey,
  getHistoryTimestamp
} from '../../app/dateUtils';
import type { Account, HistoryRecord } from '../../app/types';
import {
  getChartRangeDateKeys,
  type ChartPointKind,
  type ChartXAxisRange
} from '../../chartLogic';

export type AccountTrendSettings = {
  xAxisRange: ChartXAxisRange;
};

export type AccountTrendPoint = {
  date: string;
  kind: ChartPointKind;
  net: number;
  positive: number;
  negative: number;
};

const RESTORE_HISTORY_TYPE: HistoryRecord['type'] = '重新启用';
const CREATE_HISTORY_TYPE: HistoryRecord['type'] = '创建';

const getAccountTrendChangeDateKeys = (history: HistoryRecord[]) =>
  Array.from(
    new Set(
      history
        .map((record) => getHistoryDateKey(record.time))
        .filter((date): date is string => Boolean(date))
    )
  ).sort((left, right) => getDateTimestamp(left) - getDateTimestamp(right));

export const rollbackAccountRecordForTrend = (
  _amount: number | null,
  record: HistoryRecord
) => {
  if (record.type === RESTORE_HISTORY_TYPE) {
    return null;
  }

  return record.beforeAmount;
};

export const deriveAccountTrendPoints = (
  account: Account,
  history: HistoryRecord[],
  settings: AccountTrendSettings
): AccountTrendPoint[] => {
  const relevantHistory = history.filter((record) => record.accountId === account.id);
  const changeDateKeys = getAccountTrendChangeDateKeys(relevantHistory);
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
  const recordsByTimeDesc = relevantHistory
    .map((record, index) => ({
      record,
      index,
      timestamp: getHistoryTimestamp(record)
    }))
    .filter((entry) => entry.timestamp > 0)
    .sort((left, right) => right.timestamp - left.timestamp || left.index - right.index);

  return pointDateKeys.map((date) => {
    const cutoff = getDateEndTimestamp(date);
    const amount = recordsByTimeDesc.reduce<number | null>((currentAmount, entry) => {
      if (entry.timestamp > cutoff) {
        if (
          entry.record.type === CREATE_HISTORY_TYPE &&
          recordsByTimeDesc.some((candidate) => candidate.timestamp <= cutoff)
        ) {
          return currentAmount;
        }

        return rollbackAccountRecordForTrend(currentAmount, entry.record);
      }

      return currentAmount;
    }, account.amount);
    const value = amount ?? 0;

    return {
      date,
      kind: changeDateKeySet.has(date) ? 'change-date' : 'carry-forward',
      net: value,
      positive: value,
      negative: value
    };
  });
};
