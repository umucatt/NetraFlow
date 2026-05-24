export type AccountTypeNature = 'asset' | 'receivable' | 'liability';

export type Account = {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
  alias?: string;
  archived?: boolean;
  archivedAt?: string;
};

export type AssetGroup = {
  name: string;
  nature: AccountTypeNature;
  includeInStats: boolean;
  sortOrder: number;
  accounts: Account[];
};

export type HistoryType = '新增' | '删除' | '修改' | '归档' | '重新启用';

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

export type BackupMethod = 'manual' | 'auto';

export type BackupRecord = {
  id: string;
  backedUpAt: string;
  historyCount: number;
  incrementCount: number;
  method: BackupMethod;
};

export type SettingsSearchItem = {
  id: string;
  title: string;
  group: string;
  description: string;
  section: string;
  blockId?: string;
  keywords?: string[];
  pinyinKeywords?: string[];
  pinyinInitials?: string[];
};

export type SearchDefaultResultCategory = 'account' | 'history' | 'snapshot';
export type SearchResultCategory = SearchDefaultResultCategory | 'settings';
export type SearchCategory = 'all' | SearchResultCategory;
export type SearchResultStrength = 'strong' | 'medium' | 'weak';
export type SearchHighlightStrength = 'strong' | 'medium' | 'weak';
export type SearchHighlightRange = {
  start: number;
  end: number;
  strength: SearchHighlightStrength;
};
export type SearchDisplayField = 'title' | 'subtitle' | 'value';
export type SearchResultHighlights = Record<SearchDisplayField, SearchHighlightRange[]>;
export type SearchLogicMode = 'strict' | 'infer';
export type SearchMatchLabel = 'hit' | 'inferred';
export type SearchMatchKind =
  | 'exact'
  | 'prefix'
  | 'contains'
  | 'ordered'
  | 'word-all'
  | 'amount-exact'
  | 'amount-absolute'
  | 'amount-near'
  | 'date-day'
  | 'date-compact-day'
  | 'date-month-day'
  | 'date-month'
  | 'date-year'
  | 'pinyin-full'
  | 'pinyin-initials'
  | 'partial-text'
  | 'typo';

export type SearchNavigationTarget =
  | {
      category: 'account';
      key: string;
      groupName: string;
      accountId: string;
      isWeakRelated?: boolean;
    }
  | {
      category: 'history';
      key: string;
      recordId: string;
      isWeakRelated?: boolean;
    }
  | {
      category: 'snapshot';
      key: string;
      recordId: string;
      isWeakRelated?: boolean;
    }
  | {
      category: 'settings';
      key: string;
      settingsId: string;
      settingsSection: string;
      blockId?: string;
      isWeakRelated?: boolean;
    };

export type SearchNavigationTargetInput =
  | {
      category: 'account';
      groupName: string;
      accountId: string;
      isWeakRelated?: boolean;
    }
  | {
      category: 'history';
      recordId: string;
      isWeakRelated?: boolean;
    }
  | {
      category: 'snapshot';
      recordId: string;
      isWeakRelated?: boolean;
    }
  | {
      category: 'settings';
      settingsId: string;
      settingsSection: string;
      blockId?: string;
      isWeakRelated?: boolean;
    };

export type SearchKeyboardEntry =
  {
    id: string;
    kind: 'result';
    target: SearchNavigationTarget;
  };

export type SearchDateTarget = {
  kind: 'day' | 'month-day' | 'year' | 'month';
  score: number;
  compact?: string;
  shortCompact?: string;
  monthDay?: string;
  year?: string;
  month?: string;
  yearMonth?: string;
  dayTimestamp?: number;
  canonical?: string;
};

export type SearchTerm = {
  raw: string;
  normalized: string;
  compact: string;
  isPureLetters: boolean;
  isPureNumeric: boolean;
  hasChinese: boolean;
  isNumericIntent: boolean;
  isDateOnlyNumericIntent: boolean;
  amountValue: number | null;
  amountSign: 1 | -1 | null;
  dateTargets: SearchDateTarget[];
};

