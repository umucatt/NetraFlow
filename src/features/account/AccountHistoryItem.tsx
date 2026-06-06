import type { ReactNode } from 'react';
import HistoryRecordList, {
  type HistoryRecordListChangeDisplay,
  type HistoryRecordListGroupSummary,
  type HistoryRecordListRecord,
  type HistoryRecordListTone
} from '../history/HistoryRecordList';

export type AccountHistoryRecord = HistoryRecordListRecord;

export type AccountHistorySharedProps<TRecord extends AccountHistoryRecord> = {
  highlightedRecordId?: string;
  compareRecords: (left: TRecord, right: TRecord) => number;
  getTypeLabel: (type: TRecord['type']) => string;
  getTone: (record: TRecord) => HistoryRecordListTone;
  getAmountChange: (record: TRecord) => HistoryRecordListChangeDisplay;
  getGroupRecords?: (records: TRecord[]) => TRecord[];
  getGroupDisplayRecords?: (records: TRecord[]) => TRecord[];
  getGroupSummaryRecords?: (records: TRecord[]) => TRecord[];
  getGroupSummary?: (
    records: TRecord[]
  ) => HistoryRecordListGroupSummary<TRecord> | null;
  formatAmount: (amount: number | null) => string;
  formatShortTime: (time: string) => string;
  renderFlashSourceIcon: (className: string) => ReactNode;
};

type AccountHistoryItemProps<TRecord extends AccountHistoryRecord> =
  AccountHistorySharedProps<TRecord> & {
    record: TRecord;
  };

function AccountHistoryItem<TRecord extends AccountHistoryRecord>({
  record,
  ...listProps
}: AccountHistoryItemProps<TRecord>) {
  return <HistoryRecordList records={[record]} {...listProps} />;
}

export default AccountHistoryItem;
