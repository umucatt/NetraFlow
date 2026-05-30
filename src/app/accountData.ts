import { getLegacyNature, toStoredAmountByNature } from './accountNature';
import { compareHistoryByTimeDesc } from './dateUtils';
import { createStableAccountId, createStableGroupId } from './ids';
import type {
  Account,
  AccountTypeNature,
  AppData,
  ArchivedAccountEntry,
  AssetGroup,
  AssetGroupWithAccounts,
  HistoryRecord
} from './types';

export const INITIAL_ACCOUNT_TIME = '2024-01-01T00:00:00.000Z';

export type NormalizedAccountData = {
  groups: AssetGroup[];
  accounts: Account[];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getStringField = (value: Record<string, unknown>, fieldNames: string[]) => {
  for (const fieldName of fieldNames) {
    const fieldValue = value[fieldName];

    if (typeof fieldValue === 'string' && fieldValue.trim()) {
      return fieldValue.trim();
    }
  }

  return undefined;
};

const getNumberField = (value: Record<string, unknown>, fieldNames: string[]) => {
  for (const fieldName of fieldNames) {
    const fieldValue = value[fieldName];

    if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) {
      return fieldValue;
    }
  }

  return undefined;
};

const getBooleanField = (value: Record<string, unknown>, fieldNames: string[]) => {
  for (const fieldName of fieldNames) {
    const fieldValue = value[fieldName];

    if (typeof fieldValue === 'boolean') {
      return fieldValue;
    }
  }

  return undefined;
};

export const isAccountTypeNature = (value: unknown): value is AccountTypeNature =>
  value === 'asset' || value === 'receivable' || value === 'liability';

export const normalizeGroupNature = (value: unknown, groupName: string): AccountTypeNature =>
  isAccountTypeNature(value) ? value : getLegacyNature(groupName);

const createUniqueImportedGroupId = (
  group: Record<string, unknown>,
  existingGroupIds: Set<string>
) => {
  const existingId = getStringField(group, ['id', 'groupId']);

  if (existingId) {
    existingGroupIds.add(existingId);
    return existingId;
  }

  const generatedId = createStableGroupId(existingGroupIds);
  existingGroupIds.add(generatedId);
  return generatedId;
};

const createUniqueImportedAccountId = (
  account: Record<string, unknown>,
  existingAccountIds: Set<string>
) => {
  const existingId = getStringField(account, ['id', 'accountId']);

  if (existingId) {
    existingAccountIds.add(existingId);
    return existingId;
  }

  const generatedId = createStableAccountId(existingAccountIds);
  existingAccountIds.add(generatedId);
  return generatedId;
};

const normalizeAccountForGroup = (
  account: Record<string, unknown>,
  group: AssetGroup,
  existingAccountIds: Set<string>,
  options: { archivedFallback?: boolean; amountByNature?: boolean } = {}
): Account | null => {
  const accountName = getStringField(account, ['name', 'accountName', 'title']) ?? '';
  const accountAmount = getNumberField(account, ['amount', 'balance', 'value']);

  if (!accountName || typeof accountAmount !== 'number' || !Number.isFinite(accountAmount)) {
    return null;
  }

  const amount =
    options.amountByNature === false
      ? accountAmount
      : toStoredAmountByNature(group.nature, accountAmount);

  return {
    ...account,
    id: createUniqueImportedAccountId(account, existingAccountIds),
    groupId: group.id,
    name: accountName,
    amount,
    createdAt: getStringField(account, ['createdAt', 'createdTime', 'time']) ?? INITIAL_ACCOUNT_TIME,
    alias: getStringField(account, ['alias', 'abbreviation']),
    archived: getBooleanField(account, ['archived']) ?? options.archivedFallback ?? false,
    archivedAt:
      getStringField(account, ['archivedAt']) ??
      (options.archivedFallback ? INITIAL_ACCOUNT_TIME : undefined)
  };
};

