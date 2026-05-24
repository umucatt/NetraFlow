import HistoryRecordList from '../history/HistoryRecordList';
import type { AccountHistoryRecord, AccountHistorySharedProps } from './AccountHistoryItem';

export type AccountHistoryRecordGroup<TRecord extends AccountHistoryRecord> = {
  date: string;
  records: TRecord[];
};

type AccountHistoryGroupProps<TRecord extends AccountHistoryRecord> =
  AccountHistorySharedProps<TRecord> & {
    group: AccountHistoryRecordGroup<TRecord>;
    expandedDates?: string[];
    onToggleDate?: (dateValue: string) => void;
  };

function AccountHistoryGroup<TRecord extends AccountHistoryRecord>({
  group,
  expandedDates = [],
  onToggleDate,
  ...listProps
}: AccountHistoryGroupProps<TRecord>) {
  return (
    <HistoryRecordList
      groups={[group]}
      expandedDates={expandedDates}
      onToggleDate={onToggleDate}
      {...listProps}
    />
  );
}

export default AccountHistoryGroup;
