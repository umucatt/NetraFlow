import {
  Fragment,
  createElement,
  useEffect,
  useRef,
  useState
} from 'react';

import { toStoredAmountByNature } from '../../app/accountNature';
import { deriveGroupsWithAccounts } from '../../app/accountData';
import type {
  Account,
  AccountOperationEntrySource,
  AccountPointer,
  AppData,
  AssetGroup,
  AssetGroupWithAccounts,
  CommitAppDataUpdate,
  EditMode
} from '../../app/types';
import type {
  AppCallbackConfirmationDialogRequest,
  AppNoticeDialogRequest
} from '../../app/useAppDialogController';
import {
  getAccountOperationCalendarMonth,
  getAccountOperationTodayDateValue,
  isFutureAccountOperationDateValue,
  parseAccountOperationDateInput,
  resolveProtectedAccountOperationDateInputState,
  toAccountOperationIsoTime
} from '../../accountOperationDate';
import {
  formatMoneyInputValue,
  formatMoneyValue,
  roundToMoneyPrecision
} from '../../money';
import {
  archiveAccountInAppData,
  getArchivedRestoreTargetGroups,
  prepareArchivedAccountRestore,
  restoreArchivedAccountInAppData,
  type ArchivedRestoreSource,
  type PendingArchivedRestore
} from './archivedAccountLogic';
import {
  deleteAccountInAppData,
  getAdjustedEditableAccountAmount,
  hasAccountInfoUnsavedChanges as getAccountInfoUnsavedChanges,
  hasActiveDuplicateAccountName,
  hasAmountEditorUnsavedChanges as getAmountEditorUnsavedChanges,
  isLargeAccountAmountChange,
  parseNonNegativeAccountAmount,
  saveAccountAmountInAppData,
  toEditableAccountAmount,
  updateAccountInfoInAppData,
  type AccountAdjustDirection
} from './accountEditorLogic';
import { DUPLICATE_NAME_PLACEHOLDER } from './accountNameUniqueness';
import type {
  AccountActionsPanelProps,
  AccountDangerActionsPanelProps
} from './accountOperationTypes';

type UseAccountOperationsControllerOptions = {
  appData: AppData;
  groups: AssetGroupWithAccounts[];
  selectedAccount: AccountPointer;
  selectedAccountEntry?: Account;
  assetGroups: AssetGroup[];
  formatMoney: (amount: number | null, options?: { compact?: boolean }) => string;
  createHistoryRecordId: () => string;
  commitAppDataUpdate: CommitAppDataUpdate;
  showConfirmationDialog: (options: AppCallbackConfirmationDialogRequest) => void;
  showNoticeDialog: (options: AppNoticeDialogRequest) => Promise<void>;
  normalizeAlias: (value: string) => string;
  onCloseAccountDetail: () => void;
  onCloseAccountActionMenu: () => void;
  onReturnFromActionPanel: () => void;
  onAmountEditorReturnHome: () => void;
  onCompleteArchivedRestoreSource: (source: ArchivedRestoreSource) => void;
};

const createParagraphMessage = (...lines: Array<string | false>) =>
  createElement(
    Fragment,
    null,
    ...lines
      .filter((line): line is string => Boolean(line))
      .map((line) => createElement('p', { key: line }, line))
  );

type AmountSaveRequest =
  | {
      mode: 'set';
      editableAmount: number;
    }
  | {
      mode: 'adjust';
      signedAdjustAmount: number;
    };