export type SearchIntent = {
  query: string;
  terms: SearchTerm[];
};

export type SearchTextFieldRole = 'name' | 'detail' | 'weak';

export type NormalizedTextIndex = {
  original: string;
  normalized: string;
  compact: string;
  normalizedToOriginal: number[];
  compactToOriginal: number[];
};

export type SearchTextField = {
  value: string | null | undefined;
  role?: SearchTextFieldRole;
  weight?: number;
  inferredKind?: 'pinyin-full' | 'pinyin-initials';
};

export type SearchIndexedTextField = SearchTextField & {
  index: NormalizedTextIndex;
  pinyin: {
    full: string;
    initials: string;
  };
};

export type SearchDateField = {
  value: string | null | undefined;
  weight?: number;
};

export type SearchAmountFieldRole =
  | 'account-balance'
  | 'history-balance'
  | 'history-delta'
  | 'snapshot-count';

export type SearchAmountMatchField =
  | 'accountBalance'
  | 'delta'
  | 'balanceBefore'
  | 'balanceAfter'
  | 'historyCount'
  | 'incrementCount';

export type SearchAmountDisplayMode = 'delta' | 'balance' | 'balance-range';

export type SearchAmountField = {
  value: number | null | undefined;
  weight?: number;
  role?: SearchAmountFieldRole;
  matchField?: SearchAmountMatchField;
};

export type SearchCandidate = {
  textFields: SearchIndexedTextField[];
  dateFields?: SearchDateField[];
  amountFields?: SearchAmountField[];
  recencyDate?: string | null | undefined;
};

export type SearchTermMatch = {
  score: number;
  baseScore: number;
  fieldWeight: number;
  fuzzyPenalty: number;
  positionBonus: number;
  highlightStrength: SearchHighlightStrength;
  label: SearchMatchLabel;
  kind: SearchMatchKind;
  source: 'text' | 'pinyin' | 'date' | 'amount';
  role?: SearchTextFieldRole;
  highlightText?: string;
  highlightRanges: SearchHighlightRange[];
  amountField?: SearchAmountMatchField;
  amountValue?: number;
  amountRole?: SearchAmountFieldRole;
};

export type SearchPrimaryMatchField =
  | 'title'
  | 'subtitle'
  | 'value'
  | 'date'
  | 'accountBalance'
  | 'delta'
  | 'balanceBefore'
  | 'balanceAfter'
  | 'historyCount'
  | 'incrementCount';

export type SearchPrimaryMatch = {
  field: SearchPrimaryMatchField;
  label: SearchMatchLabel;
  value: string | number;
  displayText: string;
};

export type SearchMatchedAmount = {
  field: Extract<
    SearchAmountMatchField,
    'accountBalance' | 'delta' | 'balanceBefore' | 'balanceAfter' | 'historyCount' | 'incrementCount'
  >;
  value: number;
  label: SearchMatchLabel;
  displayMode: SearchAmountDisplayMode;
  displayText: string;
};

export type BaseSearchResult = {
  id: string;
  category: SearchResultCategory;
  target: SearchNavigationTarget;
  title: string;
  subtitle: string;
  value: string;
  score: number;
  matchedTermCount: number;
  matchLabel: SearchMatchLabel;
  matchKind: SearchMatchKind;
  highlights: SearchResultHighlights;
  primaryMatch: SearchPrimaryMatch;
  matchedAmount?: SearchMatchedAmount;
  isWeakRelated: boolean;
  strength: SearchResultStrength;
  index: number;
};

export type AccountSearchResult = BaseSearchResult & {
  category: 'account';
  group: AssetGroup;
  account: Account;
  mark: string;
};

