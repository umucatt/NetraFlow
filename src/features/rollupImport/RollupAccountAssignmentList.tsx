import AccountMark from '../../components/AccountMark';
import type { RollupAccountAssignment } from '../../rollupImportLogic';
import type {
  RollupImportAccountGroup,
  RollupImportAccountMatch
} from './rollupImportTypes';

type RollupAccountAssignmentListProps = {
  keyword: string;
  accountGroups: RollupImportAccountGroup[];
  accountAssignments: Record<string, RollupAccountAssignment | null>;
  getAccountMatches: (keyword: string) => RollupImportAccountMatch[];
  onSelectAccount: (keyword: string, accountId: string) => void;
  onCreateAccount: (keyword: string) => void;
};

function RollupAccountAssignmentList({
  keyword,
  accountGroups,
  accountAssignments,
  getAccountMatches,
  onSelectAccount,
  onCreateAccount
}: RollupAccountAssignmentListProps) {
  const matches = getAccountMatches(keyword);
  const assignment = accountAssignments[keyword];
  const selectedAccountId = assignment?.accountId ?? '';
  const uniqueMatch = matches.length === 1 && matches[0].score >= 86 ? matches[0] : null;

  return (
    <div className="rollup-account-selector">
      <div className="rollup-account-suggestion">
        {!keyword ? (
          <p>账户关键词为空，请在本地选择导入账户</p>
        ) : uniqueMatch ? (
          <p>
            账户关键词：{keyword}
            <br />
            看起来可能是账户「{uniqueMatch.account.name}」
          </p>
        ) : matches.length > 1 ? (
          <>
            <p>账户关键词：{keyword}</p>
            <p>看起来可能是以下账户</p>
          </>
        ) : (
          <p>
            账户关键词：{keyword || '空'}
            <br />
            未找到相似账户
          </p>
        )}
      </div>

      <div className="rollup-account-chip-groups">
        {accountGroups.some((group) => group.activeAccounts.length > 0) ? (
          accountGroups.map((group) => {
            const accounts = group.activeAccounts;

            if (accounts.length === 0) {
              return null;
            }

            return (
              <div key={group.id} className="rollup-account-chip-group">
                <span>{group.name}</span>
                <div>
                  {accounts.map((account) => {
                    const selected = selectedAccountId === account.id;
                    const suggested = matches.some((match) => match.account.id === account.id);

                    return (
                      <button
                        key={account.id}
                        type="button"
                        className={`rollup-account-chip${selected ? ' is-selected' : ''}${
                          suggested ? ' is-suggested' : ''
                        }`}
                        onClick={() => onSelectAccount(keyword, account.id)}
                      >
                        <AccountMark account={account} className="account-mark--flash" />
                        <span>{account.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <p>暂无可选择账户</p>
        )}
      </div>

      <div className="rollup-account-actions">
        <button
          type="button"
          className="rollup-small-button rollup-new-account-button"
          onClick={() => onCreateAccount(keyword)}
        >
          新建账户
        </button>
      </div>
    </div>
  );
}

export default RollupAccountAssignmentList;
