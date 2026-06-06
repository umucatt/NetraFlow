import { useState } from 'react';

import type {
  AccountTypeNature,
  AppData,
  AssetGroup,
  AssetGroupWithAccounts
} from '../../app/types';
import {
  type AccountTypeEditorState,
  createAccountTypeInAppData,
  getAccountTypeEditorGroup,
  hasAccountTypeUnsavedChanges,
  isAccountTypeEditorVisible,
  updateAccountTypeInAppData
} from './accountTypeLogic';

type AccountTypeControllerOptions = {
  appData: AppData;
  groups: AssetGroupWithAccounts[];
  createGroupId: () => string;
  updateAppData: (nextData: AppData) => void;
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
  createGroupId,
  updateAppData,
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
      const result = createAccountTypeInAppData({
        appData,
        groupId: createGroupId(),
        name: accountTypeNameDraft,
        nature: accountTypeNatureDraft,
        includeInStats: accountTypeStatsDraft
      });

      if (!result.ok) {
        setAccountTypeError(result.error);
        return;
      }

      updateAppData(result.nextData);
      onCreateAccountType(result.group);
      closeAccountTypeEditor();
      return;
    }

    const currentGroupId = accountTypeEditor.groupId;

    if (!currentGroupId || !accountTypeEditorGroup) {
      closeAccountTypeEditor();
      return;
    }

    const result = updateAccountTypeInAppData({
      appData,
      groupId: currentGroupId,
      name: accountTypeNameDraft,
      nature: accountTypeNatureDraft,
      includeInStats: accountTypeStatsDraft
    });

    if (!result.ok) {
      if (result.error) {
        setAccountTypeError(result.error);
        return;
      }

      closeAccountTypeEditor();
      return;
    }

    updateAppData(result.nextData);
    onUpdateAccountType({
      groupId: currentGroupId,
      previousName: result.previousGroup.name,
      nextName: result.group.name
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