export type HistorySearchResult = BaseSearchResult & {
  category: 'history';
  record: HistoryRecord;
  icon: 'history';
};

export type SnapshotSearchResult = BaseSearchResult & {
  category: 'snapshot';
  record: BackupRecord;
  icon: 'snapshot';
};

export type SettingsSearchResult = BaseSearchResult & {
  category: 'settings';
  item: SettingsSearchItem;
  icon: 'settings';
};

export type GlobalSearchResult =
  | AccountSearchResult
  | HistorySearchResult
  | SnapshotSearchResult
  | SettingsSearchResult;

export type SearchCategoryCounts = Record<SearchCategory, number>;
export type SearchCategoryScoreMap = Record<SearchResultCategory, number>;

export type SearchIndexedData = {
  accounts: Array<{
    group: AssetGroup;
    account: Account;
    candidate: SearchCandidate;
    title: string;
    subtitle: string;
    value: string;
    mark: string;
    index: number;
  }>;
  history: Array<{
    record: HistoryRecord;
    candidate: SearchCandidate;
    title: string;
    subtitle: string;
    value: string;
    amountDisplay: {
      delta: string;
      balanceBefore: string;
      balanceAfter: string;
      balanceRange: string;
    };
    index: number;
  }>;
  snapshots: Array<{
    record: BackupRecord;
    candidate: SearchCandidate;
    title: string;
    subtitle: string;
    value: string;
    index: number;
  }>;
  settings: Array<{
    item: SettingsSearchItem;
    candidate: SearchCandidate;
    title: string;
    subtitle: string;
    value: string;
    index: number;
  }>;
  totals: Record<SearchResultCategory, number>;
};

export type GlobalSearchOutput = {
  intent: SearchIntent;
  query: string;
  hasQuery: boolean;
  searchLogicMode: SearchLogicMode;
  allResults: GlobalSearchResult[];
  accountResults: AccountSearchResult[];
  historyResults: HistorySearchResult[];
  snapshotResults: SnapshotSearchResult[];
  settingsResults: SettingsSearchResult[];
  resultsByCategory: Record<SearchResultCategory, GlobalSearchResult[]>;
  counts: SearchCategoryCounts;
  topScores: SearchCategoryScoreMap;
  bestCategory: SearchResultCategory | null;
  focusTarget: SearchNavigationTarget | null;
  weakMode: boolean;
  sortedResultIds: Record<SearchCategory, string[]>;
  strongNavigationTargets: SearchNavigationTarget[];
};

export type CreateSearchIndexOptions = {
  getAccountNatureLabel: (nature: AccountTypeNature) => string;
  getHistoryTypeLabel: (type: HistoryType) => string;
  getBackupMethodLabel: (method: BackupMethod) => string;
  getAccountMark: (account: Account) => string;
  getHistoryChangeLabel: (record: HistoryRecord) => string;
  formatMoney: (amount: number | null) => string;
  formatShortTime: (time: string) => string;
  formatPreciseBackupTime: (time: string) => string;
  settingsItems?: SettingsSearchItem[];
};

export type RunSearchOptions = {
  selectedCategory?: SearchCategory;
  searchLogicMode?: SearchLogicMode;
};

export const SEARCH_CATEGORY_TABS: SearchCategory[] = [
  'all',
  'account',
  'history',
  'snapshot',
  'settings'
];

export const SEARCH_RESULT_CATEGORIES: SearchDefaultResultCategory[] = [
  'account',
  'history',
  'snapshot'
];

export const SEARCH_FILTERABLE_RESULT_CATEGORIES: SearchResultCategory[] = [
  ...SEARCH_RESULT_CATEGORIES,
  'settings'
];

export const SEARCH_CATEGORY_LABELS: Record<SearchCategory, string> = {
  all: '全部',
  account: '账户',
  history: '历史记录',
  snapshot: '快照',
  settings: '设置项'
};

export const SEARCH_STABLE_SORT_DELTA = 4;
