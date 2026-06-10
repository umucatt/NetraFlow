import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';

import NfTooltip from '../../components/tooltip/NfTooltip';
import { getQuickEntryAccountNameTooltipContent } from './quickEntryAccountNameOverflow';

export type QuickEntryAccountOption = {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  archived?: boolean;
};

export type QuickEntryAccountGroup = {
  id: string;
  name: string;
  accounts: QuickEntryAccountOption[];
};

type QuickEntryAccountPickerProps = {
  groups: QuickEntryAccountGroup[];
  selectedAccountId?: string;
  onChooseAccount: (groupId: string, accountId: string) => void;
};

const useAccountNameLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

type QuickEntryAccountButtonProps = {
  account: QuickEntryAccountOption;
  groupId: string;
  isSelected: boolean;
  onChooseAccount: (groupId: string, accountId: string) => void;
};

function QuickEntryAccountButton({
  account,
  groupId,
  isSelected,
  onChooseAccount
}: QuickEntryAccountButtonProps) {
  const accountNameRef = useRef<HTMLSpanElement | null>(null);
  const [accountNameTooltipContent, setAccountNameTooltipContent] = useState<
    string | undefined
  >();

  const updateAccountNameTooltipContent = useCallback(() => {
    setAccountNameTooltipContent(
      getQuickEntryAccountNameTooltipContent(account.name, accountNameRef.current)
    );
  }, [account.name]);

  useAccountNameLayoutEffect(() => {
    const accountNameElement = accountNameRef.current;

    updateAccountNameTooltipContent();

    if (!accountNameElement) {
      return;
    }

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window === 'undefined') {
        return;
      }

      window.addEventListener('resize', updateAccountNameTooltipContent);
      return () => window.removeEventListener('resize', updateAccountNameTooltipContent);
    }

    const resizeObserver = new ResizeObserver(updateAccountNameTooltipContent);
    resizeObserver.observe(accountNameElement);

    return () => resizeObserver.disconnect();
  }, [updateAccountNameTooltipContent]);

  return (
    <NfTooltip
      content={accountNameTooltipContent}
      disabled={!accountNameTooltipContent}
      placement="top"
    >
      <button
        type="button"
        className={`flash-note-account-chip${isSelected ? ' is-selected' : ''}`}
        onClick={() => onChooseAccount(groupId, account.id)}
      >
        <span ref={accountNameRef}>{account.name}</span>
      </button>
    </NfTooltip>
  );
}

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
              key={group.id}
              className="flash-note-account-group quick-single-entry-account-group"
            >
              <span>{group.name}</span>
              <div>
                {group.accounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;

                  return (
                    <QuickEntryAccountButton
                      key={account.id}
                      account={account}
                      groupId={group.id}
                      isSelected={isSelected}
                      onChooseAccount={onChooseAccount}
                    />
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
