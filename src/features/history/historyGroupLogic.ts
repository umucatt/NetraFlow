import type { ReactNode } from 'react';
import {
  compareHistoryByTimeDesc,
  getDateTimestamp,
  getHistoryDateKey,
  getHistoryTimestamp
} from '../../app/dateUtils';
import type { HistoryRecord } from '../../app/types';
import {
  getAccountHistoryGroupSummary,
  sortAccountHistoryRecordsByTimeAsc
} from '../account/accountHistoryLogic';
import type {
  HistoryRecordListChangeDisplay,
  HistoryRecordListGroupSummary,
  HistoryRecordListProps,
  HistoryRecordListTone
} from './HistoryRecordList';

export type HistoryRecordGroup<TRecord extends HistoryRecord> = {
  date: string;
  records: TRecord[];
};

type HistoryRecordListStaticProps<TRecord extends HistoryRecord> = Omit<
  HistoryRecordListProps<TRecord>,
  'records' | 'groups' | 'expandedDates' | 'highlightedRecordId' | 'emptyText' | 'onToggleDate'
>;

type HistoryRecordListPresentationOptions<TRecord extends HistoryRecord> = {
  getTypeLabel: (type: TRecord['type']) => string;
  getTone: (record: TRecord) => HistoryRecordListTone;
  getAmountChange: (record: TRecord) => HistoryRecordListChangeDisplay;
  formatAmount: (amount: number | null) => string;
  formatShortTime: (time: string) => string;
  renderFlashSourceIcon: (className: string) => ReactNode;
};

const sortHistoryRecordsByTime = <TRecord extends HistoryRecord>(
  records: TRecord[],
  direction: 'asc' | 'desc'
) =>
  records
    .map((record, index) => ({
      record,
      timestamp: getHistoryTimestamp(record),
      index
    }))
    .sort((left, right) =>
      direction === 'asc'
        ? left.timestamp - right.timestamp || left.index - right.index
        : right.timestamp - left.timestamp || left.index - right.index
    )
    .map(({ record }) => record);

export const sortHistoryRecordsByTimeAsc = <TRecord extends HistoryRecord>(
  records: TRecord[]
) => sortHistoryRecordsByTime(records, 'asc');

export const sortHistoryRecordsByTimeDesc = <TRecord extends HistoryRecord>(
  records: TRecord[]
) => sortHistoryRecordsByTime(records, 'desc');

export const groupHistoryRecordsByDateDesc = <TRecord extends HistoryRecord>(
  records: TRecord[]
): Array<HistoryRecordGroup<TRecord>> => {
  const groupsByDate = new Map<string, HistoryRecordGroup<TRecord>>();

  sortHistoryRecordsByTimeDesc(records).forEach((record) => {
    const date = getHistoryDateKey(record.time);

    if (!date) {
      return;
    }

    const existingGroup = groupsByDate.get(date);

    if (existingGroup) {
      existingGroup.records.push(record);
      return;
    }

    groupsByDate.set(date, { date, records: [record] });
  });

  return Array.from(groupsByDate.values()).sort(
    (left, right) => getDateTimestamp(right.date) - getDateTimestamp(left.date)
  );
};

export const prepareAccountHistoryGroups = <TRecord extends HistoryRecord>(
  records: TRecord[]
) => groupHistoryRecordsByDateDesc(records);

export const prepareAccountHistoryDisplayRecords = <TRecord extends HistoryRecord>(
  records: TRecord[]
) => sortHistoryRecordsByTimeDesc(records);

export const prepareAccountHistorySummaryRecords = <TRecord extends HistoryRecord>(
  records: TRecord[]
) => sortAccountHistoryRecordsByTimeAsc([...records].reverse());

export const getAccountHistoryRecordListGroupSummary = (
  records: HistoryRecord[]
): HistoryRecordListGroupSummary<HistoryRecord> | null => {
  const summary = getAccountHistoryGroupSummary(records);

  return summary
    ? {
        beforeAmount: summary.beforeAmount,
        afterAmount: summary.afterAmount,
        displayType: summary.displayType
      }
    : null;
};

export const createHistoryRecordListProps = <TRecord extends HistoryRecord>(
  options: HistoryRecordListPresentationOptions<TRecord>
): HistoryRecordListStaticProps<TRecord> => ({
  compareRecords: compareHistoryByTimeDesc,
  ...options
});

export const createAccountHistoryRecordListProps = <TRecord extends HistoryRecord>(
  baseProps: HistoryRecordListStaticProps<TRecord>
): HistoryRecordListStaticProps<TRecord> => ({
  ...baseProps,
  getGroupDisplayRecords: prepareAccountHistoryDisplayRecords,
  getGroupSummaryRecords: prepareAccountHistorySummaryRecords,
  getGroupSummary: getAccountHistoryRecordListGroupSummary as (
    records: TRecord[]
  ) => HistoryRecordListGroupSummary<TRecord> | null
});
