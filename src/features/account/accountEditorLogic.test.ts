/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type {
  Account,
  AppData,
  ArchivedAccountEntry,
  AssetGroup,
  AssetGroupWithAccounts
} from '../../app/types';
import { DUPLICATE_NAME_PLACEHOLDER } from './accountNameUniqueness';
import {
  createNewAccountInAppData,
  deleteAccountInAppData,
  getAdjustedEditableAccountAmount,
  hasAddAccountUnsavedChanges,
  hasAmountEditorUnsavedChanges,
  updateAccountInfoInAppData
} from './accountEditorLogic';

const createGroup = (
  id: string,
  name: string,
  nature: AssetGroup['nature'] = 'asset'
): AssetGroup => ({
  id,
  name,
  nature,
  includeInStats: true,
  sortOrder: 0
});

const withAccounts = (group: AssetGroup, accounts: Account[] = []): AssetGroupWithAccounts => ({
  ...group,
  accounts
});

const createAccount = (
  id: string,
  groupId: string,
  name: string,
  archived = false
): Account => ({
  id,
  groupId,
  name,
  amount: 100,
  createdAt: '2026-05-01T09:00:00.000Z',
  archived,
  archivedAt: archived ? '2026-05-02T09:00:00.000Z' : undefined
});

test('new account stores amount by account type nature', () => {
  const assetGroup = createGroup('g-asset', 'Cash', 'asset');
  const debtGroup = createGroup('g-debt', 'Debt', 'liability');
  const appData: AppData = {
    groups: [assetGroup, debtGroup],
    accounts: [],
    history: []
  };

  const assetResult = createNewAccountInAppData({
    appData,
    groups: [withAccounts(assetGroup), withAccounts(debtGroup)],
    archivedAccounts: [],
    groupId: assetGroup.id,
    accountTypeInput: assetGroup.name,
    accountNameInput: 'Wallet',
    amountInput: '120.50',
    createdAt: '2026-05-01T09:00:00.000Z',
    accountId: 'a-wallet',
    historyRecordId: 'h-wallet'
  });
  const debtResult = createNewAccountInAppData({
    appData,
    groups: [withAccounts(assetGroup), withAccounts(debtGroup)],
    archivedAccounts: [],
    groupId: debtGroup.id,
    accountTypeInput: debtGroup.name,
    accountNameInput: 'Credit card',
    amountInput: '120.50',
    createdAt: '2026-05-01T09:00:00.000Z',
    accountId: 'a-card',
    historyRecordId: 'h-card'
  });

  assert.equal(assetResult.ok, true);
  assert.equal(debtResult.ok, true);

  if (assetResult.ok && debtResult.ok) {
    assert.equal(assetResult.account.amount, 120.5);
    assert.equal(assetResult.nextData.history[0]?.type, '\u65b0\u589e');
    assert.equal(assetResult.nextData.history[0]?.afterAmount, 120.5);
    assert.equal(debtResult.account.amount, -120.5);
    assert.equal(debtResult.nextData.history[0]?.afterAmount, -120.5);
  }
});

test('new account rejects duplicate active account names in the same account type', () => {
  const group = createGroup('g-cash', 'Cash');
  const existingAccount = createAccount('a-existing', group.id, 'Wallet');
  const result = createNewAccountInAppData({
    appData: {
      groups: [group],
      accounts: [existingAccount],
      history: []
    },
    groups: [withAccounts(group, [existingAccount])],
    archivedAccounts: [],
    groupId: group.id,
    accountTypeInput: group.name,
    accountNameInput: ' Wallet ',
    amountInput: '10',
    createdAt: '2026-05-01T09:00:00.000Z',
    historyRecordId: 'h-new'
  });

  assert.equal(result.ok, false);

  if (!result.ok && 'error' in result) {
    assert.equal(result.error, DUPLICATE_NAME_PLACEHOLDER);
  }
});

test('new account rejects duplicate names across different account types', () => {
  const cashGroup = createGroup('g-cash', 'Cash');
  const investmentGroup = createGroup('g-investment', 'Investment');
  const existingAccount = createAccount('a-existing', cashGroup.id, 'Wallet');
  const result = createNewAccountInAppData({
    appData: {
      groups: [cashGroup, investmentGroup],
      accounts: [existingAccount],
      history: []
    },
    groups: [withAccounts(cashGroup, [existingAccount]), withAccounts(investmentGroup)],
    archivedAccounts: [],
    groupId: investmentGroup.id,
    accountTypeInput: investmentGroup.name,
    accountNameInput: 'Wallet',
    amountInput: '10',
    createdAt: '2026-05-01T09:00:00.000Z',
    historyRecordId: 'h-new'
  });

  assert.equal(result.ok, false);

  if (!result.ok && 'error' in result) {
    assert.equal(result.error, DUPLICATE_NAME_PLACEHOLDER);
  }
});

