import { toStoredAmountByNature } from '../../app/accountNature';
import { canDeleteAssetGroup, deleteAssetGroupFromAppData } from '../../app/accountData';
import type {
  Account,
  AccountTypeNature,
  AppData,
  AssetGroup,
  AssetGroupWithAccounts
} from '../../app/types';

export type AccountTypeEditorState = {
  mode: 'create' | 'edit';
  groupId?: string;
} | null;

export const validateAccountTypeName = (name: string) =>
  name.trim() ? null : '请输入账户类型名称';

export const createAccountTypeInAppData = ({
  appData,
  groupId,
  name,
  nature,
  includeInStats
}: {
  appData: AppData;
  groupId: string;
  name: string;
  nature: AccountTypeNature;
  includeInStats: boolean;
}) => {
  const error = validateAccountTypeName(name);

  if (error) {
    return { ok: false as const, error };
  }

  const sortOrder =
    appData.groups.length > 0
      ? Math.max(...appData.groups.map((group) => group.sortOrder)) + 1
      : 0;
  const group: AssetGroup = {
    id: groupId,
    name: name.trim(),
    nature,
    includeInStats,
    sortOrder
  };

  return {
    ok: true as const,
    group,
    nextData: {
      groups: [...appData.groups, group],
      accounts: appData.accounts,
      history: appData.history
    }
  };
};

export const updateAccountTypeInAppData = ({
  appData,
  groupId,
  name,
  nature,
  includeInStats
}: {
  appData: AppData;
  groupId: string;
  name: string;
  nature: AccountTypeNature;
  includeInStats: boolean;
}) => {
  const error = validateAccountTypeName(name);

  if (error) {
    return { ok: false as const, error };
  }

  const currentGroup = appData.groups.find((group) => group.id === groupId);

  if (!currentGroup) {
    return { ok: false as const, error: '' };
  }

  const nextName = name.trim();
  const targetAccountIds = new Set(
    appData.accounts.filter((account) => account.groupId === groupId).map((account) => account.id)
  );
  const nextGroups = appData.groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          name: nextName,
          nature,
          includeInStats
        }
      : group
  );
  const nextAccounts = appData.accounts.map((account) =>
    account.groupId === groupId
      ? { ...account, amount: toStoredAmountByNature(nature, account.amount) }
      : account
  );
  const nextHistory = appData.history.map((record) =>
    targetAccountIds.has(record.accountId) ? { ...record, groupName: nextName } : record
  );

  return {
    ok: true as const,
    previousGroup: currentGroup,
    group: {
      ...currentGroup,
      name: nextName,
      nature,
      includeInStats
    },
    nextData: {
      groups: nextGroups,
      accounts: nextAccounts,
      history: nextHistory
    }
  };
};

export const canDeleteAccountType = (groupId: string, accounts: Account[]) =>
  canDeleteAssetGroup(groupId, accounts);

export const deleteAccountTypeFromAppData = (appData: AppData, groupId: string) =>
  deleteAssetGroupFromAppData(appData, groupId);

export const getAccountTypeEditorGroup = (
  editor: AccountTypeEditorState,
  groups: AssetGroupWithAccounts[]
) =>
  editor?.mode === 'edit'
    ? groups.find((group) => group.id === editor.groupId)
    : undefined;

export const isAccountTypeEditorVisible = (
  editor: AccountTypeEditorState,
  editorGroup?: AssetGroupWithAccounts
) => Boolean(editor && (editor.mode === 'create' || editorGroup));

export const hasAccountTypeUnsavedChanges = ({
  editor,
  editorGroup,
  nameDraft,
  natureDraft,
  statsDraft,
  error
}: {
  editor: AccountTypeEditorState;
  editorGroup?: AssetGroupWithAccounts;
  nameDraft: string;
  natureDraft: AccountTypeNature;
  statsDraft: boolean;
  error: string;
}) =>
  Boolean(
    editor?.mode === 'create'
      ? nameDraft.trim() || natureDraft !== 'asset' || statsDraft !== true || error
      : editorGroup &&
          (nameDraft !== editorGroup.name ||
            natureDraft !== editorGroup.nature ||
            statsDraft !== editorGroup.includeInStats ||
            error)
  );
