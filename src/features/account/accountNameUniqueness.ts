import type {
  Account,
  ArchivedAccountEntry,
  AssetGroupWithAccounts
} from '../../app/types';
import { normalizeTypeSearchText } from './accountTypeSearch';

export const DUPLICATE_NAME_PLACEHOLDER = '该名称已存在';

export const normalizeAccountName = (name: string) => name.trim().toLocaleLowerCase();

export const hasDuplicateAccountName = (
  accounts: Account[],
  name: string,
  exceptAccountId = ''
) => {
  const normalizedName = normalizeAccountName(name);

  if (!normalizedName) {
    return false;
  }

  return accounts.some(
    (account) =>
      account.id !== exceptAccountId && normalizeAccountName(account.name) === normalizedName
  );
};

export const hasDuplicateAccountTypeName = ({
  groups,
  archivedAccounts,
  name,
  exceptGroupId = ''
}: {
  groups: Array<Pick<AssetGroupWithAccounts, 'id' | 'name'>>;
  archivedAccounts: ArchivedAccountEntry[];
  name: string;
  exceptGroupId?: string;
}) => {
  const normalizedName = normalizeTypeSearchText(name);

  if (!normalizedName) {
    return false;
  }

  return (
    groups.some(
      (group) =>
        group.id !== exceptGroupId && normalizeTypeSearchText(group.name) === normalizedName
    ) ||
    archivedAccounts.some(
      (account) =>
        account.groupId !== exceptGroupId &&
        normalizeTypeSearchText(account.groupName) === normalizedName
    )
  );
};