test('new account rejects names occupied by archived accounts', () => {
  const group = createGroup('g-cash', 'Cash');
  const archivedAccount: ArchivedAccountEntry = {
    ...createAccount('a-archived', group.id, 'Old wallet', true),
    groupName: group.name
  };
  const result = createNewAccountInAppData({
    appData: {
      groups: [group],
      accounts: [archivedAccount],
      history: []
    },
    groups: [withAccounts(group, [archivedAccount])],
    archivedAccounts: [archivedAccount],
    groupId: group.id,
    accountTypeInput: group.name,
    accountNameInput: 'Old wallet',
    amountInput: '10',
    createdAt: '2026-05-01T09:00:00.000Z',
    historyRecordId: 'h-new'
  });

  assert.equal(result.ok, false);

  if (!result.ok && 'error' in result) {
    assert.equal(result.error, DUPLICATE_NAME_PLACEHOLDER);
  }
});

test('adjusted account amount clamps invalid negative preview to zero', () => {
  const state = getAdjustedEditableAccountAmount({
    currentAmount: 100,
    adjustAmountInput: '150',
    adjustDirection: 'decrease'
  });

  assert.equal(state.parsedAdjustAmount, 150);
  assert.equal(state.rawNextAdjustedEditableAmount, -50);
  assert.equal(state.isAdjustAmountInvalid, true);
  assert.equal(state.nextAdjustedEditableAmount, 0);
});

test('deleting account removes the account and all related history records', () => {
  const group = createGroup('g-asset', 'Cash');
  const account: Account = {
    id: 'a-wallet',
    groupId: group.id,
    name: 'Wallet',
    amount: 100,
    createdAt: '2026-05-01T09:00:00.000Z'
  };
  const appData: AppData = {
    groups: [group],
    accounts: [account],
    history: [
      {
        id: 'h-create',
        accountId: account.id,
        type: '\u65b0\u589e',
        groupName: group.name,
        accountName: account.name,
        beforeAmount: null,
        afterAmount: account.amount,
        time: account.createdAt
      },
      {
        id: 'h-modify',
        accountId: account.id,
        type: '\u4fee\u6539',
        groupName: group.name,
        accountName: account.name,
        beforeAmount: 100,
        afterAmount: 120,
        time: '2026-05-02T08:00:00.000Z'
      },
      {
        id: 'h-other',
        accountId: 'a-other',
        type: '\u4fee\u6539',
        groupName: group.name,
        accountName: 'Other',
        beforeAmount: 1,
        afterAmount: 2,
        time: '2026-05-02T09:00:00.000Z'
      }
    ]
  };

  const nextData = deleteAccountInAppData({
    appData,
    groupId: group.id,
    account,
    deletedAt: '2026-05-03T09:00:00.000Z',
    newCreateHistoryRecordId: 'h-new-create',
    deleteHistoryRecordId: 'h-delete'
  });

  assert.ok(nextData);
  assert.equal(nextData.accounts.length, 0);
  assert.deepEqual(
    nextData.history.map((record) => record.id),
    ['h-other']
  );
  assert.equal(nextData.history.some((record) => record.accountId === account.id), false);
});

test('account info save stores only the effective custom abbreviation', () => {
  const group = createGroup('g-asset', 'Cash');
  const account: Account = {
    id: 'a-wallet',
    groupId: group.id,
    name: 'Wallet',
    amount: 100,
    createdAt: '2026-05-01T09:00:00.000Z'
  };
  const appData: AppData = {
    groups: [group],
    accounts: [account],
    history: []
  };
  const groups = [withAccounts(group, [account])];
  const saveAlias = (aliasInput: string) => {
    const result = updateAccountInfoInAppData({
      appData,
      groups,
      account,
      accountNameInput: account.name,
      aliasInput
    });

    assert.equal(result.ok, true);

    if (!result.ok) {
      return undefined;
    }

    return result.nextData.accounts[0];
  };

  assert.equal(saveAlias('zhongwen')?.alias, 'zhon');
  assert.equal(saveAlias('中国银行账户')?.alias, '中国银行');
  assert.equal(saveAlias('現金')?.alias, '現金');
  assert.equal(saveAlias('')?.alias, undefined);
});