export function useAccountOperationsController({
  appData,
  groups,
  selectedAccount,
  selectedAccountEntry,
  assetGroups,
  formatMoney,
  createHistoryRecordId,
  commitAppDataUpdate,
  showConfirmationDialog,
  showNoticeDialog,
  normalizeAlias,
  onCloseAccountDetail,
  onCloseAccountActionMenu,
  onReturnFromActionPanel,
  onAmountEditorReturnHome,
  onCompleteArchivedRestoreSource
}: UseAccountOperationsControllerOptions) {
  const [editingAccount, setEditingAccount] = useState<AccountPointer>(null);
  const [accountOperationEntrySource, setAccountOperationEntrySource] =
    useState<AccountOperationEntrySource>('account-detail');
  const [editingAccountInfo, setEditingAccountInfo] = useState<AccountPointer>(null);
  const [pendingArchivedRestore, setPendingArchivedRestore] =
    useState<PendingArchivedRestore>(null);
  const [isDangerActionsOpen, setIsDangerActionsOpen] = useState(false);

  const [editMode, setEditMode] = useState<EditMode>('set');
  const [draftAmount, setDraftAmount] = useState('');
  const [adjustAmountInput, setAdjustAmountInput] = useState('');
  const [adjustDirection, setAdjustDirection] =
    useState<AccountAdjustDirection>('increase');
  const [accountEditInitialDate, setAccountEditInitialDate] = useState('');
  const [setAmountDateInput, setSetAmountDateInput] = useState('');
  const [setAmountSelectedDate, setSetAmountSelectedDate] = useState<string | null>(null);
  const [setAmountVisibleMonth, setSetAmountVisibleMonth] = useState(() =>
    getAccountOperationCalendarMonth(getAccountOperationTodayDateValue())
  );
  const [setAmountDateFutureHint, setSetAmountDateFutureHint] = useState(false);
  const [setAmountNoteInput, setSetAmountNoteInput] = useState('');
  const [adjustAmountDateInput, setAdjustAmountDateInput] = useState('');
  const [adjustAmountSelectedDate, setAdjustAmountSelectedDate] = useState<string | null>(null);
  const [adjustAmountVisibleMonth, setAdjustAmountVisibleMonth] = useState(() =>
    getAccountOperationCalendarMonth(getAccountOperationTodayDateValue())
  );
  const [adjustAmountDateFutureHint, setAdjustAmountDateFutureHint] = useState(false);
  const [adjustAmountNoteInput, setAdjustAmountNoteInput] = useState('');

  const [accountNameDraft, setAccountNameDraft] = useState('');
  const [accountAliasDraft, setAccountAliasDraft] = useState('');
  const [accountInfoError, setAccountInfoError] = useState('');

  const setAmountFutureHintTimerRef = useRef<number | null>(null);
  const adjustAmountFutureHintTimerRef = useRef<number | null>(null);

  const accounts = appData.accounts;
  const history = appData.history;
  const currentGroup = editingAccount
    ? groups.find((group) => group.id === editingAccount.groupId)
    : undefined;
  const currentAccount = currentGroup?.accounts.find(
    (account) => account.id === editingAccount?.accountId
  );
  const accountInfoGroup = editingAccountInfo
    ? groups.find((group) => group.id === editingAccountInfo.groupId)
    : undefined;
  const accountInfoEntry = accountInfoGroup?.accounts.find(
    (account) => account.id === editingAccountInfo?.accountId
  );
  const pendingArchivedRestoreAccount = pendingArchivedRestore
    ? accounts.find((account) => account.id === pendingArchivedRestore.accountId)
    : undefined;
  const archivedRestoreTargetGroups = getArchivedRestoreTargetGroups(assetGroups);
  const selectedAccountIsArchived = Boolean(selectedAccountEntry?.archived);

  const adjustedAmountState = getAdjustedEditableAccountAmount({
    currentAmount: currentAccount?.amount ?? 0,
    adjustAmountInput,
    adjustDirection
  });
  const currentEditableAmount = adjustedAmountState.currentEditableAmount;
  const parsedAdjustAmount = adjustedAmountState.parsedAdjustAmount;
  const signedAdjustAmount = adjustedAmountState.signedAdjustAmount;
  const isAdjustAmountInvalid = editMode === 'adjust' && adjustedAmountState.isAdjustAmountInvalid;
  const nextAdjustedEditableAmount = adjustedAmountState.nextAdjustedEditableAmount;
  const parsedSetAmountDate = parseAccountOperationDateInput(setAmountDateInput);
  const parsedAdjustAmountDate = parseAccountOperationDateInput(adjustAmountDateInput);
  const activeAmountEditDate =
    editMode === 'set' ? parsedSetAmountDate : parsedAdjustAmountDate;
  const isAmountEditDateInvalid = activeAmountEditDate === null;
  const activeAmountEditNote =
    editMode === 'set' ? setAmountNoteInput : adjustAmountNoteInput;
  const isAmountEditorSubmitDisabled = isAdjustAmountInvalid || isAmountEditDateInvalid;
  const isEditingArchivedAccount = Boolean(currentAccount?.archived);
  const signedAdjustAmountLabel =
    adjustDirection === 'decrease'
      ? `-${formatMoneyValue(parsedAdjustAmount)}`
      : `+${formatMoneyValue(parsedAdjustAmount)}`;

  useEffect(() => {
    if (!parsedSetAmountDate) {
      return;
    }

    setSetAmountSelectedDate(parsedSetAmountDate);
    setSetAmountVisibleMonth(getAccountOperationCalendarMonth(parsedSetAmountDate));
  }, [parsedSetAmountDate]);

  useEffect(() => {
    if (!parsedAdjustAmountDate) {
      return;
    }

    setAdjustAmountSelectedDate(parsedAdjustAmountDate);
    setAdjustAmountVisibleMonth(getAccountOperationCalendarMonth(parsedAdjustAmountDate));
  }, [parsedAdjustAmountDate]);

  useEffect(
    () => () => {
      if (setAmountFutureHintTimerRef.current !== null) {
        window.clearTimeout(setAmountFutureHintTimerRef.current);
      }

      if (adjustAmountFutureHintTimerRef.current !== null) {
        window.clearTimeout(adjustAmountFutureHintTimerRef.current);
      }
    },
    []
  );

  const getGroupNature = (groupId: string) =>
    groups.find((group) => group.id === groupId)?.nature ?? 'asset';

  const toStoredGroupAmount = (groupId: string, amount: number) =>
    toStoredAmountByNature(getGroupNature(groupId), amount);

  const hasAmountEditorUnsavedChanges = getAmountEditorUnsavedChanges({
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
  });

  const hasAccountInfoUnsavedChanges = getAccountInfoUnsavedChanges({
    editingAccountInfo,
    account: accountInfoEntry,
    accountNameDraft,
    accountAliasDraft,
    normalizeAlias
  });

  const resetAmountEditorState = () => {
    setEditingAccount(null);
    setAccountOperationEntrySource('account-detail');
    setDraftAmount('');
    setAdjustAmountInput('');
    setAdjustDirection('increase');
    setAccountEditInitialDate('');
    setSetAmountDateInput('');
    setSetAmountSelectedDate(null);
    setSetAmountVisibleMonth(getAccountOperationCalendarMonth(getAccountOperationTodayDateValue()));
    setSetAmountDateFutureHint(false);
    setSetAmountNoteInput('');
    setAdjustAmountDateInput('');
    setAdjustAmountSelectedDate(null);
    setAdjustAmountVisibleMonth(
      getAccountOperationCalendarMonth(getAccountOperationTodayDateValue())
    );
    setAdjustAmountDateFutureHint(false);
    setAdjustAmountNoteInput('');
  };

  const openEditor = (
    groupId: string,
    account: Account,
    mode: EditMode = 'set',
    source: AccountOperationEntrySource = 'account-detail'
  ) => {
    const group = groups.find((currentGroup) => currentGroup.id === groupId);
    const today = getAccountOperationTodayDateValue();
    const todayMonth = getAccountOperationCalendarMonth(today);

    onCloseAccountActionMenu();
    setEditingAccount({ groupId, groupName: group?.name, accountId: account.id });
    setAccountOperationEntrySource(source);
    setEditMode(mode);
    setDraftAmount(formatMoneyInputValue(toEditableAccountAmount(account.amount)));
    setAdjustAmountInput('');
    setAdjustDirection('increase');
    setAccountEditInitialDate(today);
    setSetAmountDateInput(today);
    setSetAmountSelectedDate(today);
    setSetAmountVisibleMonth(todayMonth);
    setSetAmountNoteInput('');
    setAdjustAmountDateInput(today);
    setAdjustAmountSelectedDate(today);
    setAdjustAmountVisibleMonth(todayMonth);
    setAdjustAmountNoteInput('');
  };

  const closeEditor = () => {
    const shouldReturnHome = accountOperationEntrySource === 'quick-single-entry';

    resetAmountEditorState();

    if (shouldReturnHome) {
      setIsDangerActionsOpen(false);
      onCloseAccountActionMenu();
      onAmountEditorReturnHome();
    }
  };

  const openAccountInfoEditor = (groupId: string, account: Account) => {
    const group = groups.find((currentGroup) => currentGroup.id === groupId);

    onCloseAccountActionMenu();
    setEditingAccountInfo({ groupId, groupName: group?.name, accountId: account.id });
    setAccountNameDraft(account.name);
    setAccountAliasDraft(normalizeAlias(account.alias ?? ''));
    setAccountInfoError('');
  };

  const closeAccountInfoEditor = () => {
    setEditingAccountInfo(null);
    setAccountNameDraft('');
    setAccountAliasDraft('');
    setAccountInfoError('');
  };

  const openDangerActions = () => {
    onCloseAccountActionMenu();
    setIsDangerActionsOpen(true);
  };

  const closeDangerActions = () => {
    setIsDangerActionsOpen(false);
  };

  const resetAccountOperations = () => {
    resetAmountEditorState();
    closeAccountInfoEditor();
    setPendingArchivedRestore(null);
    setIsDangerActionsOpen(false);
  };

  const syncAccountGroupName = (groupId: string, nextGroupName: string) => {
    setEditingAccount((account) =>
      account?.groupId === groupId ? { ...account, groupName: nextGroupName } : account
    );
    setEditingAccountInfo((account) =>
      account?.groupId === groupId ? { ...account, groupName: nextGroupName } : account
    );
  };

  const requestDiscardableBack = (hasUnsavedChanges: boolean, onDiscard: () => void) => {
    if (!hasUnsavedChanges) {
      onDiscard();
      return;
    }

    showConfirmationDialog({
      title: '放弃当前编辑',
      message: '当前内容尚未保存，确认后会丢弃这些改动',
      confirmLabel: '放弃',
      tone: 'danger',
      onConfirm: onDiscard
    });
  };

  const requestCloseAccountInfoEditor = () =>
    requestDiscardableBack(hasAccountInfoUnsavedChanges, closeAccountInfoEditor);

  const requestCloseEditor = () =>
    requestDiscardableBack(hasAmountEditorUnsavedChanges, closeEditor);

  const updateSetAmountDateInput = (value: string) => {
    const today = getAccountOperationTodayDateValue();
    const nextState = resolveProtectedAccountOperationDateInputState(
      value,
      setAmountVisibleMonth,
      today
    );

    if (nextState.isFutureDate) {
      if (setAmountFutureHintTimerRef.current !== null) {
        window.clearTimeout(setAmountFutureHintTimerRef.current);
      }

      setSetAmountDateFutureHint(true);
      setSetAmountDateInput('');
      setSetAmountSelectedDate(today);
      setSetAmountVisibleMonth(getAccountOperationCalendarMonth(today));
      setAmountFutureHintTimerRef.current = window.setTimeout(() => {
        setSetAmountDateInput(today);
        setSetAmountDateFutureHint(false);
        setAmountFutureHintTimerRef.current = null;
      }, 900);
      return;
    }

    setSetAmountDateInput(value);
    setSetAmountSelectedDate(nextState.selectedDate);
    setSetAmountVisibleMonth(nextState.visibleMonth);
  };

  const selectSetAmountCalendarDate = (dateValue: string) => {
    if (isFutureAccountOperationDateValue(dateValue)) {
      return;
    }

    setSetAmountDateInput(dateValue);
    setSetAmountSelectedDate(dateValue);
    setSetAmountVisibleMonth(getAccountOperationCalendarMonth(dateValue));
  };

  const updateAdjustAmountDateInput = (value: string) => {
    const today = getAccountOperationTodayDateValue();
    const nextState = resolveProtectedAccountOperationDateInputState(
      value,
      adjustAmountVisibleMonth,
      today
    );

    if (nextState.isFutureDate) {
      if (adjustAmountFutureHintTimerRef.current !== null) {
        window.clearTimeout(adjustAmountFutureHintTimerRef.current);
      }

      setAdjustAmountDateFutureHint(true);
      setAdjustAmountDateInput('');
      setAdjustAmountSelectedDate(today);
      setAdjustAmountVisibleMonth(getAccountOperationCalendarMonth(today));
      adjustAmountFutureHintTimerRef.current = window.setTimeout(() => {
        setAdjustAmountDateInput(today);
        setAdjustAmountDateFutureHint(false);
        adjustAmountFutureHintTimerRef.current = null;
      }, 900);
      return;
    }

    setAdjustAmountDateInput(value);
    setAdjustAmountSelectedDate(nextState.selectedDate);
    setAdjustAmountVisibleMonth(nextState.visibleMonth);
  };

  const selectAdjustAmountCalendarDate = (dateValue: string) => {
    if (isFutureAccountOperationDateValue(dateValue)) {
      return;
    }

    setAdjustAmountDateInput(dateValue);
    setAdjustAmountSelectedDate(dateValue);
    setAdjustAmountVisibleMonth(getAccountOperationCalendarMonth(dateValue));
  };

  const saveAccountInfo = () => {
    if (!editingAccountInfo || !accountInfoEntry) {
      return;
    }

    const result = commitAppDataUpdate((latestData) => {
      const latestGroups = deriveGroupsWithAccounts(latestData.groups, latestData.accounts);
      const latestAccount = latestData.accounts.find(
        (account) => account.id === editingAccountInfo.accountId
      );

      if (!latestAccount) {
        return { ok: false, error: '当前账户已不存在，无法保存账户信息' };
      }

      const updateResult = updateAccountInfoInAppData({
        appData: latestData,
        groups: latestGroups,
        account: latestAccount,
        accountNameInput: accountNameDraft,
        aliasInput: accountAliasDraft
      });

      return updateResult.ok
        ? { ok: true, nextData: updateResult.nextData, value: null }
        : updateResult;
    });

    if (!result.ok) {
      if (result.error === DUPLICATE_NAME_PLACEHOLDER) {
        setAccountNameDraft('');
      }

      setAccountInfoError(result.error ?? '账户信息保存失败');
      return;
    }

    closeAccountInfoEditor();
  };

  const performSaveAmount = (saveRequest: AmountSaveRequest, savedDate: string, note?: string) => {
    if (!editingAccount) {
      return;
    }

    const savedAt = toAccountOperationIsoTime(savedDate);
    const result = commitAppDataUpdate((latestData) => {
      const latestGroups = deriveGroupsWithAccounts(latestData.groups, latestData.accounts);
      const latestAccount = latestData.accounts.find(
        (account) => account.id === editingAccount.accountId
      );

      if (!latestAccount) {
        return { ok: false, error: '当前账户已不存在，无法保存余额' };
      }

      const latestGroup = latestGroups.find((group) => group.id === latestAccount.groupId);

      if (!latestGroup) {
        return { ok: false, error: '当前账户类型已不存在，无法保存余额' };
      }

      if (
        latestAccount.archived &&
        hasActiveDuplicateAccountName(latestGroups, latestAccount.name, latestAccount.id)
      ) {
        return { ok: false, error: '已有同名启用账户，请先处理后再重新启用' };
      }

      const editableAmount =
        saveRequest.mode === 'set'
          ? saveRequest.editableAmount
          : roundToMoneyPrecision(
              toEditableAccountAmount(latestAccount.amount) + saveRequest.signedAdjustAmount
            );

      if (editableAmount < 0) {
        return { ok: false, error: '净值将为负数' };
      }

      const savedResult = saveAccountAmountInAppData({
        appData: latestData,
        groups: latestGroups,
        account: latestAccount,
        groupId: latestGroup.id,
        editableAmount,
        savedAt,
        note,
        changeHistoryRecordId: createHistoryRecordId(),
        restoreHistoryRecordId: latestAccount.archived ? createHistoryRecordId() : undefined
      });

      return savedResult
        ? { ok: true, nextData: savedResult.nextData, value: null }
        : { ok: false, error: '当前账户无法保存余额' };
    });

    if (!result) {
      return;
    }

    if (!result.ok) {
      void showNoticeDialog({
        title: result.error === '已有同名启用账户，请先处理后再重新启用' ? '无法重新启用账户' : '无法保存余额',
        message: result.error ?? '当前账户无法保存余额'
      });
      return;
    }

    closeEditor();
  };

  const saveAmount = () => {
    if (!editingAccount || !currentAccount) {
      return;
    }

    const editableAmount =
      editMode === 'set' ? parseNonNegativeAccountAmount(draftAmount) : nextAdjustedEditableAmount;

    if (editableAmount === null || isAdjustAmountInvalid || !activeAmountEditDate) {
      return;
    }

    const saveRequest: AmountSaveRequest =
      editMode === 'set'
        ? { mode: 'set', editableAmount }
        : { mode: 'adjust', signedAdjustAmount };

    if (
      currentAccount.archived &&
      hasActiveDuplicateAccountName(groups, currentAccount.name, currentAccount.id)
    ) {
      void showNoticeDialog({
        title: '无法重新启用账户',
        message: '已有同名启用账户，请先处理后再重新启用'
      });
      return;
    }

    const nextAmount = roundToMoneyPrecision(
      toStoredGroupAmount(editingAccount.groupId, editableAmount)
    );

    if (isLargeAccountAmountChange(currentEditableAmount, editableAmount)) {
      const savedDate = activeAmountEditDate;
      const note = activeAmountEditNote.trim() ? activeAmountEditNote : undefined;

      showConfirmationDialog({
        title: editMode === 'set' ? '确认修改余额' : '确认调整余额',
        message: `${currentAccount.name}：${formatMoney(currentAccount.amount)} → ${formatMoney(nextAmount)}`,
        confirmLabel: '确认',
        onConfirm: () => performSaveAmount(saveRequest, savedDate, note)
      });
      return;
    }

    performSaveAmount(
      saveRequest,
      activeAmountEditDate,
      activeAmountEditNote.trim() ? activeAmountEditNote : undefined
    );
  };

  const performDeleteAccount = (groupId: string, account: Account) => {
    const deletedAt = new Date().toISOString();
    const newCreateHistoryRecordId = createHistoryRecordId();
    const deleteHistoryRecordId = createHistoryRecordId();
    const result = commitAppDataUpdate((latestData) => {
      const latestAccount = latestData.accounts.find(
        (currentAccount) => currentAccount.id === account.id
      );

      if (!latestAccount) {
        return { ok: false, error: '当前账户已不存在，无法删除' };
      }

      const nextData = deleteAccountInAppData({
        appData: latestData,
        groupId: latestAccount.groupId || groupId,
        account: latestAccount,
        deletedAt,
        newCreateHistoryRecordId,
        deleteHistoryRecordId
      });

      return nextData
        ? { ok: true, nextData, value: null }
        : { ok: false, error: '当前账户无法删除' };
    });

    if (!result.ok) {
      return;
    }

    setIsDangerActionsOpen(false);
    onCloseAccountDetail();
  };

  const deleteAccount = (groupId: string, account: Account) => {
    showConfirmationDialog({
      title: '删除账户',
      message: createParagraphMessage(`确定删除 ${account.name}`, '删除后不可恢复'),
      confirmLabel: '删除',
      tone: 'danger',
      onConfirm: () => performDeleteAccount(groupId, account)
    });
  };

  const performArchiveAccount = (groupId: string, account: Account) => {
    const archivedAt = new Date().toISOString();
    const historyRecordId = createHistoryRecordId();
    const result = commitAppDataUpdate((latestData) => {
      const latestAccount = latestData.accounts.find(
        (currentAccount) => currentAccount.id === account.id
      );

      if (!latestAccount) {
        return { ok: false, error: '当前账户已不存在，无法归档' };
      }

      const nextData = archiveAccountInAppData({
        appData: latestData,
        groupId: latestAccount.groupId || groupId,
        account: latestAccount,
        archivedAt,
        historyRecordId
      });

      return nextData
        ? { ok: true, nextData, value: null }
        : { ok: false, error: '当前账户无法归档' };
    });

    if (!result.ok) {
      return;
    }

    setIsDangerActionsOpen(false);
    onCloseAccountDetail();
  };

  const archiveAccount = (groupId: string, account: Account) => {
    showConfirmationDialog({
      title: '归档账户',
      message: createParagraphMessage(
        account.amount !== 0 && '账户余额不为 0',
        `确定归档 ${account.name}`,
        '归档后可在账户创建 / 恢复中重新启用'
      ),
      confirmLabel: '归档',
      onConfirm: () => performArchiveAccount(groupId, account)
    });
  };

  const performRestoreAccountToGroup = (account: Account, targetGroup: AssetGroup) => {
    const restoredAt = new Date().toISOString();
    const historyRecordId = createHistoryRecordId();
    const result = commitAppDataUpdate((latestData) => {
      const latestGroups = deriveGroupsWithAccounts(latestData.groups, latestData.accounts);
      const latestAccount = latestData.accounts.find(
        (currentAccount) => currentAccount.id === account.id && currentAccount.archived
      );
      const latestTargetGroup = latestData.groups.find((group) => group.id === targetGroup.id);

      if (!latestAccount || !latestTargetGroup) {
        return { ok: false, error: '当前账户无法重新启用' };
      }

      const restoreResult = restoreArchivedAccountInAppData({
        appData: latestData,
        groups: latestGroups,
        account: latestAccount,
        targetGroup: latestTargetGroup,
        restoredAt,
        historyRecordId
      });

      return restoreResult.ok
        ? { ok: true, nextData: restoreResult.nextData, value: null }
        : restoreResult;
    });

    if (!result.ok) {
      if (result.error) {
        void showNoticeDialog({
          title: '无法重新启用账户',
          message: result.error
        });
      }
      return false;
    }

    return true;
  };

  const restoreAccount = (
    groupId: string,
    account: Account,
    source: ArchivedRestoreSource = 'account-detail'
  ) => {
    const restorePlan = prepareArchivedAccountRestore(groupId, account, assetGroups, source);

    if (restorePlan.type === 'needs-target') {
      setPendingArchivedRestore(restorePlan.pendingRestore);
      return false;
    }

    return performRestoreAccountToGroup(restorePlan.account, restorePlan.group);
  };

  const cancelPendingArchivedRestore = () => {
    setPendingArchivedRestore(null);
  };

  const choosePendingArchivedRestoreGroup = (groupId: string) => {
    if (!pendingArchivedRestore) {
      return;
    }

    const account = accounts.find(
      (currentAccount) => currentAccount.id === pendingArchivedRestore.accountId
    );
    const targetGroup = assetGroups.find((group) => group.id === groupId);

    if (!account || !targetGroup) {
      setPendingArchivedRestore(null);
      return;
    }

    if (performRestoreAccountToGroup(account, targetGroup)) {
      const { source } = pendingArchivedRestore;

      setPendingArchivedRestore(null);
      onCompleteArchivedRestoreSource(source);
    }
  };

  const accountActionsPanelProps: AccountActionsPanelProps | null =
    selectedAccount && selectedAccountEntry
      ? {
          isArchived: selectedAccountIsArchived,
          onEditBalance: () => openEditor(selectedAccount.groupId, selectedAccountEntry, 'set'),
          onEditAccount: () => openAccountInfoEditor(selectedAccount.groupId, selectedAccountEntry),
          onRestoreAccount: selectedAccountIsArchived
            ? () => restoreAccount(selectedAccount.groupId, selectedAccountEntry, 'account-detail')
            : undefined,
          onOpenDangerActions: openDangerActions,
          onBack: onReturnFromActionPanel
        }
      : null;

  const accountDangerActionsPanelProps: AccountDangerActionsPanelProps | null =
    selectedAccount && selectedAccountEntry
      ? {
          isArchived: selectedAccountIsArchived,
          onArchiveAccount: () => archiveAccount(selectedAccount.groupId, selectedAccountEntry),
          onDeleteAccount: () => deleteAccount(selectedAccount.groupId, selectedAccountEntry),
          onBackToAccountDetail: closeDangerActions
        }
      : null;

  return {
    editingAccount,
    accountOperationEntrySource,
    editingAccountInfo,
    pendingArchivedRestore,
    pendingArchivedRestoreAccount,
    archivedRestoreTargetGroups,
    isDangerActionsOpen,
    editMode,
    setEditMode,
    draftAmount,
    setDraftAmount,
    adjustAmountInput,
    setAdjustAmountInput,
    adjustDirection,
    setAdjustDirection,
    setAmountDateInput,
    setAmountSelectedDate,
    setAmountVisibleMonth,
    setSetAmountVisibleMonth,
    setAmountNoteInput,
    setSetAmountNoteInput,
    adjustAmountDateInput,
    setAdjustAmountSelectedDate,
    setAdjustAmountVisibleMonth,
    setAdjustAmountNoteInput,
    adjustAmountSelectedDate,
    adjustAmountVisibleMonth,
    adjustAmountDateFutureHint,
    adjustAmountNoteInput,
    accountNameDraft,
    setAccountNameDraft,
    accountAliasDraft,
    setAccountAliasDraft,
    accountInfoError,
    setAccountInfoError,
    currentGroup,
    currentAccount,
    accountInfoEntry,
    selectedAccountIsArchived,
    currentEditableAmount,
    parsedAdjustAmount,
    signedAdjustAmount,
    isAdjustAmountInvalid,
    nextAdjustedEditableAmount,
    parsedSetAmountDate,
    parsedAdjustAmountDate,
    setAmountDateFutureHint,
    isEditingArchivedAccount,
    isAmountEditorSubmitDisabled,
    signedAdjustAmountLabel,
    hasAmountEditorUnsavedChanges,
    hasAccountInfoUnsavedChanges,
    accountActionsPanelProps,
    accountDangerActionsPanelProps,
    openEditor,
    closeEditor,
    requestCloseEditor,
    openAccountInfoEditor,
    closeAccountInfoEditor,
    requestCloseAccountInfoEditor,
    saveAccountInfo,
    openDangerActions,
    closeDangerActions,
    resetAccountOperations,
    syncAccountGroupName,
    updateSetAmountDateInput,
    selectSetAmountCalendarDate,
    updateAdjustAmountDateInput,
    selectAdjustAmountCalendarDate,
    saveAmount,
    restoreAccount,
    cancelPendingArchivedRestore,
    choosePendingArchivedRestoreGroup,
    toStoredGroupAmount
  };
}
