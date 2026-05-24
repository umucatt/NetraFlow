export type QuickEntryAccountOption = {
  id: string;
  name: string;
  groupName: string;
  archived?: boolean;
};

export type QuickEntryAccountGroup = {
  name: string;
  accounts: QuickEntryAccountOption[];
};

type QuickEntryAccountPickerProps = {
  groups: QuickEntryAccountGroup[];
  selectedAccountId?: string;
  onChooseAccount: (groupName: string, accountId: string) => void;
};

function QuickEntryAccountPicker({
  groups,
  selectedAccountId,
  onChooseAccount
}: QuickEntryAccountPickerProps) {
  const hasAccounts = groups.some((group) => group.accounts.length > 0);

  return (
    <section
      className="flash-note-account-picker quick-single-entry-account-picker"
      aria-label="选择记一笔账户"
    >
      {hasAccounts ? (
        groups.map((group) => {
          if (group.accounts.length === 0) {
            return null;
          }

          return (
            <div
              key={group.name}
              className="flash-note-account-group quick-single-entry-account-group"
            >
              <span>{group.name}</span>
              <div>
                {group.accounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;

                  return (
                    <button
                      key={account.id}
                      type="button"
                      className={`flash-note-account-chip${isSelected ? ' is-selected' : ''}`}
                      onClick={() => onChooseAccount(group.name, account.id)}
                    >
                      <span>{account.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        <p className="quick-single-entry-empty">暂无可记账账户</p>
      )}
    </section>
  );
}

export default QuickEntryAccountPicker;
