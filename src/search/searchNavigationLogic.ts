import type {
  Account,
  AssetGroupWithAccounts,
  BackupRecord,
  HistoryRecord,
  SearchNavigationTarget,
  SettingsSearchItem
} from './searchTypes';

type AccountSearchNavigationTarget = Extract<SearchNavigationTarget, { category: 'account' }>;
type HistorySearchNavigationTarget = Extract<SearchNavigationTarget, { category: 'history' }>;
type SnapshotSearchNavigationTarget = Extract<SearchNavigationTarget, { category: 'snapshot' }>;
type SettingsSearchNavigationTarget = Extract<SearchNavigationTarget, { category: 'settings' }>;

export type SearchNavigationIntent<TSettingsSection extends string = string> =
  | {
      type: 'account';
      target: AccountSearchNavigationTarget;
      group: AssetGroupWithAccounts;
      account: Account;
    }
  | {
      type: 'history';
      target: HistorySearchNavigationTarget;
      record: HistoryRecord;
      group: AssetGroupWithAccounts;
      account: Account;
      recordDate: string;
    }
  | {
      type: 'snapshot';
      target: SnapshotSearchNavigationTarget;
      record: BackupRecord;
    }
  | {
      type: 'settings';
      target: SettingsSearchNavigationTarget;
      item: SettingsSearchItem;
      section: TSettingsSection;
      blockId?: string;
    }
  | {
      type: 'none';
      target: SearchNavigationTarget;
      reason: 'not-found';
    };

export type ResolveSearchNavigationTargetOptions<TSettingsSection extends string = string> = {
  groups: AssetGroupWithAccounts[];
  historyRecords: HistoryRecord[];
  backupRecords: BackupRecord[];
  settingsItems: SettingsSearchItem[];
  defaultSettingsSection: TSettingsSection;
  isSettingsSection: (value: string) => value is TSettingsSection;
  getHistoryRecordDate: (record: HistoryRecord) => string;
};

export const getSearchNavigationTargetsForResult = (
  target: SearchNavigationTarget,
  strongTargets: SearchNavigationTarget[]
) =>
  strongTargets.some((currentTarget) => currentTarget.key === target.key)
    ? strongTargets
    : [target];

const findAccountTarget = (
  groups: AssetGroupWithAccounts[],
  target: AccountSearchNavigationTarget
) => {
  const group = groups.find((currentGroup) => currentGroup.id === target.groupId);
  const account = group?.accounts.find((currentAccount) => currentAccount.id === target.accountId);

  return group && account ? { group, account } : null;
};

const findHistoryAccountTarget = (
  groups: AssetGroupWithAccounts[],
  record: HistoryRecord
) => {
  const group =
    groups.find((currentGroup) =>
      currentGroup.accounts.some((account) => account.id === record.accountId)
    ) ?? groups.find((currentGroup) => currentGroup.name === record.groupName);
  const account = group?.accounts.find((currentAccount) => currentAccount.id === record.accountId);

  return group && account ? { group, account } : null;
};

export const resolveSearchNavigationTarget = <TSettingsSection extends string = string>(
  target: SearchNavigationTarget,
  options: ResolveSearchNavigationTargetOptions<TSettingsSection>
): SearchNavigationIntent<TSettingsSection> => {
  if (target.category === 'account') {
    const accountTarget = findAccountTarget(options.groups, target);

    return accountTarget
      ? {
          type: 'account',
          target,
          group: accountTarget.group,
          account: accountTarget.account
        }
      : { type: 'none', target, reason: 'not-found' };
  }

  if (target.category === 'history') {
    const record =
      options.historyRecords.find((currentRecord) => currentRecord.id === target.recordId) ?? null;
    const accountTarget = record ? findHistoryAccountTarget(options.groups, record) : null;

    return record && accountTarget
      ? {
          type: 'history',
          target,
          record,
          group: accountTarget.group,
          account: accountTarget.account,
          recordDate: options.getHistoryRecordDate(record)
        }
      : { type: 'none', target, reason: 'not-found' };
  }

  if (target.category === 'snapshot') {
    const record =
      options.backupRecords.find((currentRecord) => currentRecord.id === target.recordId) ?? null;

    return record
      ? {
          type: 'snapshot',
          target,
          record
        }
      : { type: 'none', target, reason: 'not-found' };
  }

  const item =
    options.settingsItems.find((currentItem) => currentItem.id === target.settingsId) ?? null;

  if (!item) {
    return { type: 'none', target, reason: 'not-found' };
  }

  const section = options.isSettingsSection(item.section)
    ? item.section
    : options.isSettingsSection(target.settingsSection)
      ? target.settingsSection
      : options.defaultSettingsSection;

  return {
    type: 'settings',
    target,
    item,
    section,
    blockId: target.blockId
  };
};
