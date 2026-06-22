import {
  compareHistoryByTimeDesc,
  createHistoryTimestampForBusinessDate,
  getDateWeekKey
} from '../../app/dateUtils';
import { toStoredAmountByNature } from '../../app/accountNature';
import type {
  Account,
  AccountPointer,
  AppData,
  AssetGroup,
  HistoryRecord
} from '../../app/types';
import { roundToMoneyPrecision } from '../../money';
import { parseFlashNumberInput } from './flashNoteUtils';
import type { FlashCell, FlashInputMode, FlashWriteRow } from './flashNoteTypes';

export type FlashHistoryRecordInput = {
  account: Account;
  afterAmount: number;
  beforeAmount: number | null;
  groupName: string;
  row: FlashWriteRow;
  source: 'flash-note';
  time: string;
};

export type FlashNoteWritePlan = {
  historyRecords: HistoryRecord[];
  nextAccounts: Account[];
  nextHistory: HistoryRecord[];
  rows: FlashWriteRow[];
  targetAccount: NonNullable<AccountPointer>;
};

export const getFlashAccountPreviousAmount = ({
  account,
  sortedHistory
}: {
  account: Account;
  sortedHistory: HistoryRecord[];
}) => {
  const latestRecord = sortedHistory.find(
    (record) => record.accountId === account.id && record.afterAmount !== null
  );

  return latestRecord?.afterAmount ?? account.amount;
};

export const getFlashBalanceHasPreviousRecord = ({
  account,
  sortedHistory
}: {
  account: Account;
  sortedHistory: HistoryRecord[];
}) =>
  sortedHistory.some(
    (record) => record.accountId === account.id && record.afterAmount !== null
  );

const getGroupNature = (groups: AssetGroup[], groupId: string) =>
  groups.find((group) => group.id === groupId)?.nature ?? 'asset';

const toStoredGroupAmount = (groups: AssetGroup[], groupId: string, amount: number) =>
  toStoredAmountByNature(getGroupNature(groups, groupId), amount);

export const createFlashWriteRows = ({
  account,
  cells,
  groupId,
  groups,
  inputMode,
  sortedHistory,
  trackDates
}: {
  account: Account;
  cells: Record<string, FlashCell>;
  groupId: string;
  groups: AssetGroup[];
  inputMode: FlashInputMode;
  sortedHistory: HistoryRecord[];
  trackDates: string[];
}): FlashWriteRow[] => {
  let previousAmount = getFlashAccountPreviousAmount({ account, sortedHistory });
  let hasPreviousBalance = getFlashBalanceHasPreviousRecord({ account, sortedHistory });

  return trackDates
    .filter((dateValue) => parseFlashNumberInput(cells[dateValue]?.value ?? '') !== null)
    .map((dateValue) => {
      const value = (cells[dateValue]?.value ?? '').trim();
      const inputAmount = parseFlashNumberInput(value) ?? 0;
      const beforeAmount = previousAmount;
      const rawAfterAmount =
        inputMode === 'change'
          ? (beforeAmount ?? account.amount) + inputAmount
          : toStoredGroupAmount(groups, groupId, inputAmount);
      const afterAmount = roundToMoneyPrecision(rawAfterAmount);
      const delta =
        inputMode === 'change'
          ? inputAmount
          : hasPreviousBalance && beforeAmount !== null
            ? roundToMoneyPrecision(afterAmount - beforeAmount)
            : null;

      previousAmount = afterAmount;
      hasPreviousBalance = true;

      return {
        date: dateValue,
        value,
        inputAmount,
        beforeAmount,
        afterAmount,
        delta,
        weekKey: getDateWeekKey(dateValue)
      };
    });
};

export const createFlashNoteWritePlan = ({
  account,
  accounts,
  cells,
  createHistoryRecord,
  groupName,
  groups,
  history,
  inputMode,
  selectedAccount,
  sortedHistory,
  trackDates,
  writeTime = new Date()
}: {
  account: Account | undefined;
  accounts: Account[];
  cells: Record<string, FlashCell>;
  createHistoryRecord: (input: FlashHistoryRecordInput) => HistoryRecord;
  groupName: string;
  groups: AssetGroup[];
  history: HistoryRecord[];
  inputMode: FlashInputMode;
  selectedAccount: AccountPointer;
  sortedHistory: HistoryRecord[];
  trackDates: string[];
  writeTime?: Date;
}): FlashNoteWritePlan | null => {
  if (!account || !selectedAccount) {
    return null;
  }

  const rows = createFlashWriteRows({
    account,
    cells,
    groupId: selectedAccount.groupId,
    groups,
    inputMode,
    sortedHistory,
    trackDates
  });

  if (rows.length === 0) {
    return null;
  }

  const latestRowByDate = [...rows].sort((left, right) =>
    right.date.localeCompare(left.date)
  )[0];
  const nextAmount = latestRowByDate?.afterAmount ?? account.amount;
  const nextAccounts = accounts.map((currentAccount) =>
    currentAccount.id === selectedAccount.accountId
      ? { ...currentAccount, amount: nextAmount }
      : currentAccount
  );
  const historyRecords = rows.map((row, index) =>
    createHistoryRecord({
      account,
      afterAmount: row.afterAmount,
      beforeAmount: row.beforeAmount,
      groupName,
      row,
      source: 'flash-note',
      time: createHistoryTimestampForBusinessDate(row.date, writeTime, index)
    })
  );
  const nextHistory = [...historyRecords, ...history].sort(compareHistoryByTimeDesc);

  return {
    historyRecords,
    nextAccounts,
    nextHistory,
    rows,
    targetAccount: selectedAccount
  };
};

export const createFlashNoteWritePlanForAppData = ({
  appData,
  cells,
  createHistoryRecord,
  inputMode,
  selectedAccount,
  trackDates,
  writeTime
}: {
  appData: AppData;
  cells: Record<string, FlashCell>;
  createHistoryRecord: (input: FlashHistoryRecordInput) => HistoryRecord;
  inputMode: FlashInputMode;
  selectedAccount: AccountPointer;
  trackDates: string[];
  writeTime?: Date;
}): FlashNoteWritePlan | null => {
  if (!selectedAccount) {
    return null;
  }

  const account = appData.accounts.find(
    (currentAccount) =>
      currentAccount.id === selectedAccount.accountId && !currentAccount.archived
  );

  if (!account) {
    return null;
  }

  const group = appData.groups.find((currentGroup) => currentGroup.id === account.groupId);

  if (!group) {
    return null;
  }

  return createFlashNoteWritePlan({
    account,
    accounts: appData.accounts,
    cells,
    createHistoryRecord,
    groupName: group.name,
    groups: appData.groups,
    history: appData.history,
    inputMode,
    selectedAccount: {
      accountId: account.id,
      groupId: account.groupId,
      groupName: group.name
    },
    sortedHistory: [...appData.history].sort(compareHistoryByTimeDesc),
    trackDates,
    writeTime
  });
};
