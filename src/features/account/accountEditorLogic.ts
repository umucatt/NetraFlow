import { toStoredAmountByNature } from '../../app/accountNature';
import { createStableAccountId } from '../../app/ids';
import { getEffectiveAccountAbbreviation } from '../../accountMark';
import { formatMoneyInputValue, isMoneyInput, normalizeMoneyInput, parseMoneyInput, roundToMoneyPrecision } from '../../money';
import type {
  Account,
  AccountOperationEntrySource,
  AccountPointer,
  AppData,
  ArchivedAccountEntry,
  AssetGroupWithAccounts,
  EditMode
} from '../../app/types';
import { normalizeTypeSearchText } from './accountTypeSearch';
import { createAccountHistoryRecord } from './accountHistoryLogic';
import {
  DUPLICATE_NAME_PLACEHOLDER,
  hasDuplicateAccountName
} from './accountNameUniqueness';

export type AccountAdjustDirection = 'increase' | 'decrease';

export const normalizeAccountName = (name: string) => name.trim().toLocaleLowerCase();

export const parseNonNegativeAccountAmount = (value: string) => {
  const amount = parseMoneyInput(value);

  return amount !== null && amount >= 0 ? amount : null;
};

export const isNonNegativeAccountInput = (value: string) => isMoneyInput(value);

export const sanitizeNonNegativeAccountInput = (value: string) => normalizeMoneyInput(value);

export const toEditableAccountAmount = (amount: number) => Math.abs(amount);

export const hasActiveDuplicateAccountName = (
  groups: AssetGroupWithAccounts[],
  name: string,
  exceptAccountId = ''
) => {
  const normalizedName = normalizeAccountName(name);

  return groups.some((group) =>
    group.accounts.some(
      (account) =>
        !account.archived &&
        account.id !== exceptAccountId &&
        normalizeAccountName(account.name) === normalizedName
    )
  );
};

export const findArchivedAccountByName = (
  archivedAccounts: ArchivedAccountEntry[],
  name: string
) => {
  const normalizedName = normalizeAccountName(name);

  return archivedAccounts.find((account) => normalizeAccountName(account.name) === normalizedName);
};

export const resolveNewAccountGroup = (
  groups: AssetGroupWithAccounts[],
  groupId: string,
  accountTypeInput: string
) =>
  groups.find((group) => group.id === groupId) ??
  groups.find(
    (group) =>
      normalizeTypeSearchText(group.name) === normalizeTypeSearchText(accountTypeInput)
  );

export const getNewAccountTypeInputMatch = (
  groups: AssetGroupWithAccounts[],
  value: string
) =>
  groups.find(
    (group) => normalizeTypeSearchText(group.name) === normalizeTypeSearchText(value)
  );

type CreateNewAccountResult =
  | {
      ok: true;
      account: Account;
      group: AssetGroupWithAccounts;
      nextData: AppData;
    }
  | {
      ok: false;
      error: string;
    };

export const createNewAccountInAppData = ({
  appData,
  groups,
  archivedAccounts,
  groupId,
  accountTypeInput,
  accountNameInput,
  amountInput,
  createdAt,
  accountId,
  historyRecordId
}: {
  appData: AppData;
  groups: AssetGroupWithAccounts[];
  archivedAccounts: ArchivedAccountEntry[];
  groupId: string;
  accountTypeInput: string;
  accountNameInput: string;
  amountInput: string;
  createdAt: string;
  accountId?: string;
  historyRecordId: string;
}): CreateNewAccountResult => {
  const nextName = accountNameInput.trim();
  const editableAmount = parseNonNegativeAccountAmount(amountInput);
  const selectedGroup = resolveNewAccountGroup(groups, groupId, accountTypeInput);

  if (!selectedGroup) {
    return { ok: false, error: '请选择账户类型' };
  }

  if (!nextName) {
    return { ok: false, error: '请输入账户名称' };
  }

  if (
    hasDuplicateAccountName(appData.accounts, nextName) ||
    findArchivedAccountByName(archivedAccounts, nextName)
  ) {
    return { ok: false, error: DUPLICATE_NAME_PLACEHOLDER };
  }

  if (editableAmount === null) {
    return { ok: false, error: '请输入账户金额' };
  }

  const nextAccount: Account = {
    id: accountId ?? createStableAccountId(appData.accounts.map((account) => account.id)),
    groupId: selectedGroup.id,
    name: nextName,
    amount: roundToMoneyPrecision(toStoredAmountByNature(selectedGroup.nature, editableAmount)),
    createdAt
  };
  const nextHistory = [
    createAccountHistoryRecord({
      id: historyRecordId,
      type: '\u521b\u5efa',
      account: nextAccount,
      groupName: selectedGroup.name,
      beforeAmount: null,
      afterAmount: nextAccount.amount,
      time: createdAt
    }),
    ...appData.history
  ];

  return {
    ok: true,
    account: nextAccount,
    group: selectedGroup,
    nextData: {
      groups: appData.groups,
      accounts: [...appData.accounts, nextAccount],
      history: nextHistory
    }
  };
};

