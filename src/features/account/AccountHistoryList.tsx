import AccountHistoryGroup, {
  type AccountHistoryRecordGroup
} from './AccountHistoryGroup';
import type { AccountHistoryRecord, AccountHistorySharedProps } from './AccountHistoryItem';

type AccountHistoryListProps<TRecord extends AccountHistoryRecord> =
  AccountHistorySharedProps<TRecord> & {
    groups: Array<AccountHistoryRecordGroup<TRecord>>;
    expandedDates?: string[];
    onToggleDate?: (dateValue: string) => void;
  };

function AccountHistoryList<TRecord extends AccountHistoryRecord>({
  groups,
  expandedDates = [],
  onToggleDate,
  ...listProps
}: AccountHistoryListProps<TRecord>) {
  return (
    <>
      {groups.map((group) => (
        <AccountHistoryGroup
          key={group.date}
          group={group}
          expandedDates={expandedDates}
          onToggleDate={onToggleDate}
          {...listProps}
        />
      ))}
    </>
  );
}

export default AccountHistoryList;
