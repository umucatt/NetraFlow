import {
  getArchivedAccountRestoreGroup,
  getArchivedAccountRestoreTargetGroups,
  restoreArchivedAccountToGroup
} from '../../app/accountData';
import type {
  Account,
  AppData,
  ArchivedAccountEntry,
  AssetGroup,
  AssetGroupWithAccounts
} from '../../app/types';
import { createAccountHistoryRecord } from './accountHistoryLogic';
import { hasActiveDuplicateAccountName } from './accountEditorLogic';

export type ArchivedRestoreSource =
  | 'account-detail'
  | 'account-restore-dialog'
  | 'same-name-account'
  | 'archived-accounts-list';

export type PendingArchivedRestore = {
  accountId: string;
  source: ArchivedRestoreSource;
} | null;

export const filterArchivedAccountsForRestore = (
  archivedAccounts: ArchivedAccountEntry[],
  query: string
) => {
  const normalizedQuery = query.trim().toLowerCase();

  return normalizedQuery
    ? archivedAccounts.filter((account) => account.name.toLowerCase().includes(normalizedQuery))
    : archivedAccounts;
};

export const getArchivedRestoreTargetGroups = (groups: AssetGroup[]) =>
  getArchivedAccountRestoreTargetGroups(groups);

export const prepareArchivedAccountRestore = (
  groupId: string,
  account: Account,
  groups: AssetGroup[],
  source: ArchivedRestoreSource
):
  | {
      type: 'direct';
      account: Account;
      group: AssetGroup;
    }
  | {
      type: 'needs-target';
      pendingRestore: NonNullable<PendingArchivedRestore>;
    } => {
  const restoreGroup = getArchivedAccountRestoreGroup({ groupId }, groups);

  if (!restoreGroup) {
    return {
      type: 'needs-target',
      pendingRestore: {
        accountId: account.id,
        source
      }
    };
  }

  return {
    type: 'direct',
    account,
    group: restoreGroup
  };
};

export const archiveAccountInAppData = ({
  appData,
  groupId,
  account,
  archivedAt,
  historyRecordId
}: {
  appData: AppData;
  groupId: string;
  account: Account;
  archivedAt: string;
  historyRecordId: string;
}) => {
  const group = appData.groups.find((currentGroup) => currentGroup.id === groupId);

  if (!group) {
    return null;
  }

  const nextAccounts = appData.accounts.map((currentAccount) =>
    currentAccount.id === account.id
      ? { ...currentAccount, archived: true, archivedAt }
      : currentAccount
  );
  const nextHistory = [
    createAccountHistoryRecord({
      id: historyRecordId,
      type: '\u5f52\u6863',
      account,
      groupName: group.name,
      beforeAmount: account.amount,
      afterAmount: account.amount,
      time: archivedAt
    }),
    ...appData.history
  ];

  return {
    groups: appData.groups,
    accounts: nextAccounts,
    history: nextHistory
  };
};

export const restoreArchivedAccountInAppData = ({
  appData,
  groups,
  account,
  targetGroup,
  restoredAt,
  historyRecordId
}: {
  appData: AppData;
  groups: AssetGroupWithAccounts[];
  account: Account;
  targetGroup: AssetGroup;
  restoredAt: string;
  historyRecordId: string;
}) => {
  if (hasActiveDuplicateAccountName(groups, account.name, account.id)) {
    return { ok: false as const, error: '已有同名启用账户，请先处理后再重新启用' };
  }

  const nextData = restoreArchivedAccountToGroup(
    appData,
    account.id,
    targetGroup.id,
    restoredAt,
    historyRecordId
  );

  return nextData ? { ok: true as const, nextData } : { ok: false as const, error: '' };
};