export const getAdjustedEditableAccountAmount = ({
  currentAmount,
  adjustAmountInput,
  adjustDirection
}: {
  currentAmount: number;
  adjustAmountInput: string;
  adjustDirection: AccountAdjustDirection;
}) => {
  const currentEditableAmount = toEditableAccountAmount(currentAmount);
  const parsedAdjustAmount = parseNonNegativeAccountAmount(adjustAmountInput) ?? 0;
  const signedAdjustAmount =
    adjustDirection === 'increase' ? parsedAdjustAmount : -parsedAdjustAmount;
  const rawNextAdjustedEditableAmount = currentEditableAmount + signedAdjustAmount;

  return {
    currentEditableAmount,
    parsedAdjustAmount,
    signedAdjustAmount,
    rawNextAdjustedEditableAmount,
    isAdjustAmountInvalid: rawNextAdjustedEditableAmount < 0,
    nextAdjustedEditableAmount: roundToMoneyPrecision(
      Math.max(0, rawNextAdjustedEditableAmount)
    )
  };
};

export const isLargeAccountAmountChange = (beforeAmount: number, afterAmount: number) => {
  const delta = Math.abs(afterAmount - beforeAmount);

  if (delta === 0) {
    return false;
  }

  return beforeAmount === 0 ? afterAmount > 0 : delta / beforeAmount > 0.5;
};

export const saveAccountAmountInAppData = ({
  appData,
  groups,
  account,
  groupId,
  editableAmount,
  savedAt,
  note,
  changeHistoryRecordId,
  restoreHistoryRecordId
}: {
  appData: AppData;
  groups: AssetGroupWithAccounts[];
  account: Account;
  groupId: string;
  editableAmount: number;
  savedAt: string;
  note?: string;
  changeHistoryRecordId: string;
  restoreHistoryRecordId?: string;
}) => {
  const group = groups.find((currentGroup) => currentGroup.id === groupId);

  if (!group) {
    return null;
  }

  const nextAmount = roundToMoneyPrecision(toStoredAmountByNature(group.nature, editableAmount));
  const nextAccounts = appData.accounts.map((currentAccount) =>
    currentAccount.id === account.id
      ? {
          ...currentAccount,
          amount: nextAmount,
          ...(account.archived ? { archived: false, archivedAt: undefined } : {})
        }
      : currentAccount
  );
  const nextHistory = [
    createAccountHistoryRecord({
      id: changeHistoryRecordId,
      type: '\u4fee\u6539',
      account,
      groupName: group.name,
      beforeAmount: account.amount,
      afterAmount: nextAmount,
      time: savedAt,
      note
    }),
    ...(account.archived && restoreHistoryRecordId
      ? [
          createAccountHistoryRecord({
            id: restoreHistoryRecordId,
            type: '\u91cd\u65b0\u542f\u7528',
            account,
            groupName: group.name,
            beforeAmount: account.amount,
            afterAmount: account.amount,
            time: savedAt
          })
        ]
      : []),
    ...appData.history
  ];

  return {
    nextAmount,
    nextData: {
      groups: appData.groups,
      accounts: nextAccounts,
      history: nextHistory
    }
  };
};

