import { useState } from 'react';

import type {
  AccountTypeNature,
  AppData,
  ArchivedAccountEntry,
  AssetGroup,
  AssetGroupWithAccounts,
  CommitAppDataUpdate
} from '../../app/types';
import {
  deriveGroupsWithAccounts,
  getArchivedAccountEntries
} from '../../app/accountData';
import {
  type AccountTypeEditorState,
  createAccountTypeInAppData,
  getAccountTypeEditorGroup,
  hasAccountTypeUnsavedChanges,
  isAccountTypeEditorVisible,
  updateAccountTypeInAppData
} from './accountTypeLogic';
import { DUPLICATE_NAME_PLACEHOLDER } from './accountNameUniqueness';

type AccountTypeControllerOptions = {
  appData: AppData;
  groups: AssetGroupWithAccounts[];
  archivedAccounts: ArchivedAccountEntry[];
  createGroupId: () => string;
  commitAppDataUpdate: CommitAppDataUpdate;
  onCreateAccountType: (group: AssetGroup) => void;
  onUpdateAccountType: (result: {
    groupId: string;
    previousName: string;
    nextName: string;
  }) => void;
};

export function useAccountTypeController({
  appData,
  groups,
  archivedAccounts,
  createGroupId,
  commitAppDataUpdate,
  onCreateAccountType,
  onUpdateAccountType
}: AccountTypeControllerOptions) {
  const [accountTypeEditor, setAccountTypeEditor] =
    useState<AccountTypeEditorState>(null);
  const [accountTypeNameDraft, setAccountTypeNameDraft] = useState('');
  const [accountTypeNatureDraft, setAccountTypeNatureDraft] =
    useState<AccountTypeNature>('asset');
  const [accountTypeStatsDraft, setAccountTypeStatsDraft] = useState(true);
  const [accountTypeError, setAccountTypeError] = useState('');

  const accountTypeEditorGroup = getAccountTypeEditorGroup(accountTypeEditor, groups);
  const isVisible = isAccountTypeEditorVisible(accountTypeEditor, accountTypeEditorGroup);
  const hasUnsavedChanges = hasAccountTypeUnsavedChanges({
    editor: accountTypeEditor,
    editorGroup: accountTypeEditorGroup,
    nameDraft: accountTypeNameDraft,
    natureDraft: accountTypeNatureDraft,
    statsDraft: accountTypeStatsDraft,
    error: accountTypeError
  });

  const openCreateAccountType = (initialName = '') => {
    setAccountTypeEditor({ mode: 'create' });
    setAccountTypeNameDraft(initialName.trim());
    setAccountTypeNatureDraft('asset');
    setAccountTypeStatsDraft(true);
    setAccountTypeError('');
  };

  const openEditAccountType = (group: AssetGroup) => {
    setAccountTypeEditor({ mode: 'edit', groupId: group.id });
    setAccountTypeNameDraft(group.name);
    setAccountTypeNatureDraft(group.nature);
    setAccountTypeStatsDraft(group.includeInStats);
    setAccountTypeError('');
  };

  const closeAccountTypeEditor = () => {
    setAccountTypeEditor(null);
    setAccountTypeNameDraft('');
    setAccountTypeNatureDraft('asset');
    setAccountTypeStatsDraft(true);
    setAccountTypeError('');
  };

  const saveAccountType = () => {
    if (!accountTypeEditor) {
      return;
    }

    if (accountTypeEditor.mode === 'create') {
      const groupId = createGroupId();
      const result = commitAppDataUpdate((latestData) => {
        const latestGroups = deriveGroupsWithAccounts(latestData.groups, latestData.accounts);
        const latestArchivedAccounts = getArchivedAccountEntries(
          latestGroups,
          latestData.accounts,
          latestData.history
        );
        const createResult = createAccountTypeInAppData({
          appData: latestData,
          archivedAccounts: latestArchivedAccounts,
          groupId,
          name: accountTypeNameDraft,
          nature: accountTypeNatureDraft,
          includeInStats: accountTypeStatsDraft
        });

        return createResult.ok
          ? { ok: true, nextData: createResult.nextData, value: createResult.group }
          : createResult;
      });

      if (!result.ok) {
        if (result.error === DUPLICATE_NAME_PLACEHOLDER) {
          setAccountTypeNameDraft('');
        }

        setAccountTypeError(result.error ?? '账户类型创建失败');
        return;
      }

      onCreateAccountType(result.value);
      closeAccountTypeEditor();
      return;
    }

    const currentGroupId = accountTypeEditor.groupId;

    if (!currentGroupId || !accountTypeEditorGroup) {
      closeAccountTypeEditor();
      return;
    }

    const result = commitAppDataUpdate((latestData) => {
      const latestGroups = deriveGroupsWithAccounts(latestData.groups, latestData.accounts);
      const latestArchivedAccounts = getArchivedAccountEntries(
        latestGroups,
        latestData.accounts,
        latestData.history
      );
      const updateResult = updateAccountTypeInAppData({
        appData: latestData,
        archivedAccounts: latestArchivedAccounts,
        groupId: currentGroupId,
        name: accountTypeNameDraft,
        nature: accountTypeNatureDraft,
        includeInStats: accountTypeStatsDraft
      });

      return updateResult.ok
        ? {
            ok: true,
            nextData: updateResult.nextData,
            value: {
              previousGroup: updateResult.previousGroup,
              group: updateResult.group
            }
          }
        : updateResult;
    });

    if (!result.ok) {
      if (result.error) {
        if (result.error === DUPLICATE_NAME_PLACEHOLDER) {
          setAccountTypeNameDraft('');
        }

        setAccountTypeError(result.error);
        return;
      }

      closeAccountTypeEditor();
      return;
    }

    onUpdateAccountType({
      groupId: currentGroupId,
      previousName: result.value.previousGroup.name,
      nextName: result.value.group.name
    });
    closeAccountTypeEditor();
  };

  return {
    accountTypeEditor,
    accountTypeEditorGroup,
    isAccountTypeEditorVisible: isVisible,
    accountTypeNameDraft,
    setAccountTypeNameDraft,
    accountTypeNatureDraft,
    setAccountTypeNatureDraft,
    accountTypeStatsDraft,
    setAccountTypeStatsDraft,
    accountTypeError,
    setAccountTypeError,
    hasAccountTypeUnsavedChanges: hasUnsavedChanges,
    openCreateAccountType,
    openEditAccountType,
    closeAccountTypeEditor,
    saveAccountType
  };
}