const normalizeArchivedAccountWithMissingGroup = (
  account: Record<string, unknown>,
  groupId: string,
  existingAccountIds: Set<string>
): Account | null => {
  const accountName = getStringField(account, ['name', 'accountName', 'title']) ?? '';
  const accountAmount = getNumberField(account, ['amount', 'balance', 'value']);

  if (!accountName || typeof accountAmount !== 'number' || !Number.isFinite(accountAmount)) {
    return null;
  }

  return {
    ...account,
    id: createUniqueImportedAccountId(account, existingAccountIds),
    groupId,
    name: accountName,
    amount: accountAmount,
    createdAt: getStringField(account, ['createdAt', 'createdTime', 'time']) ?? INITIAL_ACCOUNT_TIME,
    alias: getStringField(account, ['alias', 'abbreviation']),
    archived: true,
    archivedAt: getStringField(account, ['archivedAt'])
  };
};

export const normalizeGroupsAndAccounts = (
  groupsValue: unknown,
  accountsValue?: unknown
): NormalizedAccountData => {
  const rawGroups = isPlainObject(groupsValue) && Array.isArray(groupsValue.groups)
    ? groupsValue.groups
    : Array.isArray(groupsValue)
      ? groupsValue
      : [];
  const rawTopLevelAccounts =
    accountsValue !== undefined
      ? accountsValue
      : isPlainObject(groupsValue) && Array.isArray(groupsValue.accounts)
        ? groupsValue.accounts
        : undefined;
  const groupIds = new Set<string>();
  const accountIds = new Set<string>();
  const accounts: Account[] = [];
  const groups = rawGroups
    .filter(isPlainObject)
    .flatMap((group, index): AssetGroup[] => {
      const groupName = getStringField(group, ['name', 'label', 'title', 'groupName']) ?? '';

      if (!groupName) {
        return [];
      }

      const groupId = createUniqueImportedGroupId(group, groupIds);
      const nature = normalizeGroupNature(group.nature ?? getStringField(group, ['kind']), groupName);
      const sortOrder =
        typeof group.sortOrder === 'number' && Number.isFinite(group.sortOrder)
          ? group.sortOrder
          : index;
      const normalizedGroup: AssetGroup = {
        id: groupId,
        name: groupName,
        nature,
        includeInStats:
          typeof group.includeInStats === 'boolean' ? group.includeInStats : true,
        sortOrder
      };

      if (Array.isArray(group.accounts)) {
        group.accounts.filter(isPlainObject).forEach((account) => {
          const normalizedAccount = normalizeAccountForGroup(account, normalizedGroup, accountIds);

          if (normalizedAccount) {
            accounts.push(normalizedAccount);
          }
        });
      }

      return [normalizedGroup];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((group, index) => ({ ...group, sortOrder: index }));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const firstGroup = groups[0];

  if (Array.isArray(rawTopLevelAccounts)) {
    rawTopLevelAccounts.filter(isPlainObject).forEach((account) => {
      const rawGroupId = getStringField(account, ['groupId']);
      const matchedGroupById = rawGroupId ? groupById.get(rawGroupId) : undefined;
      const isArchived = getBooleanField(account, ['archived']) === true;

      if (rawGroupId && !matchedGroupById && isArchived) {
        const normalizedAccount = normalizeArchivedAccountWithMissingGroup(
          account,
          rawGroupId,
          accountIds
        );

        if (normalizedAccount) {
          accounts.push(normalizedAccount);
        }

        return;
      }

      const rawGroupName = getStringField(account, [
        'groupName',
        'accountTypeName',
        'accountType',
        'type',
        'category'
      ]);
      const matchedGroup =
        matchedGroupById ??
        (rawGroupName ? groups.find((group) => group.name === rawGroupName) : undefined) ??
        firstGroup;

      if (!matchedGroup) {
        return;
      }

      const normalizedAccount = normalizeAccountForGroup(account, matchedGroup, accountIds, {
        amountByNature: rawGroupId ? false : true
      });

      if (normalizedAccount) {
        accounts.push(normalizedAccount);
      }
    });
  }

  return { groups, accounts };
};

export const deriveGroupsWithAccounts = (
  groups: AssetGroup[],
  accounts: Account[]
): AssetGroupWithAccounts[] => {
  const accountsByGroupId = new Map<string, Account[]>();

  accounts.forEach((account) => {
    const groupAccounts = accountsByGroupId.get(account.groupId) ?? [];
    groupAccounts.push(account);
    accountsByGroupId.set(account.groupId, groupAccounts);
  });

  return groups.map((group) => ({
    ...group,
    accounts: accountsByGroupId.get(group.id) ?? []
  }));
};

export const canDeleteAssetGroup = (groupId: string, accounts: Account[]) =>
  Boolean(groupId) &&
  !accounts.some((account) => account.groupId === groupId && !account.archived);

export const getArchivedAccountRestoreGroup = (
  account: Pick<Account, 'groupId'>,
  groups: AssetGroup[]
) => groups.find((group) => group.id === account.groupId) ?? null;

export const getArchivedAccountRestoreTargetGroups = (groups: AssetGroup[]) =>
  [...groups].sort((left, right) => left.sortOrder - right.sortOrder);

export const getArchivedAccountEntries = (
  groups: AssetGroupWithAccounts[],
  accounts: Account[],
  history: HistoryRecord[]
): ArchivedAccountEntry[] => {
  const latestHistoryGroupNameByAccountId = new Map<string, string>();

  [...history].sort(compareHistoryByTimeDesc).forEach((record) => {
    if (!latestHistoryGroupNameByAccountId.has(record.accountId) && record.groupName.trim()) {
      latestHistoryGroupNameByAccountId.set(record.accountId, record.groupName);
    }
  });

  const archivedAccountsWithCurrentGroup: ArchivedAccountEntry[] = groups.flatMap((group) =>
    group.accounts
      .filter((account) => account.archived)
      .map((account) => ({ ...account, groupName: group.name }))
  );
  const archivedAccountIdsWithCurrentGroup = new Set(
    archivedAccountsWithCurrentGroup.map((account) => account.id)
  );

  return [
    ...archivedAccountsWithCurrentGroup,
    ...accounts
      .filter((account) => account.archived && !archivedAccountIdsWithCurrentGroup.has(account.id))
      .map((account) => ({
        ...account,
        groupName: latestHistoryGroupNameByAccountId.get(account.id) ?? ''
      }))
  ];
};

export const restoreArchivedAccountToGroup = (
  appData: AppData,
  accountId: string,
  targetGroupId: string,
  restoredAt: string,
  historyRecordId: string
): AppData | null => {
  const account = appData.accounts.find(
    (currentAccount) => currentAccount.id === accountId && currentAccount.archived
  );
  const targetGroup = appData.groups.find((group) => group.id === targetGroupId);

  if (!account || !targetGroup) {
    return null;
  }

  const restoreRecord: HistoryRecord = {
    id: historyRecordId,
    accountId: account.id,
    type: '\u91cd\u65b0\u542f\u7528',
    groupName: targetGroup.name,
    accountName: account.name,
    beforeAmount: account.amount,
    afterAmount: account.amount,
    time: restoredAt
  };

  return {
    groups: appData.groups,
    accounts: appData.accounts.map((currentAccount) =>
      currentAccount.id === account.id
        ? {
            ...currentAccount,
            groupId: targetGroup.id,
            archived: false,
            archivedAt: undefined
          }
        : currentAccount
    ),
    history: [restoreRecord, ...appData.history]
  };
};

export const deleteAssetGroupFromAppData = (appData: AppData, groupId: string): AppData => {
  if (!canDeleteAssetGroup(groupId, appData.accounts)) {
    return appData;
  }

  const nextGroups = appData.groups.filter((group) => group.id !== groupId);

  if (nextGroups.length === appData.groups.length) {
    return appData;
  }

  return {
    groups: nextGroups,
    accounts: appData.accounts,
    history: appData.history
  };
};

export const cloneAppData = ({ groups, accounts, history }: AppData): AppData => ({
  groups: groups.map((group) => ({ ...group })),
  accounts: accounts.map((account) => ({ ...account })),
  history: history.map((record) => ({ ...record }))
});

export const stripRuntimeAccountsFromGroups = (groups: AssetGroup[]): AssetGroup[] =>
  groups.map(({ id, name, nature, includeInStats, sortOrder }) => ({
    id,
    name,
    nature,
    includeInStats,
    sortOrder
  }));

export const hasPersistedGroupAccounts = (groups: AssetGroup[]) =>
  groups.some((group) => 'accounts' in group);

export const normalizeAppData = (
  groupsValue: unknown,
  accountsValue: unknown,
  history: HistoryRecord[]
): AppData => {
  const accountData = normalizeGroupsAndAccounts(groupsValue, accountsValue);

  return {
    ...accountData,
    history
  };
};
