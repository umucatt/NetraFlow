import { toStoredAmountByNature } from '../../app/accountNature';
import { compareHistoryByTimeDesc } from '../../app/dateUtils';
import type { Account, AppData, HistoryRecord } from '../../app/types';
import { roundToMoneyPrecision } from '../../money';
import type {
  RollupAccountAssignment,
  RollupImportRecord,
  RollupImportReview
} from '../../rollupImportLogic';
import type { RollupHistoryRecordInput } from './rollupImportTypes';

type RollupRecordWithAccount = {
  account: Account;
  groupId: string;
  groupName: string;
  record: RollupImportRecord;
};

export type RollupImportWritePlan = {
  historyRecords: HistoryRecord[];
  nextAccounts: Account[];
  nextHistory: HistoryRecord[];
};

const findRollupAccountInAppData = (appData: AppData, accountId: string) => {
  const account = appData.accounts.find((currentAccount) => currentAccount.id === accountId);

  if (!account || account.archived) {
    return null;
  }

  const group = appData.groups.find((currentGroup) => currentGroup.id === account.groupId);

  if (!group) {
    return null;
  }

  return { account, group };
};

export const createRollupImportWritePlan = ({
  appData,
  accountAssignments,
  createHistoryRecord,
  importReview
}: {
  appData: AppData;
  accountAssignments: Record<string, RollupAccountAssignment | null>;
  createHistoryRecord: (input: RollupHistoryRecordInput) => HistoryRecord;
  importReview: RollupImportReview;
}): RollupImportWritePlan | null => {
  const runningAmounts = new Map<string, number>();
  const finalAmounts = new Map<string, number>();
  const recordsWithAccounts = importReview.records
    .map((record): RollupRecordWithAccount | null => {
      const assignment = accountAssignments[record.accountKeyword];

      if (!assignment) {
        return null;
      }

      const match = findRollupAccountInAppData(appData, assignment.accountId);

      if (!match) {
        return null;
      }

      return {
        record,
        groupId: match.group.id,
        groupName: match.group.name,
        account: match.account
      };
    })
    .filter((item): item is RollupRecordWithAccount => Boolean(item))
    .sort(
      (left, right) =>
        left.account.id.localeCompare(right.account.id) ||
        left.record.date.localeCompare(right.record.date) ||
        left.record.inputIndex - right.record.inputIndex
    );

  if (recordsWithAccounts.length !== importReview.records.length) {
    return null;
  }

  const rollupHistory = recordsWithAccounts.map((item, index) => {
    const beforeAmount = runningAmounts.get(item.account.id) ?? item.account.amount;
    const groupNature =
      appData.groups.find((group) => group.id === item.groupId)?.nature ?? 'asset';
    const afterAmount = roundToMoneyPrecision(
      item.record.mode === 'change'
        ? beforeAmount + item.record.amount
        : toStoredAmountByNature(groupNature, item.record.amount)
    );
    const recordTime = new Date(`${item.record.date}T12:00:00`);

    recordTime.setMilliseconds(index);
    runningAmounts.set(item.account.id, afterAmount);
    finalAmounts.set(item.account.id, afterAmount);

    return createHistoryRecord({
      account: item.account,
      groupName: item.groupName,
      beforeAmount,
      afterAmount,
      time: recordTime.toISOString(),
      source: 'rollup'
    });
  });

  const nextAccounts = appData.accounts.map((account) => {
    const finalAmount = finalAmounts.get(account.id);

    return typeof finalAmount === 'number' ? { ...account, amount: finalAmount } : account;
  });
  const nextHistory = [...rollupHistory, ...appData.history].sort(compareHistoryByTimeDesc);

  return {
    historyRecords: rollupHistory,
    nextAccounts,
    nextHistory
  };
};
