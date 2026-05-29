export type Account = {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
  alias?: string;
  archived?: boolean;
  archivedAt?: string;
};

export type AccountTypeNature = 'asset' | 'receivable' | 'liability';

export type AssetGroup = {
  name: string;
  nature: AccountTypeNature;
  includeInStats: boolean;
  sortOrder: number;
  accounts: Account[];
};

export type HistoryType = '新增' | '删除' | '修改' | '归档' | '重新启用';

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
  history: HistoryRecord[];
};

export type AccountPointer = {
  groupName: string;
  accountId: string;
} | null;

export type ArchivedAccountEntry = Account & {
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

export type AutoBackupSettings = {
  enabled: boolean;
  cycle: BackupCycle;
  directory: string;
};