export const updateAccountInfoInAppData = ({
  appData,
  groups,
  account,
  accountNameInput,
  aliasInput
}: {
  appData: AppData;
  groups: AssetGroupWithAccounts[];
  account: Account;
  accountNameInput: string;
  aliasInput: string;
}) => {
  const nextName = accountNameInput.trim();
  const nextAlias = getEffectiveAccountAbbreviation(aliasInput);

  if (!nextName) {
    return { ok: false as const, error: '请输入账户名称' };
  }

  if (hasDuplicateAccountName(appData.accounts, nextName, account.id)) {
    return { ok: false as const, error: DUPLICATE_NAME_PLACEHOLDER };
  }

  const nextAccounts = appData.accounts.map((currentAccount) =>
    currentAccount.id === account.id
      ? { ...currentAccount, name: nextName, alias: nextAlias || undefined }
      : currentAccount
  );
  const nextHistory = appData.history.map((record) =>
    record.accountId === account.id ? { ...record, accountName: nextName } : record
  );

  return {
    ok: true as const,
    nextData: {
      groups: appData.groups,
      accounts: nextAccounts,
      history: nextHistory
    }
  };
};

export const deleteAccountInAppData = ({
  appData,
  groupId,
  account
}: {
  appData: AppData;
  groupId: string;
  account: Account;
  deletedAt: string;
  newCreateHistoryRecordId: string;
  deleteHistoryRecordId: string;
}) => {
  const group = appData.groups.find((currentGroup) => currentGroup.id === groupId);

  if (!group) {
    return null;
  }

  const unrelatedHistory = appData.history.filter((record) => record.accountId !== account.id);

  return {
    groups: appData.groups,
    accounts: appData.accounts.filter((currentAccount) => currentAccount.id !== account.id),
    history: unrelatedHistory
  };
};

export const hasAmountEditorUnsavedChanges = ({
  editingAccount,
  currentAccount,
  editMode,
  draftAmount,
  adjustAmountInput,
  accountEditInitialDate,
  setAmountDateInput,
  adjustAmountDateInput,
  setAmountNoteInput,
  adjustAmountNoteInput
}: {
  editingAccount: AccountPointer;
  currentAccount?: Account;
  editMode: EditMode;
  draftAmount: string;
  adjustAmountInput: string;
  accountEditInitialDate: string;
  setAmountDateInput: string;
  adjustAmountDateInput: string;
  setAmountNoteInput: string;
  adjustAmountNoteInput: string;
}) => {
  const hasMetadataChanges = Boolean(
    accountEditInitialDate &&
      (setAmountDateInput !== accountEditInitialDate ||
        adjustAmountDateInput !== accountEditInitialDate ||
        setAmountNoteInput !== '' ||
        adjustAmountNoteInput !== '')
  );

  return Boolean(
    editingAccount &&
      currentAccount &&
      ((editMode === 'set'
        ? draftAmount !== formatMoneyInputValue(toEditableAccountAmount(currentAccount.amount))
        : adjustAmountInput.trim() !== '') ||
        hasMetadataChanges)
  );
};

export const hasAccountInfoUnsavedChanges = ({
  editingAccountInfo,
  account,
  accountNameDraft,
  accountAliasDraft,
  normalizeAlias
}: {
  editingAccountInfo: AccountPointer;
  account?: Account;
  accountNameDraft: string;
  accountAliasDraft: string;
  normalizeAlias: (value: string) => string;
}) =>
  Boolean(
    editingAccountInfo &&
      account &&
      (accountNameDraft !== account.name ||
        accountAliasDraft !== normalizeAlias(account.alias ?? ''))
  );

export const hasAddAccountUnsavedChanges = ({
  isAddingAccount,
  newAccountName,
  newAccountAmount,
  newAccountError,
  newAccountTypeInput,
  newAccountGroupId,
  firstGroupName,
  firstGroupId
}: {
  isAddingAccount: boolean;
  newAccountName: string;
  newAccountAmount: string;
  newAccountError: string;
  newAccountTypeInput: string;
  newAccountGroupId: string;
  firstGroupName: string;
  firstGroupId: string;
}) =>
  Boolean(
    isAddingAccount &&
      (newAccountName.trim() ||
        newAccountAmount.trim() ||
        newAccountError ||
        newAccountTypeInput !== firstGroupName ||
        newAccountGroupId !== firstGroupId)
  );

export const shouldReturnHomeAfterAmountEditorClose = (
  source: AccountOperationEntrySource
) => source === 'quick-single-entry';
