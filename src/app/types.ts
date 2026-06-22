export type Account = {
  id: string;
  groupId: string;
  name: string;
  amount: number;
  createdAt: string;
  alias?: string;
  archived?: boolean;
  archivedAt?: string;
};

export type AccountTypeNature = 'asset' | 'receivable' | 'liability';

export type AssetGroup = {
  id: string;
  name: string;
  nature: AccountTypeNature;
  includeInStats: boolean;
  sortOrder: number;
};

export type AssetGroupWithAccounts = AssetGroup & {
  accounts: Account[];
};

export type HistoryType = '创建' | '删除' | '修改' | '归档' | '重新启用';

export type EditMode = 'set' | 'adjust';

export type AccountOperationEntrySource = 'account-detail' | 'quick-single-entry';

export type HistoryRecord = {
  id: string;
  accountId: string;
  type: HistoryType;
  groupName: string;
  accountName: string;
  beforeAmount: number | null;
  afterAmount: number | null;
  time: string;
  relatedTime?: string;
  note?: string;
  source?: 'flash-note' | 'rollup';
};

export type AppData = {
  groups: AssetGroup[];
  accounts: Account[];
  history: HistoryRecord[];
};

export type AppDataCommitOutcome<T> =
  | {
      ok: true;
      nextData: AppData;
      value: T;
    }
  | {
      ok: false;
      error?: string;
    };

export type CommitAppDataUpdate = <T>(
  apply: (latestData: AppData) => AppDataCommitOutcome<T>
) => AppDataCommitOutcome<T>;

export type AccountPointer = {
  groupId: string;
  accountId: string;
  groupName?: string;
} | null;

export type ArchivedAccountEntry = Account & {
  groupId: string;
  groupName: string;
};

export type BackupCycleUnit = 'day' | 'week' | 'month';

export type BackupCycle = {
  value: number;
  unit: BackupCycleUnit;
};

export type BackupMethod = 'manual' | 'auto';

export type BackupRecord = {
  id: string;
  backedUpAt: string;
  historyCount: number;
  incrementCount: number;
  method: BackupMethod;
};

export type SnapshotImportRecord = {
  id: string;
  importedAt: string;
  snapshotCreatedAt: string | null;
  historyRecordCount: number;
  changedHistoryRecordCount: number;
};

export type AutoBackupSettings = {
  enabled: boolean;
  cycle: BackupCycle;
  directory: string;
};