test('account info save rejects duplicate account names including archived accounts', () => {
  const group = createGroup('g-asset', 'Cash');
  const currentAccount = createAccount('a-wallet', group.id, 'Wallet');
  const activeDuplicate = createAccount('a-active-duplicate', group.id, 'Brokerage');
  const archivedDuplicate = createAccount('a-archived-duplicate', group.id, 'Old card', true);
  const appData: AppData = {
    groups: [group],
    accounts: [currentAccount, activeDuplicate, archivedDuplicate],
    history: []
  };

  const activeResult = updateAccountInfoInAppData({
    appData,
    groups: [withAccounts(group, [currentAccount, activeDuplicate, archivedDuplicate])],
    account: currentAccount,
    accountNameInput: 'Brokerage',
    aliasInput: ''
  });
  const archivedResult = updateAccountInfoInAppData({
    appData,
    groups: [withAccounts(group, [currentAccount, activeDuplicate, archivedDuplicate])],
    account: currentAccount,
    accountNameInput: 'Old card',
    aliasInput: ''
  });

  assert.equal(activeResult.ok, false);
  assert.equal(archivedResult.ok, false);

  if (!activeResult.ok) {
    assert.equal(activeResult.error, DUPLICATE_NAME_PLACEHOLDER);
  }

  if (!archivedResult.ok) {
    assert.equal(archivedResult.error, DUPLICATE_NAME_PLACEHOLDER);
  }
});

test('duplicate name UI paths clear inputs and pass duplicate placeholder props', () => {
  const appSource = readFileSync('src/App.tsx', 'utf8');
  const accountDialogSource = readFileSync(
    'src/features/account/AccountEditorDialog.tsx',
    'utf8'
  );
  const accountInfoDialogSource = readFileSync(
    'src/features/account/AccountInfoEditorDialog.tsx',
    'utf8'
  );
  const accountTypeControllerSource = readFileSync(
    'src/features/account/useAccountTypeController.ts',
    'utf8'
  );
  const accountOperationsControllerSource = readFileSync(
    'src/features/account/useAccountOperationsController.ts',
    'utf8'
  );

  assert.equal(appSource.includes("setNewAccountName('');"), true);
  assert.equal(
    appSource.includes('setNewAccountNamePlaceholder(DUPLICATE_NAME_PLACEHOLDER)'),
    true
  );
  assert.equal(appSource.includes("setNewAccountTypeInput('');"), true);
  assert.equal(
    appSource.includes('setNewAccountTypeInputPlaceholder(DUPLICATE_NAME_PLACEHOLDER)'),
    true
  );
  assert.equal(accountDialogSource.includes('placeholder={newAccountNamePlaceholder}'), true);
  assert.equal(
    accountDialogSource.includes('placeholder={accountTypeInputPlaceholder}'),
    true
  );
  assert.equal(
    accountInfoDialogSource.includes('placeholder={accountNamePlaceholder}'),
    true
  );
  assert.equal(accountTypeControllerSource.includes("setAccountTypeNameDraft('');"), true);
  assert.equal(accountOperationsControllerSource.includes("setAccountNameDraft('');"), true);
});

test('account editor unsaved checks stay narrow to active drafts', () => {
  const account: Account = {
    id: 'a-wallet',
    groupId: 'g-asset',
    name: 'Wallet',
    amount: 100,
    createdAt: '2026-05-01T09:00:00.000Z'
  };

  assert.equal(
    hasAmountEditorUnsavedChanges({
      editingAccount: { groupId: 'g-asset', accountId: account.id },
      currentAccount: account,
      editMode: 'set',
      draftAmount: '100',
      adjustAmountInput: '',
      accountEditInitialDate: '2026-05-01',
      setAmountDateInput: '2026-05-01',
      adjustAmountDateInput: '2026-05-01',
      setAmountNoteInput: '',
      adjustAmountNoteInput: ''
    }),
    false
  );
  assert.equal(
    hasAmountEditorUnsavedChanges({
      editingAccount: { groupId: 'g-asset', accountId: account.id },
      currentAccount: account,
      editMode: 'adjust',
      draftAmount: '100',
      adjustAmountInput: '1',
      accountEditInitialDate: '2026-05-01',
      setAmountDateInput: '2026-05-01',
      adjustAmountDateInput: '2026-05-01',
      setAmountNoteInput: '',
      adjustAmountNoteInput: ''
    }),
    true
  );
  assert.equal(
    hasAddAccountUnsavedChanges({
      isAddingAccount: true,
      newAccountName: '',
      newAccountAmount: '',
      newAccountError: '',
      newAccountTypeInput: 'Cash',
      newAccountGroupId: 'g-cash',
      firstGroupName: 'Cash',
      firstGroupId: 'g-cash'
    }),
    false
  );
});
