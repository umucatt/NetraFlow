import type {
  RollupAccountAssignment,
  RollupImportRecord
} from '../../rollupImportLogic';
import RollupAccountAssignmentList, {
  type RollupImportAccountGroup,
  type RollupImportAccountMatch
} from './RollupAccountAssignmentList';

export type RollupImportRecordGroup = {
  keyword: string;
  records: RollupImportRecord[];
};

type RollupRecordGroupListProps = {
  groups: RollupImportRecordGroup[];
  accountGroups: RollupImportAccountGroup[];
  accountAssignments: Record<string, RollupAccountAssignment | null>;
  getAccountMatches: (keyword: string) => RollupImportAccountMatch[];
  formatRecordAmount: (record: RollupImportRecord) => string;
  onSelectAccount: (keyword: string, accountId: string) => void;
  onCreateAccount: (keyword: string) => void;
};

function RollupRecordGroupList({
  groups,
  accountGroups,
  accountAssignments,
  getAccountMatches,
  formatRecordAmount,
  onSelectAccount,
  onCreateAccount
}: RollupRecordGroupListProps) {
  return (
    <div className="rollup-record-groups">
      {groups.map((group) => (
        <section key={group.keyword || '__empty__'} className="rollup-record-group">
          <header>
            <div>
              <p>账户关键词</p>
              <h2>{group.keyword || '空'}</h2>
            </div>
            <span>{group.records.length} 条记录</span>
          </header>

          <div className="rollup-account-row">
            <span>导入账户</span>
            <RollupAccountAssignmentList
              keyword={group.keyword}
              accountGroups={accountGroups}
              accountAssignments={accountAssignments}
              getAccountMatches={getAccountMatches}
              onSelectAccount={onSelectAccount}
              onCreateAccount={onCreateAccount}
            />
          </div>

          <div className="rollup-record-list" aria-label={`${group.keyword || '空'} 记录`}>
            <div className="rollup-record-list__header">
              <span>日期</span>
              <span>模式</span>
              <span>金额</span>
            </div>
            {group.records.map((record) => (
              <div key={record.id} className="rollup-record-row">
                <span>{record.date}</span>
                <span>{record.mode}</span>
                <strong>{formatRecordAmount(record)}</strong>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default RollupRecordGroupList;
