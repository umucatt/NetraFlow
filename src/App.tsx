import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react';

import packageInfo from '../package.json';

import {
  NfFlashnoteSourceIcon,
  NfRollupSourceWideIcon,
  NfSortIcon,
  NfWindowCloseIcon,
  NfWindowMaximizeIcon,
  NfWindowMinimizeIcon,
  NfWindowRestoreIcon
} from './assets/icons';

import AccountMark from './components/AccountMark';
import NfSvgIcon from './components/NfSvgIcon';
import { ConfirmDialog, InputDialog, NoticeDialog } from './components/dialogs';
import { RightPanelActionButton, RightPanelSection } from './components/rightPanel';
import GlobalSearchPanel from './components/search/GlobalSearchPanel';
import SearchFloatingNavigator from './components/search/SearchFloatingNavigator';
import SearchPreviewPanel from './components/search/SearchPreviewPanel';

import {
  AccountActionsPanel,
  AccountAmountEditorDialog,
  AccountChartSettingsPanel,
  AccountCreateDialog,
  AccountDangerActionsPanel,
  AccountDetailPanel,
  AccountHistoryList,
  AccountInfoEditorDialog,
  AccountRestoreDialog
} from './features/account';
import {
  AssetAllocationPanel,
  AssetChartsPanel,
  AssetStructureGraphic,
  AssetTrendChart,
  AssetTrendPanel,
  CHART_COLORS,
  ChartLegendList,
  ChartSettingsPanel,
  PieSegments,
  getInteractiveChartClassName
} from './features/charts';
import { FlashNotePage } from './features/flashNote/FlashNotePage';
import {
  BackupRecordList,
  HistoryCalendarPanel,
  HistoryFilterToolbar,
  HistoryPanel,
  HistoryRecordList
} from './features/history';
import { QuickEntryAccountPicker, QuickEntryPanel } from './features/quickEntry';
import {
  RollupImportDropzone,
  RollupImportPage,
  RollupReviewActionsPanel
} from './features/rollupImport';
import {
  AboutNetraFlowPanel,
  AppearanceSettingsPanel,
  BackupSettingsPanel,
  PasswordEditorDialog,
  SearchSettingsPanel,
  SnapshotEncryptionDisableDialog,
  SnapshotPasswordEditorDialog
} from './features/settings';

import {
  ACCOUNT_MARK_MAX_CHARS,
  getAccountDisplayMark,
  limitAccountAliasInput
} from './accountMark';
import {
  getAccountOperationCalendarMonth,
  getAccountOperationTodayDateValue,
  isFutureAccountOperationDateValue,
  parseAccountOperationDateInput,
  resolveProtectedAccountOperationDateInputState,
  shiftAccountOperationCalendarMonth,
  toAccountOperationDateValue,
  toAccountOperationIsoTime
} from './accountOperationDate';
import {
  buildDisplayChartItems,
  buildSteppedStackLayers,
  cloneCategoryChartSettings,
  createSteppedAreaPath,
  getArchivedChartTooltipLabel,
  getChartAxisLabelIndexes,
  getChartRangeDateKeys,
  getChartValueLabelIndexes,
  getChartValueLabelLayout,
  getEffectiveAccountChartSettings,
  getEffectiveCategoryChartSettings,
  getNearestChangeDatePointIndex,
  getZeroAnchoredStackedYAxisScale,
  isChartColorAssignmentMode,
  isChartXAxisRange,
  normalizeChartPointValueMode,
  normalizeGlobalChartControlMode,
  syncCategoryChartSettingsFromGlobal
} from './chartLogic';
import { EXAMPLE_TEMPLATES, createExampleData } from './exampleData';
import {
  appendFlashInputCharacter,
  backspaceFlashInputValue,
  getContinuousFlashDates,
  getFlashDirectionFromDates,
  getFlashWeeksAround,
  getFlashWeeksForDates
} from './features/flashNote/flashNoteUtils';
import { useFlashKeyboardInput } from './features/flashNote/useFlashKeyboardInput';
import {
  DEFAULT_HOME_ASSET_STAT_SETTINGS,
  isHomeAssetStatLabelMode,
  isHomeAssetStatMetric,
  resolveHomeAssetStatLabel,
  resolveHomeAssetStatValue
} from './homeAssetStats';
import {
  formatCurrencyMoneyValue,
  formatHomeMoney,
  formatMoneyInputValue,
  formatMoneyValue,
  isMoneyInput,
  normalizeMoneyInput,
  parseMoneyInput,
  roundToMoneyPrecision
} from './money';
import { ROLLUP_IMPORT_EXPLANATION, ROLLUP_IMPORT_PROMPT } from './rollupImportContent';
import {
  areAllRollupGroupsAssigned,
  getRollupAccountGroupKeys,
  parseRollupImportJson
} from './rollupImportLogic';
import { createGlobalSearchIndex, runGlobalSearch } from './search/searchEngine';
import {
  getNextSearchNavigationTarget,
  getSearchNavigationCycle,
  getSearchResultItemId,
  getSearchResultsForCategory,
  SEARCH_SCROLL_BLOCK
} from './search/searchNavigation';
import {
  createInitialSearchState,
  getSearchEscapeAction,
  searchStateReducer
} from './search/searchState';
import { createPasswordHash, isPasswordHash, verifyPassword } from './security/passwordHash';
import {
  SNAPSHOT_DECRYPTION_ERROR_MESSAGE,
  decryptSnapshotPayload,
  encryptSnapshotPayload,
  isEncryptedSnapshotFile
} from './security/snapshotCrypto';

import type { RightPanelActionButtonProps } from './components/rightPanel';
import type { ChartLegendItemData, TotalAssetChartSettings } from './features/charts';
import type {
  FlashCell,
  FlashDateRule,
  FlashDirection,
  FlashInputMode,
  FlashSelectionMode,
  FlashStep,
  FlashWriteRow
} from './features/flashNote/flashNoteTypes';
import type { QuickEntryAccountGroup } from './features/quickEntry';
import type {
  BasicAccountChartSettings,
  BasicCategoryChartSettings,
  ChartColorAssignmentMode as NetraflowChartColorAssignmentMode,
  ChartColorItem,
  ChartPointKind,
  ChartPointValueMode,
  ChartXAxisRange,
  GlobalChartControlMode
} from './chartLogic';
import type { ExampleTemplateId } from './exampleData';
import type { HomeAssetStatLabelMode, HomeAssetStatMetric } from './homeAssetStats';
import type {
  RollupAccountAssignment,
  RollupImportRecord,
  RollupImportReview,
  RollupRiskLevel
} from './rollupImportLogic';
import type {
  GlobalSearchResult,
  SearchLogicMode,
  SearchNavigationTarget,
  SettingsSearchItem
} from './search/searchTypes';
import type { PasswordHash } from './security/passwordHash';

type Account = {

  id: string;

  name: string;

  amount: number;

  createdAt: string;

  alias?: string;

  archived?: boolean;

  archivedAt?: string;

};



type AccountTypeNature = 'asset' | 'receivable' | 'liability';



type AssetGroup = {

  name: string;

  nature: AccountTypeNature;

  includeInStats: boolean;

  sortOrder: number;

  accounts: Account[];

};



type HistoryType = '新增' | '删除' | '修改' | '归档' | '重新启用';

type EditMode = 'set' | 'adjust';

type AccountOperationEntrySource = 'account-detail' | 'quick-single-entry';



type HistoryRecord = {

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



type AppData = {

  groups: AssetGroup[];

  history: HistoryRecord[];

};



type FlashNoteStage =
  | FlashStep
  | 'date-select'
  | 'mode-select'
  | 'sequence-input'
  | 'correction';

type FlashNoteInputMode = FlashInputMode;

type RollupPromptTab = 'explanation' | 'prompt';

type FlashNoteDirection = FlashDirection;

type FlashNoteDateRule = FlashDateRule;

type FlashNoteSelectionMode = FlashSelectionMode;



type FlashNoteCell = FlashCell;



type FlashNoteStashItem = {

  date: string;

  value: string;

};



type FlashNoteStashSegment = {

  id: string;

  items: FlashNoteStashItem[];

};



type FlashNoteContextMenu =

  | {

      kind: 'block';

      x: number;

      y: number;

      date: string;

    }

  | {

      kind: 'place';

      x: number;

      y: number;

      date: string;

    }

  | null;



type FlashNoteWriteRow = FlashWriteRow;



type FlashCorrectionEntrySnapshot = {

  cells: Record<string, FlashNoteCell>;

  inputCursor: number;

  currentInput: string;

  rangeStart: string;

  rangeEnd: string;

};



type HistoryChangeKind = 'increase' | 'decrease' | 'neutral';



type HistoryChangeDisplay = {

  label: string;

  color: string;

  background: string;

  kind: HistoryChangeKind;

};



type HistoryTone = {

  background: string;

  border: string;

  emphasisBorder: string;

  divider: string;

  nestedBackground: string;

  text: string;

  labelBackground: string;

};



type AdjustDirection = 'increase' | 'decrease';



type AccountTypeEditorState = {

  mode: 'create' | 'edit';

  groupName?: string;

} | null;



type ConfirmationDialogState = {

  title: string;

  message: ReactNode;

  confirmLabel: string;

  cancelLabel?: string;

  eyebrow?: string | null;

  tone?: 'default' | 'danger';

  onConfirm: () => void;

  onCancel?: () => void;

} | null;



type NoticeDialogState = {

  title: string;

  message: ReactNode;

  confirmLabel?: string;

  onClose?: () => void;

} | null;



type InputDialogState = {

  title: string;

  message: ReactNode;

  label: string;

  confirmLabel: string;

  inputType?: 'text' | 'password';

  autoComplete?: string;

  onConfirm: (value: string) => void;

  onCancel: () => void;

} | null;



type AccountPointer = {

  groupName: string;

  accountId: string;

} | null;



type GroupPointerInteraction = {

  pointerId: number;

  groupName: string;

  startX: number;

  startY: number;

  moved: boolean;

  longPressTriggered: boolean;

};



type ArchivedAccountEntry = Account & {

  groupName: string;

};



type BackupCycleUnit = 'day' | 'week' | 'month';



type BackupCycle = {

  value: number;

  unit: BackupCycleUnit;

};



type BackupMethod = 'manual' | 'auto';



type BackupRecord = {

  id: string;

  backedUpAt: string;

  historyCount: number;

  incrementCount: number;

  method: BackupMethod;

};



type AutoBackupSettings = {

  enabled: boolean;

  cycle: BackupCycle;

  directory: string;

};



type StructureAssetDisplay = 'positive' | 'negative' | 'both';

type TrendAssetDisplay = 'net' | 'positive' | 'positive-negative';

type TrendXAxisRange = ChartXAxisRange;

type TrendPointValueMode = ChartPointValueMode;



type HomeThumbnailChartSettings = {

  showStructure: boolean;

  showTrend: boolean;

  xAxisRange: TrendXAxisRange;

};



type CategoryChartVisibility = {

  showStructure: boolean;

  showTrend: boolean;

};



type CategoryDetailChartSettings = BasicCategoryChartSettings & {

  xAxisRange: TrendXAxisRange;

  pointValueMode: TrendPointValueMode;

};



type AccountDetailChartSettings = BasicAccountChartSettings & {

  adaptiveYAxis: boolean;

  xAxisRange: TrendXAxisRange;

  pointValueMode: TrendPointValueMode;

};



type AssetChartSettings = {

  l0: HomeThumbnailChartSettings;

  globalChartControlMode: GlobalChartControlMode;

  structure: {

    assetDisplay: StructureAssetDisplay;

    showDebtMultiple: boolean;

  };

  trend: {

    assetDisplay: TrendAssetDisplay;

    adaptiveYAxis: boolean;

    xAxisRange: TrendXAxisRange;

    pointValueMode: TrendPointValueMode;

  };

  categoryVisibility: CategoryChartVisibility;

  globalCategoryDetail: CategoryDetailChartSettings;

  categoryDetailById: Record<string, CategoryDetailChartSettings>;

  accountDetailById: Record<string, AccountDetailChartSettings>;

};



type PositiveNegativeColorMode = 'red-positive' | 'green-positive';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeStyle = 'default' | 'nyaa';

type PagePositionMemoryMode = 'global' | 'covered-reset';

type ResolvedTheme = 'light' | 'dark';



type GlobalSettings = {

  positiveNegativeColorMode: PositiveNegativeColorMode;

  themeMode: ThemeMode;

  themeStyle: ThemeStyle;

  nyaaThemeUnlocked: boolean;

  pagePositionMemoryMode: PagePositionMemoryMode;

  searchLogicMode: SearchLogicMode;

  chartColorAssignmentMode: NetraflowChartColorAssignmentMode;

  homeAssetStatMetric: HomeAssetStatMetric;

  homeAssetStatLabelMode: HomeAssetStatLabelMode;

  homeAssetStatCompact: boolean;

  passwordProtectionEnabled: boolean;

  passwordHash: PasswordHash | null;

  autoLockMinutes: number;

  snapshotEncryptionEnabled: boolean;

  snapshotPasswordHash: PasswordHash | null;

};



type PasswordEditorMode = 'setup' | 'edit' | null;

type SnapshotPasswordEditorMode = 'setup' | 'edit' | null;



type SignedAmountCssVariables = CSSProperties & {

  '--signed-positive-color': string;

  '--signed-negative-color': string;

  '--signed-positive-background': string;

  '--signed-negative-background': string;

};



type HistoryPanelView = 'history' | 'backup';

type BackupReturnTarget = 'history' | 'global-settings-backup';

type GlobalSettingsSection =

  | 'appearance'

  | 'charts'

  | 'search'

  | 'backup'

  | 'security'

  | 'about';



type SearchNavigationSnapshot = {

  selectedAccount: AccountPointer;

  selectedGroupDetailName: string;

  isAccountChartsOpen: boolean;

  expandedGroupNames: string[];

  isTotalChartsOpen: boolean;

  isGlobalSettingsOpen: boolean;

  globalSettingsSection: GlobalSettingsSection;

  isArchivedAccountsOpen: boolean;

  isHistoryOpen: boolean;

  historyPanelView: HistoryPanelView;

  historyStartDate: string;

  historyEndDate: string;

  historyRangeInput: string;

  calendarMonth: Date;

  mainScrollTop: number;

};



type PageCoverage = 'full' | 'right-panel-only' | 'none';



type ToastTone = 'info' | 'success' | 'error';



type ToastMessage = {

  id: string;

  message: string;

  tone: ToastTone;

};



type ExampleModeRealSnapshot = {

  appData: AppData;

  backupRecords: BackupRecord[];

  lastBackupAt: string;

  lastBackupHistoryCount: number;

};



type ExampleGeneratedData = ExampleModeRealSnapshot;



type FirstWelcomeState = {

  completed: boolean;

  pendingAfterClearAll: boolean;

};



type FirstWelcomeStage = 'welcome' | 'story' | null;



type ResetAction = 'settings' | 'history' | 'all';



type ResetConfirmationState = {

  action: ResetAction;

  code: string;

} | null;



type OverlayBackdropProps = Omit<

  HTMLAttributes<HTMLDivElement>,

  'onClick'

> & {

  onBack: () => void;

};



type ChartSegment = {

  id: string;

  label: string;

  amount: number;

  color: string;

  sourceIds?: string[];

  archived?: boolean;

};



type AssetStructureChartData = {

  positiveSegments: ChartSegment[];

  negativeSegments: ChartSegment[];

  positiveTotal: number;

  negativeTotal: number;

  debtRatio: number;

};



type TrendChartPoint = {

  date: string;

  kind: ChartPointKind;

  net: number;

  positive: number;

  negative: number;

};



type TrendChartSeries = {

  key: 'net' | 'positive' | 'negative';

  label: string;

  color: string;

  values: number[];

};



type GroupDetailStructureData = {

  segments: ChartSegment[];

  total: number;

  signedTotal: number;

  nature: AccountTypeNature;

};



type GroupDetailTrendSeries = {

  id: string;

  label: string;

  color: string;

  values: number[];

  archived?: boolean;

};



type GroupDetailTrendData = {

  dates: string[];

  pointKinds: ChartPointKind[];

  series: GroupDetailTrendSeries[];

  totals: number[];

  nature: AccountTypeNature;

};



type RecentNetWorthChange = {

  date: string;

  amount: number;

  relativeLabel: string;

} | null;



type ChartAccountState = {

  groupName: string;

  nature: AccountTypeNature;

  amount: number;

};



const GROUPS_STORAGE_KEY = 'asset-overview-groups';

const HISTORY_STORAGE_KEY = 'asset-overview-history';

const LAST_BACKUP_STORAGE_KEY = 'lastBackupAt';

const LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY = 'lastBackupHistoryCount';

const BACKUP_RECORDS_STORAGE_KEY = 'backupRecords';

const AUTO_BACKUP_SETTINGS_STORAGE_KEY = 'autoBackupSettings';

const CHART_SETTINGS_STORAGE_KEY = 'assetChartSettings';

const GLOBAL_SETTINGS_STORAGE_KEY = 'netraflowGlobalSettings';

const FIRST_WELCOME_STORAGE_KEY = 'netraflowFirstWelcomeState';

const ROLLUP_IMPORT_HASHES_STORAGE_KEY = 'netraflowRollupImportHashes';

const USER_SETTINGS_FILE_TYPE = 'netraflow-user-settings';

const USER_SETTINGS_FILE_VERSION = 1;

const MIGRATION_BACKUP_STORAGE_KEY = 'netraflow_backup_before_migration';

const LEGACY_ACCOUNTS_STORAGE_KEY = 'accounts';

const LEGACY_ACCOUNT_TYPES_STORAGE_KEY = 'accountTypes';

const LEGACY_HISTORY_STORAGE_KEY = 'historyRecords';

const LEGACY_ARCHIVED_ACCOUNTS_STORAGE_KEY = 'archivedAccounts';

const LEGACY_DELETED_RECORDS_STORAGE_KEY = 'deletedRecords';

const PRODUCT_NAME_EN = 'NetraFlow';

const PRODUCT_NAME_ZH = '净流';

const PRODUCT_TAGLINE = '资产变化记录工具';

const PRODUCT_ICON_PATH = 'icons/netraflow.ico';

const APP_VERSION =

  typeof packageInfo.version === 'string' && packageInfo.version.trim()

    ? packageInfo.version

    : '开发版';

const BILIBILI_PROFILE_URL = 'https://space.bilibili.com/1738773145';

const GITHUB_RELEASES_URL = 'https://github.com/umucatt/NetraFlow/releases';

const INITIAL_TIME = new Date().toISOString();

const LONG_PRESS_DURATION_MS = 560;

const GROUP_DOUBLE_CLICK_MS = 320;

const GROUP_POINTER_MOVE_THRESHOLD_PX = 7;

const SECRET_CONSOLE_LONG_PRESS_MS = 1500;

const SECRET_CONSOLE_DEFAULT_PLACEHOLDER = '嘘...轻一点';

const SECRET_CONSOLE_TEST_DATA_SUCCESS = '示例数据已写入真实数据';

const SECRET_CONSOLE_NYAA_SUCCESS = '已解锁nyaa主题';

const DAY_MS = 24 * 60 * 60 * 1000;

const GLOBAL_SETTINGS_NAV_ITEMS: Array<{ id: GlobalSettingsSection; label: string }> = [

  { id: 'appearance', label: '显示与界面' },

  { id: 'charts', label: '图表设置' },

  { id: 'search', label: '全局搜索' },

  { id: 'backup', label: '数据与备份' },

  { id: 'security', label: '安全' },

  { id: 'about', label: '关于净流' }

];

const GLOBAL_SETTINGS_SEARCH_ITEMS = [

  {

    id: 'appearance',

    title: '显示与界面',

    group: '全局设置',

    description: '数字正负值显示、资产统计数值类型、显示类型、紧凑数字格式与页面主题',

    section: 'appearance',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '外观',

      '显示',

      '界面',

      '数字正负值显示',

      '红正绿负',

      '绿正红负',

      '首页资产统计',

      '资产统计数值类型',

      '净值',

      '总资产',

      '显示类型',

      '全称',

      '缩写',

      '紧凑数字格式',

      '页面主题',

      '浅色',

      '深色',

      '跟随系统',

      '主题风格',

      '页面位置记忆',

      '全局记忆',

      '覆盖后重置',

      '页面位置',

      '位置记忆',

      '页面滚动',

      '滚动位置',

      '页面被覆盖',

      '覆盖重置',

      '堆叠组',

      '展开状态',

      '收起状态'

    ],

    pinyinKeywords: ['xian shi', 'jie mian', 'wai guan', 'zhu ti', 'ye mian wei zhi ji yi'],

    pinyinInitials: ['xs', 'jm', 'wg', 'zt', 'ymwzjy']

  },

  {

    id: 'appearance-positive-negative-color',

    title: '数字正负值显示',

    group: '显示与界面',

    description: '红正绿负、绿正红负',

    section: 'appearance',

    keywords: ['数字正负值显示', '红正绿负', '绿正红负', '金额颜色', '正负值颜色'],

    pinyinKeywords: ['shu zi zheng fu zhi xian shi'],

    pinyinInitials: ['szzfzxs']

  },

  {

    id: 'appearance-home-asset-stat',

    title: '资产统计数值类型',

    group: '显示与界面',

    description: '净值、总资产、显示类型、全称、缩写、紧凑数字格式',

    section: 'appearance',

    keywords: ['首页资产统计', '资产统计数值类型', '净值', '总资产', '显示类型', '全称', '缩写', '紧凑数字格式'],

    pinyinKeywords: ['zi chan tong ji shu zhi lei xing', 'jin zhi', 'zong zi chan'],

    pinyinInitials: ['zctjszlx', 'jz', 'zzc']

  },

  {

    id: 'appearance-theme',

    title: '页面主题',

    group: '显示与界面',

    description: '浅色、深色、跟随系统、主题风格',

    section: 'appearance',

    keywords: ['页面主题', '浅色', '深色', '跟随系统', '主题风格', 'nyaa'],

    pinyinKeywords: ['ye mian zhu ti', 'qian se', 'shen se', 'gen sui xi tong'],

    pinyinInitials: ['ymzt', 'qs', 'ss', 'gsxt']

  },

  {

    id: 'appearance-page-position-memory',

    title: '页面位置记忆',

    group: '显示与界面',

    description: '切换页面保留滚动位置和堆叠组状态，页面被覆盖将重置滚动位置和堆叠组状态',

    section: 'appearance',

    blockId: 'global-settings-page-position-memory',

    keywords: [

      '页面位置记忆',

      '全局记忆',

      '覆盖后重置',

      '页面位置',

      '位置记忆',

      '页面滚动',

      '滚动位置',

      '切换页面',

      '页面被覆盖',

      '覆盖重置',

      '堆叠组',

      '堆叠组状态',

      '展开状态',

      '收起状态'

    ],

    pinyinKeywords: [

      'ye mian wei zhi ji yi',

      'quan ju ji yi',

      'fu gai hou chong zhi',

      'ye mian wei zhi',

      'wei zhi ji yi',

      'ye mian gun dong',

      'gun dong wei zhi',

      'dui die zu'

    ],

    pinyinInitials: ['ymwzjy', 'qjjy', 'fghcz', 'ymwz', 'wzjy', 'ymgd', 'gdwz', 'ddz']

  },

  {

    id: 'charts',

    title: '图表设置',

    group: '全局设置',

    description: '图表配色、资产结构显示、资产趋势显示、自适应纵轴、横轴范围显示与点值显示',

    section: 'charts',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '图表',

      '图表设置',

      '图表配色',

      '图表配色遵循',

      '创建时间优先',

      '占比优先',

      '首页缩略图表',

      '资产结构显示',

      '资产趋势显示',

      '全局图表控制',

      '控制模式',

      '平级设定',

      '全局锁定',

      '总资产图表设置',

      '多重叠加数字',

      '自适应纵轴',

      '横轴范围显示',

      '点值显示',

      '全局账户类型图表设置',

      '账户详情图表设置',

      '近 1 月',

      '近 3 月',

      '近 6 月',

      '近 1 年',

      '自适应',

      '最高最低',

      '不显示',

      '正资产',

      '负资产',

      '正负资产',

      '净资产'

    ],

    pinyinKeywords: [

      'tu biao',

      'tu biao she zhi',

      'tu biao pei se',

      'zi chan jie gou xian shi',

      'zi chan qu shi xian shi',

      'duo chong die jia shu zi',

      'zi shi ying zong zhou',

      'heng zhou fan wei xian shi',

      'dian zhi xian shi',

      'jin yi yue',

      'jin san yue',

      'jin liu yue',

      'jin yi nian'

    ],

    pinyinInitials: ['tb', 'tbsz', 'tbps', 'zcjgxs', 'zcqsxs', 'dcdjsz', 'zsyzz', 'hzfwxs', 'dzxs', 'jyy', 'jsy', 'jly', 'jyn']

  },

  {

    id: 'search-accounts',

    title: '搜索账户',

    group: '全局搜索',

    description: '账户名称、账户类型、账户缩写与归档状态可参与搜索',

    section: 'search',

    keywords: ['搜索账户', '账户搜索', '账户名称', '账户类型', '账户缩写', '归档账户'],

    pinyinKeywords: ['sou suo zhang hu', 'zhang hu sou suo'],

    pinyinInitials: ['sszh', 'zhss']

  },

  {

    id: 'search-history',

    title: '搜索历史记录',

    group: '全局搜索',

    description: '历史记录日期、金额、变动类型、账户与备注可参与搜索',

    section: 'search',

    keywords: ['搜索历史记录', '历史记录搜索', '历史备注', '历史记录备注', '变动类型', '日期', '金额'],

    pinyinKeywords: ['sou suo li shi ji lu', 'li shi ji lu sou suo'],

    pinyinInitials: ['sslsjl', 'lsjlss']

  },

  {

    id: 'search-snapshots',

    title: '搜索快照',

    group: '全局搜索',

    description: '快照时间、方式、历史记录数量与增量记录数量可参与搜索',

    section: 'search',

    keywords: ['搜索快照', '快照搜索', '快照时间', '手动快照', '自动快照', '增量记录'],

    pinyinKeywords: ['sou suo kuai zhao', 'kuai zhao sou suo'],

    pinyinInitials: ['sskz', 'kzss']

  },

  {

    id: 'search-settings-items',

    title: '搜索设置项',

    group: '全局搜索',

    description: '设置页面入口、功能区标题、具体设置项名称与可见选项关键词可参与搜索',

    section: 'search',

    keywords: ['搜索设置项', '设置项搜索', '设置页面入口', '功能区标题', '具体设置项', '可见选项关键词'],

    pinyinKeywords: ['sou suo she zhi xiang', 'she zhi xiang sou suo'],

    pinyinInitials: ['ssszx', 'szxss']

  },

  {

    id: 'search',

    title: '全局搜索',

    group: '全局设置',

    description: '搜索账户、搜索历史记录、搜索快照、搜索设置项与搜索逻辑',

    section: 'search',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '搜索设置',

      '搜索账户',

      '搜索历史记录',

      '搜索快照',

      '搜索设置项',

      '搜索逻辑',

      '关键词匹配',

      '只显示命中',

      '允许推断',

      '关闭推断',

      '拼音',

      '首字母'

    ],

    pinyinKeywords: ['quan ju sou suo', 'quan ji sou suo', 'sou suo'],

    pinyinInitials: ['qjss', 'ss']

  },

  {

    id: 'backup-user-settings',

    title: '用户配置文件',

    group: '数据与备份',

    description: '导出用户配置文件、导入用户配置文件',

    section: 'backup',

    keywords: ['用户配置文件', '导出用户配置文件', '导入用户配置文件', '配置备份', '配置恢复'],

    pinyinKeywords: ['yong hu pei zhi wen jian', 'dao chu yong hu pei zhi wen jian', 'dao ru yong hu pei zhi wen jian'],

    pinyinInitials: ['yhpzwj', 'dcyhpzwj', 'dryhpzwj']

  },

  {

    id: 'backup-history-snapshot',

    title: '历史记录备份',

    group: '数据与备份',

    description: '快照、跳转至快照、手动快照与自动快照',

    section: 'backup',

    keywords: ['历史记录备份', '快照', '跳转至快照', '手动快照', '自动快照'],

    pinyinKeywords: ['li shi ji lu bei fen', 'kuai zhao'],

    pinyinInitials: ['lsjlbf', 'kz']

  },

  {

    id: 'backup-example-data',

    title: '示例数据',

    group: '数据与备份',

    description: '进入示例模式、切换示例模板、退出示例模式',

    section: 'backup',

    keywords: ['示例数据', '进入示例模式', '切换示例模板', '退出示例模式', '示例模板'],

    pinyinKeywords: ['shi li shu ju', 'shi li mo shi', 'shi li mo ban'],

    pinyinInitials: ['slsj', 'slms', 'slmb']

  },

  {

    id: 'backup-reset',

    title: '重置功能',

    group: '数据与备份',

    description: '清除用户配置、清除历史记录、清除所有',

    section: 'backup',

    keywords: ['重置功能', '清除用户配置', '清除历史记录', '清除所有', '重置', '清除'],

    pinyinKeywords: ['chong zhi gong neng', 'qing chu yong hu pei zhi', 'qing chu li shi ji lu', 'qing chu suo you'],

    pinyinInitials: ['czgn', 'qcyhpz', 'qclsjl', 'qcsy']

  },

  {

    id: 'backup',

    title: '数据与备份',

    group: '全局设置',

    description: '用户配置文件、导出导入、历史记录备份、快照、示例数据与重置功能',

    section: 'backup',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '数据',

      '备份',

      '用户配置文件',

      '导出用户配置文件',

      '导入用户配置文件',

      '历史记录备份',

      '快照',

      '跳转至快照',

      '示例数据',

      '进入示例模式',

      '切换示例模板',

      '退出示例模式',

      '重置功能',

      '清除用户配置',

      '清除历史记录',

      '清除所有',

      '导入',

      '导出'

    ],

    pinyinKeywords: ['shu ju', 'bei fen', 'kuai zhao', 'dao ru', 'dao chu'],

    pinyinInitials: ['sj', 'bf', 'kz', 'dr', 'dc']

  },

  {

    id: 'security-password-protection',

    title: '登录密码保护',

    group: '安全',

    description: '是否开启登陆密码保护、设置登录密码、修改登录密码、自动锁定时间',

    section: 'security',

    keywords: ['登录密码保护', '登陆密码保护', '是否开启登陆密码保护', '设置登录密码', '修改登录密码', '自动锁定时间'],

    pinyinKeywords: ['deng lu mi ma bao hu', 'she zhi deng lu mi ma', 'zi dong suo ding shi jian'],

    pinyinInitials: ['dlmmbh', 'szdlmm', 'zdsdsj']

  },

  {

    id: 'security-snapshot-encryption',

    title: '快照加密',

    group: '安全',

    description: '是否启用快照加密、设置快照密码、修改快照密码',

    section: 'security',

    keywords: ['快照加密', '是否启用快照加密', '设置快照密码', '修改快照密码', '快照密码'],

    pinyinKeywords: ['kuai zhao jia mi', 'she zhi kuai zhao mi ma', 'xiu gai kuai zhao mi ma'],

    pinyinInitials: ['kzjm', 'szkzmm', 'xgkzmm']

  },

  {

    id: 'security',

    title: '安全',

    group: '全局设置',

    description: '登录密码保护、设置登录密码、自动锁定时间、快照加密与设置快照密码',

    section: 'security',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '安全',

      '登陆密码保护',

      '登录密码保护',

      '是否开启登陆密码保护',

      '设置登录密码',

      '修改登录密码',

      '自动锁定时间',

      '快照加密',

      '是否启用快照加密',

      '设置快照密码',

      '修改快照密码',

      '密码',

      '自动锁定',

      '加密'

    ],

    pinyinKeywords: ['an quan', 'mi ma', 'zi dong suo ding', 'jia mi'],

    pinyinInitials: ['aq', 'mm', 'zdsd', 'jm']

  },

  {

    id: 'about-software',

    title: '软件信息',

    group: '关于净流',

    description: '净流、NetraFlow、当前版本',

    section: 'about',

    keywords: ['软件信息', '净流', 'NetraFlow', '当前版本', '版本'],

    pinyinKeywords: ['ruan jian xin xi', 'jing liu', 'ban ben'],

    pinyinInitials: ['rjxx', 'jl', 'bb']

  },

  {

    id: 'about-license-font',

    title: '开源许可',

    group: '关于净流',

    description: '字体、Noto Sans、字体许可',

    section: 'about',

    keywords: ['开源许可', '字体', 'Noto Sans', '字体许可', '许可'],

    pinyinKeywords: ['kai yuan xu ke', 'zi ti', 'xu ke'],

    pinyinInitials: ['kyxk', 'zt', 'xk']

  },

  {

    id: 'about-contact-memo',

    title: '获取信息',

    group: '关于净流',

    description: 'Bilibili、GitHub Releases',

    section: 'about',

    keywords: ['获取信息', 'Bilibili', 'GitHub', 'Releases', '发布页', '版本发布'],

    pinyinKeywords: ['huo qu xin xi', 'github', 'fa bu ye'],

    pinyinInitials: ['hqxx', 'github', 'fby']

  },

  {

    id: 'about',

    title: '关于净流',

    group: '全局设置',

    description: '软件信息、开源许可、字体与获取信息',

    section: 'about',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '关于',

      '关于净流',

      '软件信息',

      '净流',

      'NetraFlow',

      '版本',

      '当前版本',

      '开源许可',

      '字体',

      'Noto Sans',

      '获取信息',

      'Bilibili',

      'GitHub',

      'Releases',

      '发布页',

      '许可'

    ],

    pinyinKeywords: ['guan yu', 'ruan jian xin xi', 'zi ti', 'xu ke', 'huo qu xin xi', 'ban ben'],

    pinyinInitials: ['gy', 'rjxx', 'zt', 'xk', 'hqxx', 'bb']

  }

] satisfies SettingsSearchItem[];

const isGlobalSettingsSection = (value: string): value is GlobalSettingsSection =>

  GLOBAL_SETTINGS_NAV_ITEMS.some((item) => item.id === value);

const DEFAULT_AUTO_BACKUP_SETTINGS: AutoBackupSettings = {

  enabled: false,

  cycle: {

    value: 7,

    unit: 'day'

  },

  directory: ''

};

const DEFAULT_ASSET_CHART_SETTINGS: AssetChartSettings = {

  l0: {

    showStructure: true,

    showTrend: true,

    xAxisRange: '6m'

  },

  globalChartControlMode: 'peer',

  structure: {

    assetDisplay: 'both',

    showDebtMultiple: true

  },

  trend: {

    assetDisplay: 'net',

    adaptiveYAxis: true,

    xAxisRange: '6m',

    pointValueMode: 'adaptive'

  },

  categoryVisibility: {

    showStructure: true,

    showTrend: true

  },

  globalCategoryDetail: {

    xAxisRange: '6m',

    pointValueMode: 'adaptive'

  },

  categoryDetailById: {},

  accountDetailById: {}

};

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {

  positiveNegativeColorMode: 'red-positive',

  themeMode: 'system',

  themeStyle: 'default',

  nyaaThemeUnlocked: false,

  pagePositionMemoryMode: 'global',

  searchLogicMode: 'infer',

  chartColorAssignmentMode: 'createdAt',

  ...DEFAULT_HOME_ASSET_STAT_SETTINGS,

  passwordProtectionEnabled: false,

  passwordHash: null,

  autoLockMinutes: 10,

  snapshotEncryptionEnabled: false,

  snapshotPasswordHash: null

};

const DEFAULT_FIRST_WELCOME_STATE: FirstWelcomeState = {

  completed: false,

  pendingAfterClearAll: false

};

const SIGNED_AMOUNT_COLORS = {

  red: 'var(--signed-red)',

  green: 'var(--signed-green)',

  neutral: 'var(--text-muted)'

} as const;

const SIGNED_AMOUNT_BACKGROUNDS = {

  red: 'var(--signed-red-bg)',

  green: 'var(--signed-green-bg)',

  neutral: 'var(--surface-muted)'

} as const;

const FIRST_WELCOME_FOOTPRINT_STORAGE_KEYS = [

  GROUPS_STORAGE_KEY,

  HISTORY_STORAGE_KEY,

  LAST_BACKUP_STORAGE_KEY,

  LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY,

  BACKUP_RECORDS_STORAGE_KEY,

  AUTO_BACKUP_SETTINGS_STORAGE_KEY,

  CHART_SETTINGS_STORAGE_KEY,

  GLOBAL_SETTINGS_STORAGE_KEY,

  LEGACY_ACCOUNTS_STORAGE_KEY,

  LEGACY_ACCOUNT_TYPES_STORAGE_KEY,

  LEGACY_HISTORY_STORAGE_KEY,

  LEGACY_ARCHIVED_ACCOUNTS_STORAGE_KEY,

  LEGACY_DELETED_RECORDS_STORAGE_KEY

] as const;



const FIRST_WELCOME_STORY_ROUTES: Array<{

  templateId: ExampleTemplateId;

  title: string;

  description: string;

}> = [

  {

    templateId: 'light',

    title: '先在门口看看吧~',

    description: '适合快速熟悉净流的基础使用方式'

  },

  {

    templateId: 'daily',

    title: '瞄一眼ta的小账本~',

    description: '适合体验更接近日常记录的资产状态'

  },

  {

    templateId: 'advanced',

    title: 'ta抱来了一堆书！',

    description: '适合查看更完整的数据规模和功能表现'

  }

];



const accountTypeNatureOptions: Array<{ value: AccountTypeNature; label: string }> = [

  { value: 'asset', label: '资产' },

  { value: 'receivable', label: '应收款' },

  { value: 'liability', label: '负债' }

];



const createId = (prefix: string) => {

  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {

    return `${prefix}-${crypto.randomUUID()}`;

  }



  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

};



function randomIntBetween(min: number, max: number): number {

  return Math.floor(Math.random() * (max - min + 1)) + min;

}



const useOverlayBack = <T extends HTMLElement>(handleBack: () => void) => {

  const mouseDownStartedOnBackdropRef = useRef<{ x: number; y: number } | null>(null);



  return {

    onMouseDownCapture: (event: MouseEvent<T>) => {

      mouseDownStartedOnBackdropRef.current =
        event.button === 0 && event.target === event.currentTarget
          ? { x: event.clientX, y: event.clientY }
          : null;

    },

    onMouseUpCapture: (event: MouseEvent<T>) => {

      const startedOnBackdrop = mouseDownStartedOnBackdropRef.current;
      const shouldBack =

        startedOnBackdrop !== null &&
        event.button === 0 &&
        event.target === event.currentTarget &&
        Math.abs(event.clientX - startedOnBackdrop.x) <= 6 &&
        Math.abs(event.clientY - startedOnBackdrop.y) <= 6;



      mouseDownStartedOnBackdropRef.current = null;



      if (!shouldBack) {

        return;

      }



      handleBack();

    }

  };

};



function OverlayBackdrop({ onBack, ...props }: OverlayBackdropProps) {

  const overlayBackProps = useOverlayBack<HTMLDivElement>(onBack);



  return <div {...props} {...overlayBackProps} />;

}



const isTextEditingElement = (element: Element | null): element is HTMLElement => {

  if (!(element instanceof HTMLElement)) {

    return false;

  }



  return (

    element.isContentEditable ||

    element instanceof HTMLInputElement ||

    element instanceof HTMLTextAreaElement

  );

};



let hasLoggedStorageStartup = false;

let hasCheckedStartupAutoBackup = false;



const initialGroups: AssetGroup[] = [];



const isPlainObject = (value: unknown): value is Record<string, unknown> =>

  typeof value === 'object' && value !== null;



const getStringField = (value: Record<string, unknown>, fieldNames: string[]) => {

  for (const fieldName of fieldNames) {

    const fieldValue = value[fieldName];



    if (typeof fieldValue === 'string') {

      return fieldValue;

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



const getNullableNumberField = (

  value: Record<string, unknown>,

  fieldNames: string[]

): number | null => {

  for (const fieldName of fieldNames) {

    const fieldValue = value[fieldName];



    if (fieldValue === null) {

      return null;

    }



    if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) {

      return fieldValue;

    }

  }



  return null;

};



const getLocalStorageKeyList = () =>

  Array.from({ length: window.localStorage.length }, (_, index) =>

    window.localStorage.key(index)

  ).filter((key): key is string => typeof key === 'string');



const getLocalStorageSnapshot = () =>

  getLocalStorageKeyList().reduce<Record<string, string | null>>((snapshot, key) => {

    snapshot[key] = window.localStorage.getItem(key);



    return snapshot;

  }, {});



const saveBackupBeforeMigration = (reason: string) => {

  try {

    if (window.localStorage.getItem(MIGRATION_BACKUP_STORAGE_KEY) !== null) {

      return;

    }



    window.localStorage.setItem(

      MIGRATION_BACKUP_STORAGE_KEY,

      JSON.stringify({

        createdAt: new Date().toISOString(),

        reason,

        keys: getLocalStorageKeyList(),

        data: getLocalStorageSnapshot()

      })

    );

  } catch (error) {

    console.warn('[NetraFlow storage] Failed to create migration snapshot.', error);

  }

};



const readStorageJson = (key: string) => {

  const raw = window.localStorage.getItem(key);



  if (raw === null) {

    return { exists: false, parsed: false, value: undefined, raw };

  }



  try {

    return { exists: true, parsed: true, value: JSON.parse(raw) as unknown, raw };

  } catch (error) {

    console.warn(`[NetraFlow storage] Failed to parse localStorage key "${key}".`, error);



    return { exists: true, parsed: false, value: undefined, raw };

  }

};



const isBackupCycleUnit = (value: unknown): value is BackupCycleUnit =>

  value === 'day' || value === 'week' || value === 'month';



const normalizeBackupCycle = (value: unknown): BackupCycle => {

  if (!isPlainObject(value)) {

    return { ...DEFAULT_AUTO_BACKUP_SETTINGS.cycle };

  }



  const rawValue = value.value;

  const rawUnit = value.unit;

  const cycleValue =

    typeof rawValue === 'number' && Number.isFinite(rawValue)

      ? Math.max(1, Math.floor(rawValue))

      : DEFAULT_AUTO_BACKUP_SETTINGS.cycle.value;



  return {

    value: cycleValue,

    unit: isBackupCycleUnit(rawUnit) ? rawUnit : DEFAULT_AUTO_BACKUP_SETTINGS.cycle.unit

  };

};



const isBackupMethod = (value: unknown): value is BackupMethod =>

  value === 'manual' || value === 'auto';



const normalizeBackupRecords = (value: unknown): BackupRecord[] => {

  if (!Array.isArray(value)) {

    return [];

  }



  return value

    .flatMap((record): BackupRecord[] => {

      if (!isPlainObject(record)) {

        return [];

      }



      const backedUpAt =

        getStringField(record, ['backedUpAt', 'backupAt', 'exportedAt', 'time']) ?? '';



      if (getValidTimestamp(backedUpAt) === null) {

        return [];

      }



      const rawHistoryCount = getNumberField(record, ['historyCount', 'backupHistoryCount']);

      const rawIncrementCount = getNumberField(record, [

        'incrementCount',

        'incrementalCount',

        'deltaCount'

      ]);



      return [

        {

          id: getStringField(record, ['id', 'recordId']) ?? createId('backup-record'),

          backedUpAt,

          historyCount:

            rawHistoryCount === undefined ? 0 : Math.max(0, Math.floor(rawHistoryCount)),

          incrementCount:

            rawIncrementCount === undefined ? 0 : Math.max(0, Math.floor(rawIncrementCount)),

          method: isBackupMethod(record.method) ? record.method : 'manual'

        }

      ];

    })

    .sort((left, right) => {

      const leftTime = getValidTimestamp(left.backedUpAt) ?? 0;

      const rightTime = getValidTimestamp(right.backedUpAt) ?? 0;



      return rightTime - leftTime;

    });

};



const mergeBackupRecords = (

  currentRecords: BackupRecord[],

  importedRecords: BackupRecord[]

) => {

  const recordsById = new Map<string, BackupRecord>();



  currentRecords.forEach((record) => recordsById.set(record.id, record));

  importedRecords.forEach((record) => {

    const existingRecord = recordsById.get(record.id);

    recordsById.set(record.id, existingRecord ? { ...existingRecord, ...record } : record);

  });



  return Array.from(recordsById.values()).sort((left, right) => {

    const leftTime = getValidTimestamp(left.backedUpAt) ?? 0;

    const rightTime = getValidTimestamp(right.backedUpAt) ?? 0;



    return rightTime - leftTime;

  });

};



const loadBackupRecords = () => {

  const storedRecords = readStorageJson(BACKUP_RECORDS_STORAGE_KEY);



  return storedRecords.parsed ? normalizeBackupRecords(storedRecords.value) : [];

};



const saveBackupRecords = (records: BackupRecord[]) => {

  window.localStorage.setItem(

    BACKUP_RECORDS_STORAGE_KEY,

    JSON.stringify(normalizeBackupRecords(records))

  );

};



const getBackupCycleDays = (cycle: BackupCycle) => {

  const unitMultiplier = cycle.unit === 'month' ? 30 : cycle.unit === 'week' ? 7 : 1;



  return Math.max(1, Math.floor(cycle.value)) * unitMultiplier;

};



const hasBackupRecordMissingIncrementCount = () => {

  const storedRecords = readStorageJson(BACKUP_RECORDS_STORAGE_KEY);



  return (

    storedRecords.parsed &&

    Array.isArray(storedRecords.value) &&

    storedRecords.value.some(

      (record) => isPlainObject(record) && !('incrementCount' in record)

    )

  );

};



const getValidTimestamp = (value: string | null | undefined) => {

  if (!value) {

    return null;

  }



  const timestamp = Date.parse(value);



  return Number.isFinite(timestamp) ? timestamp : null;

};



const loadLastBackupAt = () => {

  const value = window.localStorage.getItem(LAST_BACKUP_STORAGE_KEY);



  return getValidTimestamp(value) === null ? '' : value ?? '';

};



const saveLastBackupAt = (time: string) => {

  window.localStorage.setItem(LAST_BACKUP_STORAGE_KEY, time);

};



const getStoredNumber = (key: string) => {

  const storedValue = readStorageJson(key);

  const value = storedValue.parsed ? storedValue.value : storedValue.raw;

  const numberValue =

    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;



  return Number.isFinite(numberValue) ? numberValue : null;

};



const loadLastBackupHistoryCount = (currentHistoryCount: number) => {

  const storedCount = getStoredNumber(LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY);



  if (storedCount !== null) {

    return Math.max(0, Math.floor(storedCount));

  }



  const latestBackupRecord = loadBackupRecords()[0];



  if (latestBackupRecord) {

    return latestBackupRecord.historyCount;

  }



  return loadLastBackupAt() ? currentHistoryCount : 0;

};



const saveLastBackupHistoryCount = (count: number) => {

  window.localStorage.setItem(

    LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY,

    JSON.stringify(Math.max(0, Math.floor(count)))

  );

};



const normalizeAutoBackupSettings = (value: unknown): AutoBackupSettings => {

  if (!isPlainObject(value)) {

    return DEFAULT_AUTO_BACKUP_SETTINGS;

  }



  return {

    enabled:

      typeof value.enabled === 'boolean'

        ? value.enabled

        : DEFAULT_AUTO_BACKUP_SETTINGS.enabled,

    cycle: normalizeBackupCycle(value.cycle),

    directory:

      typeof value.directory === 'string'

        ? value.directory

        : DEFAULT_AUTO_BACKUP_SETTINGS.directory

  };

};



const loadAutoBackupSettings = () => {

  const storedSettings = readStorageJson(AUTO_BACKUP_SETTINGS_STORAGE_KEY);



  return storedSettings.parsed

    ? normalizeAutoBackupSettings(storedSettings.value)

    : DEFAULT_AUTO_BACKUP_SETTINGS;

};



const saveAutoBackupSettings = (settings: AutoBackupSettings) => {

  window.localStorage.setItem(

    AUTO_BACKUP_SETTINGS_STORAGE_KEY,

    JSON.stringify(normalizeAutoBackupSettings(settings))

  );

};



const isStructureAssetDisplay = (value: unknown): value is StructureAssetDisplay =>

  value === 'positive' || value === 'negative' || value === 'both';



const isTrendAssetDisplay = (value: unknown): value is TrendAssetDisplay =>

  value === 'net' || value === 'positive' || value === 'positive-negative';



const isTrendXAxisRange = isChartXAxisRange;



const normalizeCategoryDetailChartSettings = (

  value: unknown,

  fallback: CategoryDetailChartSettings = DEFAULT_ASSET_CHART_SETTINGS.globalCategoryDetail

): CategoryDetailChartSettings => {

  const rawSettings = isPlainObject(value) ? value : {};



  return {

    xAxisRange: isTrendXAxisRange(rawSettings.xAxisRange)

      ? rawSettings.xAxisRange

      : fallback.xAxisRange,

    pointValueMode: normalizeChartPointValueMode(

      rawSettings.pointValueMode,

      fallback.pointValueMode

    )

  };

};



const normalizeAccountDetailChartSettings = (

  value: unknown,

  fallback: AccountDetailChartSettings

): AccountDetailChartSettings => {

  const rawSettings = isPlainObject(value) ? value : {};



  return {

    adaptiveYAxis:

      typeof rawSettings.adaptiveYAxis === 'boolean'

        ? rawSettings.adaptiveYAxis

        : fallback.adaptiveYAxis,

    xAxisRange: isTrendXAxisRange(rawSettings.xAxisRange)

      ? rawSettings.xAxisRange

      : fallback.xAxisRange,

    pointValueMode: normalizeChartPointValueMode(

      rawSettings.pointValueMode,

      fallback.pointValueMode

    )

  };

};



const normalizeAssetChartSettings = (value: unknown): AssetChartSettings => {

  if (!isPlainObject(value)) {

    return DEFAULT_ASSET_CHART_SETTINGS;

  }



  const rawTotalAsset = isPlainObject(value.totalAsset) ? value.totalAsset : {};

  const rawL0 = isPlainObject(value.homeThumbnail)

    ? value.homeThumbnail

    : isPlainObject(value.l0)

      ? value.l0

      : {};

  const rawStructure = isPlainObject(rawTotalAsset.structure)

    ? rawTotalAsset.structure

    : isPlainObject(value.structure)

      ? value.structure

      : {};

  const rawTrend = isPlainObject(rawTotalAsset.trend)

    ? rawTotalAsset.trend

    : isPlainObject(value.trend)

      ? value.trend

      : {};

  const rawCategoryVisibility = isPlainObject(value.categoryVisibility)

    ? value.categoryVisibility

    : isPlainObject(value.categoryDetail)

      ? value.categoryDetail

      : {};

  const rawGlobalCategoryDetail = isPlainObject(value.globalCategoryDetail)

    ? value.globalCategoryDetail

    : isPlainObject(value.globalCategoryChartSettings)

      ? value.globalCategoryChartSettings

      : isPlainObject(value.categoryDetail)

        ? value.categoryDetail

        : {};

  const rawCategoryDetailById = isPlainObject(value.categoryDetailById)

    ? value.categoryDetailById

    : isPlainObject(value.categoryChartSettingsById)

      ? value.categoryChartSettingsById

      : {};

  const rawAccountDetailById = isPlainObject(value.accountDetailById)

    ? value.accountDetailById

    : isPlainObject(value.accountChartSettingsById)

      ? value.accountChartSettingsById

      : {};

  const legacyLocked =

    value.locked === true ||

    value.globalChartLocked === true ||

    value.globalChartControlLocked === true;

  const rawControlMode = isPlainObject(value.globalChartControl)

    ? value.globalChartControl.mode

    : value.globalChartControlMode;

  const globalChartControlMode = legacyLocked

    ? 'locked'

    : normalizeGlobalChartControlMode(

        rawControlMode,

        DEFAULT_ASSET_CHART_SETTINGS.globalChartControlMode

      );

  const globalCategoryDetail = normalizeCategoryDetailChartSettings(

    rawGlobalCategoryDetail,

    DEFAULT_ASSET_CHART_SETTINGS.globalCategoryDetail

  );

  const categoryDetailById = Object.fromEntries(

    Object.entries(rawCategoryDetailById).map(([categoryId, settings]) => [

      categoryId,

      normalizeCategoryDetailChartSettings(settings, globalCategoryDetail)

    ])

  );

  const trend = {

    assetDisplay: isTrendAssetDisplay(rawTrend.assetDisplay)

      ? rawTrend.assetDisplay

      : DEFAULT_ASSET_CHART_SETTINGS.trend.assetDisplay,

    adaptiveYAxis:

      typeof rawTrend.adaptiveYAxis === 'boolean'

        ? rawTrend.adaptiveYAxis

        : DEFAULT_ASSET_CHART_SETTINGS.trend.adaptiveYAxis,

    xAxisRange: isTrendXAxisRange(rawTrend.xAxisRange)

      ? rawTrend.xAxisRange

      : DEFAULT_ASSET_CHART_SETTINGS.trend.xAxisRange,

    pointValueMode: normalizeChartPointValueMode(

      rawTrend.pointValueMode,

      DEFAULT_ASSET_CHART_SETTINGS.trend.pointValueMode

    )

  };

  const globalAccountDetail = {

    adaptiveYAxis: trend.adaptiveYAxis,

    xAxisRange: trend.xAxisRange,

    pointValueMode: trend.pointValueMode

  };

  const accountDetailById = Object.fromEntries(

    Object.entries(rawAccountDetailById).map(([accountId, settings]) => [

      accountId,

      normalizeAccountDetailChartSettings(settings, globalAccountDetail)

    ])

  );



  return {

    l0: {

      showStructure:

        typeof rawL0.showStructure === 'boolean'

          ? rawL0.showStructure

          : DEFAULT_ASSET_CHART_SETTINGS.l0.showStructure,

      showTrend:

        typeof rawL0.showTrend === 'boolean'

          ? rawL0.showTrend

          : DEFAULT_ASSET_CHART_SETTINGS.l0.showTrend,

      xAxisRange: isTrendXAxisRange(rawL0.xAxisRange)

        ? rawL0.xAxisRange

        : isTrendXAxisRange(rawTrend.xAxisRange)

          ? rawTrend.xAxisRange

          : DEFAULT_ASSET_CHART_SETTINGS.l0.xAxisRange

    },

    globalChartControlMode,

    structure: {

      assetDisplay: isStructureAssetDisplay(rawStructure.assetDisplay)

        ? rawStructure.assetDisplay

        : DEFAULT_ASSET_CHART_SETTINGS.structure.assetDisplay,

      showDebtMultiple:

        typeof rawStructure.showDebtMultiple === 'boolean'

          ? rawStructure.showDebtMultiple

          : DEFAULT_ASSET_CHART_SETTINGS.structure.showDebtMultiple

    },

    trend,

    categoryVisibility: {

      showStructure:

        typeof rawCategoryVisibility.showStructure === 'boolean'

          ? rawCategoryVisibility.showStructure

          : DEFAULT_ASSET_CHART_SETTINGS.categoryVisibility.showStructure,

      showTrend:

        typeof rawCategoryVisibility.showTrend === 'boolean'

          ? rawCategoryVisibility.showTrend

          : DEFAULT_ASSET_CHART_SETTINGS.categoryVisibility.showTrend

    },

    globalCategoryDetail,

    categoryDetailById,

    accountDetailById

  };

};



const loadAssetChartSettings = () => {

  const storedSettings = readStorageJson(CHART_SETTINGS_STORAGE_KEY);



  return storedSettings.parsed

    ? normalizeAssetChartSettings(storedSettings.value)

    : DEFAULT_ASSET_CHART_SETTINGS;

};



const saveAssetChartSettings = (settings: AssetChartSettings) => {

  window.localStorage.setItem(

    CHART_SETTINGS_STORAGE_KEY,

    JSON.stringify(normalizeAssetChartSettings(settings))

  );

};



const isPositiveNegativeColorMode = (value: unknown): value is PositiveNegativeColorMode =>

  value === 'red-positive' || value === 'green-positive';



const isThemeMode = (value: unknown): value is ThemeMode =>

  value === 'light' || value === 'dark' || value === 'system';



const isThemeStyle = (value: unknown): value is ThemeStyle =>

  value === 'default' || value === 'nyaa';



const isPagePositionMemoryMode = (value: unknown): value is PagePositionMemoryMode =>

  value === 'global' || value === 'covered-reset';



const isSearchLogicMode = (value: unknown): value is SearchLogicMode =>

  value === 'strict' || value === 'infer';



const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';



const getSystemTheme = (): ResolvedTheme => {

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {

    return 'light';

  }



  return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light';

};



const resolveThemeMode = (

  themeMode: ThemeMode,

  systemTheme: ResolvedTheme

): ResolvedTheme => (themeMode === 'system' ? systemTheme : themeMode);



const normalizeAutoLockMinutes = (value: unknown) => {

  const numericValue = typeof value === 'number' ? value : Number(value);



  return Number.isFinite(numericValue) && numericValue >= 1

    ? Math.floor(numericValue)

    : DEFAULT_GLOBAL_SETTINGS.autoLockMinutes;

};



const normalizeGlobalSettings = (value: unknown): GlobalSettings => {

  if (!isPlainObject(value)) {

    return DEFAULT_GLOBAL_SETTINGS;

  }



  const passwordHash = isPasswordHash(value.passwordHash) ? value.passwordHash : null;

  const snapshotPasswordHash = isPasswordHash(value.snapshotPasswordHash)

    ? value.snapshotPasswordHash

    : null;

  const nyaaThemeUnlocked = value.nyaaThemeUnlocked === true;



  return {

    positiveNegativeColorMode: isPositiveNegativeColorMode(value.positiveNegativeColorMode)

      ? value.positiveNegativeColorMode

      : DEFAULT_GLOBAL_SETTINGS.positiveNegativeColorMode,

    themeMode: isThemeMode(value.themeMode)

      ? value.themeMode

      : DEFAULT_GLOBAL_SETTINGS.themeMode,

    themeStyle:

      nyaaThemeUnlocked && isThemeStyle(value.themeStyle)

        ? value.themeStyle

        : DEFAULT_GLOBAL_SETTINGS.themeStyle,

    nyaaThemeUnlocked,

    pagePositionMemoryMode: isPagePositionMemoryMode(value.pagePositionMemoryMode)

      ? value.pagePositionMemoryMode

      : DEFAULT_GLOBAL_SETTINGS.pagePositionMemoryMode,

    searchLogicMode: isSearchLogicMode(value.searchLogicMode)

      ? value.searchLogicMode

      : DEFAULT_GLOBAL_SETTINGS.searchLogicMode,

    chartColorAssignmentMode: isChartColorAssignmentMode(value.chartColorAssignmentMode)

      ? value.chartColorAssignmentMode

      : DEFAULT_GLOBAL_SETTINGS.chartColorAssignmentMode,

    homeAssetStatMetric: isHomeAssetStatMetric(value.homeAssetStatMetric)

      ? value.homeAssetStatMetric

      : DEFAULT_GLOBAL_SETTINGS.homeAssetStatMetric,

    homeAssetStatLabelMode: isHomeAssetStatLabelMode(value.homeAssetStatLabelMode)

      ? value.homeAssetStatLabelMode

      : DEFAULT_GLOBAL_SETTINGS.homeAssetStatLabelMode,

    homeAssetStatCompact:

      typeof value.homeAssetStatCompact === 'boolean'

        ? value.homeAssetStatCompact

        : DEFAULT_GLOBAL_SETTINGS.homeAssetStatCompact,

    passwordProtectionEnabled: value.passwordProtectionEnabled === true && passwordHash !== null,

    passwordHash,

    autoLockMinutes: normalizeAutoLockMinutes(value.autoLockMinutes),

    snapshotEncryptionEnabled:

      value.snapshotEncryptionEnabled === true && snapshotPasswordHash !== null,

    snapshotPasswordHash

  };

};



const loadGlobalSettings = () => {

  const storedSettings = readStorageJson(GLOBAL_SETTINGS_STORAGE_KEY);



  return storedSettings.parsed

    ? normalizeGlobalSettings(storedSettings.value)

    : DEFAULT_GLOBAL_SETTINGS;

};



const saveGlobalSettings = (settings: GlobalSettings) => {

  window.localStorage.setItem(

    GLOBAL_SETTINGS_STORAGE_KEY,

    JSON.stringify(normalizeGlobalSettings(settings))

  );

};



const normalizeFirstWelcomeState = (value: unknown): FirstWelcomeState => {

  if (!isPlainObject(value)) {

    return DEFAULT_FIRST_WELCOME_STATE;

  }



  return {

    completed: value.completed === true,

    pendingAfterClearAll: value.pendingAfterClearAll === true

  };

};



const hasExistingFirstWelcomeFootprint = () =>

  FIRST_WELCOME_FOOTPRINT_STORAGE_KEYS.some((key) => window.localStorage.getItem(key) !== null);



const loadFirstWelcomeState = (): FirstWelcomeState => {

  const storedState = readStorageJson(FIRST_WELCOME_STORAGE_KEY);



  if (storedState.parsed) {

    return normalizeFirstWelcomeState(storedState.value);

  }



  return hasExistingFirstWelcomeFootprint()

    ? { completed: true, pendingAfterClearAll: false }

    : DEFAULT_FIRST_WELCOME_STATE;

};



const saveFirstWelcomeState = (state: FirstWelcomeState) => {

  window.localStorage.setItem(

    FIRST_WELCOME_STORAGE_KEY,

    JSON.stringify(normalizeFirstWelcomeState(state))

  );

};



const shouldShowFirstWelcome = (state: FirstWelcomeState) =>

  state.pendingAfterClearAll || !state.completed;



const getSignedAmountTone = (

  value: number,

  positiveNegativeColorMode: PositiveNegativeColorMode

) => {

  if (value > 0) {

    const toneName = positiveNegativeColorMode === 'red-positive' ? 'red' : 'green';



    return {

      color: SIGNED_AMOUNT_COLORS[toneName],

      background: SIGNED_AMOUNT_BACKGROUNDS[toneName]

    };

  }



  if (value < 0) {

    const toneName = positiveNegativeColorMode === 'red-positive' ? 'green' : 'red';



    return {

      color: SIGNED_AMOUNT_COLORS[toneName],

      background: SIGNED_AMOUNT_BACKGROUNDS[toneName]

    };

  }



  return {

    color: SIGNED_AMOUNT_COLORS.neutral,

    background: SIGNED_AMOUNT_BACKGROUNDS.neutral

  };

};



const areBackupCyclesEqual = (left: BackupCycle, right: BackupCycle) =>

  left.value === right.value && left.unit === right.unit;



const areAutoBackupSettingsEqual = (

  left: AutoBackupSettings,

  right: AutoBackupSettings

) =>

  left.enabled === right.enabled &&

  left.directory === right.directory &&

  areBackupCyclesEqual(left.cycle, right.cycle);



const storedValueLooksNonEmpty = (raw: string | null) => {

  if (raw === null) {

    return false;

  }



  const trimmedRaw = raw.trim();

  return trimmedRaw !== '' && trimmedRaw !== '[]';

};



const isAccountTypeNature = (value: unknown): value is AccountTypeNature =>

  value === 'asset' || value === 'receivable' || value === 'liability';



const getLegacyNature = (groupName: string): AccountTypeNature =>

  groupName === '负债' ? 'liability' : 'asset';



const normalizeGroupNature = (value: unknown, groupName: string): AccountTypeNature =>

  isAccountTypeNature(value) ? value : getLegacyNature(groupName);



const isPositiveNature = (nature: AccountTypeNature) =>

  nature === 'asset' || nature === 'receivable';



const toStoredAmountByNature = (nature: AccountTypeNature, amount: number) =>

  nature === 'liability' ? -Math.abs(amount) : Math.abs(amount);



const getStatAmount = (nature: AccountTypeNature, amount: number) =>

  nature === 'liability' ? -Math.abs(amount) : Math.abs(amount);



const toEditableAmount = (amount: number) => Math.abs(amount);



const normalizeHistoryType = (type: unknown): HistoryType | null => {

  if (type === '新增' || type === '删除' || type === '修改' || type === '重新启用') {

    return type;

  }



  if (type === '归档' || type === '已归档') {

    return '归档';

  }



  return null;

};



const DEFAULT_HISTORY_TYPE: HistoryType = '修改';



const looksLikeHistoryRecord = (value: unknown) =>

  isPlainObject(value) &&

  [

    'type',

    'action',

    'kind',

    'beforeAmount',

    'afterAmount',

    'previousAmount',

    'nextAmount',

    'relatedTime'

  ].some((fieldName) => fieldName in value);



const normalizeGroups = (value: unknown): AssetGroup[] => {

  if (isPlainObject(value) && Array.isArray(value.groups)) {

    return normalizeGroups(value.groups);

  }



  if (!Array.isArray(value)) {

    return initialGroups;

  }



  const groups = value

    .filter(isPlainObject)

    .map((group, index) => {

      const groupName = getStringField(group, ['name', 'label', 'title', 'groupName']) ?? '';

      const nature = normalizeGroupNature(group.nature ?? getStringField(group, ['kind']), groupName);

      const sortOrder =

        typeof group.sortOrder === 'number' && Number.isFinite(group.sortOrder)

          ? group.sortOrder

          : index;

      const rawAccounts = Array.isArray(group.accounts) ? group.accounts : [];



      return {

        ...group,

        name: groupName,

        nature,

        includeInStats:

          typeof group.includeInStats === 'boolean' ? group.includeInStats : true,

        sortOrder,

        accounts: rawAccounts.filter(isPlainObject).flatMap((account) => {

          const accountName = getStringField(account, ['name', 'accountName', 'title']) ?? '';

          const accountAmount = getNumberField(account, ['amount', 'balance', 'value']);



          if (

            !accountName ||

            typeof accountAmount !== 'number' ||

            !Number.isFinite(accountAmount)

          ) {

            return [];

          }



          return [

            {

              ...account,

              id: getStringField(account, ['id', 'accountId']) ?? createId('account'),

              name: accountName,

              amount: toStoredAmountByNature(nature, accountAmount),

              createdAt:

                getStringField(account, ['createdAt', 'createdTime', 'time']) ?? INITIAL_TIME,

              alias: getStringField(account, ['alias', 'abbreviation']),

              archived: getBooleanField(account, ['archived']) ?? false,

              archivedAt: getStringField(account, ['archivedAt'])

            }

          ];

        })

      };

    })

    .filter((group) => group.name);



  return groups

    .sort((left, right) => left.sortOrder - right.sortOrder)

    .map((group, index) => ({ ...group, sortOrder: index }));

};



const findAccountByLegacyRecord = (

  groups: AssetGroup[],

  groupName: string,

  accountName: string

) =>

  groups

    .find((group) => group.name === groupName)

    ?.accounts.find((account) => account.name === accountName);



const findAccountById = (groups: AssetGroup[], accountId: string) => {

  for (const group of groups) {

    const account = group.accounts.find((currentAccount) => currentAccount.id === accountId);



    if (account) {

      return { group, account };

    }

  }



  return undefined;

};



const normalizeHistory = (value: unknown, groups: AssetGroup[]): HistoryRecord[] => {

  if (isPlainObject(value)) {

    if (Array.isArray(value.history)) {

      return normalizeHistory(value.history, groups);

    }



    if (Array.isArray(value.historyRecords)) {

      return normalizeHistory(value.historyRecords, groups);

    }

  }



  if (!Array.isArray(value)) {

    return [];

  }



  return value.filter(isPlainObject).flatMap((record) => {

    const type =

      normalizeHistoryType(record.type) ??

      normalizeHistoryType(record.action) ??

      normalizeHistoryType(record.kind) ??

      DEFAULT_HISTORY_TYPE;

    const recordAccountId = getStringField(record, ['accountId', 'accountID', 'account_id']);

    const accountMatch = recordAccountId ? findAccountById(groups, recordAccountId) : undefined;

    const groupName =

      getStringField(record, ['groupName', 'accountType', 'accountTypeName', 'category']) ??

      accountMatch?.group.name ??

      groups[0]?.name ??

      'Uncategorized';

    const accountName =

      getStringField(record, ['accountName', 'name', 'title']) ??

      accountMatch?.account.name ??

      'Unknown account';

    const fallbackAccount = findAccountByLegacyRecord(groups, groupName, accountName);

    const accountId = recordAccountId ?? fallbackAccount?.id ?? createId('legacy-account');



    if (!groupName || !accountName || !accountId) {

      return [];

    }



    const beforeAmount = getNullableNumberField(record, [

      'beforeAmount',

      'previousAmount',

      'beforeBalance',

      'before'

    ]);

    const afterAmount = getNullableNumberField(record, [

      'afterAmount',

      'nextAmount',

      'afterBalance',

      'after'

    ]);



    const source = getStringField(record, ['source']);



    return [

      {

        ...record,

        id: getStringField(record, ['id', 'recordId']) ?? createId('history'),

        accountId,

        type,

        groupName,

        accountName,

        beforeAmount,

        afterAmount,

        time: getStringField(record, ['time', 'createdAt', 'createdTime', 'date']) ?? INITIAL_TIME,

        relatedTime: getStringField(record, ['relatedTime']),

        note: getStringField(record, ['note', 'remark', 'memo']),

        source: source === 'flash-note' || source === 'rollup' ? source : undefined

      }

    ];

  });

};



const getBackupFieldValue = (value: unknown, fieldNames: string[]) => {

  const sources = [value];



  if (isPlainObject(value)) {

    sources.push(value.data, value.appData);

  }



  for (const source of sources) {

    if (!isPlainObject(source)) {

      continue;

    }



    for (const fieldName of fieldNames) {

      if (fieldName in source) {

        return source[fieldName];

      }

    }

  }



  return undefined;

};



const getBackupGroups = (value: unknown) => {

  if (Array.isArray(value)) {

    return normalizeGroups(value);

  }



  const groupsValue = getBackupFieldValue(value, ['groups', 'assetGroups']);



  return Array.isArray(groupsValue) || isPlainObject(groupsValue)

    ? normalizeGroups(groupsValue)

    : [];

};



const getBackupHistory = (value: unknown, groups: AssetGroup[]) => {

  const historyValue = getBackupFieldValue(value, ['history', 'historyRecords']);



  return Array.isArray(historyValue) || isPlainObject(historyValue)

    ? normalizeHistory(historyValue, groups)

    : [];

};



const mergeAccountLists = (currentAccounts: Account[], importedAccounts: Account[]) => {

  const nextAccounts = [...currentAccounts];



  importedAccounts.forEach((importedAccount) => {

    const existingIndex = nextAccounts.findIndex((account) => account.id === importedAccount.id);



    if (existingIndex >= 0) {

      nextAccounts[existingIndex] = {

        ...nextAccounts[existingIndex],

        ...importedAccount

      };

      return;

    }



    nextAccounts.push(importedAccount);

  });



  return nextAccounts;

};



const mergeGroups = (currentGroups: AssetGroup[], importedGroups: AssetGroup[]) => {

  const nextGroups = currentGroups.map((group) => ({ ...group, accounts: [...group.accounts] }));



  importedGroups.forEach((importedGroup) => {

    const existingIndex = nextGroups.findIndex((group) => group.name === importedGroup.name);



    if (existingIndex >= 0) {

      const existingGroup = nextGroups[existingIndex];



      nextGroups[existingIndex] = {

        ...existingGroup,

        ...importedGroup,

        accounts: mergeAccountLists(existingGroup.accounts, importedGroup.accounts)

      };

      return;

    }



    nextGroups.push({

      ...importedGroup,

      sortOrder: nextGroups.length

    });

  });



  return nextGroups.map((group, index) => ({ ...group, sortOrder: index }));

};



const mergeHistoryRecords = (

  currentHistory: HistoryRecord[],

  importedHistory: HistoryRecord[]

) => {

  const recordsById = new Map<string, HistoryRecord>();



  currentHistory.forEach((record) => recordsById.set(record.id, record));

  importedHistory.forEach((record) => {

    const existingRecord = recordsById.get(record.id);

    recordsById.set(record.id, existingRecord ? { ...existingRecord, ...record } : record);

  });



  return Array.from(recordsById.values()).sort(compareHistoryByTimeDesc);

};



const normalizeLegacyAccountTypes = (value: unknown): AssetGroup[] => {

  const accountTypes =

    isPlainObject(value) && Array.isArray(value.accountTypes)

      ? value.accountTypes

      : Array.isArray(value)

        ? value

        : [];



  return accountTypes.flatMap((accountType, index) => {

    if (typeof accountType === 'string') {

      return [

        {

          name: accountType,

          nature: normalizeGroupNature(undefined, accountType),

          includeInStats: true,

          sortOrder: index,

          accounts: []

        }

      ];

    }



    if (!isPlainObject(accountType)) {

      return [];

    }



    const name = getStringField(accountType, ['name', 'label', 'title', 'groupName']) ?? '';



    if (!name) {

      return [];

    }



    return [

      {

        ...accountType,

        name,

        nature: normalizeGroupNature(accountType.nature ?? getStringField(accountType, ['kind']), name),

        includeInStats: getBooleanField(accountType, ['includeInStats']) ?? true,

        sortOrder: getNumberField(accountType, ['sortOrder', 'order']) ?? index,

        accounts: Array.isArray(accountType.accounts) ? accountType.accounts : []

      }

    ];

  });

};



const appendLegacyAccountsToGroups = (

  groups: AssetGroup[],

  value: unknown,

  archivedFallback: boolean

) => {

  const accounts =

    isPlainObject(value) && Array.isArray(value.accounts)

      ? value.accounts

      : Array.isArray(value)

        ? value

        : [];



  accounts.filter(isPlainObject).forEach((account) => {

    const accountName = getStringField(account, ['name', 'accountName', 'title']) ?? '';

    const amount = getNumberField(account, ['amount', 'balance', 'value']);



    if (!accountName || typeof amount !== 'number') {

      return;

    }



    const groupName =

      getStringField(account, ['groupName', 'accountTypeName', 'accountType', 'type', 'category']) ??

      groups[0]?.name ??

      'Uncategorized';

    let group = groups.find((currentGroup) => currentGroup.name === groupName);



    if (!group) {

      group = {

        name: groupName,

        nature: normalizeGroupNature(undefined, groupName),

        includeInStats: true,

        sortOrder: groups.length,

        accounts: []

      };

      groups.push(group);

    }



    group.accounts.push({

      ...account,

      id: getStringField(account, ['id', 'accountId']) ?? createId('account'),

      name: accountName,

      amount,

      createdAt: getStringField(account, ['createdAt', 'createdTime', 'time']) ?? INITIAL_TIME,

      alias: getStringField(account, ['alias', 'abbreviation']),

      archived: getBooleanField(account, ['archived']) ?? archivedFallback,

      archivedAt:

        getStringField(account, ['archivedAt']) ??

        (archivedFallback ? INITIAL_TIME : undefined)

    });

  });

};



const loadLegacyGroupsFromStorage = (): AssetGroup[] | null => {

  const storedAccountTypes = readStorageJson(LEGACY_ACCOUNT_TYPES_STORAGE_KEY);

  const storedAccounts = readStorageJson(LEGACY_ACCOUNTS_STORAGE_KEY);

  const storedArchivedAccounts = readStorageJson(LEGACY_ARCHIVED_ACCOUNTS_STORAGE_KEY);



  if (!storedAccountTypes.exists && !storedAccounts.exists && !storedArchivedAccounts.exists) {

    return null;

  }



  saveBackupBeforeMigration('migrate legacy account storage');



  const groups = storedAccountTypes.parsed

    ? normalizeLegacyAccountTypes(storedAccountTypes.value)

    : [];



  if (storedAccounts.parsed) {

    appendLegacyAccountsToGroups(groups, storedAccounts.value, false);

  }



  if (storedArchivedAccounts.parsed) {

    appendLegacyAccountsToGroups(groups, storedArchivedAccounts.value, true);

  }



  return groups.length > 0 ? normalizeGroups(groups) : null;

};



const loadLegacyHistoryFromStorage = (groups: AssetGroup[]) => {

  const storedHistory = readStorageJson(LEGACY_HISTORY_STORAGE_KEY);

  const storedDeletedRecords = readStorageJson(LEGACY_DELETED_RECORDS_STORAGE_KEY);

  const legacyHistoryValues: unknown[] = [];



  if (storedHistory.parsed) {

    const historyValue =

      isPlainObject(storedHistory.value) && Array.isArray(storedHistory.value.historyRecords)

        ? storedHistory.value.historyRecords

        : storedHistory.value;



    if (Array.isArray(historyValue)) {

      legacyHistoryValues.push(...historyValue);

    }

  }



  if (storedDeletedRecords.parsed) {

    const deletedValue =

      isPlainObject(storedDeletedRecords.value) && Array.isArray(storedDeletedRecords.value.deletedRecords)

        ? storedDeletedRecords.value.deletedRecords

        : storedDeletedRecords.value;



    if (Array.isArray(deletedValue)) {

      legacyHistoryValues.push(...deletedValue.filter(looksLikeHistoryRecord));

    }

  }



  if (legacyHistoryValues.length === 0) {

    return [];

  }



  saveBackupBeforeMigration('migrate legacy history storage');



  return normalizeHistory(legacyHistoryValues, groups);

};



const loadGroupsFromStorage = () => {

  const storedGroups = readStorageJson(GROUPS_STORAGE_KEY);



  if (storedGroups.parsed) {

    saveBackupBeforeMigration('normalize current account storage');

    return normalizeGroups(storedGroups.value);

  }



  const legacyGroups = loadLegacyGroupsFromStorage();



  if (legacyGroups) {

    return legacyGroups;

  }



  return initialGroups;

};



const loadHistoryFromStorage = (groups: AssetGroup[]) => {

  const storedHistory = readStorageJson(HISTORY_STORAGE_KEY);

  const legacyHistory = loadLegacyHistoryFromStorage(groups);



  if (storedHistory.parsed) {

    saveBackupBeforeMigration('normalize current history storage');



    const currentHistory = normalizeHistory(storedHistory.value, groups);



    if (currentHistory.length === 0 && legacyHistory.length > 0) {

      return legacyHistory;

    }



    return currentHistory;

  }



  return legacyHistory;

};



const hasPossiblyStoredHistoryRecords = () =>

  [

    HISTORY_STORAGE_KEY,

    LEGACY_HISTORY_STORAGE_KEY,

    LEGACY_DELETED_RECORDS_STORAGE_KEY

  ].some((key) => storedValueLooksNonEmpty(window.localStorage.getItem(key)));



const logStorageStartup = (groups: AssetGroup[], history: HistoryRecord[]) => {

  if (hasLoggedStorageStartup) {

    return;

  }



  hasLoggedStorageStartup = true;



  console.log(

    '[NetraFlow startup] accounts count:',

    groups.reduce((count, group) => count + group.accounts.length, 0)

  );

  console.log('[NetraFlow startup] historyRecords count:', history.length);

  console.log('[NetraFlow startup] localStorage keys:', getLocalStorageKeyList());

};



const loadAppData = (): AppData => {

  const groups = loadGroupsFromStorage();

  const history = loadHistoryFromStorage(groups);



  logStorageStartup(groups, history);



  return { groups, history };

};



const saveAppData = (

  { groups, history }: AppData,

  options: { allowEmptyHistoryOverwrite?: boolean } = {}

) => {

  window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));



  if (

    history.length === 0 &&

    !options.allowEmptyHistoryOverwrite &&

    hasPossiblyStoredHistoryRecords()

  ) {

    console.warn(

      '[NetraFlow storage] Skipped writing empty historyRecords because stored history exists.'

    );

    return;

  }



  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));

};



const cloneAppData = ({ groups, history }: AppData): AppData => ({

  groups: groups.map((group) => ({

    ...group,

    accounts: group.accounts.map((account) => ({ ...account }))

  })),

  history: history.map((record) => ({ ...record }))

});



const cloneBackupRecords = (records: BackupRecord[]) =>

  records.map((record) => ({ ...record }));



const saveEmptyAssetData = () => {

  window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify([]));

  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([]));

  window.localStorage.setItem(BACKUP_RECORDS_STORAGE_KEY, JSON.stringify([]));

  window.localStorage.removeItem(LAST_BACKUP_STORAGE_KEY);

  window.localStorage.setItem(LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY, JSON.stringify(0));

  [

    LEGACY_ACCOUNTS_STORAGE_KEY,

    LEGACY_ACCOUNT_TYPES_STORAGE_KEY,

    LEGACY_HISTORY_STORAGE_KEY,

    LEGACY_ARCHIVED_ACCOUNTS_STORAGE_KEY,

    LEGACY_DELETED_RECORDS_STORAGE_KEY

  ].forEach((key) => window.localStorage.removeItem(key));

};



const loadRollupImportHashes = () => {

  try {

    const rawValue = window.localStorage.getItem(ROLLUP_IMPORT_HASHES_STORAGE_KEY);

    const parsedValue = rawValue ? JSON.parse(rawValue) : [];



    return Array.isArray(parsedValue)

      ? parsedValue.filter((value): value is string => typeof value === 'string')

      : [];

  } catch {

    return [];

  }

};



const saveRollupImportHashes = (hashes: string[]) => {

  window.localStorage.setItem(

    ROLLUP_IMPORT_HASHES_STORAGE_KEY,

    JSON.stringify(Array.from(new Set(hashes)).slice(-80))

  );

};



const createHistoryRecord = (

  type: HistoryType,

  account: Account,

  groupName: string,

  beforeAmount: number | null,

  afterAmount: number | null,

  time = new Date().toISOString(),

  relatedTime?: string,

  source?: HistoryRecord['source'],

  note?: string

): HistoryRecord => ({

  id: createId('history'),

  accountId: account.id,

  type,

  groupName,

  accountName: account.name,

  beforeAmount,

  afterAmount,

  time,

  relatedTime,

  source,

  note

});



const parseNonNegativeAmount = (value: string) => {

  const amount = parseMoneyInput(value);

  return amount !== null && amount >= 0 ? amount : null;

};



const isNonNegativeInput = (value: string) => isMoneyInput(value);



const sanitizeNonNegativeInput = (value: string) => normalizeMoneyInput(value);



const getAccountMark = (account: Account) => getAccountDisplayMark(account);



const getArchivedAccountRestoreTitle = (account: ArchivedAccountEntry) => {

  const groupName = account.groupName.trim();



  return groupName ? `${groupName} - ${account.name}` : account.name;

};



const getSegmentedControlStyle = (optionCount: number): CSSProperties =>

  ({ '--segmented-option-count': optionCount } as CSSProperties);



const addDays = (date: Date, days: number) => {

  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);



  return nextDate;

};



const toDateInputValue = (date: Date) => {

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, '0');

  const day = String(date.getDate()).padStart(2, '0');



  return `${year}-${month}-${day}`;

};



const getRecent7DayRange = () => {

  const today = new Date();



  return {

    start: toDateInputValue(addDays(today, -6)),

    end: toDateInputValue(today)

  };

};



const getSelectedDayCount = (startDate: string, endDate: string) => {

  if (!startDate) {

    return 0;

  }



  const startTime = getRangeTime(startDate, 'start');

  const endTime = getRangeTime(endDate || startDate, 'start');

  const dayMs = 24 * 60 * 60 * 1000;



  return Math.abs(Math.round((endTime - startTime) / dayMs)) + 1;

};



const getDateKeyFromValue = (dateValue: string) =>

  new Date(`${dateValue}T00:00:00`);



const getTodayDateKey = () => toDateInputValue(new Date());



const isFutureDateKey = (dateValue: string) => dateValue > getTodayDateKey();



const clampHistoryDateValue = (dateValue: string) =>

  isFutureDateKey(dateValue) ? getTodayDateKey() : dateValue;



const getHistoryCalendarLeadMonth = (dateValue = getTodayDateKey()) => {

  const date = getDateKeyFromValue(clampHistoryDateValue(dateValue));

  return new Date(date.getFullYear(), date.getMonth() - 1, 1);

};



const getMondayDate = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));



const getDateWeekKey = (dateValue: string) =>

  toDateInputValue(getMondayDate(getDateKeyFromValue(dateValue)));



const getDateRangeKeys = (startDate: string, endDate: string) => {

  if (!startDate || !endDate) {

    return [];

  }



  const direction = startDate <= endDate ? 1 : -1;

  const result: string[] = [];

  let cursor = getDateKeyFromValue(startDate);

  const endTime = getDateKeyFromValue(endDate).getTime();



  while (

    direction === 1

      ? cursor.getTime() <= endTime

      : cursor.getTime() >= endTime

  ) {

    const dateValue = toDateInputValue(cursor);

    if (!isFutureDateKey(dateValue)) {

      result.push(dateValue);

    }

    cursor = addDays(cursor, direction);

  }



  return result;

};



const sortFlashDatesByDirection = (

  dates: string[],

  direction: FlashNoteDirection

) => {

  const sortedDates = Array.from(new Set(dates)).sort();

  return direction === 'backward' ? sortedDates.reverse() : sortedDates;

};



const isValidFlashNumberInput = (value: string) =>

  isMoneyInput(value, { allowNegative: true });



const parseFlashNumberInput = (value: string) => {

  return parseMoneyInput(value, { allowNegative: true });

};



const getFlashMonthStart = (date = new Date()) =>

  new Date(date.getFullYear(), date.getMonth(), 1);



const getFlashDefaultVisibleMonth = (date = new Date()) =>

  getFlashMonthStart(new Date(date.getFullYear(), date.getMonth() - 1, 1));



const formatDateRangeDisplay = (startDate: string, endDate: string) => {

  if (!startDate) {

    return '';

  }



  const safeEndDate = endDate || startDate;

  const dateText = startDate === safeEndDate ? startDate : `${startDate} 至 ${safeEndDate}`;



  return `${dateText}，共选取 ${getSelectedDayCount(startDate, safeEndDate)} 天`;

};



const parseDateToken = (token: string) => {

  const trimmedToken = token.trim();



  if (!/^\d{4}$|^\d{6}$/.test(trimmedToken)) {

    return null;

  }



  const year =

    trimmedToken.length === 6

      ? 2000 + Number(trimmedToken.slice(0, 2))

      : new Date().getFullYear();

  const month =

    trimmedToken.length === 6

      ? Number(trimmedToken.slice(2, 4))

      : Number(trimmedToken.slice(0, 2));

  const day =

    trimmedToken.length === 6

      ? Number(trimmedToken.slice(4, 6))

      : Number(trimmedToken.slice(2, 4));

  const parsedDate = new Date(year, month - 1, day);



  if (

    parsedDate.getFullYear() !== year ||

    parsedDate.getMonth() !== month - 1 ||

    parsedDate.getDate() !== day

  ) {

    return null;

  }



  return {

    value: toDateInputValue(parsedDate),

    year,

    hasExplicitYear: trimmedToken.length === 6

  };

};



const getHistoryRangeTokens = (value: string) => {

  const normalizedValue = value.replace(/至/g, ' ');

  const explicitDateTokens = normalizedValue.match(/\d{4}-\d{2}-\d{2}/g) ?? [];



  if (explicitDateTokens.length > 0) {

    return explicitDateTokens.map((dateValue) => dateValue.replace(/\D/g, '').slice(2));

  }



  return normalizedValue.match(/\d{4,6}/g) ?? [];

};



const parseHistoryRangeInput = (value: string) => {

  const tokens = getHistoryRangeTokens(value);



  if (tokens.length < 2) {

    return null;

  }



  const firstToken = tokens[0] ?? '';

  const secondToken = tokens[1] ?? '';

  const firstDate = parseDateToken(firstToken);

  const secondDate = parseDateToken(secondToken);



  if (!firstDate || !secondDate) {

    return null;

  }



  return firstDate.value <= secondDate.value

    ? { start: firstDate.value, end: secondDate.value }

    : { start: secondDate.value, end: firstDate.value };

};



const getLastWeekRange = () => {

  const today = new Date();

  const daysSinceMonday = (today.getDay() + 6) % 7;

  const thisMonday = addDays(today, -daysSinceMonday);



  return {

    start: toDateInputValue(addDays(thisMonday, -7)),

    end: toDateInputValue(addDays(thisMonday, -1))

  };

};



const getRangeTime = (dateValue: string, edge: 'start' | 'end') => {

  if (!dateValue) {

    return edge === 'start' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

  }



  const time = new Date(`${dateValue}T${edge === 'start' ? '00:00:00' : '23:59:59.999'}`).getTime();



  return Number.isFinite(time)

    ? time

    : edge === 'start'

      ? Number.NEGATIVE_INFINITY

      : Number.POSITIVE_INFINITY;

};



const isWithinDateRange = (time: string, startDate: string, endDate: string) => {

  const timestamp = new Date(time).getTime();



  return timestamp >= getRangeTime(startDate, 'start') && timestamp <= getRangeTime(endDate, 'end');

};



const getHistoryTimestamp = (record: HistoryRecord) => {

  const timestamp = Date.parse(record.time);



  return Number.isFinite(timestamp) ? timestamp : 0;

};



const compareHistoryByTimeDesc = (left: HistoryRecord, right: HistoryRecord) =>

  getHistoryTimestamp(right) - getHistoryTimestamp(left);



const getDateTimestamp = (dateValue: string) => {

  const timestamp = new Date(`${dateValue}T00:00:00`).getTime();



  return Number.isFinite(timestamp) ? timestamp : 0;

};



const getDateEndTimestamp = (dateValue: string) => {

  const timestamp = new Date(`${dateValue}T23:59:59.999`).getTime();



  return Number.isFinite(timestamp) ? timestamp : 0;

};



const getHistoryDateKey = (time: string) => {

  const timestamp = getValidTimestamp(time);



  return timestamp === null ? '' : toDateInputValue(new Date(timestamp));

};



const formatChartNumber = (amount: number | null, maximumFractionDigits = 2) => {

  if (amount === null || !Number.isFinite(amount)) {

    return '-';

  }



  return new Intl.NumberFormat('zh-CN', {

    maximumFractionDigits

  }).format(roundToMoneyPrecision(amount));

};



const formatChartPercent = (numerator: number, denominator: number) => {

  if (denominator <= 0) {

    return '0%';

  }



  return `${((Math.abs(numerator) / Math.abs(denominator)) * 100).toFixed(1)}%`;

};



const clampNumber = (value: number, min: number, max: number) =>

  Math.min(max, Math.max(min, value));



const getRelativeDateLabel = (dateValue: string) => {

  const today = new Date();

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const targetStart = getDateTimestamp(dateValue);

  const dayDistance =

    targetStart === 0 ? 0 : Math.max(0, Math.floor((todayStart - targetStart) / DAY_MS));



  if (dayDistance === 0) {

    return '今天';

  }



  if (dayDistance === 1) {

    return '昨天';

  }



  return `${dayDistance} 天前`;

};



const getHistoryNetWorthDelta = (record: HistoryRecord) =>

  (record.afterAmount ?? 0) - (record.beforeAmount ?? 0);



const deriveRecentNetWorthChange = (history: HistoryRecord[]): RecentNetWorthChange => {

  const validRecords = history

    .map((record) => ({

      record,

      timestamp: getHistoryTimestamp(record),

      date: getHistoryDateKey(record.time)

    }))

    .filter((entry) => entry.timestamp > 0 && entry.date);



  if (validRecords.length === 0) {

    return null;

  }



  const latestDate = validRecords.reduce((latest, entry) =>

    entry.timestamp > latest.timestamp ? entry : latest

  ).date;

  const amount = validRecords

    .filter((entry) => entry.date === latestDate)

    .reduce((sum, entry) => sum + getHistoryNetWorthDelta(entry.record), 0);



  return {

    date: latestDate,

    amount,

    relativeLabel: getRelativeDateLabel(latestDate)

  };

};



const getHistoryOrder = (time: string, fallback: number) => {

  const timestamp = getValidTimestamp(time);

  return timestamp ?? fallback;

};



const getGroupColorRegistry = (groups: AssetGroup[], history: HistoryRecord[]) => {

  const registry = new Map<string, ChartColorItem>();



  groups.forEach((group, index) => {

    registry.set(group.name, {

      id: group.name,

      label: group.name,

      amount: 0,

      order: Number.MAX_SAFE_INTEGER - groups.length + index

    });

  });



  history.forEach((record, index) => {

    const order = getHistoryOrder(record.time, Number.MAX_SAFE_INTEGER - index);

    const existing = registry.get(record.groupName);



    if (!existing || order < existing.order) {

      registry.set(record.groupName, {

        id: record.groupName,

        label: record.groupName,

        amount: 0,

        order

      });

    }

  });



  return Array.from(registry.values());

};



const getActiveGroupTotal = (group: AssetGroup) =>

  toStoredAmountByNature(

    group.nature,

    group.accounts

      .filter((account) => !account.archived)

      .reduce((sum, account) => sum + account.amount, 0)

  );



const deriveAssetStructureData = (

  groups: AssetGroup[],

  history: HistoryRecord[],

  colorAssignmentMode: NetraflowChartColorAssignmentMode

): AssetStructureChartData => {

  const includedGroups = groups.filter((group) => group.includeInStats);

  const positiveSegments: ChartSegment[] = [];

  const negativeSegments: ChartSegment[] = [];

  const groupByName = new Map(includedGroups.map((group) => [group.name, group]));

  const displayItems = buildDisplayChartItems(

    includedGroups.map((group) => ({

      id: group.name,

      label: group.name,

      amount: Math.abs(getActiveGroupTotal(group)),

      order: group.sortOrder

    })),

    colorAssignmentMode,

    {

      registry: getGroupColorRegistry(groups, history),

      otherId: 'group-other',

      otherLabel: '其他'

    }

  );



  displayItems.forEach((item) => {

    const sourceGroups = item.sourceIds

      .map((sourceId) => groupByName.get(sourceId))

      .filter((group): group is AssetGroup => Boolean(group));

    const positiveAmount = sourceGroups

      .filter((group) => isPositiveNature(group.nature))

      .reduce((sum, group) => sum + Math.abs(getActiveGroupTotal(group)), 0);

    const negativeAmount = sourceGroups

      .filter((group) => !isPositiveNature(group.nature))

      .reduce((sum, group) => sum + Math.abs(getActiveGroupTotal(group)), 0);



    if (positiveAmount > 0) {

      positiveSegments.push({

        id: `${item.id}-positive`,

        label: item.label,

        amount: positiveAmount,

        color: item.color,

        sourceIds: item.sourceIds

      });

    }



    if (negativeAmount > 0) {

      negativeSegments.push({

        id: `${item.id}-negative`,

        label: item.label,

        amount: negativeAmount,

        color: item.color,

        sourceIds: item.sourceIds

      });

    }

  });



  const positiveTotal = positiveSegments.reduce((sum, segment) => sum + segment.amount, 0);

  const negativeTotal = negativeSegments.reduce((sum, segment) => sum + segment.amount, 0);



  return {

    positiveSegments,

    negativeSegments,

    positiveTotal,

    negativeTotal,

    debtRatio:

      positiveTotal > 0

        ? negativeTotal / positiveTotal

        : negativeTotal > 0

          ? Number.POSITIVE_INFINITY

          : 0

  };

};



const createCurrentChartState = (groups: AssetGroup[]) => {

  const state = new Map<string, ChartAccountState>();



  groups.forEach((group) => {

    if (!group.includeInStats) {

      return;

    }



    group.accounts.forEach((account) => {

      if (account.archived) {

        return;

      }



      state.set(account.id, {

        groupName: group.name,

        nature: group.nature,

        amount: toStoredAmountByNature(group.nature, account.amount)

      });

    });

  });



  return state;

};



const getChartGroupMeta = (groups: AssetGroup[], groupName: string) => {

  const group = groups.find((currentGroup) => currentGroup.name === groupName);



  return {

    nature: group?.nature ?? getLegacyNature(groupName),

    includeInStats: group?.includeInStats ?? true

  };

};



const setChartStateAmount = (

  state: Map<string, ChartAccountState>,

  groups: AssetGroup[],

  record: HistoryRecord,

  amount: number | null

) => {

  const meta = getChartGroupMeta(groups, record.groupName);



  if (!meta.includeInStats || amount === null) {

    state.delete(record.accountId);

    return;

  }



  state.set(record.accountId, {

    groupName: record.groupName,

    nature: meta.nature,

    amount: toStoredAmountByNature(meta.nature, amount)

  });

};



const rollbackHistoryRecordForTrend = (

  state: Map<string, ChartAccountState>,

  groups: AssetGroup[],

  record: HistoryRecord

) => {

  if (record.type === '新增') {

    setChartStateAmount(state, groups, record, record.beforeAmount);

    return;

  }



  if (record.type === '删除' || record.type === '归档') {

    setChartStateAmount(state, groups, record, record.beforeAmount);

    return;

  }



  if (record.type === '重新启用') {

    state.delete(record.accountId);

    return;

  }



  setChartStateAmount(state, groups, record, record.beforeAmount);

};



const sumChartState = (state: Map<string, ChartAccountState>) => {

  let positive = 0;

  let negative = 0;



  state.forEach((account) => {

    if (isPositiveNature(account.nature)) {

      positive += Math.abs(account.amount);

      return;

    }



    negative += Math.abs(account.amount);

  });



  return {

    positive,

    negative,

    net: positive - negative

  };

};



const getTrendChangeDateKeys = (history: HistoryRecord[]) =>

  Array.from(

    new Set(

      history

        .map((record) => getHistoryDateKey(record.time))

        .filter((date): date is string => Boolean(date))

    )

  ).sort((left, right) => getDateTimestamp(left) - getDateTimestamp(right));



const deriveAssetTrendPoints = (

  groups: AssetGroup[],

  history: HistoryRecord[],

  settings: AssetChartSettings['trend']

): TrendChartPoint[] => {

  const includedGroupNames = new Set(

    groups.filter((group) => group.includeInStats).map((group) => group.name)

  );

  const relevantHistory = history.filter((record) => {

    const meta = getChartGroupMeta(groups, record.groupName);

    return meta.includeInStats || includedGroupNames.has(record.groupName);

  });

  const changeDateKeys = getTrendChangeDateKeys(relevantHistory);

  const rangeDateKeys = getChartRangeDateKeys(settings.xAxisRange);

  const rangeStart = rangeDateKeys[0] ?? '';

  const rangeEnd = rangeDateKeys[rangeDateKeys.length - 1] ?? '';

  const changeDateKeysBeforeEnd = changeDateKeys.filter(

    (date) => !rangeEnd || getDateTimestamp(date) <= getDateTimestamp(rangeEnd)

  );



  if (changeDateKeysBeforeEnd.length < 2 || rangeDateKeys.length === 0) {

    return [];

  }



  const hasBaselineBeforeRange = changeDateKeysBeforeEnd.some(

    (date) => getDateTimestamp(date) < getDateTimestamp(rangeStart)

  );

  const firstChangeInRange = changeDateKeysBeforeEnd.find(

    (date) => getDateTimestamp(date) >= getDateTimestamp(rangeStart)

  );

  const firstPlotDate = hasBaselineBeforeRange ? rangeStart : firstChangeInRange;



  if (!firstPlotDate) {

    return [];

  }



  const pointDateKeys = rangeDateKeys.filter(

    (date) => getDateTimestamp(date) >= getDateTimestamp(firstPlotDate)

  );

  const changeDateKeySet = new Set(changeDateKeysBeforeEnd);



  const currentState = createCurrentChartState(groups);

  const recordsByTimeDesc = relevantHistory

    .map((record, index) => ({

      record,

      index,

      timestamp: getHistoryTimestamp(record)

    }))

    .filter((entry) => entry.timestamp > 0)

    .sort((left, right) => right.timestamp - left.timestamp || left.index - right.index);



  return pointDateKeys.map((date) => {

    const state = new Map(currentState);

    const cutoff = getDateEndTimestamp(date);



    recordsByTimeDesc.forEach((entry) => {

      if (entry.timestamp > cutoff) {

        rollbackHistoryRecordForTrend(state, groups, entry.record);

      }

    });



    return {

      date,

      kind: changeDateKeySet.has(date) ? 'change-date' : 'carry-forward',

      ...sumChartState(state)

    };

  });

};



const getGroupDetailHistory = (group: AssetGroup, history: HistoryRecord[]) => {

  const currentAccountIds = new Set(group.accounts.map((account) => account.id));



  return history.filter(

    (record) => record.groupName === group.name || currentAccountIds.has(record.accountId)

  );

};



const getAccountColorRegistry = (group: AssetGroup, history: HistoryRecord[]) => {

  const registry = new Map<string, ChartColorItem>();



  group.accounts.forEach((account, index) => {

    registry.set(account.id, {

      id: account.id,

      label: account.name,

      amount: 0,

      order: getHistoryOrder(account.createdAt, index)

    });

  });



  getGroupDetailHistory(group, history).forEach((record, index) => {

    const order = getHistoryOrder(record.time, Number.MAX_SAFE_INTEGER - index);

    const existing = registry.get(record.accountId);



    if (!existing || order < existing.order) {

      registry.set(record.accountId, {

        id: record.accountId,

        label: record.accountName,

        amount: 0,

        order

      });

    }

  });



  return Array.from(registry.values());

};



const createCurrentGroupDetailState = (group: AssetGroup) => {

  const state = new Map<string, { label: string; amount: number }>();



  group.accounts.forEach((account) => {

    if (account.archived) {

      return;

    }



    state.set(account.id, {

      label: account.name,

      amount: toStoredAmountByNature(group.nature, account.amount)

    });

  });



  return state;

};



const setGroupDetailStateAmount = (

  state: Map<string, { label: string; amount: number }>,

  group: AssetGroup,

  record: HistoryRecord,

  amount: number | null

) => {

  if (amount === null) {

    state.delete(record.accountId);

    return;

  }



  state.set(record.accountId, {

    label: record.accountName,

    amount: toStoredAmountByNature(group.nature, amount)

  });

};



const rollbackGroupDetailRecordForTrend = (

  state: Map<string, { label: string; amount: number }>,

  group: AssetGroup,

  record: HistoryRecord

) => {

  if (record.type === '新增') {

    setGroupDetailStateAmount(state, group, record, record.beforeAmount);

    return;

  }



  if (record.type === '删除' || record.type === '归档') {

    setGroupDetailStateAmount(state, group, record, record.beforeAmount);

    return;

  }



  if (record.type === '重新启用') {

    state.delete(record.accountId);

    return;

  }



  setGroupDetailStateAmount(state, group, record, record.beforeAmount);

};



const getGroupDetailStateAtDate = (

  group: AssetGroup,

  currentState: Map<string, { label: string; amount: number }>,

  recordsByTimeDesc: Array<{ record: HistoryRecord; timestamp: number; index: number }>,

  date: string

) => {

  const state = new Map(currentState);

  const cutoff = getDateEndTimestamp(date);



  recordsByTimeDesc.forEach((entry) => {

    if (entry.timestamp > cutoff) {

      rollbackGroupDetailRecordForTrend(state, group, entry.record);

    }

  });



  return state;

};



const deriveGroupDetailStructureData = (

  group: AssetGroup,

  history: HistoryRecord[],

  colorAssignmentMode: NetraflowChartColorAssignmentMode

): GroupDetailStructureData => {

  const registry = getAccountColorRegistry(group, history);

  const registryById = new Map(registry.map((item) => [item.id, item]));

  const activeAccounts = group.accounts.filter((account) => !account.archived);

  const segments = buildDisplayChartItems(

    activeAccounts.map((account, index) => ({

      id: account.id,

      label: account.name,

      amount: Math.abs(account.amount),

      order: registryById.get(account.id)?.order ?? getHistoryOrder(account.createdAt, index)

    })),

    colorAssignmentMode,

    {

      registry,

      otherId: `${group.name}-account-other`,

      otherLabel: '其他'

    }

  );

  const signedTotal = activeAccounts.reduce(

    (sum, account) => sum + toStoredAmountByNature(group.nature, account.amount),

    0

  );



  return {

    segments,

    total: segments.reduce((sum, segment) => sum + segment.amount, 0),

    signedTotal,

    nature: group.nature

  };

};



const deriveGroupDetailTrendData = (

  group: AssetGroup,

  history: HistoryRecord[],

  settings: CategoryDetailChartSettings,

  colorAssignmentMode: NetraflowChartColorAssignmentMode

): GroupDetailTrendData => {

  const relevantHistory = getGroupDetailHistory(group, history);

  const changeDateKeys = getTrendChangeDateKeys(relevantHistory);

  const rangeDateKeys = getChartRangeDateKeys(settings.xAxisRange);

  const rangeStart = rangeDateKeys[0] ?? '';

  const rangeEnd = rangeDateKeys[rangeDateKeys.length - 1] ?? '';

  const changeDateKeysBeforeEnd = changeDateKeys.filter(

    (date) => !rangeEnd || getDateTimestamp(date) <= getDateTimestamp(rangeEnd)

  );



  if (changeDateKeysBeforeEnd.length < 2 || rangeDateKeys.length === 0) {

    return { dates: [], pointKinds: [], series: [], totals: [], nature: group.nature };

  }



  const hasBaselineBeforeRange = changeDateKeysBeforeEnd.some(

    (date) => getDateTimestamp(date) < getDateTimestamp(rangeStart)

  );

  const firstChangeInRange = changeDateKeysBeforeEnd.find(

    (date) => getDateTimestamp(date) >= getDateTimestamp(rangeStart)

  );

  const firstPlotDate = hasBaselineBeforeRange ? rangeStart : firstChangeInRange;



  if (!firstPlotDate) {

    return { dates: [], pointKinds: [], series: [], totals: [], nature: group.nature };

  }



  const dates = rangeDateKeys.filter(

    (date) => getDateTimestamp(date) >= getDateTimestamp(firstPlotDate)

  );

  const changeDateKeySet = new Set(changeDateKeysBeforeEnd);

  const currentState = createCurrentGroupDetailState(group);

  const recordsByTimeDesc = relevantHistory

    .map((record, index) => ({

      record,

      index,

      timestamp: getHistoryTimestamp(record)

    }))

    .filter((entry) => entry.timestamp > 0)

    .sort((left, right) => right.timestamp - left.timestamp || left.index - right.index);

  const dailyStates = dates.map((date) =>

    getGroupDetailStateAtDate(group, currentState, recordsByTimeDesc, date)

  );

  const registry = getAccountColorRegistry(group, history);

  const registryById = new Map(registry.map((item) => [item.id, item]));

  const accountIds = new Set<string>();



  registry.forEach((item) => accountIds.add(item.id));

  dailyStates.forEach((state) => state.forEach((_, accountId) => accountIds.add(accountId)));



  const items = Array.from(accountIds).map((accountId) => {

    const values = dailyStates.map((state) => state.get(accountId)?.amount ?? 0);

    const latestValue = values[values.length - 1] ?? 0;

    const maxHistoricalValue = values.reduce(

      (maxValue, value) => Math.max(maxValue, Math.abs(value)),

      0

    );

    const account = group.accounts.find((currentAccount) => currentAccount.id === accountId);

    const registryItem = registryById.get(accountId);



    return {

      id: accountId,

      label:

        account?.name ??

        registryItem?.label ??

        dailyStates.find((state) => state.has(accountId))?.get(accountId)?.label ??

        accountId,

      archived: Boolean(account?.archived),

      amount: Math.abs(latestValue) > 0 ? Math.abs(latestValue) : maxHistoricalValue > 0 ? Number.EPSILON : 0,

      order: registryItem?.order ?? Number.MAX_SAFE_INTEGER,

      values

    };

  });

  const displayItems = buildDisplayChartItems(items, colorAssignmentMode, {

    registry,

    otherId: `${group.name}-trend-other`,

    otherLabel: '其他',

    ...(items.some((item) => item.archived) ? { maxItems: Number.MAX_SAFE_INTEGER } : {})

  });

  const valuesById = new Map(items.map((item) => [item.id, item.values]));

  const archivedById = new Map(items.map((item) => [item.id, item.archived]));

  const series = displayItems

    .map((item) => ({

      id: item.id,

      label: item.label,

      color: item.color,

      archived: item.sourceIds.length === 1 ? archivedById.get(item.sourceIds[0]) : false,

      values: dates.map((_, index) =>

        item.sourceIds.reduce(

          (sum, accountId) => sum + (valuesById.get(accountId)?.[index] ?? 0),

          0

        )

      )

    }))

    .filter((item) => item.values.some((value) => value !== 0));

  const totals = dates.map((_, index) =>

    series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0)

  );



  return {

    dates,

    pointKinds: dates.map((date) =>

      changeDateKeySet.has(date) ? 'change-date' : 'carry-forward'

    ),

    series,

    totals,

    nature: group.nature

  };

};



const getAccountDetailTitle = (groupName: string | undefined, accountName: string) => {

  const trimmedGroupName = groupName?.trim() ?? '';



  return trimmedGroupName ? `${trimmedGroupName} - ${accountName}` : accountName;

};



const getPageCoverage = (

  previousPageKey: string,

  nextPageKey: string,

  panel: 'main' | 'right'

): PageCoverage => {

  if (previousPageKey === nextPageKey) {

    return 'none';

  }



  return panel === 'main' ? 'full' : 'right-panel-only';

};



const getGlobalAccountDetailChartSettings = (

  trendSettings: AssetChartSettings['trend']

): AccountDetailChartSettings => ({

  adaptiveYAxis: trendSettings.adaptiveYAxis,

  xAxisRange: trendSettings.xAxisRange,

  pointValueMode: trendSettings.pointValueMode

});



const rollbackAccountRecordForTrend = (amount: number | null, record: HistoryRecord) => {

  if (record.type === '新增') {

    return record.beforeAmount;

  }



  if (record.type === '删除' || record.type === '归档') {

    return record.beforeAmount;

  }



  if (record.type === '重新启用') {

    return null;

  }



  return record.beforeAmount;

};



const deriveAccountTrendPoints = (

  account: Account,

  history: HistoryRecord[],

  settings: AccountDetailChartSettings

): TrendChartPoint[] => {

  const relevantHistory = history.filter((record) => record.accountId === account.id);

  const changeDateKeys = getTrendChangeDateKeys(relevantHistory);

  const rangeDateKeys = getChartRangeDateKeys(settings.xAxisRange);

  const rangeStart = rangeDateKeys[0] ?? '';

  const rangeEnd = rangeDateKeys[rangeDateKeys.length - 1] ?? '';

  const changeDateKeysBeforeEnd = changeDateKeys.filter(

    (date) => !rangeEnd || getDateTimestamp(date) <= getDateTimestamp(rangeEnd)

  );



  if (changeDateKeysBeforeEnd.length < 2 || rangeDateKeys.length === 0) {

    return [];

  }



  const hasBaselineBeforeRange = changeDateKeysBeforeEnd.some(

    (date) => getDateTimestamp(date) < getDateTimestamp(rangeStart)

  );

  const firstChangeInRange = changeDateKeysBeforeEnd.find(

    (date) => getDateTimestamp(date) >= getDateTimestamp(rangeStart)

  );

  const firstPlotDate = hasBaselineBeforeRange ? rangeStart : firstChangeInRange;



  if (!firstPlotDate) {

    return [];

  }



  const pointDateKeys = rangeDateKeys.filter(

    (date) => getDateTimestamp(date) >= getDateTimestamp(firstPlotDate)

  );

  const changeDateKeySet = new Set(changeDateKeysBeforeEnd);

  const recordsByTimeDesc = relevantHistory

    .map((record, index) => ({

      record,

      index,

      timestamp: getHistoryTimestamp(record)

    }))

    .filter((entry) => entry.timestamp > 0)

    .sort((left, right) => right.timestamp - left.timestamp || left.index - right.index);



  return pointDateKeys.map((date) => {

    const cutoff = getDateEndTimestamp(date);

    const amount = recordsByTimeDesc.reduce<number | null>((currentAmount, entry) => {

      if (entry.timestamp > cutoff) {

        return rollbackAccountRecordForTrend(currentAmount, entry.record);

      }



      return currentAmount;

    }, account.amount);

    const value = amount ?? 0;



    return {

      date,

      kind: changeDateKeySet.has(date) ? 'change-date' : 'carry-forward',

      net: value,

      positive: value,

      negative: value

    };

  });

};



const getCalendarDays = (monthDate: Date) => {

  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

  const leadingDays = (monthStart.getDay() + 6) % 7;

  const calendarStart = addDays(monthStart, -leadingDays);



  return Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));

};



const renderWindowControlIcon = (

  control: 'minimize' | 'maximize' | 'close',

  isWindowMaximized = false

): ReactNode => {

  const iconName = control === 'maximize' && isWindowMaximized ? 'restore' : control;

  const iconSvg = {

    minimize: NfWindowMinimizeIcon,

    maximize: NfWindowMaximizeIcon,

    restore: NfWindowRestoreIcon,

    close: NfWindowCloseIcon

  }[iconName];



  return (

    <NfSvgIcon

      svg={iconSvg}

      className={`window-control-icon window-control-icon--${iconName}`}

      decorative

    />

  );

};



const getAxisLabelIndexes = (count: number, range: TrendXAxisRange, width: number) => {

  return getChartAxisLabelIndexes(count, range, width);

};



const getValueLabelIndexes = (

  series: TrendChartSeries,

  mode: TrendPointValueMode,

  width: number

) => {

  return getChartValueLabelIndexes(series.values, mode, width);

};



const createSteppedHorizontalLinePath = (

  values: number[],

  getX: (index: number) => number,

  getY: (value: number) => number

) => {

  const commands: string[] = [];



  for (let index = 1; index < values.length; index += 1) {

    commands.push(

      `M ${getX(index - 1)} ${getY(values[index - 1])} H ${getX(index)}`

    );

  }



  return commands.join(' ');

};



const createSteppedVerticalLinePath = (

  values: number[],

  getX: (index: number) => number,

  getY: (value: number) => number

) => {

  const commands: string[] = [];



  for (let index = 1; index < values.length; index += 1) {

    if (values[index] !== values[index - 1]) {

      commands.push(

        `M ${getX(index)} ${getY(values[index - 1])} V ${getY(values[index])}`

      );

    }

  }



  return commands.join(' ');

};



const useMeasuredWidth = <T extends HTMLElement>() => {

  const ref = useRef<T | null>(null);

  const [width, setWidth] = useState(0);



  useEffect(() => {

    const element = ref.current;



    if (!element) {

      return;

    }



    const updateWidth = () => setWidth(element.getBoundingClientRect().width);

    updateWidth();



    if (typeof ResizeObserver === 'undefined') {

      window.addEventListener('resize', updateWidth);

      return () => window.removeEventListener('resize', updateWidth);

    }



    const observer = new ResizeObserver(updateWidth);

    observer.observe(element);



    return () => observer.disconnect();

  }, []);



  return [ref, width] as const;

};



function AccountTrendPanel({

  points,

  settings

}: {

  points: TrendChartPoint[];

  settings: AccountDetailChartSettings;

}) {

  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);

  const [isDetailMode, setIsDetailMode] = useState(false);

  const chartSettings: AssetChartSettings['trend'] = {

    assetDisplay: 'net',

    adaptiveYAxis: settings.adaptiveYAxis,

    xAxisRange: settings.xAxisRange,

    pointValueMode: settings.pointValueMode

  };



  return (

    <section className="asset-chart-panel account-chart-panel">

      <header className="asset-chart-panel__header chart-visual-text">

        <div>

          <h2>账户趋势</h2>

        </div>

      </header>

      <AssetTrendChart

        points={points}

        settings={chartSettings}

        formatMoney={formatChartNumber}

        activeSeriesId={isDetailMode ? null : hoveredSeriesId}

        onSeriesHover={setHoveredSeriesId}

        detailMode={isDetailMode}

        onDetailModeChange={(enabled) => {

          setIsDetailMode(enabled);

          setHoveredSeriesId(null);

        }}

      />

    </section>

  );

}



function GroupDetailStructurePanel({

  data

}: {

  data: GroupDetailStructureData;

}) {

  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);

  const legendRows = data.segments.map((segment) => ({

    ...segment,

    percent: formatChartPercent(segment.amount, data.total)

  }));

  const legendItems: ChartLegendItemData[] = legendRows.map((segment) => ({

    id: segment.id,

    label: segment.label,

    color: segment.color,

    value: formatChartNumber(segment.amount),

    detail: segment.percent,

    archived: segment.archived

  }));



  return (

    <section className="asset-chart-panel">

      <header className="asset-chart-panel__header chart-visual-text">

        <div>

          <h2>账户占比</h2>

        </div>

      </header>



      <div className="asset-structure-detail">

        <div className="asset-structure-graphic">

          <svg viewBox="0 0 120 120" role="img">

            <circle cx="60" cy="60" r="38" fill="var(--chart-center-bg)" />

            <PieSegments

              segments={data.segments}

              total={data.total}

              cx={60}

              cy={60}

              radius={34}

              activeSegmentId={hoveredSeriesId}

              onSegmentHover={setHoveredSeriesId}

              formatMoney={formatChartNumber}

            />

            {data.total <= 0 ? (

              <text

                x="60"

                y="62"

                textAnchor="middle"

                dominantBaseline="middle"

                fill="var(--chart-axis-text)"

                fontSize="8.5"

                fontWeight="700"

                className="chart-svg-text"

              >

                暂无占比

              </text>

            ) : null}

          </svg>

        </div>

        <ChartLegendList

          items={legendItems}

          emptyMessage="暂无账户占比"

          activeId={hoveredSeriesId}

          onActiveIdChange={setHoveredSeriesId}

        />

      </div>

    </section>

  );

}



const getGroupDetailTrendBoundaryMessage = (data: GroupDetailTrendData) => {

  if (data.dates.length < 2 || data.series.length === 0) {

    return '暂无足够数据';

  }



  if (data.totals.every((value) => value === 0)) {

    return '当前趋势为 0';

  }



  return null;

};



function GroupDetailTrendChart({

  data,

  settings,

  activeSeriesId,

  onSeriesHover,

  detailMode = false,

  onDetailModeChange

}: {

  data: GroupDetailTrendData;

  settings: CategoryDetailChartSettings;

  activeSeriesId?: string | null;

  onSeriesHover?: (id: string | null) => void;

  detailMode?: boolean;

  onDetailModeChange?: (enabled: boolean) => void;

}) {

  const [containerRef, measuredWidth] = useMeasuredWidth<HTMLDivElement>();

  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  const message = getGroupDetailTrendBoundaryMessage(data);

  const densityWidth = measuredWidth || 620;

  const isDetailMode = detailMode;

  const chartActiveSeriesId = isDetailMode ? null : activeSeriesId;



  useEffect(() => {

    setDetailIndex(null);

  }, [isDetailMode, data.dates, data.pointKinds]);



  if (message) {

    return (

      <div ref={containerRef} className="asset-trend-chart is-empty">

        <span className="chart-visual-text">{message}</span>

      </div>

    );

  }



  const viewWidth = 640;

  const viewHeight = 300;

  const padding = { top: 28, right: 32, bottom: 46, left: 56 };

  const plotWidth = viewWidth - padding.left - padding.right;

  const plotHeight = viewHeight - padding.top - padding.bottom;

  const layers = buildSteppedStackLayers(data.series);

  const yScale = getZeroAnchoredStackedYAxisScale(

    data.totals,

    isPositiveNature(data.nature) ? 'positive' : 'negative'

  );

  const [yMin, yMax] = yScale.domain;



  const getX = (index: number) =>

    padding.left + (data.dates.length === 1 ? 0 : (index / (data.dates.length - 1)) * plotWidth);

  const getY = (value: number) =>

    padding.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;

  const getValueLabelLayout = (index: number, value: number) =>

    getChartValueLabelLayout({

      pointX: getX(index),

      pointY: getY(value),

      plotLeft: padding.left,

      plotTop: padding.top,

      plotWidth,

      plotHeight,

      preferBelow: value < 0,

      labelWidth: 70

    });

  const axisLabelIndexes = getAxisLabelIndexes(data.dates.length, settings.xAxisRange, densityWidth);

  const yAxisLabels = yScale.ticks;

  const valueLabelIndexes = getValueLabelIndexes(

    {

      key: 'net',

      label: '合计',

      color: CHART_COLORS.netLine,

      values: data.totals

    },

    settings.pointValueMode,

    densityWidth

  );

  const detailPointProxies = data.dates.map((_, index) => ({

    kind: data.pointKinds[index]

  }));

  const updateDetailIndexFromMouse = (event: MouseEvent<SVGSVGElement>) => {

    if (!isDetailMode) {

      return;

    }



    const bounds = event.currentTarget.getBoundingClientRect();

    const cursorX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * viewWidth;

    const cursorY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * viewHeight;



    if (

      cursorX < padding.left ||

      cursorX > padding.left + plotWidth ||

      cursorY < padding.top ||

      cursorY > padding.top + plotHeight

    ) {

      setDetailIndex(null);

      return;

    }



    const nearestIndex = getNearestChangeDatePointIndex(detailPointProxies, cursorX, getX);

    setDetailIndex(nearestIndex >= 0 ? nearestIndex : null);

  };

  const toggleDetailMode = () => {

    onSeriesHover?.(null);

    setDetailIndex(null);

    onDetailModeChange?.(!isDetailMode);

  };

  const detailValue = detailIndex === null ? 0 : data.totals[detailIndex] ?? 0;

  const detailX = detailIndex === null ? 0 : getX(detailIndex);

  const detailY = detailIndex === null ? 0 : getY(detailValue);

  const detailColor = CHART_COLORS.netLine;

  const detailBubbleWidth = 116;

  const detailBubbleX =

    detailIndex === null

      ? 0

      : clampNumber(

          detailX + (detailX > viewWidth - detailBubbleWidth - 14 ? -detailBubbleWidth - 10 : 10),

          padding.left,

          viewWidth - detailBubbleWidth - 4

        );

  const detailBubbleY =

    detailIndex === null

      ? 0

      : clampNumber(detailY - 30, padding.top + 4, padding.top + plotHeight - 28);



  return (

    <div ref={containerRef} className="asset-trend-chart">

      <svg

        viewBox={`0 0 ${viewWidth} ${viewHeight}`}

        role="img"

        onDoubleClick={toggleDetailMode}

        onMouseMove={isDetailMode ? updateDetailIndexFromMouse : undefined}

        onMouseLeave={() => {

          setDetailIndex(null);

          if (!isDetailMode) {

            onSeriesHover?.(null);

          }

        }}

      >

        <line

          x1={padding.left}

          y1={padding.top}

          x2={padding.left}

          y2={padding.top + plotHeight}

          stroke="var(--chart-axis-line)"

        />

        <line

          x1={padding.left}

          y1={getY(0)}

          x2={padding.left + plotWidth}

          y2={getY(0)}

          stroke="var(--chart-axis-line)"

        />

        {yAxisLabels.map((value) => {

          const y = getY(value);



          return (

            <g key={value}>

              <line

                x1={padding.left}

                y1={y}

                x2={padding.left + plotWidth}

                y2={y}

                stroke="var(--chart-grid-line)"

              />

              <text

                x={padding.left - 8}

                y={y + 3}

                textAnchor="end"

                fill="var(--chart-axis-text)"

                fontSize="10"

                className="chart-svg-text"

              >

                {formatChartNumber(value)}

              </text>

            </g>

          );

        })}

        {axisLabelIndexes.map((index) => (

          <text

            key={data.dates[index]}

            x={getX(index)}

            y={viewHeight - 14}

            textAnchor="middle"

            fill="var(--chart-axis-text)"

            fontSize="10"

            className="chart-svg-text"

          >

            {data.dates[index].slice(5)}

          </text>

        ))}

        {layers.map((layer) => {

          const isActive = chartActiveSeriesId === layer.series.id;

          const isDimmed = Boolean(chartActiveSeriesId && chartActiveSeriesId !== layer.series.id);

          const areaPath = createSteppedAreaPath(layer.upperValues, layer.lowerValues, getX, getY);

          const horizontalPath = createSteppedHorizontalLinePath(layer.upperValues, getX, getY);

          const verticalPath = createSteppedVerticalLinePath(layer.upperValues, getX, getY);



          return (

            <g key={layer.series.id}>

              <path

                d={areaPath}

                fill={layer.series.color}

                fillOpacity={isActive ? 0.56 : isDimmed ? 0.22 : 0.38}

                stroke="none"

                className={getInteractiveChartClassName(

                  'chart-shape chart-shape--stacked-area',

                  layer.series.id,

                  chartActiveSeriesId

                )}

                onMouseEnter={() => {

                  if (!isDetailMode) {

                    onSeriesHover?.(layer.series.id);

                  }

                }}

                onMouseLeave={() => {

                  if (!isDetailMode) {

                    onSeriesHover?.(null);

                  }

                }}

              >

                <title>{getArchivedChartTooltipLabel(layer.series.label, layer.series.archived)}</title>

              </path>

              <path

                d={horizontalPath}

                fill="none"

                stroke={layer.series.color}

                strokeWidth={isActive ? 2 : 1.35}

                strokeOpacity={isActive ? 0.92 : isDimmed ? 0.42 : 0.76}

                strokeLinecap="butt"

                pointerEvents="none"

                className={getInteractiveChartClassName(

                  'chart-series-line chart-series-line--stacked-boundary',

                  layer.series.id,

                  chartActiveSeriesId

                )}

              />

              <path

                d={verticalPath}

                fill="none"

                stroke={layer.series.color}

                strokeWidth={isActive ? 1.8 : 1.2}

                strokeOpacity={isActive ? 0.5 : isDimmed ? 0.16 : 0.3}

                strokeLinecap="butt"

                pointerEvents="none"

                className={getInteractiveChartClassName(

                  'chart-series-line chart-series-line--stacked-boundary',

                  layer.series.id,

                  chartActiveSeriesId

                )}

              />

            </g>

          );

        })}

        {valueLabelIndexes.map((index) => {

          const value = data.totals[index];

          const labelLayout = getValueLabelLayout(index, value);



          return (

            <text

              key={`group-total-value-${data.dates[index]}`}

              x={labelLayout.x}

              y={labelLayout.y}

              textAnchor={labelLayout.textAnchor}

              fill="var(--chart-axis-text)"

              fontSize="10"

              fontWeight="700"

              className="chart-svg-text chart-value-label"

            >

              {formatChartNumber(value)}

            </text>

          );

        })}

        {isDetailMode && detailIndex !== null ? (

          <g className="chart-detail-readout" pointerEvents="none">

            <line

              x1={padding.left}

              y1={detailY}

              x2={detailX}

              y2={detailY}

              className="chart-detail-readout__guide"

            />

            <line

              x1={detailX}

              y1={detailY}

              x2={detailX}

              y2={padding.top + plotHeight}

              className="chart-detail-readout__guide"

            />

            <circle

              cx={detailX}

              cy={detailY}

              r="4.1"

              fill="var(--chart-point-fill)"

              stroke={detailColor}

              strokeWidth="1.7"

            />

            <text

              x={padding.left - 8}

              y={clampNumber(detailY - 6, padding.top + 10, padding.top + plotHeight - 6)}

              textAnchor="end"

              className="chart-detail-readout__axis-label chart-svg-text"

            >

              {formatChartNumber(detailValue)}

            </text>

            <text

              x={detailX}

              y={padding.top + plotHeight + 28}

              textAnchor="middle"

              className="chart-detail-readout__axis-label chart-svg-text"

            >

              {data.dates[detailIndex]}

            </text>

            <rect

              x={detailBubbleX}

              y={detailBubbleY}

              width={detailBubbleWidth}

              height="24"

              rx="6"

              className="chart-detail-readout__bubble"

            />

            <text

              x={detailBubbleX + 8}

              y={detailBubbleY + 15.5}

              className="chart-detail-readout__bubble-text chart-svg-text"

            >

              合计 {formatChartNumber(detailValue)}

            </text>

          </g>

        ) : null}

      </svg>

    </div>

  );

}



function GroupDetailTrendPanel({

  data,

  settings

}: {

  data: GroupDetailTrendData;

  settings: CategoryDetailChartSettings;

}) {

  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);

  const [isDetailMode, setIsDetailMode] = useState(false);

  const lastIndex = Math.max(0, data.dates.length - 1);

  const latestTotal = Math.abs(data.totals[lastIndex] ?? 0);

  const legendItems: ChartLegendItemData[] = data.series.map((item) => {

    const latestValue = item.values[lastIndex] ?? 0;



    return {

      id: item.id,

      label: item.label,

      color: item.color,

      value: formatChartNumber(latestValue),

      detail: formatChartPercent(latestValue, latestTotal),

      archived: item.archived

    };

  });



  return (

    <section className="asset-chart-panel">

      <header className="asset-chart-panel__header chart-visual-text">

        <div>

          <h2>账户趋势</h2>

        </div>

      </header>

      <GroupDetailTrendChart

        data={data}

        settings={settings}

        activeSeriesId={isDetailMode ? null : hoveredSeriesId}

        onSeriesHover={setHoveredSeriesId}

        detailMode={isDetailMode}

        onDetailModeChange={(enabled) => {

          setIsDetailMode(enabled);

          setHoveredSeriesId(null);

        }}

      />

      <ChartLegendList

        items={legendItems}

        emptyMessage="暂无账户趋势"

        activeId={isDetailMode ? null : hoveredSeriesId}

        onActiveIdChange={isDetailMode ? undefined : setHoveredSeriesId}

      />

    </section>

  );

}



const normalizeTypeSearchText = (value: string) => value.trim().toLocaleLowerCase('zh-CN');



const getSubsequenceMatchScore = (candidate: string, query: string) => {

  let queryIndex = 0;

  let score = 0;



  for (const character of candidate) {

    if (character === query[queryIndex]) {

      queryIndex += 1;

      score += 1;

    }

  }



  return queryIndex === query.length ? score : null;

};



const getAccountTypeMatchScore = (name: string, query: string) => {

  const candidate = normalizeTypeSearchText(name);



  if (!query || !candidate) {

    return -1;

  }



  if (candidate === query) {

    return 1000;

  }



  if (candidate.startsWith(query)) {

    return 900 - (candidate.length - query.length);

  }



  const includedAt = candidate.indexOf(query);



  if (includedAt >= 0) {

    return 700 - includedAt - (candidate.length - query.length) * 0.1;

  }



  const subsequenceScore = getSubsequenceMatchScore(candidate, query);



  if (subsequenceScore !== null) {

    return 500 + subsequenceScore;

  }



  const queryCharacters = Array.from(new Set(query));

  const overlapCount = queryCharacters.filter((character) =>

    candidate.includes(character)

  ).length;



  return overlapCount > 0 ? 100 + overlapCount / queryCharacters.length : -1;

};



const findBestAccountTypeMatch = (groups: AssetGroup[], input: string) => {

  const query = normalizeTypeSearchText(input);



  if (!query) {

    return null;

  }



  return groups

    .map((group, index) => ({

      group,

      index,

      score: getAccountTypeMatchScore(group.name, query)

    }))

    .filter((result) => result.score >= 0)

    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.group ?? null;

};



const getAccountTypeGhostText = (input: string, match: AssetGroup | null) => {

  const trimmedInput = input.trim();



  if (!trimmedInput || !match) {

    return '';

  }



  const normalizedInput = normalizeTypeSearchText(trimmedInput);

  const normalizedMatch = normalizeTypeSearchText(match.name);



  if (normalizedInput === normalizedMatch) {

    return '';

  }



  if (normalizedMatch.startsWith(normalizedInput)) {

    return match.name.slice(trimmedInput.length);

  }



  return ` → ${match.name}`;

};





function App() {

  const mainContentRef = useRef<HTMLElement | null>(null);

  const leftLayerPanelRef = useRef<HTMLElement | null>(null);

  const rightActionPanelRef = useRef<HTMLElement | null>(null);

  const previousMainPageKeyRef = useRef('');

  const previousLeftLayerKeyRef = useRef('');

  const previousLeftLayerPanelKeyRef = useRef('');

  const previousRightPanelKeyRef = useRef('');

  const sessionMainScrollPositionsRef = useRef<Record<string, number>>({});

  const sessionLeftLayerScrollPositionsRef = useRef<Record<string, number>>({});

  const sessionRightPanelScrollPositionsRef = useRef<Record<string, number>>({});

  const skipNextMainScrollResetRef = useRef(false);

  const groupLongPressTimerRef = useRef<number | null>(null);

  const groupPointerInteractionRef = useRef<GroupPointerInteraction | null>(null);

  const groupDoubleClickCandidateRef = useRef<{ groupName: string; time: number } | null>(null);

  const suppressGroupClickRef = useRef(false);

  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  const rollupFileInputRef = useRef<HTMLInputElement | null>(null);

  const userSettingsFileInputRef = useRef<HTMLInputElement | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const flashSequenceInputRef = useRef<HTMLInputElement | null>(null);

  const flashEditInputRef = useRef<HTMLInputElement | null>(null);

  const flashCorrectionEntrySnapshotRef = useRef<FlashCorrectionEntrySnapshot | null>(null);

  const flashCorrectionTouchedRef = useRef(false);

  const searchInteractionHoldUntilRef = useRef(0);

  const newAccountTypeInputRef = useRef<HTMLInputElement | null>(null);

  const autoSnapshotCycleInputRef = useRef<HTMLInputElement | null>(null);

  const autoLockTimerRef = useRef<number | null>(null);

  const snapshotPasswordRevealTimerRef = useRef<number | null>(null);

  const catPetTimerRef = useRef<number | null>(null);

  const secretConsoleInputRef = useRef<HTMLInputElement | null>(null);

  const secretConsoleLongPressTimerRef = useRef<number | null>(null);

  const secretConsoleHighlightTimerRef = useRef<number | null>(null);

  const lastCatPetAtRef = useRef(0);

  const catPetCountRef = useRef(0);

  const realDataBeforeExampleRef = useRef<ExampleModeRealSnapshot | null>(null);

  const toastTimerRefs = useRef<number[]>([]);

  const [appData, setAppData] = useState<AppData>(loadAppData);

  const [, setFirstWelcomeState] = useState<FirstWelcomeState>(loadFirstWelcomeState);

  const [firstWelcomeStage, setFirstWelcomeStage] = useState<FirstWelcomeStage>(() =>

    shouldShowFirstWelcome(loadFirstWelcomeState()) ? 'welcome' : null

  );

  const [editingAccount, setEditingAccount] = useState<AccountPointer>(null);

  const [selectedAccount, setSelectedAccount] = useState<AccountPointer>(null);

  const [isQuickSingleEntryAccountPickerOpen, setIsQuickSingleEntryAccountPickerOpen] =

    useState(false);

  const [accountOperationEntrySource, setAccountOperationEntrySource] =

    useState<AccountOperationEntrySource>('account-detail');

  const [isRollupImportOpen, setIsRollupImportOpen] = useState(false);

  const [rollupPromptTab, setRollupPromptTab] = useState<RollupPromptTab>('explanation');

  const [rollupPasteText, setRollupPasteText] = useState('');

  const [rollupImportError, setRollupImportError] = useState('');

  const [rollupImportReview, setRollupImportReview] = useState<RollupImportReview | null>(null);

  const [rollupImportHash, setRollupImportHash] = useState('');

  const [rollupImportedHashes, setRollupImportedHashes] = useState(loadRollupImportHashes);

  const [rollupAccountAssignments, setRollupAccountAssignments] = useState<

    Record<string, RollupAccountAssignment | null>

  >({});

  const [rollupPendingNewAccountKey, setRollupPendingNewAccountKey] = useState('');

  const [isFlashNoteOpen, setIsFlashNoteOpen] = useState(false);

  const [flashNoteStage, setFlashNoteStage] = useState<FlashNoteStage>('select');

  const [flashNoteAccount, setFlashNoteAccount] = useState<AccountPointer>(null);

  const [flashVisibleMonth, setFlashVisibleMonth] = useState(() => getFlashDefaultVisibleMonth());

  const [flashStartDate, setFlashStartDate] = useState('');

  const [flashEndDate, setFlashEndDate] = useState('');

  const [flashSelectedDates, setFlashSelectedDates] = useState<string[]>([]);

  const [flashSelectionMode, setFlashSelectionMode] =

    useState<FlashNoteSelectionMode>('replace');

  const [flashActiveDateRule, setFlashActiveDateRule] = useState<FlashNoteDateRule | null>(null);

  const [flashDragStartDate, setFlashDragStartDate] = useState('');

  const [flashDragPreviewDates, setFlashDragPreviewDates] = useState<string[]>([]);

  const [flashKeyboardDate, setFlashKeyboardDate] = useState('');

  const [flashInputMode, setFlashInputMode] = useState<FlashNoteInputMode>('change');

  const [flashCells, setFlashCells] = useState<Record<string, FlashNoteCell>>({});

  const [flashInputCursor, setFlashInputCursor] = useState(0);

  const [flashCurrentInput, setFlashCurrentInput] = useState('');

  const [isFlashInputTailLocked, setIsFlashInputTailLocked] = useState(false);

  const [flashCorrectionSelection, setFlashCorrectionSelection] = useState<string[]>([]);

  const [flashCorrectionRangeStart, setFlashCorrectionRangeStart] = useState('');

  const [flashCorrectionRangeEnd, setFlashCorrectionRangeEnd] = useState('');

  const [flashStashSegments, setFlashStashSegments] = useState<FlashNoteStashSegment[]>([]);

  const [flashContextMenu, setFlashContextMenu] = useState<FlashNoteContextMenu>(null);

  const [flashEditingDate, setFlashEditingDate] = useState('');

  const [, setFlashEditingValue] = useState('');

  const [flashShortcutHintHidden, setFlashShortcutHintHidden] = useState(false);

  const [isFlashExitConfirmOpen, setIsFlashExitConfirmOpen] = useState(false);

  const [isFlashReturnDateConfirmOpen, setIsFlashReturnDateConfirmOpen] = useState(false);

  const [isFlashReturnSequenceConfirmOpen, setIsFlashReturnSequenceConfirmOpen] = useState(false);

  const [editingAccountInfo, setEditingAccountInfo] = useState<AccountPointer>(null);

  const [accountTypeEditor, setAccountTypeEditor] = useState<AccountTypeEditorState>(null);

  const [expandedGroupNames, setExpandedGroupNames] = useState<string[]>([]);

  const [isGroupEditMode, setIsGroupEditMode] = useState(false);

  const [isAddingAccount, setIsAddingAccount] = useState(false);

  const [isArchivedAccountsOpen, setIsArchivedAccountsOpen] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [historyPanelView, setHistoryPanelView] = useState<HistoryPanelView>('history');

  const [backupReturnTarget, setBackupReturnTarget] =

    useState<BackupReturnTarget>('history');

  const [lastBackupAt, setLastBackupAt] = useState(loadLastBackupAt);

  const [lastBackupHistoryCount, setLastBackupHistoryCount] = useState(() =>

    loadLastBackupHistoryCount(appData.history.length)

  );

  const [backupRecords, setBackupRecords] = useState(loadBackupRecords);

  const [autoBackupSettings, setAutoBackupSettings] = useState(loadAutoBackupSettings);

  const [autoBackupDraft, setAutoBackupDraft] =

    useState<AutoBackupSettings>(() => autoBackupSettings);

  const [autoBackupCycleValueInput, setAutoBackupCycleValueInput] = useState(() =>

    String(autoBackupSettings.cycle.value)

  );

  const [assetChartSettings, setAssetChartSettings] = useState(loadAssetChartSettings);

  const [globalSettings, setGlobalSettings] = useState(loadGlobalSettings);

  const [selectedExampleTemplateId, setSelectedExampleTemplateId] =

    useState<ExampleTemplateId>('light');

  const [isExampleMode, setIsExampleMode] = useState(false);

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  const [isLocked, setIsLocked] = useState(() => loadGlobalSettings().passwordProtectionEnabled);

  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');

  const [unlockError, setUnlockError] = useState('');

  const [isUnlocking, setIsUnlocking] = useState(false);

  const [passwordEditorMode, setPasswordEditorMode] = useState<PasswordEditorMode>(null);

  const [oldPasswordInput, setOldPasswordInput] = useState('');

  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  const [passwordEditorError, setPasswordEditorError] = useState('');

  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [autoLockMinutesInput, setAutoLockMinutesInput] = useState(() =>

    String(loadGlobalSettings().autoLockMinutes)

  );

  const [isPasswordDisableConfirmOpen, setIsPasswordDisableConfirmOpen] = useState(false);

  const [passwordDisableInput, setPasswordDisableInput] = useState('');

  const [passwordDisableError, setPasswordDisableError] = useState('');

  const [isDisablingPasswordProtection, setIsDisablingPasswordProtection] = useState(false);

  const [snapshotPasswordEditorMode, setSnapshotPasswordEditorMode] =

    useState<SnapshotPasswordEditorMode>(null);

  const [

    shouldEnableSnapshotEncryptionAfterPasswordSave,

    setShouldEnableSnapshotEncryptionAfterPasswordSave

  ] = useState(false);

  const [oldSnapshotPasswordInput, setOldSnapshotPasswordInput] = useState('');

  const [newSnapshotPasswordInput, setNewSnapshotPasswordInput] = useState('');

  const [confirmSnapshotPasswordInput, setConfirmSnapshotPasswordInput] = useState('');

  const [snapshotPasswordEditorError, setSnapshotPasswordEditorError] = useState('');

  const [isSavingSnapshotPassword, setIsSavingSnapshotPassword] = useState(false);

  const [visibleSnapshotPasswordField, setVisibleSnapshotPasswordField] =

    useState<'new' | 'confirm' | null>(null);

  const [isSnapshotEncryptionDisableConfirmOpen, setIsSnapshotEncryptionDisableConfirmOpen] =

    useState(false);

  const [snapshotEncryptionDisableInput, setSnapshotEncryptionDisableInput] = useState('');

  const [snapshotEncryptionDisableError, setSnapshotEncryptionDisableError] = useState('');

  const [isDisablingSnapshotEncryption, setIsDisablingSnapshotEncryption] = useState(false);

  const [isCalendarVisible, setIsCalendarVisible] = useState(true);

  const [isAccountActionMenuOpen, setIsAccountActionMenuOpen] = useState(false);

  const [isDangerActionsOpen, setIsDangerActionsOpen] = useState(false);

  const [confirmationDialog, setConfirmationDialog] =

    useState<ConfirmationDialogState>(null);

  const [noticeDialog, setNoticeDialog] = useState<NoticeDialogState>(null);

  const [inputDialog, setInputDialog] = useState<InputDialogState>(null);

  const [inputDialogValue, setInputDialogValue] = useState('');

  const [resetConfirmation, setResetConfirmation] = useState<ResetConfirmationState>(null);

  const [resetConfirmationInput, setResetConfirmationInput] = useState('');

  const [isCatPetted, setIsCatPetted] = useState(false);

  const [isSecretConsoleOpen, setIsSecretConsoleOpen] = useState(false);

  const [secretConsoleInput, setSecretConsoleInput] = useState('');

  const [secretConsolePlaceholder, setSecretConsolePlaceholder] = useState(

    SECRET_CONSOLE_DEFAULT_PLACEHOLDER

  );

  const [isSecretConsoleHighlighted, setIsSecretConsoleHighlighted] = useState(false);

  const [expandedDetailDates, setExpandedDetailDates] = useState<string[]>([]);

  const [editMode, setEditMode] = useState<EditMode>('set');

  const [draftAmount, setDraftAmount] = useState('');

  const [adjustAmountInput, setAdjustAmountInput] = useState('');

  const [adjustDirection, setAdjustDirection] = useState<AdjustDirection>('increase');

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

  const [accountTypeNameDraft, setAccountTypeNameDraft] = useState('');

  const [accountTypeNatureDraft, setAccountTypeNatureDraft] =

    useState<AccountTypeNature>('asset');

  const [accountTypeStatsDraft, setAccountTypeStatsDraft] = useState(true);

  const [accountTypeError, setAccountTypeError] = useState('');

  const [groupDetailNameDraft, setGroupDetailNameDraft] = useState('');

  const [groupDetailNatureDraft, setGroupDetailNatureDraft] =

    useState<AccountTypeNature>('asset');

  const [groupDetailStatsDraft, setGroupDetailStatsDraft] = useState(true);

  const [groupDetailError, setGroupDetailError] = useState('');

  const [draggingGroupName, setDraggingGroupName] = useState('');

  const [newAccountGroupName, setNewAccountGroupName] = useState('');

  const [newAccountTypeInput, setNewAccountTypeInput] = useState('');

  const [newAccountName, setNewAccountName] = useState('');

  const [newAccountAmount, setNewAccountAmount] = useState('');

  const [newAccountError, setNewAccountError] = useState('');

  const [archivedAccountSearchQuery, setArchivedAccountSearchQuery] = useState('');

  const [isTotalChartsOpen, setIsTotalChartsOpen] = useState(false);

  const [isAccountChartsOpen, setIsAccountChartsOpen] = useState(false);

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  const [selectedGroupDetailName, setSelectedGroupDetailName] = useState('');

  const [globalSettingsSection, setGlobalSettingsSection] =

    useState<GlobalSettingsSection>('appearance');

  const [historyStartDate, setHistoryStartDate] = useState('');

  const [historyEndDate, setHistoryEndDate] = useState('');

  const [historyRangeInput, setHistoryRangeInput] = useState('');

  const [searchState, dispatchSearchState] = useReducer(

    searchStateReducer<SearchNavigationSnapshot>,

    undefined,

    createInitialSearchState<SearchNavigationSnapshot>

  );

  const [highlightedHistoryRecordId, setHighlightedHistoryRecordId] = useState('');

  const [highlightedBackupRecordId, setHighlightedBackupRecordId] = useState('');

  const [searchTargetScrollKey, setSearchTargetScrollKey] = useState(0);

  const [calendarMonth, setCalendarMonth] = useState(() => getHistoryCalendarLeadMonth());

  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  const resolvedTheme = useMemo(

    () => resolveThemeMode(globalSettings.themeMode, systemTheme),

    [globalSettings.themeMode, systemTheme]

  );

  const effectiveThemeStyle: ThemeStyle = globalSettings.nyaaThemeUnlocked

    ? globalSettings.themeStyle

    : 'default';



  const openSearch = () => {

    dispatchSearchState({ type: 'open' });

  };



  const closeSearch = () => {

    dispatchSearchState({ type: 'close-and-reset' });

  };



  const clearSecretConsoleLongPress = () => {

    if (secretConsoleLongPressTimerRef.current === null) {

      return;

    }



    window.clearTimeout(secretConsoleLongPressTimerRef.current);

    secretConsoleLongPressTimerRef.current = null;

  };



  const clearSecretConsoleHighlight = () => {

    if (secretConsoleHighlightTimerRef.current === null) {

      return;

    }



    window.clearTimeout(secretConsoleHighlightTimerRef.current);

    secretConsoleHighlightTimerRef.current = null;

  };



  const closeSecretConsole = () => {

    clearSecretConsoleLongPress();

    clearSecretConsoleHighlight();

    setIsSecretConsoleOpen(false);

    setSecretConsoleInput('');

    setSecretConsolePlaceholder(SECRET_CONSOLE_DEFAULT_PLACEHOLDER);

    setIsSecretConsoleHighlighted(false);

  };



  const clearSecretConsoleResultPlaceholder = () => {

    if (secretConsolePlaceholder !== SECRET_CONSOLE_DEFAULT_PLACEHOLDER) {

      setSecretConsolePlaceholder(SECRET_CONSOLE_DEFAULT_PLACEHOLDER);

    }



    if (isSecretConsoleHighlighted) {

      clearSecretConsoleHighlight();

      setIsSecretConsoleHighlighted(false);

    }

  };



  const openSecretConsole = () => {

    clearSecretConsoleLongPress();

    clearSecretConsoleHighlight();

    setIsSecretConsoleOpen(true);

    setSecretConsoleInput('');

    setSecretConsolePlaceholder(SECRET_CONSOLE_DEFAULT_PLACEHOLDER);

    setIsSecretConsoleHighlighted(false);

  };



  const startAboutVersionLongPress = (event: PointerEvent<HTMLElement>) => {

    if (event.pointerType === 'mouse' && event.button !== 0) {

      return;

    }



    clearSecretConsoleLongPress();

    secretConsoleLongPressTimerRef.current = window.setTimeout(() => {

      openSecretConsole();

    }, SECRET_CONSOLE_LONG_PRESS_MS);

  };



  useEffect(() => {

    console.log('electronAPI', window.electronAPI);

    console.log('electronWindow', window.electronWindow);



    const electronAPI = window.electronAPI ?? window.electronWindow;



    if (!electronAPI) {

      console.error('electronAPI is not available');

      return;

    }



    let isMounted = true;



    void electronAPI.isMaximized().then((maximized) => {

      if (isMounted) {

        setIsWindowMaximized(maximized);

      }

    });



    const unsubscribe = electronAPI.onMaximizedChange((maximized) => {

      setIsWindowMaximized(maximized);

    });



    return () => {

      isMounted = false;

      unsubscribe();

    };

  }, []);



  useEffect(() => {

    const root = document.documentElement;

    root.dataset.theme = resolvedTheme;

    root.dataset.themeStyle = effectiveThemeStyle;

    root.style.setProperty('color-scheme', resolvedTheme);

  }, [effectiveThemeStyle, resolvedTheme]);



  useEffect(() => {

    if (

      globalSettings.themeMode !== 'system' ||

      typeof window.matchMedia !== 'function'

    ) {

      return;

    }



    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);

    const updateSystemTheme = () => {

      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    };



    updateSystemTheme();



    if (typeof mediaQuery.addEventListener === 'function') {

      mediaQuery.addEventListener('change', updateSystemTheme);

      return () => mediaQuery.removeEventListener('change', updateSystemTheme);

    }



    mediaQuery.addListener(updateSystemTheme);

    return () => mediaQuery.removeListener(updateSystemTheme);

  }, [globalSettings.themeMode]);



  useEffect(() => {

    setAutoBackupCycleValueInput(String(autoBackupDraft.cycle.value));

  }, [autoBackupDraft.cycle.value]);



  useEffect(() => {

    setAutoLockMinutesInput(String(globalSettings.autoLockMinutes));

  }, [globalSettings.autoLockMinutes]);


  useEffect(() => {
    if (!globalSettings.passwordProtectionEnabled) {
      setIsLocked(false);
      setUnlockPasswordInput('');
      setUnlockError('');
    }
  }, [globalSettings.passwordProtectionEnabled]);


  useEffect(() => {
    const api = window.electronAPI ?? window.electronWindow;

    if (!api?.onNetraFlowLock) {
      return;
    }

    return api.onNetraFlowLock(() => {
      if (!globalSettings.passwordProtectionEnabled || !globalSettings.passwordHash) {
        showToast('请先开启登陆密码保护', 'info');
        return;
      }

      setUnlockPasswordInput('');
      setUnlockError('');
      setIsLocked(true);
    });
  }, [globalSettings.passwordHash, globalSettings.passwordProtectionEnabled]);


  useEffect(() => {

    if (

      !globalSettings.passwordProtectionEnabled ||

      !globalSettings.passwordHash ||

      isLocked

    ) {

      if (autoLockTimerRef.current !== null) {

        window.clearTimeout(autoLockTimerRef.current);

        autoLockTimerRef.current = null;

      }



      return;

    }



    const autoLockDelay = Math.max(1, globalSettings.autoLockMinutes) * 60 * 1000;

    const resetAutoLockTimer = () => {

      if (autoLockTimerRef.current !== null) {

        window.clearTimeout(autoLockTimerRef.current);

      }



      autoLockTimerRef.current = window.setTimeout(() => {

        setUnlockPasswordInput('');

        setUnlockError('');

        setIsLocked(true);

      }, autoLockDelay);

    };

    const activityEvents: Array<keyof WindowEventMap> = [

      'pointerdown',

      'keydown',

      'wheel',

      'scroll',

      'touchstart'

    ];

    const listenerOptions: AddEventListenerOptions = {

      capture: true,

      passive: true

    };



    resetAutoLockTimer();

    activityEvents.forEach((eventName) => {

      window.addEventListener(eventName, resetAutoLockTimer, listenerOptions);

    });



    return () => {

      if (autoLockTimerRef.current !== null) {

        window.clearTimeout(autoLockTimerRef.current);

        autoLockTimerRef.current = null;

      }



      activityEvents.forEach((eventName) => {

        window.removeEventListener(eventName, resetAutoLockTimer, listenerOptions);

      });

    };

  }, [

    globalSettings.autoLockMinutes,

    globalSettings.passwordHash,

    globalSettings.passwordProtectionEnabled,

    isLocked

  ]);



  useEffect(() => {

    const wheelGuard = (event: globalThis.WheelEvent) => {

      event.preventDefault();

    };

    const guardedInputs = [

      newAccountTypeInputRef.current,

      autoSnapshotCycleInputRef.current

    ];



    guardedInputs.forEach((input) => {

      input?.addEventListener('wheel', wheelGuard, { passive: false });

    });



    return () => {

      guardedInputs.forEach((input) => {

        input?.removeEventListener('wheel', wheelGuard);

      });

    };

  }, [isAddingAccount, historyPanelView, autoBackupDraft.enabled]);



  useEffect(

    () => () => {

      toastTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));

      toastTimerRefs.current = [];



      if (autoLockTimerRef.current !== null) {

        window.clearTimeout(autoLockTimerRef.current);

        autoLockTimerRef.current = null;

      }



      if (snapshotPasswordRevealTimerRef.current !== null) {

        window.clearTimeout(snapshotPasswordRevealTimerRef.current);

        snapshotPasswordRevealTimerRef.current = null;

      }



      if (catPetTimerRef.current !== null) {

        window.clearTimeout(catPetTimerRef.current);

        catPetTimerRef.current = null;

      }



      if (secretConsoleLongPressTimerRef.current !== null) {

        window.clearTimeout(secretConsoleLongPressTimerRef.current);

        secretConsoleLongPressTimerRef.current = null;

      }



      if (groupLongPressTimerRef.current !== null) {

        window.clearTimeout(groupLongPressTimerRef.current);

        groupLongPressTimerRef.current = null;

      }



      if (secretConsoleHighlightTimerRef.current !== null) {

        window.clearTimeout(secretConsoleHighlightTimerRef.current);

        secretConsoleHighlightTimerRef.current = null;

      }

    },

    []

  );



  useEffect(() => {

    if (!isSecretConsoleOpen) {

      return;

    }



    const focusTimer = window.setTimeout(() => {

      secretConsoleInputRef.current?.focus();

    }, 0);



    return () => {

      window.clearTimeout(focusTimer);

    };

  }, [isSecretConsoleOpen]);



  useEffect(() => {

    if (hasBackupRecordMissingIncrementCount()) {

      saveBackupRecords(backupRecords);

    }

  }, []);



  useEffect(() => {

    const handleSearchShortcut = (event: globalThis.KeyboardEvent) => {

      if (!(event.ctrlKey || event.metaKey) || event.key.toLocaleLowerCase() !== 'k') {

        return;

      }



      event.preventDefault();

      event.stopPropagation();

      openSearch();

    };



    document.addEventListener('keydown', handleSearchShortcut, true);



    return () => {

      document.removeEventListener('keydown', handleSearchShortcut, true);

    };

  }, []);



  useEffect(() => {

    if (!searchState.isOpen) {

      return;

    }



    const focusTimer = window.setTimeout(() => {

      searchInputRef.current?.focus();

    }, 0);



    return () => {

      window.clearTimeout(focusTimer);

    };

  }, [searchState.isOpen]);



  const { groups, history } = appData;

  const newAccountTypeMatch = findBestAccountTypeMatch(groups, newAccountTypeInput);

  const newAccountTypeGhostText = getAccountTypeGhostText(

    newAccountTypeInput,

    newAccountTypeMatch

  );

  const recent7Range = getRecent7DayRange();

  const hasHistoryDateFilter = Boolean(historyStartDate && historyEndDate);

  const effectiveHistoryStartDate = hasHistoryDateFilter ? historyStartDate : recent7Range.start;

  const effectiveHistoryEndDate = hasHistoryDateFilter ? historyEndDate : recent7Range.end;



  const groupTotals = groups.map((group) => {

    const activeAccounts = group.accounts.filter((account) => !account.archived);

    const total = toStoredAmountByNature(

      group.nature,

      activeAccounts.reduce((sum, account) => sum + account.amount, 0)

    );



    return {

      ...group,

      activeAccounts,

      total

    };

  });



  const archivedAccounts: ArchivedAccountEntry[] = groups.flatMap((group) =>

    group.accounts

      .filter((account) => account.archived)

      .map((account) => ({ ...account, groupName: group.name }))

  );

  const selectedGroupDetail = selectedGroupDetailName

    ? groups.find((group) => group.name === selectedGroupDetailName)

    : undefined;

  const normalizedArchivedAccountSearchQuery = archivedAccountSearchQuery.trim().toLowerCase();

  const filteredArchivedAccountsForRestore = normalizedArchivedAccountSearchQuery

    ? archivedAccounts.filter((account) =>

        account.name.toLowerCase().includes(normalizedArchivedAccountSearchQuery)

      )

    : archivedAccounts;

  const sortedHistory = useMemo(() => [...history].sort(compareHistoryByTimeDesc), [history]);

  const historyDateCounts = history.reduce<Record<string, number>>((counts, record) => {

    const recordDate = toDateInputValue(new Date(record.time));

    counts[recordDate] = (counts[recordDate] ?? 0) + 1;



    return counts;

  }, {});

  const filteredHistory = sortedHistory.filter((record) =>

    isWithinDateRange(record.time, effectiveHistoryStartDate, effectiveHistoryEndDate)

  );

  const positiveStatsTotal = groupTotals.reduce(

    (sum, group) =>

      group.includeInStats && isPositiveNature(group.nature)

        ? sum + Math.abs(group.total)

        : sum,

    0

  );

  const totalAssets = groupTotals.reduce(

    (sum, group) =>

      group.includeInStats ? sum + getStatAmount(group.nature, group.total) : sum,

    0

  );

  const homeAssetStatValue = resolveHomeAssetStatValue(globalSettings.homeAssetStatMetric, {

    netWorth: totalAssets,

    totalAssets: positiveStatsTotal

  });

  const homeAssetStatLabel = resolveHomeAssetStatLabel(

    globalSettings.homeAssetStatMetric,

    globalSettings.homeAssetStatLabelMode

  );

  const assetStructureData = useMemo(

    () => deriveAssetStructureData(groups, history, globalSettings.chartColorAssignmentMode),

    [groups, history, globalSettings.chartColorAssignmentMode]

  );

  const homeGroupLegendColorByName = useMemo(() => {

    const colorByName = new Map<string, string>();



    [...assetStructureData.positiveSegments, ...assetStructureData.negativeSegments].forEach(

      (segment) => {

        (segment.sourceIds ?? [segment.label]).forEach((sourceId) =>

          colorByName.set(sourceId, segment.color)

        );

      }

    );



    return colorByName;

  }, [assetStructureData]);

  const assetTrendPoints = useMemo(

    () => deriveAssetTrendPoints(groups, history, assetChartSettings.trend),

    [groups, history, assetChartSettings.trend]

  );

  const homeThumbnailTrendPoints = useMemo(

    () =>

      deriveAssetTrendPoints(groups, history, {

        ...assetChartSettings.trend,

        xAxisRange: assetChartSettings.l0.xAxisRange

      }),

    [groups, history, assetChartSettings.l0.xAxisRange, assetChartSettings.trend]

  );

  const selectedGroupDetailChartSettings = selectedGroupDetail

    ? getEffectiveCategoryChartSettings(

        assetChartSettings.globalChartControlMode,

        assetChartSettings.globalCategoryDetail,

        assetChartSettings.categoryDetailById,

        selectedGroupDetail.name

      )

    : assetChartSettings.globalCategoryDetail;

  const selectedGroupDetailStructureData = useMemo(

    () =>

      selectedGroupDetail

        ? deriveGroupDetailStructureData(

            selectedGroupDetail,

            history,

            globalSettings.chartColorAssignmentMode

          )

        : null,

    [selectedGroupDetail, history, globalSettings.chartColorAssignmentMode]

  );

  const selectedGroupDetailTrendData = useMemo(

    () =>

      selectedGroupDetail

        ? deriveGroupDetailTrendData(

            selectedGroupDetail,

            history,

            selectedGroupDetailChartSettings,

            globalSettings.chartColorAssignmentMode

          )

        : null,

    [

      selectedGroupDetail,

      history,

      selectedGroupDetailChartSettings,

      globalSettings.chartColorAssignmentMode

    ]

  );

  useEffect(() => {

    if (!selectedGroupDetail) {

      setGroupDetailNameDraft('');

      setGroupDetailNatureDraft('asset');

      setGroupDetailStatsDraft(true);

      setGroupDetailError('');

      return;

    }



    setGroupDetailNameDraft(selectedGroupDetail.name);

    setGroupDetailNatureDraft(selectedGroupDetail.nature);

    setGroupDetailStatsDraft(selectedGroupDetail.includeInStats);

    setGroupDetailError('');

  }, [

    selectedGroupDetail?.includeInStats,

    selectedGroupDetail?.name,

    selectedGroupDetail?.nature

  ]);

  const recentNetWorthChange = useMemo(

    () => deriveRecentNetWorthChange(history),

    [history]

  );

  const shouldShowL0Charts =

    assetChartSettings.l0.showStructure || assetChartSettings.l0.showTrend;

  const accountCount = groups.reduce((count, group) => count + group.accounts.length, 0);

  const backupHistoryDelta = history.length - lastBackupHistoryCount;

  const incrementalRecordValue =

    backupHistoryDelta < 0 ? '有记录删除' : `${backupHistoryDelta}`;

  const hasAutoBackupDraftChanges = !areAutoBackupSettingsEqual(

    autoBackupDraft,

    autoBackupSettings

  );

  const canSaveAutoBackupSettings =

    !isExampleMode &&

    hasAutoBackupDraftChanges &&

    (!autoBackupDraft.enabled ||

      (autoBackupCycleValueInput.trim() !== '' &&

        autoBackupDraft.cycle.value > 0 &&

        autoBackupDraft.directory.trim() !== ''));

  const rollupAccountGroupKeys = useMemo(

    () => (rollupImportReview ? getRollupAccountGroupKeys(rollupImportReview.records) : []),

    [rollupImportReview]

  );

  const rollupRecordGroups = useMemo(

    () =>

      rollupAccountGroupKeys.map((keyword) => ({

        keyword,

        records: rollupImportReview?.records.filter(

          (record) => record.accountKeyword === keyword

        ) ?? []

      })),

    [rollupAccountGroupKeys, rollupImportReview]

  );

  const rollupActiveAccountOptions = useMemo(

    () =>

      groups.flatMap((group) =>

        group.accounts

          .filter((account) => !account.archived)

          .map((account) => ({

            groupName: group.name,

            account

          }))

      ),

    [groups]

  );

  const rollupConfirmedAccountCount = rollupAccountGroupKeys.filter((keyword) =>

    Boolean(rollupAccountAssignments[keyword]?.accountId)

  ).length;

  const isRollupImportReady =

    Boolean(rollupImportReview) &&

    !rollupImportReview?.hasBlockingIssues &&

    areAllRollupGroupsAssigned(rollupAccountGroupKeys, rollupAccountAssignments);



  const currentGroup = editingAccount

    ? groups.find((group) => group.name === editingAccount.groupName)

    : undefined;

  const currentAccount = currentGroup?.accounts.find(

    (account) => account.id === editingAccount?.accountId

  );

  const selectedGroup = selectedAccount

    ? groups.find((group) => group.name === selectedAccount.groupName)

    : undefined;

  const selectedAccountEntry = selectedGroup?.accounts.find(

    (account) => account.id === selectedAccount?.accountId

  );

  const selectedAccountIsArchived = Boolean(selectedAccountEntry?.archived);

  const flashSelectedGroup = flashNoteAccount

    ? groups.find((group) => group.name === flashNoteAccount.groupName)

    : undefined;

  const flashSelectedAccountEntry = flashSelectedGroup?.accounts.find(

    (account) => account.id === flashNoteAccount?.accountId

  );

  const accountInfoGroup = editingAccountInfo

    ? groups.find((group) => group.name === editingAccountInfo.groupName)

    : undefined;

  const accountInfoEntry = accountInfoGroup?.accounts.find(

    (account) => account.id === editingAccountInfo?.accountId

  );

  const accountTypeEditorGroup =

    accountTypeEditor?.mode === 'edit'

      ? groups.find((group) => group.name === accountTypeEditor.groupName)

      : undefined;

  const isAccountTypeEditorVisible = Boolean(

    accountTypeEditor && (accountTypeEditor.mode === 'create' || accountTypeEditorGroup)

  );

  const selectedAccountHistory = selectedAccount

    ? sortedHistory.filter((record) => record.accountId === selectedAccount.accountId)

    : [];

  const selectedAccountTitle =

    selectedAccountEntry && selectedAccount

      ? getAccountDetailTitle(selectedGroup?.name ?? selectedAccount.groupName, selectedAccountEntry.name)

      : '';

  const selectedAccountChartSettings = selectedAccountEntry

    ? getEffectiveAccountChartSettings(

        assetChartSettings.globalChartControlMode,

        getGlobalAccountDetailChartSettings(assetChartSettings.trend),

        assetChartSettings.accountDetailById,

        selectedAccountEntry.id

      )

    : getGlobalAccountDetailChartSettings(assetChartSettings.trend);

  const selectedAccountTrendPoints = useMemo(

    () =>

      selectedAccountEntry

        ? deriveAccountTrendPoints(selectedAccountEntry, history, selectedAccountChartSettings)

        : [],

    [selectedAccountEntry, history, selectedAccountChartSettings]

  );

  const mainPageKey = isFlashNoteOpen

    ? 'flash-note'

    : isRollupImportOpen

      ? 'rollup-import'

      : isGlobalSettingsOpen

        ? 'global-settings'

        : isTotalChartsOpen

          ? 'total-charts'

          : isAccountChartsOpen && selectedAccount && selectedAccountEntry

            ? `account-charts:${selectedAccountEntry.id}`

            : selectedGroupDetail

              ? `group-detail:${selectedGroupDetail.name}`

              : selectedAccount && selectedAccountEntry

                ? `account-detail:${selectedAccountEntry.id}`

                : 'home';

  const leftLayerKey = isHistoryOpen

    ? `history:${historyPanelView}`

    : isArchivedAccountsOpen

      ? 'archived-accounts'

      : '';

  const rightPanelKey = searchState.isOpen

    ? 'search'

    : isRollupImportOpen

      ? 'rollup-import'

      : isDangerActionsOpen && selectedAccount && selectedAccountEntry

        ? `account-danger:${selectedAccountEntry.id}`

        : isAccountChartsOpen && selectedAccount && selectedAccountEntry

          ? `account-chart-settings:${selectedAccountEntry.id}`

          : selectedAccount && selectedAccountEntry

            ? `account-actions:${selectedAccountEntry.id}`

            : isHistoryOpen

              ? `history-actions:${historyPanelView}`

              : isArchivedAccountsOpen

                ? 'archived-actions'

                : isTotalChartsOpen

                  ? 'chart-settings'

                  : selectedGroupDetail

                    ? `group-detail-actions:${selectedGroupDetail.name}`

                    : isGlobalSettingsOpen

                      ? `global-settings:${globalSettingsSection}`

                      : 'home-actions';

  const selectedAccountHistoryByDate = selectedAccountHistory

    .reduce<Array<{ date: string; records: HistoryRecord[] }>>((groupsByDate, record) => {

      const date = toDateInputValue(new Date(record.time));

      const existingGroup = groupsByDate.find((group) => group.date === date);



      if (existingGroup) {

        existingGroup.records.push(record);

      } else {

        groupsByDate.push({ date, records: [record] });

      }



      return groupsByDate;

    }, [])

    .map((group) => ({

      ...group,

      records: [...group.records].sort(compareHistoryByTimeDesc)

    }))

    .sort((left, right) => getDateTimestamp(right.date) - getDateTimestamp(left.date));

  const currentEditableAmount = currentAccount ? toEditableAmount(currentAccount.amount) : 0;

  const isEditingArchivedAccount = Boolean(currentAccount?.archived);

  const parsedAdjustAmount = parseNonNegativeAmount(adjustAmountInput) ?? 0;

  const signedAdjustAmount =

    adjustDirection === 'increase' ? parsedAdjustAmount : -parsedAdjustAmount;

  const rawNextAdjustedEditableAmount = currentEditableAmount + signedAdjustAmount;

  const isAdjustAmountInvalid = editMode === 'adjust' && rawNextAdjustedEditableAmount < 0;

  const nextAdjustedEditableAmount = roundToMoneyPrecision(

    Math.max(0, rawNextAdjustedEditableAmount)

  );

  const parsedSetAmountDate = parseAccountOperationDateInput(setAmountDateInput);

  const parsedAdjustAmountDate = parseAccountOperationDateInput(adjustAmountDateInput);

  const activeAmountEditDate =

    editMode === 'set' ? parsedSetAmountDate : parsedAdjustAmountDate;

  const isAmountEditDateInvalid = activeAmountEditDate === null;

  const activeAmountEditNote =

    editMode === 'set' ? setAmountNoteInput : adjustAmountNoteInput;

  const isAmountEditorSubmitDisabled = isAdjustAmountInvalid || isAmountEditDateInvalid;

  const signedAmountCssVariables = useMemo<SignedAmountCssVariables>(

    () => {

      const positiveTone = getSignedAmountTone(1, globalSettings.positiveNegativeColorMode);

      const negativeTone = getSignedAmountTone(-1, globalSettings.positiveNegativeColorMode);



      return {

        '--signed-positive-color': positiveTone.color,

        '--signed-negative-color': negativeTone.color,

        '--signed-positive-background': positiveTone.background,

        '--signed-negative-background': negativeTone.background

      };

    },

    [globalSettings.positiveNegativeColorMode]

  );



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



  const completeFirstWelcome = () => {

    const nextState: FirstWelcomeState = {

      completed: true,

      pendingAfterClearAll: false

    };



    saveFirstWelcomeState(nextState);

    setFirstWelcomeState(nextState);

    setFirstWelcomeStage(null);

  };



  const markPendingFirstWelcomeAfterClearAll = () => {

    const nextState: FirstWelcomeState = {

      completed: false,

      pendingAfterClearAll: true

    };



    saveFirstWelcomeState(nextState);

    setFirstWelcomeState(nextState);

    setFirstWelcomeStage(null);

  };



  const cancelPendingFirstWelcomeForRealChange = () => {

    setFirstWelcomeState((currentState) => {

      if (!currentState.pendingAfterClearAll) {

        return currentState;

      }



      const nextState: FirstWelcomeState = {

        completed: true,

        pendingAfterClearAll: false

      };



      saveFirstWelcomeState(nextState);

      return nextState;

    });

    setFirstWelcomeStage(null);

  };



  const updateAppData = (nextData: AppData) => {

    dispatchSearchState({ type: 'clear-navigation' });

    setAppData(nextData);



    if (!isExampleMode) {

      saveAppData(nextData);

      cancelPendingFirstWelcomeForRealChange();

    }

  };



  const updateAssetChartSettings = (

    createNextSettings: (currentSettings: AssetChartSettings) => AssetChartSettings

  ) => {

    setAssetChartSettings((currentSettings) => {

      const nextSettings = normalizeAssetChartSettings(createNextSettings(currentSettings));



      saveAssetChartSettings(nextSettings);

      return nextSettings;

    });

    cancelPendingFirstWelcomeForRealChange();

  };



  const updateGlobalSettings = (

    createNextSettings: (currentSettings: GlobalSettings) => GlobalSettings

  ) => {

    setGlobalSettings((currentSettings) => {

      const nextSettings = normalizeGlobalSettings(createNextSettings(currentSettings));



      saveGlobalSettings(nextSettings);

      return nextSettings;

    });

    cancelPendingFirstWelcomeForRealChange();

  };



  const updatePositiveNegativeColorMode = (value: string) => {

    if (!isPositiveNegativeColorMode(value)) {

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      positiveNegativeColorMode: value

    }));

  };



  const updateChartColorAssignmentMode = (value: string) => {

    if (!isChartColorAssignmentMode(value)) {

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      chartColorAssignmentMode: value

    }));

  };



  const updateHomeAssetStatMetric = (value: string) => {

    if (!isHomeAssetStatMetric(value)) {

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      homeAssetStatMetric: value

    }));

  };



  const updateHomeAssetStatLabelMode = (value: string) => {

    if (!isHomeAssetStatLabelMode(value)) {

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      homeAssetStatLabelMode: value

    }));

  };



  const updateHomeAssetStatCompact = (value: string) => {

    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      homeAssetStatCompact: value === 'yes'

    }));

  };



  const updateGlobalChartControlMode = (value: string) => {

    const nextMode = normalizeGlobalChartControlMode(value);



    updateAssetChartSettings((currentSettings) => ({

      ...currentSettings,

      globalChartControlMode: nextMode

    }));

  };



  const updateHomeThumbnailChartSettings = (

    createNextSettings: (

      currentSettings: HomeThumbnailChartSettings

    ) => HomeThumbnailChartSettings

  ) => {

    updateAssetChartSettings((currentSettings) => ({

      ...currentSettings,

      l0: createNextSettings(currentSettings.l0)

    }));

  };



  const updateGlobalCategoryDetailChartSettings = (

    createNextSettings: (

      currentSettings: CategoryDetailChartSettings

    ) => CategoryDetailChartSettings

  ) => {

    const categoryIds = groups.map((group) => group.name);



    updateAssetChartSettings((currentSettings) => {

      const globalCategoryDetail = normalizeCategoryDetailChartSettings(

        createNextSettings(currentSettings.globalCategoryDetail),

        currentSettings.globalCategoryDetail

      );



      return {

        ...currentSettings,

        globalCategoryDetail,

        categoryDetailById: syncCategoryChartSettingsFromGlobal(

          currentSettings.globalChartControlMode,

          categoryIds,

          currentSettings.categoryDetailById,

          globalCategoryDetail

        )

      };

    });

  };



  const updateLocalCategoryDetailChartSettings = (

    categoryId: string,

    createNextSettings: (

      currentSettings: CategoryDetailChartSettings

    ) => CategoryDetailChartSettings

  ) => {

    if (assetChartSettings.globalChartControlMode === 'locked') {

      return;

    }



    updateAssetChartSettings((currentSettings) => {

      const currentCategorySettings =

        currentSettings.categoryDetailById[categoryId] ??

        currentSettings.globalCategoryDetail;

      const nextCategorySettings = normalizeCategoryDetailChartSettings(

        createNextSettings(currentCategorySettings),

        currentCategorySettings

      );



      return {

        ...currentSettings,

        categoryDetailById: {

          ...currentSettings.categoryDetailById,

          [categoryId]: nextCategorySettings

        }

      };

    });

  };



  const updateLocalAccountDetailChartSettings = (

    accountId: string,

    createNextSettings: (

      currentSettings: AccountDetailChartSettings

    ) => AccountDetailChartSettings

  ) => {

    if (assetChartSettings.globalChartControlMode === 'locked') {

      return;

    }



    updateAssetChartSettings((currentSettings) => {

      const globalAccountDetail = getGlobalAccountDetailChartSettings(currentSettings.trend);

      const currentAccountSettings =

        currentSettings.accountDetailById[accountId] ?? globalAccountDetail;

      const nextAccountSettings = normalizeAccountDetailChartSettings(

        createNextSettings(currentAccountSettings),

        currentAccountSettings

      );



      return {

        ...currentSettings,

        accountDetailById: {

          ...currentSettings.accountDetailById,

          [accountId]: nextAccountSettings

        }

      };

    });

  };



  const updateThemeMode = (value: string) => {

    if (!isThemeMode(value)) {

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      themeMode: value

    }));

  };



  const updateThemeStyle = (value: string) => {

    if (!isThemeStyle(value) || !globalSettings.nyaaThemeUnlocked) {

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      themeStyle: value

    }));

  };



  const updatePagePositionMemoryMode = (value: string) => {

    if (!isPagePositionMemoryMode(value)) {

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      pagePositionMemoryMode: value

    }));

  };



  const updateSearchLogicMode = (value: string) => {

    if (!isSearchLogicMode(value)) {

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      searchLogicMode: value

    }));

  };



  const unlockNyaaTheme = () => {

    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      nyaaThemeUnlocked: true

    }));

  };



  const resetDataViews = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    setSelectedAccount(null);

    setSelectedGroupDetailName('');

    setEditingAccount(null);

    setAccountOperationEntrySource('account-detail');

    setEditingAccountInfo(null);

    setAccountTypeEditor(null);

    setIsQuickSingleEntryAccountPickerOpen(false);

    setIsRollupImportOpen(false);

    setRollupImportReview(null);

    setRollupImportError('');

    setRollupAccountAssignments({});

    setRollupPendingNewAccountKey('');

    setIsAddingAccount(false);

    setIsArchivedAccountsOpen(false);

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(false);

    setExpandedGroupNames([]);

    setExpandedDetailDates([]);

    closeSearch();

  };



  const applyBackupState = (

    nextBackupRecords: BackupRecord[],

    nextLastBackupAt: string,

    nextLastBackupHistoryCount: number,

    persist: boolean

  ) => {

    const normalizedRecords = normalizeBackupRecords(nextBackupRecords);

    const normalizedHistoryCount = Math.max(0, Math.floor(nextLastBackupHistoryCount));



    setBackupRecords(normalizedRecords);

    setLastBackupAt(nextLastBackupAt);

    setLastBackupHistoryCount(normalizedHistoryCount);



    if (!persist) {

      return;

    }



    saveBackupRecords(normalizedRecords);



    if (nextLastBackupAt) {

      saveLastBackupAt(nextLastBackupAt);

    } else {

      window.localStorage.removeItem(LAST_BACKUP_STORAGE_KEY);

    }



    saveLastBackupHistoryCount(normalizedHistoryCount);

  };



  const applyExampleGeneratedData = (generatedData: ExampleGeneratedData) => {

    resetDataViews();

    setAppData(cloneAppData(generatedData.appData));

    applyBackupState(

      cloneBackupRecords(generatedData.backupRecords),

      generatedData.lastBackupAt,

      generatedData.lastBackupHistoryCount,

      false

    );

  };



  const writeExampleDataToRealData = () => {

    if (!isExampleMode) {

      return false;

    }



    const currentExampleData = cloneAppData(appData);



    saveAppData(currentExampleData, { allowEmptyHistoryOverwrite: true });

    setAppData(currentExampleData);

    applyBackupState(

      cloneBackupRecords(backupRecords),

      lastBackupAt,

      lastBackupHistoryCount,

      true

    );

    setIsExampleMode(false);

    realDataBeforeExampleRef.current = null;

    cancelPendingFirstWelcomeForRealChange();



    return true;

  };



  const runSecretConsoleCommand = (rawCommand: string) => {

    const command = rawCommand.trim();



    if (command === 'testdatain') {

      return writeExampleDataToRealData() ? SECRET_CONSOLE_TEST_DATA_SUCCESS : null;

    }



    if (command === 'eggget') {

      unlockNyaaTheme();

      return SECRET_CONSOLE_NYAA_SUCCESS;

    }



    return null;

  };



  const showSecretConsoleResult = (resultPlaceholder: string) => {

    clearSecretConsoleHighlight();

    setIsSecretConsoleOpen(true);

    setSecretConsoleInput('');

    setSecretConsolePlaceholder(resultPlaceholder);

    setIsSecretConsoleHighlighted(true);



    secretConsoleHighlightTimerRef.current = window.setTimeout(() => {

      setIsSecretConsoleHighlighted(false);

      secretConsoleHighlightTimerRef.current = null;

    }, 1000);



    window.setTimeout(() => {

      secretConsoleInputRef.current?.focus();

    }, 0);

  };



  const handleSecretConsoleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {

    if (event.key === 'Escape') {

      event.preventDefault();

      event.stopPropagation();

      closeSecretConsole();

      return;

    }



    if (event.key !== 'Enter') {

      return;

    }



    event.preventDefault();

    event.stopPropagation();



    const result = runSecretConsoleCommand(secretConsoleInput);



    if (!result) {

      closeSecretConsole();

      return;

    }



    showSecretConsoleResult(result);

  };



  const startExampleMode = (templateId: ExampleTemplateId) => {

    realDataBeforeExampleRef.current = {

      appData: cloneAppData(appData),

      backupRecords: cloneBackupRecords(backupRecords),

      lastBackupAt,

      lastBackupHistoryCount

    };

    setSelectedExampleTemplateId(templateId);

    applyExampleGeneratedData(createExampleData(templateId));

    setIsExampleMode(true);

  };



  const enterExampleMode = () => {

    setConfirmationDialog({

      title: '进入示例模式',

      message: (

        <>

          <p>示例数据不会覆盖你的真实资产数据</p>

          <p>在示例模式中的修改不会保存到真实数据中</p>

          <p>退出示例模式后会恢复进入前的状态</p>

          <strong>是否继续？</strong>

        </>

      ),

      confirmLabel: '确认进入',

      onConfirm: () => startExampleMode(selectedExampleTemplateId)

    });

  };



  const openFirstWelcomeStory = () => {

    setFirstWelcomeStage('story');

  };



  const chooseFirstWelcomeStoryRoute = (templateId: ExampleTemplateId) => {

    completeFirstWelcome();

    startExampleMode(templateId);

  };



  const switchExampleTemplate = () => {

    setConfirmationDialog({

      title: '切换示例模板',

      message: (

        <>

          <p>切换示例模板会丢弃当前示例模式中的修改</p>

          <p>系统将重新生成所选模板</p>

          <strong>是否继续？</strong>

        </>

      ),

      confirmLabel: '确认切换',

      onConfirm: () => applyExampleGeneratedData(createExampleData(selectedExampleTemplateId))

    });

  };



  const performExitExampleMode = () => {

    const realSnapshot = realDataBeforeExampleRef.current;



    resetDataViews();

    setIsExampleMode(false);

    realDataBeforeExampleRef.current = null;



    if (!realSnapshot) {

      const restoredData = loadAppData();

      setAppData(restoredData);

      applyBackupState(

        loadBackupRecords(),

        loadLastBackupAt(),

        loadLastBackupHistoryCount(restoredData.history.length),

        false

      );

      return;

    }



    setAppData(cloneAppData(realSnapshot.appData));

    applyBackupState(

      cloneBackupRecords(realSnapshot.backupRecords),

      realSnapshot.lastBackupAt,

      realSnapshot.lastBackupHistoryCount,

      false

    );

  };



  const exitExampleMode = () => {

    if (!isExampleMode) {

      return;

    }



    setConfirmationDialog({

      title: '退出示例模式',

      message: (

        <>

          <p>退出后将离开当前示例模式</p>

          <p>示例模式中的修改不会保留</p>

          <p>系统将恢复到进入示例模式前的真实数据状态</p>

          <strong>确定退出吗？</strong>

        </>

      ),

      confirmLabel: '确认退出',

      onConfirm: performExitExampleMode

    });

  };



  const getUserSettingsExportPayload = () => ({

    type: USER_SETTINGS_FILE_TYPE,

    version: USER_SETTINGS_FILE_VERSION,

    exportedAt: new Date().toISOString(),

    settings: {

      themeMode: globalSettings.themeMode,

      positiveNegativeColorMode: globalSettings.positiveNegativeColorMode,

      pagePositionMemoryMode: globalSettings.pagePositionMemoryMode,

      searchLogicMode: globalSettings.searchLogicMode,

      chartColorAssignmentMode: globalSettings.chartColorAssignmentMode,

      homeAssetStatMetric: globalSettings.homeAssetStatMetric,

      homeAssetStatLabelMode: globalSettings.homeAssetStatLabelMode,

      homeAssetStatCompact: globalSettings.homeAssetStatCompact,

      themeStyle: effectiveThemeStyle,

      assetChartSettings: normalizeAssetChartSettings(assetChartSettings)

    }

  });



  const getUserSettingsFileName = (date: Date) => {

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    const hour = String(date.getHours()).padStart(2, '0');

    const minute = String(date.getMinutes()).padStart(2, '0');

    const second = String(date.getSeconds()).padStart(2, '0');



    return `netraflow-settings-${year}${month}${day}-${hour}${minute}${second}.netraflow-settings.json`;

  };



  const exportUserSettings = () => {

    const exportedAt = new Date();

    const blob = new Blob([JSON.stringify(getUserSettingsExportPayload(), null, 2)], {

      type: 'application/json'

    });

    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');



    link.href = objectUrl;

    link.download = getUserSettingsFileName(exportedAt);

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

  };



  const applyImportedUserSettings = (value: unknown) => {

    if (

      !isPlainObject(value) ||

      value.type !== USER_SETTINGS_FILE_TYPE ||

      value.version !== USER_SETTINGS_FILE_VERSION

    ) {

      throw new Error('Invalid user settings file.');

    }



    if (!isPlainObject(value.settings)) {

      throw new Error('Invalid user settings payload.');

    }



    const importedSettings = value.settings;



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      themeMode: isThemeMode(importedSettings.themeMode)

        ? importedSettings.themeMode

        : currentSettings.themeMode,

      positiveNegativeColorMode: isPositiveNegativeColorMode(

        importedSettings.positiveNegativeColorMode

      )

        ? importedSettings.positiveNegativeColorMode

        : currentSettings.positiveNegativeColorMode,

      searchLogicMode: isSearchLogicMode(importedSettings.searchLogicMode)

        ? importedSettings.searchLogicMode

        : currentSettings.searchLogicMode,

      pagePositionMemoryMode: isPagePositionMemoryMode(

        importedSettings.pagePositionMemoryMode

      )

        ? importedSettings.pagePositionMemoryMode

        : currentSettings.pagePositionMemoryMode,

      chartColorAssignmentMode: isChartColorAssignmentMode(

        importedSettings.chartColorAssignmentMode

      )

        ? importedSettings.chartColorAssignmentMode

        : currentSettings.chartColorAssignmentMode,

      homeAssetStatMetric: isHomeAssetStatMetric(importedSettings.homeAssetStatMetric)

        ? importedSettings.homeAssetStatMetric

        : currentSettings.homeAssetStatMetric,

      homeAssetStatLabelMode: isHomeAssetStatLabelMode(

        importedSettings.homeAssetStatLabelMode

      )

        ? importedSettings.homeAssetStatLabelMode

        : currentSettings.homeAssetStatLabelMode,

      homeAssetStatCompact:

        typeof importedSettings.homeAssetStatCompact === 'boolean'

          ? importedSettings.homeAssetStatCompact

          : currentSettings.homeAssetStatCompact,

      themeStyle: isThemeStyle(importedSettings.themeStyle)

        ? importedSettings.themeStyle

        : currentSettings.themeStyle,

      nyaaThemeUnlocked: currentSettings.nyaaThemeUnlocked

    }));



    if (importedSettings.assetChartSettings !== undefined) {

      const nextChartSettings = normalizeAssetChartSettings(

        importedSettings.assetChartSettings

      );



      setAssetChartSettings(nextChartSettings);

      saveAssetChartSettings(nextChartSettings);

    }



  };



  const importUserSettings = (event: ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0];

    event.target.value = '';



    if (!file) {

      return;

    }



    const reader = new FileReader();



    reader.onload = () => {

      try {

        applyImportedUserSettings(JSON.parse(String(reader.result ?? '')));

        void showNoticeDialog({

          title: '导入用户配置',

          message: '用户配置文件已导入'

        });

      } catch (error) {

        console.error('[NetraFlow settings] Failed to import user settings.', error);

        void showNoticeDialog({

          title: '导入用户配置失败',

          message: '用户配置文件无法导入，请确认文件内容'

        });

      }

    };

    reader.onerror = () => {

      void showNoticeDialog({

        title: '读取用户配置失败',

        message: '用户配置文件读取失败'

      });

    };

    reader.readAsText(file);

  };



  const resetUserConfiguration = () => {

    const nextGlobalSettings = DEFAULT_GLOBAL_SETTINGS;



    setGlobalSettings(nextGlobalSettings);

    saveGlobalSettings(nextGlobalSettings);

    setAssetChartSettings(DEFAULT_ASSET_CHART_SETTINGS);

    saveAssetChartSettings(DEFAULT_ASSET_CHART_SETTINGS);

    setAutoBackupSettings(DEFAULT_AUTO_BACKUP_SETTINGS);

    setAutoBackupDraft(DEFAULT_AUTO_BACKUP_SETTINGS);

    setAutoBackupCycleValueInput(String(DEFAULT_AUTO_BACKUP_SETTINGS.cycle.value));

    saveAutoBackupSettings(DEFAULT_AUTO_BACKUP_SETTINGS);

    setIsLocked(false);

    setUnlockPasswordInput('');

    setUnlockError('');

    setPasswordEditorMode(null);

    setSnapshotPasswordEditorMode(null);

    setIsPasswordDisableConfirmOpen(false);

    setIsSnapshotEncryptionDisableConfirmOpen(false);

  };



  const resetAssetHistory = (persist: boolean) => {

    const emptyData: AppData = { groups: [], history: [] };



    resetDataViews();

    setAppData(emptyData);

    applyBackupState([], '', 0, persist);



    if (persist) {

      saveEmptyAssetData();

    }

  };



  const resetAllData = () => {

    resetUserConfiguration();

    setIsExampleMode(false);

    realDataBeforeExampleRef.current = null;

    resetAssetHistory(true);

    markPendingFirstWelcomeAfterClearAll();

  };



  const getResetActionLabel = (action: ResetAction) => {

    if (action === 'settings') {

      return '清除用户配置';

    }



    if (action === 'history') {

      return '清除历史记录';

    }



    return '清除所有';

  };



  const openResetConfirmation = (action: ResetAction) => {

    if (isExampleMode) {

      return;

    }



    setResetConfirmation({

      action,

      code: String(randomIntBetween(0, 9999)).padStart(4, '0')

    });

    setResetConfirmationInput('');

  };



  const closeResetConfirmation = () => {

    setResetConfirmation(null);

    setResetConfirmationInput('');

  };



  const confirmResetAction = () => {

    if (!resetConfirmation || resetConfirmationInput !== resetConfirmation.code) {

      return;

    }



    const { action } = resetConfirmation;

    closeResetConfirmation();



    if (isExampleMode) {

      return;

    }



    if (action === 'settings') {

      resetUserConfiguration();

      return;

    }



    if (action === 'history') {

      resetAssetHistory(!isExampleMode);

      return;

    }



    resetAllData();

  };



  const petNyaaCat = () => {

    if (isCatPetted || catPetTimerRef.current !== null) {

      return;

    }



    const now = Date.now();

    const nextCount = now - lastCatPetAtRef.current <= 5000 ? catPetCountRef.current + 1 : 1;



    lastCatPetAtRef.current = now;

    catPetCountRef.current = nextCount;

    setIsCatPetted(true);



    if (catPetTimerRef.current !== null) {

      window.clearTimeout(catPetTimerRef.current);

    }



    catPetTimerRef.current = window.setTimeout(() => {

      setIsCatPetted(false);

      catPetTimerRef.current = null;

    }, 1200);



    if (nextCount >= 3 && !globalSettings.nyaaThemeUnlocked) {

      catPetCountRef.current = 0;

      lastCatPetAtRef.current = 0;

      unlockNyaaTheme();

    }

  };



  const resetPasswordEditor = () => {

    setPasswordEditorMode(null);

    setOldPasswordInput('');

    setNewPasswordInput('');

    setConfirmPasswordInput('');

    setPasswordEditorError('');

    setIsSavingPassword(false);

  };



  const openPasswordEditor = (mode: Exclude<PasswordEditorMode, null>) => {

    setPasswordEditorMode(mode);

    setOldPasswordInput('');

    setNewPasswordInput('');

    setConfirmPasswordInput('');

    setPasswordEditorError('');

    setIsSavingPassword(false);

  };



  const requestFirstPasswordSetup = () => {

    setConfirmationDialog({

      title: '设置登录密码',

      message: (

        <>

          <p>忘记登录密码将无法进入净流</p>

          <p>请妥善保存</p>

        </>

      ),

      confirmLabel: '继续设置',

      onConfirm: () => openPasswordEditor('setup')

    });

  };



  const requestOpenPasswordEditor = () => {

    if (globalSettings.passwordHash) {

      openPasswordEditor('edit');

      return;

    }



    requestFirstPasswordSetup();

  };



  const closePasswordDisableConfirm = () => {

    setIsPasswordDisableConfirmOpen(false);

    setPasswordDisableInput('');

    setPasswordDisableError('');

    setIsDisablingPasswordProtection(false);

  };



  const requestDisablePasswordProtection = () => {

    if (!globalSettings.passwordHash) {

      updateGlobalSettings((currentSettings) => ({

        ...currentSettings,

        passwordProtectionEnabled: false

      }));

      return;

    }



    setIsPasswordDisableConfirmOpen(true);

    setPasswordDisableInput('');

    setPasswordDisableError('');

    setIsDisablingPasswordProtection(false);

  };



  const updatePasswordProtection = (value: string) => {

    if (value === 'yes') {

      if (globalSettings.passwordProtectionEnabled) {

        return;

      }



      if (!globalSettings.passwordHash) {

        requestFirstPasswordSetup();

        return;

      }



      updateGlobalSettings((currentSettings) => ({

        ...currentSettings,

        passwordProtectionEnabled: true

      }));

      return;

    }



    if (value === 'no' && globalSettings.passwordProtectionEnabled) {

      requestDisablePasswordProtection();

    }

  };



  const confirmDisablePasswordProtection = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();



    if (!globalSettings.passwordHash) {

      updateGlobalSettings((currentSettings) => ({

        ...currentSettings,

        passwordProtectionEnabled: false

      }));

      closePasswordDisableConfirm();

      return;

    }



    setIsDisablingPasswordProtection(true);

    setPasswordDisableError('');



    const isPasswordValid = await verifyPassword(

      passwordDisableInput,

      globalSettings.passwordHash

    );



    if (!isPasswordValid) {

      setPasswordDisableError('密码错误');

      setIsDisablingPasswordProtection(false);

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      passwordProtectionEnabled: false

    }));

    setIsLocked(false);

    closePasswordDisableConfirm();

  };



  const saveLoginPassword = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();



    if (newPasswordInput.trim() === '') {

      setPasswordEditorError('请输入新密码');

      return;

    }



    if (newPasswordInput !== confirmPasswordInput) {

      setPasswordEditorError('两次输入的新密码不一致');

      return;

    }



    const savedPasswordHash = globalSettings.passwordHash;



    setIsSavingPassword(true);

    setPasswordEditorError('');



    if (passwordEditorMode === 'edit') {

      if (!savedPasswordHash) {

        setPasswordEditorError('旧密码不正确');

        setIsSavingPassword(false);

        return;

      }



      const isOldPasswordValid = await verifyPassword(oldPasswordInput, savedPasswordHash);



      if (!isOldPasswordValid) {

        setPasswordEditorError('旧密码不正确');

        setIsSavingPassword(false);

        return;

      }

    }



    try {

      const nextPasswordHash = await createPasswordHash(newPasswordInput);



      updateGlobalSettings((currentSettings) => ({

        ...currentSettings,

        passwordHash: nextPasswordHash,

        passwordProtectionEnabled:

          passwordEditorMode === 'setup' ? true : currentSettings.passwordProtectionEnabled

      }));

      resetPasswordEditor();

    } catch (error) {

      console.error('[NetraFlow security] Failed to save login password.', error);

      setPasswordEditorError('密码保存失败');

      setIsSavingPassword(false);

    }

  };



  const getSnapshotEncryptionEnableMessage = () =>

    autoBackupSettings.enabled

      ? (

          <>

            <p>手动导出的快照文件和当前已开启的自动快照文件都将使用快照密码加密</p>

            <p>忘记快照密码将无法恢复这些加密快照</p>

            <strong>是否继续？</strong>

          </>

        )

      : (

          <>

            <p>手动导出的快照文件将使用快照密码加密</p>

            <p>忘记快照密码将无法恢复这些加密快照</p>

            <strong>是否继续？</strong>

          </>

        );



  const resetSnapshotPasswordEditor = () => {

    setSnapshotPasswordEditorMode(null);

    setShouldEnableSnapshotEncryptionAfterPasswordSave(false);

    setOldSnapshotPasswordInput('');

    setNewSnapshotPasswordInput('');

    setConfirmSnapshotPasswordInput('');

    setSnapshotPasswordEditorError('');

    setIsSavingSnapshotPassword(false);

    setVisibleSnapshotPasswordField(null);



    if (snapshotPasswordRevealTimerRef.current !== null) {

      window.clearTimeout(snapshotPasswordRevealTimerRef.current);

      snapshotPasswordRevealTimerRef.current = null;

    }

  };



  const openSnapshotPasswordEditor = (

    mode: Exclude<SnapshotPasswordEditorMode, null>,

    enableAfterSave = false

  ) => {

    setSnapshotPasswordEditorMode(mode);

    setShouldEnableSnapshotEncryptionAfterPasswordSave(enableAfterSave);

    setOldSnapshotPasswordInput('');

    setNewSnapshotPasswordInput('');

    setConfirmSnapshotPasswordInput('');

    setSnapshotPasswordEditorError('');

    setIsSavingSnapshotPassword(false);

    setVisibleSnapshotPasswordField(null);



    if (snapshotPasswordRevealTimerRef.current !== null) {

      window.clearTimeout(snapshotPasswordRevealTimerRef.current);

      snapshotPasswordRevealTimerRef.current = null;

    }

  };



  const requestFirstSnapshotPasswordSetup = (enableAfterSave = false) => {

    setConfirmationDialog({

      title: '设置快照密码',

      message: (

        <>

          <p>忘记快照密码将无法恢复已加密的快照</p>

          <p>请妥善保存</p>

        </>

      ),

      confirmLabel: '继续设置',

      onConfirm: () => openSnapshotPasswordEditor('setup', enableAfterSave)

    });

  };



  const requestOpenSnapshotPasswordEditor = () => {

    if (!globalSettings.snapshotPasswordHash) {

      requestFirstSnapshotPasswordSetup();

      return;

    }



    setConfirmationDialog({

      title: '修改快照密码',

      message: (

        <>

          <p>之后生成的加密快照将使用新密码</p>

          <p>此前已经使用旧快照密码加密的文件，仍需要使用原密码解密</p>

        </>

      ),

      confirmLabel: '继续修改',

      onConfirm: () => openSnapshotPasswordEditor('edit')

    });

  };



  const closeSnapshotEncryptionDisableConfirm = () => {

    setIsSnapshotEncryptionDisableConfirmOpen(false);

    setSnapshotEncryptionDisableInput('');

    setSnapshotEncryptionDisableError('');

    setIsDisablingSnapshotEncryption(false);

  };



  const requestDisableSnapshotEncryption = () => {

    if (!globalSettings.snapshotPasswordHash) {

      updateGlobalSettings((currentSettings) => ({

        ...currentSettings,

        snapshotEncryptionEnabled: false

      }));

      return;

    }



    setIsSnapshotEncryptionDisableConfirmOpen(true);

    setSnapshotEncryptionDisableInput('');

    setSnapshotEncryptionDisableError('');

    setIsDisablingSnapshotEncryption(false);

  };



  const updateSnapshotEncryption = (value: string) => {

    if (value === 'yes') {

      if (globalSettings.snapshotEncryptionEnabled) {

        return;

      }



      if (!globalSettings.snapshotPasswordHash) {

        setConfirmationDialog({

          title: '启用快照加密',

          message: getSnapshotEncryptionEnableMessage(),

          confirmLabel: '继续',

          onConfirm: () => requestFirstSnapshotPasswordSetup(true)

        });

        return;

      }



      setConfirmationDialog({

        title: '启用快照加密',

        message: getSnapshotEncryptionEnableMessage(),

        confirmLabel: '确认启用',

        onConfirm: () =>

          updateGlobalSettings((currentSettings) => ({

            ...currentSettings,

            snapshotEncryptionEnabled: true

          }))

      });

      return;

    }



    if (value === 'no' && globalSettings.snapshotEncryptionEnabled) {

      requestDisableSnapshotEncryption();

    }

  };



  const confirmDisableSnapshotEncryption = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();



    if (!globalSettings.snapshotPasswordHash) {

      updateGlobalSettings((currentSettings) => ({

        ...currentSettings,

        snapshotEncryptionEnabled: false

      }));

      closeSnapshotEncryptionDisableConfirm();

      return;

    }



    setIsDisablingSnapshotEncryption(true);

    setSnapshotEncryptionDisableError('');



    const isPasswordValid = await verifyPassword(

      snapshotEncryptionDisableInput,

      globalSettings.snapshotPasswordHash

    );



    if (!isPasswordValid) {

      setSnapshotEncryptionDisableError('快照密码不正确');

      setIsDisablingSnapshotEncryption(false);

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      snapshotEncryptionEnabled: false

    }));

    closeSnapshotEncryptionDisableConfirm();

  };



  const toggleSnapshotPasswordVisibility = (field: 'new' | 'confirm') => {

    if (snapshotPasswordRevealTimerRef.current !== null) {

      window.clearTimeout(snapshotPasswordRevealTimerRef.current);

      snapshotPasswordRevealTimerRef.current = null;

    }



    if (visibleSnapshotPasswordField === field) {

      setVisibleSnapshotPasswordField(null);

      return;

    }



    setVisibleSnapshotPasswordField(field);

    snapshotPasswordRevealTimerRef.current = window.setTimeout(() => {

      setVisibleSnapshotPasswordField(null);

      snapshotPasswordRevealTimerRef.current = null;

    }, 2400);

  };



  const saveSnapshotPassword = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();



    if (newSnapshotPasswordInput.trim() === '') {

      setSnapshotPasswordEditorError('请输入新快照密码');

      return;

    }



    if (newSnapshotPasswordInput !== confirmSnapshotPasswordInput) {

      setSnapshotPasswordEditorError('两次输入的新快照密码不一致');

      return;

    }



    const savedSnapshotPasswordHash = globalSettings.snapshotPasswordHash;



    setIsSavingSnapshotPassword(true);

    setSnapshotPasswordEditorError('');



    if (snapshotPasswordEditorMode === 'edit') {

      if (!savedSnapshotPasswordHash) {

        setSnapshotPasswordEditorError('旧快照密码不正确');

        setIsSavingSnapshotPassword(false);

        return;

      }



      const isOldSnapshotPasswordValid = await verifyPassword(

        oldSnapshotPasswordInput,

        savedSnapshotPasswordHash

      );



      if (!isOldSnapshotPasswordValid) {

        setSnapshotPasswordEditorError('旧快照密码不正确');

        setIsSavingSnapshotPassword(false);

        return;

      }

    }



    try {

      const nextSnapshotPasswordHash = await createPasswordHash(newSnapshotPasswordInput);



      updateGlobalSettings((currentSettings) => ({

        ...currentSettings,

        snapshotPasswordHash: nextSnapshotPasswordHash,

        snapshotEncryptionEnabled:

          shouldEnableSnapshotEncryptionAfterPasswordSave ||

          currentSettings.snapshotEncryptionEnabled

      }));

      resetSnapshotPasswordEditor();

    } catch (error) {

      console.error('[NetraFlow security] Failed to save snapshot password.', error);

      setSnapshotPasswordEditorError('快照密码保存失败');

      setIsSavingSnapshotPassword(false);

    }

  };



  const updateAutoLockMinutesInput = (value: string) => {

    if (!/^\d*$/.test(value)) {

      return;

    }



    setAutoLockMinutesInput(value);



    if (!value) {

      return;

    }



    const nextMinutes = Number(value);



    if (!Number.isFinite(nextMinutes) || nextMinutes < 1) {

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      autoLockMinutes: Math.floor(nextMinutes)

    }));

  };



  const resetInvalidAutoLockMinutesInput = () => {

    const nextMinutes = Number(autoLockMinutesInput);



    if (!autoLockMinutesInput || !Number.isFinite(nextMinutes) || nextMinutes < 1) {

      setAutoLockMinutesInput(String(globalSettings.autoLockMinutes));

    }

  };



  const unlockApp = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();



    if (!globalSettings.passwordProtectionEnabled || !globalSettings.passwordHash) {

      setIsLocked(false);

      setUnlockPasswordInput('');

      setUnlockError('');

      return;

    }



    setIsUnlocking(true);

    setUnlockError('');



    const isPasswordValid = await verifyPassword(unlockPasswordInput, globalSettings.passwordHash);



    if (!isPasswordValid) {

      setUnlockError('密码错误');

      setIsUnlocking(false);

      return;

    }



    setIsLocked(false);

    setUnlockPasswordInput('');

    setUnlockError('');

    setIsUnlocking(false);

  };



  const dismissToast = (toastId: string) => {

    setToastMessages((currentMessages) =>

      currentMessages.filter((message) => message.id !== toastId)

    );

  };



  const showToast = (message: string, tone: ToastTone = 'info') => {

    const toastId = createId('toast');

    const timerId = window.setTimeout(() => dismissToast(toastId), 2800);



    toastTimerRefs.current.push(timerId);

    setToastMessages((currentMessages) => [

      ...currentMessages.filter((currentMessage) => currentMessage.message !== message),

      {

        id: toastId,

        message,

        tone

      }

    ]);



    return toastId;

  };



  const openExternalInfoLink = (url: string, logMessage: string) => {

    const api = window.electronAPI ?? window.electronWindow;



    if (api?.openExternalUrl) {

      void api.openExternalUrl(url).catch((error) => {

        console.warn(logMessage, error);

      });

    } else {

      window.open(url, '_blank', 'noopener,noreferrer');

    }

  };



  const openBilibiliProfile = () => {

    openExternalInfoLink(
      BILIBILI_PROFILE_URL,
      'Failed to open Bilibili profile.'
    );

  };



  const openGithubReleases = () => {

    openExternalInfoLink(
      GITHUB_RELEASES_URL,
      'Failed to open GitHub releases.'
    );

  };



  const closeConfirmationDialog = () => {

    const cancelAction = confirmationDialog?.onCancel;



    setConfirmationDialog(null);

    cancelAction?.();

  };



  const confirmAndClose = () => {

    const action = confirmationDialog?.onConfirm;



    setConfirmationDialog(null);

    action?.();

  };



  const requestConfirmationDialog = (

    options: Omit<NonNullable<ConfirmationDialogState>, 'onConfirm' | 'onCancel'>

  ) =>

    new Promise<boolean>((resolve) => {

      setConfirmationDialog({

        ...options,

        onConfirm: () => resolve(true),

        onCancel: () => resolve(false)

      });

    });



  const closeNoticeDialog = () => {

    const closeAction = noticeDialog?.onClose;



    setNoticeDialog(null);

    closeAction?.();

  };



  const showNoticeDialog = (options: Omit<NonNullable<NoticeDialogState>, 'onClose'>) =>

    new Promise<void>((resolve) => {

      setNoticeDialog({

        ...options,

        onClose: resolve

      });

    });



  const closeInputDialog = () => {

    const cancelAction = inputDialog?.onCancel;



    setInputDialog(null);

    setInputDialogValue('');

    cancelAction?.();

  };



  const confirmInputDialog = () => {

    const confirmAction = inputDialog?.onConfirm;

    const value = inputDialogValue;



    setInputDialog(null);

    setInputDialogValue('');

    confirmAction?.(value);

  };



  const formatMoney = (amount: number | null, options: { compact?: boolean } = {}) =>

    formatCurrencyMoneyValue(amount, options);



  const formatHomeMoneyAmount = (

    amount: number | null,

    options: { compact?: boolean } = {}

  ) => formatHomeMoney(amount, options);



  const formatHistoryAmount = (amount: number | null) =>

    amount === null ? '0' : formatMoneyValue(amount);

  const signedAdjustAmountLabel =

    adjustDirection === 'decrease'

      ? `-${formatHistoryAmount(parsedAdjustAmount)}`

      : `+${formatHistoryAmount(parsedAdjustAmount)}`;



  const formatShortTime = (time: string) => {

    const date = new Date(time);

    const year = String(date.getFullYear()).slice(2);

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    const hour = String(date.getHours()).padStart(2, '0');

    const minute = String(date.getMinutes()).padStart(2, '0');



    return `${year}.${month}.${day} ${hour}:${minute}`;

  };



  const formatShortDate = (time: string) => {

    const date = new Date(time);



    if (Number.isNaN(date.getTime())) {

      return '';

    }



    const year = String(date.getFullYear()).slice(2);

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');



    return `${year}.${month}.${day}`;

  };



  const getArchivedAccountArchivedAtLabel = (archivedAt?: string) => {

    const archivedDate = archivedAt ? formatShortDate(archivedAt) : '';



    return archivedDate ? `归档于 ${archivedDate}` : '归档时间未知';

  };



  const formatRelativeBackupTime = (time: string) => {

    const timestamp = getValidTimestamp(time);



    if (timestamp === null) {

      return '从未备份';

    }



    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const backupDate = new Date(timestamp);

    backupDate.setHours(0, 0, 0, 0);

    const diffDays = Math.max(0, Math.floor((today.getTime() - backupDate.getTime()) / DAY_MS));



    if (diffDays === 0) {

      return '今天';

    }



    if (diffDays === 1) {

      return '昨天';

    }



    return `${diffDays}天前`;

  };



  const formatPreciseBackupTime = (time: string) => {

    const timestamp = getValidTimestamp(time);



    if (timestamp === null) {

      return '时间未知';

    }



    const date = new Date(timestamp);

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    const hour = String(date.getHours()).padStart(2, '0');

    const minute = String(date.getMinutes()).padStart(2, '0');

    const second = String(date.getSeconds()).padStart(2, '0');



    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;

  };



  const getBackupMethodLabel = (method: BackupMethod) =>

    method === 'auto' ? '自动快照' : '手动快照';



  const formatBackupFileTimestamp = (date: Date) => {

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    const hour = String(date.getHours()).padStart(2, '0');

    const minute = String(date.getMinutes()).padStart(2, '0');



    return `${year}${month}${day}-${hour}${minute}`;

  };



  const formatPercentage = (amount: number, denominator: number) => {

    if (denominator === 0) {

      return '0%';

    }



    return `${((Math.abs(amount) / Math.abs(denominator)) * 100).toFixed(1)}%`;

  };



  const getGroupPercentageLabel = (group: (typeof groupTotals)[number]) =>

    group.includeInStats ? formatPercentage(group.total, positiveStatsTotal) : '未计入';



  const getAccountPercentageLabel = (

    group: (typeof groupTotals)[number],

    account: Account

  ) => (group.includeInStats ? formatPercentage(account.amount, group.total) : '未计入');



  const getPercentageColor = (nature: AccountTypeNature, includeInStats: boolean) => {

    if (!includeInStats) {

      return 'var(--text-muted)';

    }



    return nature === 'liability' ? '#15803d' : '#9a6b2f';

  };



  const getGroupNature = (groupName: string) =>

    groups.find((group) => group.name === groupName)?.nature ?? getLegacyNature(groupName);



  const toStoredGroupAmount = (groupName: string, amount: number) =>

    toStoredAmountByNature(getGroupNature(groupName), amount);



  const flashDirection: FlashNoteDirection = getFlashDirectionFromDates(flashStartDate, flashEndDate);

  const flashVisibleMonthEnd = useMemo(

    () => new Date(flashVisibleMonth.getFullYear(), flashVisibleMonth.getMonth() + 2, 0),

    [flashVisibleMonth]

  );

  const flashVisibleSelectableDates = useMemo(

    () =>

      getDateRangeKeys(

        toDateInputValue(flashVisibleMonth),

        toDateInputValue(flashVisibleMonthEnd)

      ),

    [flashVisibleMonth, flashVisibleMonthEnd]

  );

  const flashTrackDates = useMemo(() => {

    const safeDates = flashSelectedDates.filter((dateValue) => !isFutureDateKey(dateValue));

    if (flashStartDate && !flashEndDate && !isFutureDateKey(flashStartDate)) {

      return getContinuousFlashDates({

        startDate: flashStartDate,

        direction: flashDirection,

        minimumCount: Math.max(35, flashInputCursor + 14),

        includeDates: Object.keys(flashCells)

      });

    }



    if (safeDates.length === 0 && flashStartDate && !isFutureDateKey(flashStartDate)) {

      return [flashStartDate];

    }



    return sortFlashDatesByDirection(safeDates, flashDirection);

  }, [flashCells, flashDirection, flashEndDate, flashInputCursor, flashSelectedDates, flashStartDate]);

  const flashCorrectionTrackDates = useMemo(() => {

    if (!flashStartDate) {

      return [];

    }



    if (flashEndDate) {

      return sortFlashDatesByDirection(

        getDateRangeKeys(flashStartDate, flashEndDate),

        flashDirection

      );

    }



    if (!flashCorrectionRangeStart || !flashCorrectionRangeEnd) {

      return flashTrackDates;

    }



    return sortFlashDatesByDirection(

      getDateRangeKeys(flashCorrectionRangeStart, flashCorrectionRangeEnd),

      flashDirection

    );

  }, [

    flashCorrectionRangeEnd,

    flashCorrectionRangeStart,

    flashDirection,

    flashEndDate,

    flashStartDate,

    flashTrackDates

  ]);

  const flashSelectedDateSet = useMemo(

    () => new Set(flashSelectedDates),

    [flashSelectedDates]

  );

  const flashDragPreviewDateSet = useMemo(

    () => new Set(flashDragPreviewDates),

    [flashDragPreviewDates]

  );

  const flashCurrentDate = flashTrackDates[flashInputCursor] ?? '';

  const flashHasTemporaryContent =

    Boolean(flashStartDate) ||

    flashSelectedDates.length > 0 ||

    flashNoteStage !== 'select' ||

    Object.values(flashCells).some((cell) => cell.value.trim() || cell.enabled || cell.missing) ||

    flashStashSegments.length > 0;



  const getFlashCell = (dateValue: string): FlashNoteCell => {

    const existingCell = flashCells[dateValue];



    return (

      existingCell ?? {

        date: dateValue,

        value: '',

        enabled: flashSelectedDateSet.has(dateValue),

        original: flashSelectedDateSet.has(dateValue),

        missing: false,

        pendingDelete: false

      }

    );

  };



  const createFlashCell = (

    dateValue: string,

    overrides: Partial<FlashNoteCell> = {}

  ): FlashNoteCell => ({

    ...getFlashCell(dateValue),

    ...overrides,

    date: dateValue

  });



  const getFlashSelectionResult = (

    candidateDates: string[],

    mode: FlashNoteSelectionMode

  ) => {

    const safeCandidateDates = Array.from(

      new Set(candidateDates.filter((dateValue) => !isFutureDateKey(dateValue)))

    );

    const currentSet = new Set(flashSelectedDates);

    const candidateSet = new Set(safeCandidateDates);



    if (mode === 'replace') {

      return safeCandidateDates.sort();

    }



    if (mode === 'intersect') {

      return flashSelectedDates.filter((dateValue) => candidateSet.has(dateValue)).sort();

    }



    if (mode === 'subtract') {

      return flashSelectedDates.filter((dateValue) => !candidateSet.has(dateValue)).sort();

    }



    safeCandidateDates.forEach((dateValue) => currentSet.add(dateValue));

    return Array.from(currentSet).sort();

  };



  const wouldFlashSelectionFillVisibleRange = (dates: string[]) =>

    flashVisibleSelectableDates.length > 0 &&

    dates.length === flashVisibleSelectableDates.length &&

    flashVisibleSelectableDates.every((dateValue) => dates.includes(dateValue));



  const applyFlashDateSelection = (

    candidateDates: string[],

    mode = flashSelectionMode,

    bounds?: { start: string; end?: string; keepBounds?: boolean }

  ) => {

    const nextDates = getFlashSelectionResult(candidateDates, mode);



    if (wouldFlashSelectionFillVisibleRange(nextDates)) {

      return false;

    }



    setFlashSelectedDates(nextDates);

    setFlashDragPreviewDates([]);

    setFlashActiveDateRule(null);



    if (!bounds?.keepBounds) {

      const nextStartDate = bounds?.start ?? nextDates[0] ?? '';

      const nextEndDate = bounds?.end ?? '';

      setFlashStartDate(nextStartDate);

      setFlashEndDate(nextEndDate && nextEndDate !== nextStartDate ? nextEndDate : '');

      setFlashKeyboardDate(nextStartDate);

    } else if (!flashStartDate && nextDates[0]) {

      setFlashStartDate(nextDates[0]);

      setFlashKeyboardDate(nextDates[0]);

    }



    return true;

  };



  const handleFlashDatePointerDown = (dateValue: string) => {

    if (isFutureDateKey(dateValue)) {

      return;

    }



    setFlashDragStartDate(dateValue);

    setFlashDragPreviewDates([dateValue]);

    setFlashKeyboardDate(dateValue);

  };



  const handleFlashDatePointerEnter = (dateValue: string) => {

    if (!flashDragStartDate || isFutureDateKey(dateValue)) {

      return;

    }



    setFlashDragPreviewDates(getDateRangeKeys(flashDragStartDate, dateValue));

  };



  const handleFlashDatePointerUp = (dateValue: string) => {

    if (!flashDragStartDate || isFutureDateKey(dateValue)) {

      return;

    }



    const isSingleClick = flashDragStartDate === dateValue && flashDragPreviewDates.length <= 1;



    if (isSingleClick && flashSelectionMode === 'replace') {

      if (!flashStartDate || flashEndDate || flashStartDate === dateValue) {

        applyFlashDateSelection([dateValue], 'replace', { start: dateValue });

      } else {

        applyFlashDateSelection(getDateRangeKeys(flashStartDate, dateValue), 'replace', {

          start: flashStartDate,

          end: dateValue

        });

      }

    } else {

      applyFlashDateSelection(getDateRangeKeys(flashDragStartDate, dateValue), flashSelectionMode, {

        start: flashDragStartDate,

        end: dateValue

      });

    }



    setFlashDragStartDate('');

  };



  const applyFlashDateRule = (rule: FlashNoteDateRule) => {

    if (!flashStartDate || isFutureDateKey(flashStartDate)) {

      return;

    }



    const visibleEndDate =

      flashVisibleSelectableDates[flashVisibleSelectableDates.length - 1] ?? flashStartDate;

    const endDate = flashEndDate || visibleEndDate;

    const candidateDates = getDateRangeKeys(flashStartDate, endDate).filter((dateValue) => {

      const weekdayIndex = getDateKeyFromValue(dateValue).getDay();



      if (rule === 'weekday') {

        return weekdayIndex >= 1 && weekdayIndex <= 5;

      }



      if (rule === 'weekend') {

        return weekdayIndex === 0 || weekdayIndex === 6;

      }



      return true;

    });



    applyFlashDateSelection(candidateDates, 'replace', {

      start: flashStartDate,

      end: flashEndDate,

      keepBounds: true

    });

    setFlashActiveDateRule(rule);

  };



  const getFlashDateRuleCandidateDates = (rule: FlashNoteDateRule) => {

    if (!flashStartDate || isFutureDateKey(flashStartDate)) {

      return [];

    }

    const visibleEndDate =

      flashVisibleSelectableDates[flashVisibleSelectableDates.length - 1] ?? flashStartDate;

    const endDate = flashEndDate || visibleEndDate;

    return getDateRangeKeys(flashStartDate, endDate).filter((dateValue) => {

      const weekdayIndex = getDateKeyFromValue(dateValue).getDay();

      if (rule === 'weekday') {

        return weekdayIndex >= 1 && weekdayIndex <= 5;

      }

      if (rule === 'weekend') {

        return weekdayIndex === 0 || weekdayIndex === 6;

      }

      return true;

    });

  };



  const isFlashDateRuleDisabled = (rule: FlashNoteDateRule) => {

    const candidateDates = getFlashDateRuleCandidateDates(rule);

    if (candidateDates.length === 0) {

      return true;

    }

    return wouldFlashSelectionFillVisibleRange(getFlashSelectionResult(candidateDates, 'replace'));

  };



  const resetFlashNoteDraft = (keepOpen = true) => {

    setIsFlashNoteOpen(keepOpen);

    setFlashNoteStage('select');

    setFlashNoteAccount(null);

    setFlashVisibleMonth(getFlashDefaultVisibleMonth());

    setFlashStartDate('');

    setFlashEndDate('');

    setFlashSelectedDates([]);

    setFlashSelectionMode('replace');

    setFlashActiveDateRule(null);

    setFlashDragStartDate('');

    setFlashDragPreviewDates([]);

    setFlashKeyboardDate('');

    setFlashInputMode('change');

    setFlashCells({});

    setFlashInputCursor(0);

    setFlashCurrentInput('');

    setIsFlashInputTailLocked(false);

    setFlashCorrectionSelection([]);

    setFlashCorrectionRangeStart('');

    setFlashCorrectionRangeEnd('');

    setFlashStashSegments([]);

    setFlashContextMenu(null);

    setFlashEditingDate('');

    setFlashEditingValue('');

    setFlashShortcutHintHidden(false);

    setIsFlashExitConfirmOpen(false);

    setIsFlashReturnDateConfirmOpen(false);

    setIsFlashReturnSequenceConfirmOpen(false);

    flashCorrectionEntrySnapshotRef.current = null;

    flashCorrectionTouchedRef.current = false;

  };



  const openFlashNote = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    exitGroupEditMode();

    setSelectedAccount(null);

    setSelectedGroupDetailName('');

    setIsQuickSingleEntryAccountPickerOpen(false);

    setIsGlobalSettingsOpen(false);

    setIsTotalChartsOpen(false);

    setIsHistoryOpen(false);

    setIsArchivedAccountsOpen(false);

    resetFlashNoteDraft(true);

    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: 0 });

    }, 0);

  };



  const closeFlashNote = () => {

    resetFlashNoteDraft(false);

  };



  const requestCloseFlashNote = () => {

    if (!flashHasTemporaryContent) {

      closeFlashNote();

      return;

    }



    setIsFlashExitConfirmOpen(true);

  };



  const hasFlashSequenceValidInput = () =>

    parseFlashNumberInput(flashCurrentInput) !== null ||

    Object.values(flashCells).some((cell) => parseFlashNumberInput(cell.value) !== null);



  const clearFlashSequenceDraft = () => {

    setFlashCells({});

    setFlashInputCursor(0);

    setFlashCurrentInput('');

    setIsFlashInputTailLocked(false);

    setFlashCorrectionSelection([]);

    setFlashCorrectionRangeStart('');

    setFlashCorrectionRangeEnd('');

    setFlashStashSegments([]);

    setFlashContextMenu(null);

    setFlashEditingDate('');

    setFlashEditingValue('');

    flashCorrectionEntrySnapshotRef.current = null;

    flashCorrectionTouchedRef.current = false;

  };



  const returnFlashDateSelection = () => {

    clearFlashSequenceDraft();

    setIsFlashReturnDateConfirmOpen(false);

    setFlashNoteStage('select');

  };



  const requestReturnFlashDateSelection = () => {

    if (flashNoteStage !== 'input') {

      return;

    }



    if (!hasFlashSequenceValidInput()) {

      returnFlashDateSelection();

      return;

    }



    setIsFlashReturnDateConfirmOpen(true);

  };



  const chooseFlashAccount = (groupName: string, account: Account) => {

    setFlashNoteAccount({ groupName, accountId: account.id });

  };



  const advanceFlashDateSelection = () => {

    if (!flashSelectedAccountEntry || flashTrackDates.length === 0 || !flashStartDate) {

      return;

    }

    startFlashSequenceInput();

  };



  const startFlashSequenceInput = () => {

    if (!flashSelectedAccountEntry || flashTrackDates.length === 0) {

      return;

    }



    const initialTrackDates = flashEndDate ? flashTrackDates : flashTrackDates.slice(0, 1);

    const nextCells = initialTrackDates.reduce<Record<string, FlashNoteCell>>(

      (cells, dateValue) => ({

        ...cells,

        [dateValue]: {

          date: dateValue,

          value: '',

          enabled: true,

          original: true,

          missing: false,

          pendingDelete: false

        }

      }),

      {}

    );



    setFlashCells(nextCells);

    setFlashInputCursor(0);

    setFlashCurrentInput('');

    setIsFlashInputTailLocked(false);

    setFlashNoteStage('input');

  };



  const syncFlashCurrentInputFromCursor = (nextCursor: number, nextCells = flashCells) => {

    const nextDate = flashTrackDates[nextCursor] ?? '';

    setIsFlashInputTailLocked(false);

    setFlashCurrentInput(nextDate ? nextCells[nextDate]?.value ?? '' : '');

  };



  const commitFlashSequenceInput = () => {

    if (isFlashInputTailLocked) {

      return;

    }

    const currentDate = flashTrackDates[flashInputCursor];



    if (!currentDate) {

      return;

    }



    const trimmedValue = flashCurrentInput.trim();

    const parsedValue = parseFlashNumberInput(trimmedValue);

    const normalizedValue = parsedValue === null ? '' : formatMoneyInputValue(parsedValue);

    const nextCells = {

      ...flashCells,

      [currentDate]: createFlashCell(currentDate, {

        value: normalizedValue,

        enabled: true,

        original: true,

        missing: parsedValue === null,

        pendingDelete: false

      })

    };



    setFlashCells(nextCells);



    if (flashInputCursor >= flashTrackDates.length - 1) {

      setFlashCurrentInput(nextCells[currentDate]?.value ?? '');

      setIsFlashInputTailLocked(parsedValue !== null);

      return;

    }



    const nextCursor = flashInputCursor + 1;

    setFlashInputCursor(nextCursor);

    setIsFlashInputTailLocked(false);

    syncFlashCurrentInputFromCursor(nextCursor, nextCells);

  };



  const undoFlashSequenceInput = () => {

    setIsFlashInputTailLocked(false);

    const currentDate = flashTrackDates[flashInputCursor];

    const currentCell = currentDate ? getFlashCell(currentDate) : null;

    const currentDraftValue = flashCurrentInput.trim();



    const currentHasValue =

      Boolean(currentDate) &&

      (parseFlashNumberInput(currentDraftValue) !== null ||

        (currentCell && parseFlashNumberInput(currentCell.value) !== null));



    if (currentHasValue && currentDate) {

      const nextCells = {

        ...flashCells,

        [currentDate]: createFlashCell(currentDate, {

          value: '',

          enabled: true,

          missing: true,

          pendingDelete: false

        })

      };

      const previousCursor = Math.max(0, flashInputCursor - 1);

      setFlashCells(nextCells);

      setFlashInputCursor(previousCursor);

      syncFlashCurrentInputFromCursor(previousCursor, nextCells);

      return;

    }



    if (flashInputCursor <= 0) {

      return;

    }



    const previousCursor = flashInputCursor - 1;

    const previousDate = flashTrackDates[previousCursor];



    if (!previousDate) {

      return;

    }



    const nextCells = {

      ...flashCells,

      [previousDate]: createFlashCell(previousDate, {

        value: '',

        enabled: true,

        missing: true,

        pendingDelete: false

      })

    };



    setFlashInputCursor(previousCursor);

    setFlashCells(nextCells);

    setFlashCurrentInput('');

  };



  const appendFlashSequenceInputCharacter = (key: string) => {

    if (isFlashInputTailLocked) {

      return;

    }

    setFlashCurrentInput((currentValue) => appendFlashInputCharacter(currentValue, key));

  };



  const backspaceFlashSequenceInput = () => {

    setIsFlashInputTailLocked(false);

    setFlashCurrentInput((currentValue) => backspaceFlashInputValue(currentValue));

  };



  const enterFlashConfirmStage = () => {

    const currentCellValue = flashCurrentDate ? getFlashCell(flashCurrentDate).value : '';

    if (
      !isFlashInputTailLocked &&
      flashCurrentDate &&
      (flashCurrentInput.trim() || flashCurrentInput !== currentCellValue)
    ) {

      commitFlashSequenceInput();

    }

    setIsFlashInputTailLocked(false);

    const firstSelectableDate =

      flashTrackDates.find((dateValue) => {

        const cell = getFlashCell(dateValue);

        return cell.enabled || parseFlashNumberInput(cell.value) !== null;

      }) ?? '';

    setFlashEditingDate(firstSelectableDate);

    setFlashEditingValue(firstSelectableDate ? getFlashCell(firstSelectableDate).value : '');

    setFlashNoteStage('confirm');

  };



  const cancelFlashCellEdit = () => {

    setFlashEditingDate('');

    setFlashEditingValue('');

  };



  const deleteSelectedFlashCells = () => {

    const deletableDates = flashCorrectionSelection.filter(

      (dateValue) => parseFlashNumberInput(getFlashCell(dateValue).value) !== null

    );



    if (deletableDates.length === 0) {

      return;

    }



    const shouldDeleteNow = deletableDates.every(

      (dateValue) => getFlashCell(dateValue).pendingDelete

    );

    const nextCells = { ...flashCells };



    deletableDates.forEach((dateValue) => {

      nextCells[dateValue] = createFlashCell(dateValue, {

        value: shouldDeleteNow ? '' : getFlashCell(dateValue).value,

        enabled: true,

        missing: false,

        pendingDelete: !shouldDeleteNow

      });

    });



    flashCorrectionTouchedRef.current = true;

    setFlashCells(nextCells);

  };



  const moveFlashKeyboardDate = (offset: number) => {

    const isDateSelection = flashNoteStage === 'date-select';

    const track = isDateSelection ? flashVisibleSelectableDates : flashCorrectionTrackDates;

    const currentDate =

      flashKeyboardDate || (isDateSelection ? flashStartDate : flashCorrectionSelection[0]) || track[0];

    const currentIndex = currentDate ? track.indexOf(currentDate) : -1;

    const nextDate = track[Math.max(0, Math.min(track.length - 1, currentIndex + offset))];



    if (!nextDate || isFutureDateKey(nextDate)) {

      return;

    }



    setFlashKeyboardDate(nextDate);



    if (flashNoteStage === 'correction') {

      setFlashCorrectionSelection([nextDate]);

    }

  };



  const getFlashAccountPreviousAmount = () => {

    if (!flashSelectedAccountEntry) {

      return null;

    }



    const latestRecord = sortedHistory.find(

      (record) =>

        record.accountId === flashSelectedAccountEntry.id &&

        record.afterAmount !== null

    );



    return latestRecord?.afterAmount ?? flashSelectedAccountEntry.amount;

  };



  const getFlashBalanceHasPreviousRecord = () =>

    Boolean(

      flashSelectedAccountEntry &&

        sortedHistory.some(

          (record) =>

            record.accountId === flashSelectedAccountEntry.id &&

            record.afterAmount !== null

        )

    );



  const isFlashConfirmSelectableDate = (dateValue: string) => {

    if (isFutureDateKey(dateValue) || !flashTrackDates.includes(dateValue)) {

      return false;

    }

    const cell = getFlashCell(dateValue);

    return cell.enabled || parseFlashNumberInput(cell.value) !== null;

  };



  const selectFlashConfirmDate = (dateValue: string) => {

    if (!isFlashConfirmSelectableDate(dateValue)) {

      return;

    }

    setFlashEditingDate(dateValue);

    setFlashEditingValue(getFlashCell(dateValue).value);

  };



  const updateFlashConfirmCellValue = (dateValue: string, nextValue: string) => {

    if (!dateValue || !isFlashConfirmSelectableDate(dateValue)) {

      return;

    }

    const normalizedValue = normalizeMoneyInput(nextValue, { allowNegative: true });

    if (!isValidFlashNumberInput(normalizedValue)) {

      return;

    }

    const parsedValue = parseFlashNumberInput(normalizedValue);

    setFlashEditingValue(normalizedValue);

    setFlashCells((currentCells) => ({

      ...currentCells,

      [dateValue]: {

        ...(currentCells[dateValue] ?? getFlashCell(dateValue)),

        date: dateValue,

        value: normalizedValue,

        enabled: true,

        missing: parsedValue === null,

        pendingDelete: false

      }

    }));

  };



  const appendFlashConfirmInputCharacter = (key: string) => {

    if (!flashEditingDate) {

      return;

    }

    updateFlashConfirmCellValue(

      flashEditingDate,

      appendFlashInputCharacter(getFlashCell(flashEditingDate).value, key)

    );

  };



  const backspaceFlashConfirmInput = () => {

    if (!flashEditingDate) {

      return;

    }

    updateFlashConfirmCellValue(

      flashEditingDate,

      backspaceFlashInputValue(getFlashCell(flashEditingDate).value)

    );

  };



  const clearFlashConfirmCell = () => {

    if (!flashEditingDate || !isFlashConfirmSelectableDate(flashEditingDate)) {

      return;

    }

    setFlashEditingValue('');

    setFlashCells((currentCells) => ({

      ...currentCells,

      [flashEditingDate]: {

        ...(currentCells[flashEditingDate] ?? getFlashCell(flashEditingDate)),

        date: flashEditingDate,

        value: '',

        enabled: true,

        missing: true,

        pendingDelete: false

      }

    }));

  };



  const selectNextFlashConfirmCell = () => {

    const selectableDates = flashTrackDates.filter(isFlashConfirmSelectableDate);

    if (selectableDates.length === 0) {

      return;

    }

    const currentIndex = flashEditingDate ? selectableDates.indexOf(flashEditingDate) : -1;

    selectFlashConfirmDate(selectableDates[(currentIndex + 1) % selectableDates.length] ?? selectableDates[0]!);

  };



  const getFlashWriteRows = (): FlashNoteWriteRow[] => {

    if (!flashSelectedAccountEntry || !flashNoteAccount) {

      return [];

    }



    let previousAmount = getFlashAccountPreviousAmount();

    let hasPreviousBalance = getFlashBalanceHasPreviousRecord();



    return flashTrackDates

      .filter((dateValue) => {

        const parsedValue = parseFlashNumberInput(getFlashCell(dateValue).value);

        return parsedValue !== null && !getFlashCell(dateValue).pendingDelete;

      })

      .map((dateValue) => {

        const value = getFlashCell(dateValue).value.trim();

        const inputAmount = parseFlashNumberInput(value) ?? 0;

        const beforeAmount = previousAmount;

        const rawAfterAmount =

          flashInputMode === 'change'

            ? (beforeAmount ?? flashSelectedAccountEntry.amount) + inputAmount

            : toStoredGroupAmount(flashNoteAccount.groupName, inputAmount);

        const afterAmount = roundToMoneyPrecision(rawAfterAmount);

        const delta =

          flashInputMode === 'change'

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



  const confirmFlashNoteWrite = () => {

    if (!flashSelectedAccountEntry || !flashNoteAccount) {

      return;

    }



    const rows = getFlashWriteRows();



    if (rows.length === 0) {

      return;

    }



    const latestRowByDate = [...rows].sort((left, right) =>

      right.date.localeCompare(left.date)

    )[0];

    const nextAmount = latestRowByDate?.afterAmount ?? flashSelectedAccountEntry.amount;

    const nextGroups = groups.map((group) =>

      group.name === flashNoteAccount.groupName

        ? {

            ...group,

            accounts: group.accounts.map((account) =>

              account.id === flashNoteAccount.accountId

                ? { ...account, amount: nextAmount }

                : account

            )

          }

        : group

    );

    const nextHistory = [

      ...rows.map((row, index) => {

        const recordTime = new Date(`${row.date}T12:00:00`);

        recordTime.setMilliseconds(index);



        return createHistoryRecord(

          '修改',

          flashSelectedAccountEntry,

          flashNoteAccount.groupName,

          row.beforeAmount,

          row.afterAmount,

          recordTime.toISOString(),

          undefined,

          'flash-note'

        );

      }),

      ...history

    ].sort(compareHistoryByTimeDesc);



    updateAppData({ groups: nextGroups, history: nextHistory });

    setSelectedAccount(flashNoteAccount);

    setExpandedDetailDates([]);

    setFlashNoteStage('completed');

    resetFlashNoteDraft(false);

  };



  useFlashKeyboardInput({

    enabled: isFlashNoteOpen && flashNoteStage === 'input',

    step: 'input',

    onInputCharacter: appendFlashSequenceInputCharacter,

    onEnter: commitFlashSequenceInput,

    onBackspace: backspaceFlashSequenceInput,

    onCtrlZ: undoFlashSequenceInput,

    onDelete: () => undefined,

    onEscape: requestReturnFlashDateSelection

  });



  useFlashKeyboardInput({

    enabled: isFlashNoteOpen && flashNoteStage === 'confirm',

    step: 'confirm',

    hasConfirmSelection: Boolean(flashEditingDate),

    onInputCharacter: appendFlashConfirmInputCharacter,

    onEnter: selectNextFlashConfirmCell,

    onBackspace: backspaceFlashConfirmInput,

    onCtrlZ: clearFlashConfirmCell,

    onDelete: clearFlashConfirmCell,

    onEscape: () => {

      if (flashEditingDate) {

        setFlashEditingDate('');

        setFlashEditingValue('');

        return;

      }

      setFlashNoteStage('input');

    }

  });



  const renderFlashLightningIcon = (className = 'flash-note-lightning') => (

    <NfSvgIcon svg={NfFlashnoteSourceIcon} className={className} decorative />

  );



  const getQuickSingleEntryAccount = (groupName: string, accountId: string) =>
    groupTotals
      .find((group) => group.name === groupName)
      ?.activeAccounts.find((account) => account.id === accountId);

  const quickSingleEntryAccountGroups: QuickEntryAccountGroup[] = groupTotals.map((group) => ({
    name: group.name,
    accounts: group.activeAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      groupName: group.name,
      archived: account.archived
    }))
  }));

  const renderQuickSingleEntryAccountPicker = () => (
    <QuickEntryAccountPicker
      groups={quickSingleEntryAccountGroups}
      onChooseAccount={(groupName, accountId) => {
        const account = getQuickSingleEntryAccount(groupName, accountId);

        if (account) {
          chooseQuickSingleEntryAccount(groupName, account);
        }
      }}
    />
  );



  const renderFlashExitConfirm = () =>

    isFlashExitConfirmOpen ? (

      <OverlayBackdrop onBack={() => setIsFlashExitConfirmOpen(false)} className="modal-backdrop">

        <section

          role="dialog"

          aria-modal="true"

          aria-labelledby="flash-exit-title"

          className="modal-card"

          onClick={(event) => event.stopPropagation()}

        >

          <h2 id="flash-exit-title" style={{ margin: '0 0 10px', fontSize: '1.26rem' }}>

            退出后，本次闪记内容不会保留

          </h2>

          <div className="modal-actions">

            <button

              type="button"

              className="modal-button modal-button--secondary"

              onClick={() => setIsFlashExitConfirmOpen(false)}

            >

              继续编辑

            </button>

            <button

              type="button"

              className="modal-button modal-button--danger"

              onClick={closeFlashNote}

            >

              退出

            </button>

          </div>

        </section>

      </OverlayBackdrop>

    ) : null;



  const renderFlashReturnDateConfirm = () =>

    isFlashReturnDateConfirmOpen ? (

      <OverlayBackdrop

        onBack={() => setIsFlashReturnDateConfirmOpen(false)}

        className="modal-backdrop"

      >

        <section

          role="dialog"

          aria-modal="true"

          aria-labelledby="flash-return-date-title"

          className="modal-card"

          onClick={(event) => event.stopPropagation()}

        >

          <p className="eyebrow" style={{ marginBottom: 8 }}>

            返回日期选择

          </p>

          <h2 id="flash-return-date-title" style={{ margin: '0 0 10px', fontSize: '1.26rem' }}>

            返回日期选择后，当前顺序输入内容不会保留

          </h2>

          <div className="modal-actions">

            <button

              type="button"

              className="modal-button modal-button--secondary"

              onClick={() => setIsFlashReturnDateConfirmOpen(false)}

            >

              取消

            </button>

            <button

              type="button"

              className="modal-button modal-button--primary"

              onClick={returnFlashDateSelection}

            >

              返回日期选择

            </button>

          </div>

        </section>

      </OverlayBackdrop>

    ) : null;



  const flashAccountGroups = groupTotals.map((group) => ({

    name: group.name,

    accounts: group.activeAccounts.map((account) => ({

      id: account.id,

      name: account.name

    }))

  }));

  const flashInputWeeks = getFlashWeeksAround(flashCurrentDate || flashTrackDates[0] || flashStartDate, flashDirection);

  const flashConfirmDates = flashTrackDates.filter((dateValue) => {

    const cell = getFlashCell(dateValue);

    return cell.enabled || parseFlashNumberInput(cell.value) !== null;

  });

  const flashConfirmWeeks = getFlashWeeksForDates(

    flashConfirmDates.length > 0 ? flashConfirmDates : flashTrackDates.slice(0, 7)

  );

  const flashWriteRows = getFlashWriteRows();

  const flashDisabledDateRules: Record<FlashNoteDateRule, boolean> = {

    all: isFlashDateRuleDisabled('all'),

    weekday: isFlashDateRuleDisabled('weekday'),

    weekend: isFlashDateRuleDisabled('weekend')

  };

  const renderFlashNotePage = () => (

    <>

      <FlashNotePage

        step={flashNoteStage as FlashStep}

        accountName={flashSelectedAccountEntry?.name ?? ''}

        selectedAccountId={flashNoteAccount?.accountId}

        inputMode={flashInputMode}

        direction={flashDirection}

        visibleMonth={flashVisibleMonth}

        activeDateRule={flashActiveDateRule}

        disabledDateRules={flashDisabledDateRules}

        accountGroups={flashAccountGroups}

        selectedDates={flashSelectedDateSet}

        previewDates={flashDragPreviewDateSet}

        startDate={flashStartDate}

        endDate={flashEndDate}

        inputWeeks={flashInputWeeks}

        confirmWeeks={flashConfirmWeeks}

        cells={flashCells}

        trackDates={flashTrackDates}

        currentDate={flashCurrentDate}

        nextDate={flashTrackDates[flashInputCursor + 1] ?? ''}

        currentInput={flashCurrentInput}

        confirmSelectedDate={flashEditingDate}

        writeRows={flashWriteRows}

        showShortcutHint={!flashShortcutHintHidden}

        canStartInput={Boolean(flashSelectedAccountEntry && flashStartDate && flashTrackDates.length > 0)}

        canWrite={flashWriteRows.length > 0}

        getCell={getFlashCell}

        getCalendarDays={getCalendarDays}

        onChooseAccount={(groupName, accountId) => {

          const group = groups.find((currentGroup) => currentGroup.name === groupName);

          const account = group?.accounts.find((currentAccount) => currentAccount.id === accountId);

          if (account) {

            chooseFlashAccount(groupName, account);

          }

        }}

        onModeChange={setFlashInputMode}

        selectionMode={flashSelectionMode}

        onSelectionModeChange={setFlashSelectionMode}

        onDateRuleApply={applyFlashDateRule}

        onVisibleMonthChange={setFlashVisibleMonth}

        onDatePointerDown={handleFlashDatePointerDown}

        onDatePointerEnter={handleFlashDatePointerEnter}

        onDatePointerUp={handleFlashDatePointerUp}

        onClose={requestCloseFlashNote}

        onBackToSelect={requestReturnFlashDateSelection}

        onStartInput={advanceFlashDateSelection}

        onGoToConfirm={enterFlashConfirmStage}

        onBackToInput={() => {

          setIsFlashInputTailLocked(false);

          setFlashNoteStage('input');

        }}

        onConfirmWrite={confirmFlashNoteWrite}

        onSelectConfirmDate={selectFlashConfirmDate}

        onCloseShortcutHint={() => setFlashShortcutHintHidden(true)}

      />

      {renderFlashExitConfirm()}

      {renderFlashReturnDateConfirm()}

    </>

  );



  const getChangeDisplay = (

    beforeAmount: number | null,

    afterAmount: number | null

  ): HistoryChangeDisplay => {

    const before = beforeAmount ?? 0;

    const after = afterAmount ?? 0;

    const delta = after - before;

    const signedTone = getSignedAmountTone(delta, globalSettings.positiveNegativeColorMode);



    if (delta > 0) {

      return {

        label: `+${formatHistoryAmount(delta)}`,

        color: signedTone.color,

        background: signedTone.background,

        kind: 'increase'

      };

    }



    if (delta < 0) {

      return {

        label: `-${formatHistoryAmount(Math.abs(delta))}`,

        color: signedTone.color,

        background: signedTone.background,

        kind: 'decrease'

      };

    }



    return {

      label: '0',

      color: 'var(--text-muted)',

      background: 'var(--surface-muted)',

      kind: 'neutral'

    };

  };



  const getAmountChange = (record: HistoryRecord) =>

    getChangeDisplay(record.beforeAmount, record.afterAmount);



  const getHistoryTone = (record: HistoryRecord): HistoryTone => {

    if (record.type === '删除') {

      return {

        background: 'var(--danger-bg)',

        border: 'var(--danger-border)',

        emphasisBorder: 'var(--danger-border-strong)',

        divider: 'var(--danger-divider)',

        nestedBackground: 'var(--surface-bg)',

        text: 'var(--danger-text)',

        labelBackground: 'var(--danger-chip-bg)'

      };

    }



    if (record.type === '归档') {

      return {

        background: 'var(--info-bg)',

        border: 'var(--info-border)',

        emphasisBorder: 'var(--info-border-strong)',

        divider: 'var(--info-divider)',

        nestedBackground: 'var(--surface-bg)',

        text: 'var(--info-text)',

        labelBackground: 'var(--info-chip-bg)'

      };

    }



    if (record.type === '新增' || record.type === '重新启用') {

      return {

        background: 'var(--success-bg)',

        border: 'var(--success-border)',

        emphasisBorder: 'var(--success-border-strong)',

        divider: 'var(--success-divider)',

        nestedBackground: 'var(--surface-bg)',

        text: 'var(--success-text)',

        labelBackground: 'var(--success-chip-bg)'

      };

    }



    return {

      background: 'var(--surface-bg)',

      border: 'var(--border-soft)',

      emphasisBorder: 'var(--border-medium)',

      divider: 'var(--border-soft)',

      nestedBackground: 'var(--surface-strong)',

      text: 'var(--text-secondary)',

      labelBackground: 'var(--surface-muted)'

    };

  };



  const normalizeAccountName = (name: string) => name.trim().toLocaleLowerCase();



  const hasActiveDuplicateAccountName = (name: string) => {

    const normalizedName = normalizeAccountName(name);



    return groups.some((group) =>

      group.accounts.some(

        (account) =>

          !account.archived && normalizeAccountName(account.name) === normalizedName

      )

    );

  };



  const hasActiveDuplicateAccountNameExcept = (name: string, accountId: string) => {

    const normalizedName = normalizeAccountName(name);



    return groups.some((group) =>

      group.accounts.some(

        (account) =>

          !account.archived &&

          account.id !== accountId &&

          normalizeAccountName(account.name) === normalizedName

      )

    );

  };



  const findArchivedAccountByName = (name: string) => {

    const normalizedName = normalizeAccountName(name);



    return archivedAccounts.find(

      (account) => normalizeAccountName(account.name) === normalizedName

    );

  };



  const hasDuplicateGroupName = (name: string, exceptName?: string) => {

    const normalizedName = normalizeAccountName(name);

    const normalizedExceptName = exceptName ? normalizeAccountName(exceptName) : '';



    return groups.some(

      (group) =>

        normalizeAccountName(group.name) === normalizedName &&

        normalizeAccountName(group.name) !== normalizedExceptName

    );

  };



  const handleMainContentBlankClick = (event: MouseEvent<HTMLElement>) => {

    if (!mainContentRef.current) {

      return;

    }



    const target = event.target;



    if (isGroupEditMode && target instanceof Element) {

      const clickedGroupItem = target.closest('[data-account-type-entry="true"]');

      const clickedInteractiveControl = target.closest(
        'button, input, select, textarea, a, [contenteditable]:not([contenteditable="false"]), [data-interactive]'
      );



      if (!clickedGroupItem && !clickedInteractiveControl) {

        event.stopPropagation();

        exitGroupEditMode();

      }



      return;

    }



    if (event.target !== event.currentTarget) {

      return;

    }



    if (isGlobalSettingsOpen) {

      return;

    }



    const contentRect = mainContentRef.current.getBoundingClientRect();

    const shouldScrollTop = event.clientY < contentRect.top + contentRect.height / 2;



    mainContentRef.current.scrollTo({

      top: shouldScrollTop ? 0 : mainContentRef.current.scrollHeight,

      behavior: 'smooth'

    });

  };



  const toggleGroup = (groupName: string) => {

    setExpandedGroupNames((currentGroups) =>

      currentGroups.includes(groupName)

        ? currentGroups.filter((currentGroup) => currentGroup !== groupName)

        : [...currentGroups, groupName]

    );

  };



  const clearGroupLongPress = () => {

    if (groupLongPressTimerRef.current !== null) {

      window.clearTimeout(groupLongPressTimerRef.current);

      groupLongPressTimerRef.current = null;

    }

  };



  const exitGroupEditMode = () => {

    clearGroupLongPress();

    setIsGroupEditMode(false);

    setDraggingGroupName('');

  };



  const handleAppShellBack = () => {

    if (isGroupEditMode) {

      exitGroupEditMode();

      return;

    }



    currentLayerBack?.();

  };



  const suppressNextGroupClick = (durationMs = 0) => {

    suppressGroupClickRef.current = true;

    window.setTimeout(() => {

      suppressGroupClickRef.current = false;

    }, durationMs);

  };



  const startGroupPointerInteraction = (

    event: PointerEvent<HTMLButtonElement>,

    groupName: string

  ) => {

    if ((event.pointerType === 'mouse' && event.button !== 0) || isGroupEditMode) {

      return;

    }



    clearGroupLongPress();

    groupPointerInteractionRef.current = {

      pointerId: event.pointerId,

      groupName,

      startX: event.clientX,

      startY: event.clientY,

      moved: false,

      longPressTriggered: false

    };

    groupLongPressTimerRef.current = window.setTimeout(() => {

      const interaction = groupPointerInteractionRef.current;



      if (!interaction || interaction.pointerId !== event.pointerId || interaction.moved) {

        return;

      }



      interaction.longPressTriggered = true;

      setIsGroupEditMode(true);

      suppressNextGroupClick(350);

      groupLongPressTimerRef.current = null;

    }, LONG_PRESS_DURATION_MS);

  };



  const moveGroupPointerInteraction = (event: PointerEvent<HTMLButtonElement>) => {

    const interaction = groupPointerInteractionRef.current;



    if (!interaction || interaction.pointerId !== event.pointerId) {

      return;

    }



    const deltaX = Math.abs(event.clientX - interaction.startX);

    const deltaY = Math.abs(event.clientY - interaction.startY);



    if (

      deltaX <= GROUP_POINTER_MOVE_THRESHOLD_PX &&

      deltaY <= GROUP_POINTER_MOVE_THRESHOLD_PX

    ) {

      return;

    }



    interaction.moved = true;

    groupDoubleClickCandidateRef.current = null;



    if (!interaction.longPressTriggered) {

      clearGroupLongPress();

    }

  };



  const finishGroupPointerInteraction = (event: PointerEvent<HTMLButtonElement>) => {

    const interaction = groupPointerInteractionRef.current;



    if (!interaction || interaction.pointerId !== event.pointerId) {

      clearGroupLongPress();

      return;

    }



    clearGroupLongPress();



    if (interaction.longPressTriggered || interaction.moved || draggingGroupName) {

      suppressNextGroupClick(interaction.longPressTriggered ? 350 : 0);

    }



    groupPointerInteractionRef.current = null;

  };



  const cancelGroupPointerInteraction = () => {

    clearGroupLongPress();

    groupPointerInteractionRef.current = null;

  };



  const openCreateAccountType = (initialName = '') => {

    setAccountTypeEditor({ mode: 'create' });

    setAccountTypeNameDraft(initialName.trim());

    setAccountTypeNatureDraft('asset');

    setAccountTypeStatsDraft(true);

    setAccountTypeError('');

  };



  const closeAccountTypeEditor = () => {

    setAccountTypeEditor(null);

    setAccountTypeNameDraft('');

    setAccountTypeNatureDraft('asset');

    setAccountTypeStatsDraft(true);

    setAccountTypeError('');

  };



  const openGroupDetailPage = (groupName: string) => {

    const group = groups.find((currentGroup) => currentGroup.name === groupName);



    if (!group) {

      return;

    }



    dispatchSearchState({ type: 'clear-navigation' });

    exitGroupEditMode();

    setSelectedAccount(null);

    setIsGlobalSettingsOpen(false);

    setIsArchivedAccountsOpen(false);

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setIsTotalChartsOpen(false);

    setSelectedGroupDetailName(group.name);

    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    }, 0);

  };



  const closeGroupDetailPage = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    setSelectedGroupDetailName('');

  };



  const handleGroupClick = (groupName: string) => {

    if (suppressGroupClickRef.current) {

      suppressGroupClickRef.current = false;

      return;

    }



    if (isGroupEditMode) {

      return;

    }



    const now = Date.now();

    const previousClick = groupDoubleClickCandidateRef.current;



    if (

      previousClick &&

      previousClick.groupName === groupName &&

      now - previousClick.time <= GROUP_DOUBLE_CLICK_MS

    ) {

      groupDoubleClickCandidateRef.current = null;

      openGroupDetailPage(groupName);

      return;

    }



    groupDoubleClickCandidateRef.current = { groupName, time: now };

    toggleGroup(groupName);

  };



  const applyAccountTypeUpdate = (

    currentName: string,

    nextName: string,

    nextNature: AccountTypeNature,

    nextIncludeInStats: boolean

  ) => {

    const nextGroups = groups.map((group) =>

      group.name === currentName

        ? {

            ...group,

            name: nextName,

            nature: nextNature,

            includeInStats: nextIncludeInStats,

            accounts: group.accounts.map((account) => ({

              ...account,

              amount: toStoredAmountByNature(nextNature, account.amount)

            }))

          }

        : group

    );

    const nextHistory = history.map((record) =>

      record.groupName === currentName ? { ...record, groupName: nextName } : record

    );



    updateAppData({ groups: nextGroups, history: nextHistory });

    if (currentName !== nextName) {

      updateAssetChartSettings((currentSettings) => {

        const preservedSettings =

          currentSettings.categoryDetailById[currentName] ??

          currentSettings.globalCategoryDetail;

        const nextSettingsById = { ...currentSettings.categoryDetailById };



        delete nextSettingsById[currentName];

        nextSettingsById[nextName] = cloneCategoryChartSettings(preservedSettings);



        return {

          ...currentSettings,

          categoryDetailById: nextSettingsById

        };

      });

    }

    setExpandedGroupNames((currentNames) =>

      currentNames.map((groupName) => (groupName === currentName ? nextName : groupName))

    );

    setNewAccountGroupName((groupName) => (groupName === currentName ? nextName : groupName));

    setNewAccountTypeInput((typeInput) => (typeInput === currentName ? nextName : typeInput));

    setSelectedGroupDetailName((groupName) => (groupName === currentName ? nextName : groupName));

    setSelectedAccount((account) =>

      account?.groupName === currentName ? { ...account, groupName: nextName } : account

    );

    setEditingAccount((account) =>

      account?.groupName === currentName ? { ...account, groupName: nextName } : account

    );

    setEditingAccountInfo((account) =>

      account?.groupName === currentName ? { ...account, groupName: nextName } : account

    );

  };



  const saveAccountType = () => {

    if (!accountTypeEditor) {

      return;

    }



    const nextName = accountTypeNameDraft.trim();



    if (!nextName) {

      setAccountTypeError('请输入账户类型名称');

      return;

    }



    if (hasDuplicateGroupName(nextName, accountTypeEditor.groupName)) {

      setAccountTypeError('账户类型名称必须唯一');

      return;

    }



    if (accountTypeEditor.mode === 'create') {

      const sortOrder =

        groups.length > 0 ? Math.max(...groups.map((group) => group.sortOrder)) + 1 : 0;

      const nextGroups = [

        ...groups,

        {

          name: nextName,

          nature: accountTypeNatureDraft,

          includeInStats: accountTypeStatsDraft,

          sortOrder,

          accounts: []

        }

      ];



      updateAppData({ groups: nextGroups, history });

      updateAssetChartSettings((currentSettings) => ({

        ...currentSettings,

        categoryDetailById: {

          ...currentSettings.categoryDetailById,

          [nextName]: cloneCategoryChartSettings(currentSettings.globalCategoryDetail)

        }

      }));

      setNewAccountGroupName(nextName);

      setNewAccountTypeInput(nextName);

      closeAccountTypeEditor();

      return;

    }



    const currentName = accountTypeEditor.groupName;



    if (!currentName || !accountTypeEditorGroup) {

      closeAccountTypeEditor();

      return;

    }



    applyAccountTypeUpdate(

      currentName,

      nextName,

      accountTypeNatureDraft,

      accountTypeStatsDraft

    );

    closeAccountTypeEditor();

  };



  const saveGroupDetailInfo = () => {

    if (!selectedGroupDetail) {

      return;

    }



    const currentName = selectedGroupDetail.name;

    const nextName = groupDetailNameDraft.trim();



    if (!nextName) {

      setGroupDetailError('请输入账户类型名称');

      return;

    }



    if (hasDuplicateGroupName(nextName, currentName)) {

      setGroupDetailError('账户类型名称必须唯一');

      return;

    }



    applyAccountTypeUpdate(

      currentName,

      nextName,

      groupDetailNatureDraft,

      groupDetailStatsDraft

    );

    setGroupDetailError('');

  };



  const reorderGroups = (draggedName: string, targetName: string) => {

    if (draggedName === targetName) {

      return;

    }



    const nextGroups = [...groups];

    const fromIndex = nextGroups.findIndex((group) => group.name === draggedName);

    const toIndex = nextGroups.findIndex((group) => group.name === targetName);



    if (fromIndex < 0 || toIndex < 0) {

      return;

    }



    const [draggedGroup] = nextGroups.splice(fromIndex, 1);



    if (!draggedGroup) {

      return;

    }



    nextGroups.splice(toIndex, 0, draggedGroup);

    updateAppData({

      groups: nextGroups.map((group, index) => ({ ...group, sortOrder: index })),

      history

    });

  };



  const handleGroupDragStart = (event: DragEvent<HTMLElement>, groupName: string) => {

    if (!isGroupEditMode) {

      return;

    }



    setDraggingGroupName(groupName);

    suppressGroupClickRef.current = true;

    groupDoubleClickCandidateRef.current = null;

    event.dataTransfer.effectAllowed = 'move';

    event.dataTransfer.setData('text/plain', groupName);

  };



  const handleGroupDragOver = (event: DragEvent<HTMLElement>, groupName: string) => {

    if (!isGroupEditMode || !draggingGroupName || draggingGroupName === groupName) {

      return;

    }



    event.preventDefault();

    event.dataTransfer.dropEffect = 'move';

  };



  const handleGroupDrop = (event: DragEvent<HTMLElement>, groupName: string) => {

    if (!isGroupEditMode) {

      return;

    }



    event.preventDefault();

    const draggedName = event.dataTransfer.getData('text/plain') || draggingGroupName;

    reorderGroups(draggedName, groupName);

    suppressNextGroupClick(350);

    groupDoubleClickCandidateRef.current = null;

    setDraggingGroupName('');

  };



  const handleGroupDragEnd = () => {

    setDraggingGroupName('');

    window.setTimeout(() => {

      suppressGroupClickRef.current = false;

    }, 0);

  };



  const openAccountDetail = (groupName: string, account: Account) => {

    dispatchSearchState({ type: 'clear-navigation' });

    setIsArchivedAccountsOpen(false);

    setIsQuickSingleEntryAccountPickerOpen(false);

    setSelectedGroupDetailName('');

    setIsAccountChartsOpen(false);

    setSelectedAccount({ groupName, accountId: account.id });

    setExpandedDetailDates([]);

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(false);

  };



  const closeAccountDetail = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    setSelectedAccount(null);

    setIsAccountChartsOpen(false);

    setExpandedDetailDates([]);

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(false);

  };



  const openAccountChartsPage = () => {

    if (!selectedAccount || !selectedAccountEntry) {

      return;

    }



    dispatchSearchState({ type: 'clear-navigation' });

    setIsAccountChartsOpen(true);

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(false);

    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    }, 0);

  };



  const closeAccountChartsPage = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    setIsAccountChartsOpen(false);

  };



  const openTotalChartsPage = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    exitGroupEditMode();

    setSelectedAccount(null);

    setSelectedGroupDetailName('');

    setIsQuickSingleEntryAccountPickerOpen(false);

    setIsGlobalSettingsOpen(false);

    setIsArchivedAccountsOpen(false);

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setIsTotalChartsOpen(true);

    setIsAccountChartsOpen(false);

    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    }, 0);

  };



  const closeTotalChartsPage = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    setIsTotalChartsOpen(false);

  };



  const openGlobalSettings = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    exitGroupEditMode();

    resetAutoBackupDraft();

    resetPasswordEditor();

    resetSnapshotPasswordEditor();

    closePasswordDisableConfirm();

    closeSnapshotEncryptionDisableConfirm();

    setConfirmationDialog(null);

    setSelectedAccount(null);

    setSelectedGroupDetailName('');

    setEditingAccount(null);

    setAccountOperationEntrySource('account-detail');

    setIsQuickSingleEntryAccountPickerOpen(false);

    setIsRollupImportOpen(false);

    setRollupImportReview(null);

    setRollupImportError('');

    setRollupAccountAssignments({});

    setRollupPendingNewAccountKey('');

    setEditingAccountInfo(null);

    setAccountTypeEditor(null);

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(false);

    setIsAddingAccount(false);

    setIsArchivedAccountsOpen(false);

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setIsTotalChartsOpen(false);

    setGlobalSettingsSection('appearance');

    setIsGlobalSettingsOpen(true);

    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    }, 0);

  };



  const closeGlobalSettings = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    resetPasswordEditor();

    closePasswordDisableConfirm();

    resetSnapshotPasswordEditor();

    closeSnapshotEncryptionDisableConfirm();

    setIsGlobalSettingsOpen(false);

  };



  const openDangerActions = () => {

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(true);

  };



  const closeDangerActions = () => {

    setIsDangerActionsOpen(false);

  };



  const toggleDetailDate = (date: string) => {

    setExpandedDetailDates((currentDates) =>

      currentDates.includes(date)

        ? currentDates.filter((currentDate) => currentDate !== date)

        : [...currentDates, date]

    );

  };



  const openEditor = (

    groupName: string,

    account: Account,

    mode: EditMode = 'set',

    source: AccountOperationEntrySource = 'account-detail'

  ) => {

    const today = getAccountOperationTodayDateValue();

    const todayMonth = getAccountOperationCalendarMonth(today);



    setEditingAccount({ groupName, accountId: account.id });

    setAccountOperationEntrySource(source);

    setEditMode(mode);

    setDraftAmount(formatMoneyInputValue(toEditableAmount(account.amount)));

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



    if (shouldReturnHome) {

      setSelectedAccount(null);

      setExpandedDetailDates([]);

      setIsAccountActionMenuOpen(false);

      setIsDangerActionsOpen(false);

    }

  };



  const openQuickSingleEntry = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    exitGroupEditMode();

    setSelectedGroupDetailName('');

    setIsGlobalSettingsOpen(false);

    setIsTotalChartsOpen(false);

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setIsArchivedAccountsOpen(false);

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(false);

    setIsRollupImportOpen(false);

    setRollupImportReview(null);

    setRollupImportError('');

    setRollupAccountAssignments({});

    setRollupPendingNewAccountKey('');

    setIsQuickSingleEntryAccountPickerOpen(true);

  };



  const closeQuickSingleEntryAccountPicker = () => {

    setIsQuickSingleEntryAccountPickerOpen(false);

  };



  const resetRollupImportReview = () => {

    setRollupImportReview(null);

    setRollupImportHash('');

    setRollupImportError('');

    setRollupAccountAssignments({});

    setRollupPendingNewAccountKey('');

  };



  const closeRollupImport = () => {

    setIsRollupImportOpen(false);

    setRollupPromptTab('explanation');

    setRollupPasteText('');

    resetRollupImportReview();

  };



  const openRollupImport = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    exitGroupEditMode();

    setSelectedAccount(null);

    setSelectedGroupDetailName('');

    setIsGlobalSettingsOpen(false);

    setIsTotalChartsOpen(false);

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setIsArchivedAccountsOpen(false);

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(false);

    setIsQuickSingleEntryAccountPickerOpen(false);

    setEditingAccount(null);

    setAccountOperationEntrySource('account-detail');

    setEditingAccountInfo(null);

    setAccountTypeEditor(null);

    setIsAddingAccount(false);

    setRollupPromptTab('explanation');

    resetRollupImportReview();

    setIsRollupImportOpen(true);

    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    }, 0);

  };



  const createRollupImportHash = async (text: string) => {

    if (window.crypto?.subtle) {

      const bytes = new TextEncoder().encode(text);

      const digest = await window.crypto.subtle.digest('SHA-256', bytes);



      return Array.from(new Uint8Array(digest))

        .map((byte) => byte.toString(16).padStart(2, '0'))

        .join('');

    }



    let hash = 0;



    for (let index = 0; index < text.length; index += 1) {

      hash = (hash * 31 + text.charCodeAt(index)) | 0;

    }



    return `fallback-${Math.abs(hash).toString(16)}-${text.length}`;

  };



  const acceptRollupImportText = async (text: string) => {

    const trimmedText = text.trim();



    if (!trimmedText) {

      setRollupImportError('请先提供汇总 JSON');

      setRollupImportReview(null);

      setRollupAccountAssignments({});

      return;

    }



    try {

      const contentHash = await createRollupImportHash(trimmedText);

      const result = parseRollupImportJson(trimmedText, {

        todayDateValue: getAccountOperationTodayDateValue(),

        contentHash,

        importedHashes: rollupImportedHashes

      });



      if (!result.ok) {

        setRollupImportError(result.issues[0]?.message ?? '汇总 JSON 无法导入');

        setRollupImportReview(null);

        setRollupAccountAssignments({});

        setRollupImportHash('');

        return;

      }



      setRollupImportHash(contentHash);

      setRollupImportReview(result.review);

      setRollupImportError('');

      setRollupAccountAssignments({});

      setRollupPendingNewAccountKey('');

      window.setTimeout(() => {

        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

      }, 0);

    } catch (error) {

      console.error('[NetraFlow rollup] Failed to parse rollup import.', error);

      setRollupImportError('汇总 JSON 无法导入，请确认文件内容');

      setRollupImportReview(null);

      setRollupAccountAssignments({});

      setRollupImportHash('');

    }

  };



  const importRollupFile = (event: ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0];

    event.target.value = '';



    if (!file) {

      return;

    }



    const reader = new FileReader();



    reader.onload = () => {

      void acceptRollupImportText(String(reader.result ?? ''));

    };

    reader.onerror = () => {

      setRollupImportError('汇总文件读取失败');

    };

    reader.readAsText(file);

  };



  const importRollupPastedJson = () => {

    void acceptRollupImportText(rollupPasteText);

  };



  const copyRollupPrompt = () => {

    void navigator.clipboard

      .writeText(ROLLUP_IMPORT_PROMPT)

      .then(() => showToast('提示词已复制', 'success'))

      .catch((error) => {

        console.error('[NetraFlow rollup] Failed to copy prompt.', error);

        showToast('复制失败，请重试', 'error');

      });

  };



  const assignRollupAccount = (

    keyword: string,

    assignment: RollupAccountAssignment | null

  ) => {

    setRollupAccountAssignments((currentAssignments) => ({

      ...currentAssignments,

      [keyword]: assignment

    }));

  };



  const selectRollupAccount = (keyword: string, accountId: string) => {

    if (!accountId) {

      assignRollupAccount(keyword, null);

      return;

    }



    const match = findAccountById(groups, accountId);



    if (!match || match.account.archived) {

      assignRollupAccount(keyword, null);

      return;

    }



    assignRollupAccount(keyword, {

      groupName: match.group.name,

      accountId: match.account.id

    });

  };



  const openRollupNewAccount = (keyword: string) => {

    const firstGroupName = groups[0]?.name ?? '';



    setRollupPendingNewAccountKey(keyword);

    setIsAddingAccount(true);

    setNewAccountGroupName(firstGroupName);

    setNewAccountTypeInput(firstGroupName);

    setNewAccountName(keyword.trim());

    setNewAccountAmount('0');

    setNewAccountError('');

  };



  const discardRollupImportReview = () => {

    resetRollupImportReview();

    setRollupPasteText('');

  };



  const performRollupImportWrite = () => {

    if (!rollupImportReview || !isRollupImportReady) {

      return;

    }



    const runningAmounts = new Map<string, number>();

    const finalAmounts = new Map<string, { groupName: string; amount: number }>();

    const recordsWithAccounts = rollupImportReview.records

      .map((record) => {

        const assignment = rollupAccountAssignments[record.accountKeyword];



        if (!assignment) {

          return null;

        }



        const match = findAccountById(groups, assignment.accountId);



        if (!match || match.account.archived) {

          return null;

        }



        return {

          record,

          groupName: match.group.name,

          account: match.account

        };

      })

      .filter((item): item is {

        record: RollupImportRecord;

        groupName: string;

        account: Account;

      } => Boolean(item))

      .sort(

        (left, right) =>

          left.account.id.localeCompare(right.account.id) ||

          left.record.date.localeCompare(right.record.date) ||

          left.record.inputIndex - right.record.inputIndex

      );



    if (recordsWithAccounts.length !== rollupImportReview.records.length) {

      showToast('仍有账户未确认', 'error');

      return;

    }



    const rollupHistory = recordsWithAccounts.map((item, index) => {

      const beforeAmount = runningAmounts.get(item.account.id) ?? item.account.amount;

      const afterAmount = roundToMoneyPrecision(

        item.record.mode === 'change'

          ? beforeAmount + item.record.amount

          : toStoredGroupAmount(item.groupName, item.record.amount)

      );

      const recordTime = new Date(`${item.record.date}T12:00:00`);



      recordTime.setMilliseconds(index);

      runningAmounts.set(item.account.id, afterAmount);

      finalAmounts.set(item.account.id, {

        groupName: item.groupName,

        amount: afterAmount

      });



      return createHistoryRecord(

        '修改',

        item.account,

        item.groupName,

        beforeAmount,

        afterAmount,

        recordTime.toISOString(),

        undefined,

        'rollup'

      );

    });



    const nextGroups = groups.map((group) => ({

      ...group,

      accounts: group.accounts.map((account) => {

        const finalAmount = finalAmounts.get(account.id);



        return finalAmount && finalAmount.groupName === group.name

          ? { ...account, amount: finalAmount.amount }

          : account;

      })

    }));

    const nextHistory = [...rollupHistory, ...history].sort(compareHistoryByTimeDesc);



    updateAppData({ groups: nextGroups, history: nextHistory });



    if (rollupImportHash && !isExampleMode) {

      const nextHashes = Array.from(new Set([...rollupImportedHashes, rollupImportHash]));

      setRollupImportedHashes(nextHashes);

      saveRollupImportHashes(nextHashes);

    }



    closeRollupImport();

    showToast(`已导入 ${rollupHistory.length} 条汇总记录`, 'success');

  };



  const confirmRollupImportWrite = () => {

    if (!rollupImportReview || !isRollupImportReady) {

      return;

    }



    performRollupImportWrite();

  };



  const chooseQuickSingleEntryAccount = (groupName: string, account: Account) => {

    closeQuickSingleEntryAccountPicker();

    setSelectedAccount({ groupName, accountId: account.id });

    setExpandedDetailDates([]);

    setSelectedGroupDetailName('');

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(false);

    openEditor(groupName, account, 'set', 'quick-single-entry');

  };



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



  const openAddAccount = () => {

    const firstGroupName = groups[0]?.name ?? '';



    setIsAddingAccount(true);

    setNewAccountGroupName(firstGroupName);

    setNewAccountTypeInput(firstGroupName);

    setNewAccountName('');

    setNewAccountAmount('');

    setNewAccountError('');

    setArchivedAccountSearchQuery('');

    setRollupPendingNewAccountKey('');

  };



  const closeAddAccount = () => {

    setIsAddingAccount(false);

    setNewAccountGroupName('');

    setNewAccountTypeInput('');

    setNewAccountName('');

    setNewAccountAmount('');

    setNewAccountError('');

    setArchivedAccountSearchQuery('');

  };



  const updateNewAccountTypeInput = (value: string) => {

    const exactMatch = groups.find(

      (group) => normalizeTypeSearchText(group.name) === normalizeTypeSearchText(value)

    );



    setNewAccountTypeInput(value);

    setNewAccountGroupName(exactMatch?.name ?? '');

    setNewAccountError('');

  };



  const confirmNewAccountTypeInput = () => {

    const trimmedInput = newAccountTypeInput.trim();



    if (newAccountTypeMatch) {

      setNewAccountGroupName(newAccountTypeMatch.name);

      setNewAccountTypeInput(newAccountTypeMatch.name);

      setNewAccountError('');

      return;

    }



    if (!trimmedInput) {

      setNewAccountError('请输入账户类型');

      return;

    }



    setConfirmationDialog({

      title: '新增账户类型',

      message: `账户类型：${trimmedInput}`,

      confirmLabel: '确认',

      onConfirm: () => openCreateAccountType(trimmedInput)

    });

  };



  const switchNewAccountGroup = (direction: 1 | -1) => {

    if (groups.length < 2) {

      return;

    }



    const currentIndex = groups.findIndex((group) => group.name === newAccountGroupName);

    const safeIndex = currentIndex >= 0 ? currentIndex : 0;

    const nextGroup = groups[(safeIndex + direction + groups.length) % groups.length];



    if (nextGroup) {

      setNewAccountGroupName(nextGroup.name);

      setNewAccountTypeInput(nextGroup.name);

      setNewAccountError('');

    }

  };



  const handleNewAccountGroupWheel = (event: WheelEvent<HTMLElement>) => {

    event.preventDefault();

    event.stopPropagation();



    if (event.deltaY === 0) {

      return;

    }



    switchNewAccountGroup(event.deltaY > 0 ? 1 : -1);

  };



  const openAccountInfoEditor = (groupName: string, account: Account) => {

    setIsAccountActionMenuOpen(false);

    setEditingAccountInfo({ groupName, accountId: account.id });

    setAccountNameDraft(account.name);

    setAccountAliasDraft(limitAccountAliasInput(account.alias ?? ''));

    setAccountInfoError('');

  };



  const closeAccountInfoEditor = () => {

    setEditingAccountInfo(null);

    setAccountNameDraft('');

    setAccountAliasDraft('');

    setAccountInfoError('');

  };



  const saveAccountInfo = () => {

    if (!editingAccountInfo || !accountInfoEntry) {

      return;

    }



    const nextName = accountNameDraft.trim();

    const nextAlias = limitAccountAliasInput(accountAliasDraft.trim());



    if (!nextName) {

      setAccountInfoError('请输入账户名称');

      return;

    }



    if (hasActiveDuplicateAccountNameExcept(nextName, accountInfoEntry.id)) {

      setAccountInfoError('小类名称必须唯一');

      return;

    }



    const nextGroups = groups.map((group) =>

      group.name === editingAccountInfo.groupName

        ? {

            ...group,

            accounts: group.accounts.map((account) =>

              account.id === editingAccountInfo.accountId

                ? { ...account, name: nextName, alias: nextAlias || undefined }

                : account

            )

          }

        : group

    );

    const nextHistory = history.map((record) =>

      record.accountId === editingAccountInfo.accountId

        ? { ...record, accountName: nextName }

        : record

    );



    updateAppData({ groups: nextGroups, history: nextHistory });

    closeAccountInfoEditor();

  };



  const setLastWeekHistoryRange = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    const range = getLastWeekRange();

    setHistoryStartDate(range.start);

    setHistoryEndDate(range.end);

    setHistoryRangeInput(formatDateRangeDisplay(range.start, range.end));

    setCalendarMonth(getHistoryCalendarLeadMonth(range.end));

  };



  const setRecent7HistoryRange = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    const range = getRecent7DayRange();

    setHistoryStartDate(range.start);

    setHistoryEndDate(range.end);

    setHistoryRangeInput(formatDateRangeDisplay(range.start, range.end));

    setCalendarMonth(getHistoryCalendarLeadMonth(range.end));

  };



  const handleHistoryRangeInput = (value: string) => {

    dispatchSearchState({ type: 'clear-navigation' });

    setHistoryRangeInput(value);



    if (!value.trim()) {

      setHistoryStartDate('');

      setHistoryEndDate('');

      return;

    }



    const tokens = getHistoryRangeTokens(value);

    const firstDate = tokens[0] ? parseDateToken(tokens[0]) : null;



    if (firstDate) {

      const safeFirstDate = clampHistoryDateValue(firstDate.value);

      setHistoryStartDate(safeFirstDate);

      setHistoryEndDate('');

      setCalendarMonth(getHistoryCalendarLeadMonth(safeFirstDate));

    }



    const parsedRange = parseHistoryRangeInput(value);



    if (parsedRange) {

      const safeStartDate = clampHistoryDateValue(parsedRange.start);

      const safeEndDate = clampHistoryDateValue(parsedRange.end);

      const nextStartDate = safeStartDate <= safeEndDate ? safeStartDate : safeEndDate;

      const nextEndDate = safeStartDate <= safeEndDate ? safeEndDate : safeStartDate;

      setHistoryStartDate(nextStartDate);

      setHistoryEndDate(nextEndDate);

      setHistoryRangeInput(formatDateRangeDisplay(nextStartDate, nextEndDate));

      setCalendarMonth(getHistoryCalendarLeadMonth(nextEndDate));

    }

  };



  const confirmSingleHistoryDate = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    const tokens = getHistoryRangeTokens(historyRangeInput);

    const token = tokens[0];



    if (tokens.length !== 1) {

      return;

    }



    const parsedDate = token ? parseDateToken(token) : null;



    if (!parsedDate) {

      return;

    }



    const safeDate = clampHistoryDateValue(parsedDate.value);

    setHistoryStartDate(safeDate);

    setHistoryEndDate(safeDate);

    setHistoryRangeInput(formatDateRangeDisplay(safeDate, safeDate));

    setCalendarMonth(getHistoryCalendarLeadMonth(safeDate));

  };



  const clearHistoryRange = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    setHistoryStartDate('');

    setHistoryEndDate('');

    setHistoryRangeInput('');

    setCalendarMonth(getHistoryCalendarLeadMonth());

  };



  const resetAutoBackupDraft = () => {

    setAutoBackupDraft(autoBackupSettings);

    setAutoBackupCycleValueInput(String(autoBackupSettings.cycle.value));

  };



  const clearSearchScrollTargets = () => {

    setHighlightedHistoryRecordId('');

    setHighlightedBackupRecordId('');

  };



  const requestSearchTargetScroll = (target: SearchNavigationTarget) => {

    if (target.category === 'history') {

      setHighlightedHistoryRecordId(target.recordId);

      setHighlightedBackupRecordId('');

      setSearchTargetScrollKey((currentKey) => currentKey + 1);

      return;

    }



    if (target.category === 'snapshot') {

      setHighlightedHistoryRecordId('');

      setHighlightedBackupRecordId(target.recordId);

      setSearchTargetScrollKey((currentKey) => currentKey + 1);

      return;

    }



    clearSearchScrollTargets();

  };



  const prepareSearchNavigation = () => {

    dispatchSearchState({ type: 'hide-for-navigation' });

    resetAutoBackupDraft();

    setConfirmationDialog(null);

    setIsArchivedAccountsOpen(false);

    setIsHistoryOpen(false);

    setIsTotalChartsOpen(false);

    setIsAccountChartsOpen(false);

    setIsGlobalSettingsOpen(false);

    setIsRollupImportOpen(false);

    setRollupImportReview(null);

    setRollupImportError('');

    setRollupAccountAssignments({});

    setRollupPendingNewAccountKey('');

    setIsAddingAccount(false);

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(false);

    setEditingAccount(null);

    setEditingAccountInfo(null);

    setAccountTypeEditor(null);

    setSelectedAccount(null);

    setSelectedGroupDetailName('');

  };



  const createSearchNavigationSnapshot = (): SearchNavigationSnapshot => ({

    selectedAccount,

    selectedGroupDetailName,

    isAccountChartsOpen,

    expandedGroupNames,

    isTotalChartsOpen,

    isGlobalSettingsOpen,

    globalSettingsSection,

    isArchivedAccountsOpen,

    isHistoryOpen,

    historyPanelView,

    historyStartDate,

    historyEndDate,

    historyRangeInput,

    calendarMonth: new Date(calendarMonth),

    mainScrollTop: mainContentRef.current?.scrollTop ?? 0

  });



  const restoreSearchNavigationSnapshot = (snapshot: SearchNavigationSnapshot) => {

    setSelectedAccount(snapshot.selectedAccount);

    setSelectedGroupDetailName(snapshot.selectedGroupDetailName);

    setIsAccountChartsOpen(snapshot.isAccountChartsOpen);

    setExpandedGroupNames(snapshot.expandedGroupNames);

    setIsTotalChartsOpen(snapshot.isTotalChartsOpen);

    setIsGlobalSettingsOpen(snapshot.isGlobalSettingsOpen);

    setGlobalSettingsSection(snapshot.globalSettingsSection);

    setIsArchivedAccountsOpen(snapshot.isArchivedAccountsOpen);

    setIsHistoryOpen(snapshot.isHistoryOpen);

    setHistoryPanelView(snapshot.historyPanelView);

    setHistoryStartDate(snapshot.historyStartDate);

    setHistoryEndDate(snapshot.historyEndDate);

    setHistoryRangeInput(snapshot.historyRangeInput);

    setCalendarMonth(new Date(snapshot.calendarMonth));

    setConfirmationDialog(null);

    setIsQuickSingleEntryAccountPickerOpen(false);

    setIsRollupImportOpen(false);

    setRollupImportReview(null);

    setRollupImportError('');

    setRollupAccountAssignments({});

    setRollupPendingNewAccountKey('');

    setIsAddingAccount(false);

    setIsAccountActionMenuOpen(false);

    setIsDangerActionsOpen(false);

    setEditingAccount(null);

    setAccountOperationEntrySource('account-detail');

    setEditingAccountInfo(null);

    setAccountTypeEditor(null);

    resetAutoBackupDraft();



    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: snapshot.mainScrollTop });

    }, 0);

  };



  const findSearchNavigationTarget = (target: SearchNavigationTarget) => {

    if (target.category === 'account') {

      const group = groups.find((currentGroup) => currentGroup.name === target.groupName);

      const account = group?.accounts.find(

        (currentAccount) => currentAccount.id === target.accountId

      );



      return group && account ? { group, account } : null;

    }



    if (target.category === 'history') {

      return sortedHistory.find((record) => record.id === target.recordId) ?? null;

    }



    if (target.category === 'snapshot') {

      return backupRecords.find((record) => record.id === target.recordId) ?? null;

    }



    return GLOBAL_SETTINGS_SEARCH_ITEMS.find((item) => item.id === target.settingsId) ?? null;

  };



  const navigateToSearchTarget = (target: SearchNavigationTarget) => {

    const foundTarget = findSearchNavigationTarget(target);



    if (!foundTarget) {

      return;

    }



    if (target.category === 'settings' && target.blockId) {

      skipNextMainScrollResetRef.current = true;

    }



    prepareSearchNavigation();



    if (target.category === 'account') {

      const { group, account } = foundTarget as { group: AssetGroup; account: Account };



      setExpandedGroupNames((currentNames) =>

        currentNames.includes(group.name) ? currentNames : [...currentNames, group.name]

      );

      setSelectedAccount({ groupName: group.name, accountId: account.id });

      setExpandedDetailDates([]);

      setIsAccountActionMenuOpen(false);

      return;

    }



    if (target.category === 'settings') {

      const item = foundTarget as SettingsSearchItem;

      const nextSection = isGlobalSettingsSection(item.section)

        ? item.section

        : isGlobalSettingsSection(target.settingsSection)

          ? target.settingsSection

          : 'appearance';



      setGlobalSettingsSection(nextSection);

      setIsGlobalSettingsOpen(true);

      window.setTimeout(() => {

        const targetElement = target.blockId

          ? document.getElementById(target.blockId)

          : null;



        if (targetElement) {

          targetElement.scrollIntoView({ block: 'start', behavior: 'smooth' });

          return;

        }



        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

      }, 0);

      return;

    }



    if (target.category === 'history') {

      const record = foundTarget as HistoryRecord;
      const group =
        groups.find((currentGroup) =>
          currentGroup.accounts.some((account) => account.id === record.accountId)
        ) ?? groups.find((currentGroup) => currentGroup.name === record.groupName);
      const account = group?.accounts.find(
        (currentAccount) => currentAccount.id === record.accountId
      );

      if (!group || !account) {
        return;
      }

      const recordDate = toDateInputValue(new Date(record.time));

      setExpandedGroupNames((currentNames) =>
        currentNames.includes(group.name) ? currentNames : [...currentNames, group.name]
      );

      setSelectedAccount({ groupName: group.name, accountId: account.id });

      setExpandedDetailDates((currentDates) =>
        currentDates.includes(recordDate) ? currentDates : [...currentDates, recordDate]
      );

      setIsAccountActionMenuOpen(false);



      requestSearchTargetScroll(target);

      return;

    }



    setHistoryPanelView('backup');

    setIsHistoryOpen(true);

    requestSearchTargetScroll(target);

  };



  const startSearchNavigation = (target: SearchNavigationTarget) => {

    const targets = strongSearchNavigationTargets.some(

      (currentTarget) => currentTarget.key === target.key

    )

      ? strongSearchNavigationTargets

      : [target];



    dispatchSearchState({

      type: 'set-navigation',

      navigation: {

        returnSnapshot: createSearchNavigationSnapshot(),

        targets,

        currentTargetKey: target.key

      },

      openedResultId: target.key

    });

    navigateToSearchTarget(target);

  };



  const closeHistoryPanel = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setBackupReturnTarget('history');

    setHighlightedHistoryRecordId('');

    setHighlightedBackupRecordId('');

    resetAutoBackupDraft();

  };



  const openHistoryPanel = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    setHighlightedHistoryRecordId('');

    setHighlightedBackupRecordId('');

    setHistoryPanelView('history');

    setIsHistoryOpen(true);

  };



  const openBackupPanel = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    setHighlightedHistoryRecordId('');

    setHighlightedBackupRecordId('');

    resetAutoBackupDraft();

    setBackupReturnTarget('history');

    setIsHistoryOpen(true);

    setHistoryPanelView('backup');

  };



  const openBackupPanelFromGlobalSettings = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    setHighlightedHistoryRecordId('');

    setHighlightedBackupRecordId('');

    resetAutoBackupDraft();

    setBackupReturnTarget('global-settings-backup');

    setIsHistoryOpen(true);

    setHistoryPanelView('backup');

  };



  const returnFromBackupPanel = () => {

    resetAutoBackupDraft();



    if (backupReturnTarget === 'global-settings-backup') {

      setIsHistoryOpen(false);

      setHistoryPanelView('history');

      setBackupReturnTarget('history');

      setIsGlobalSettingsOpen(true);

      setGlobalSettingsSection('backup');

      return;

    }



    setHistoryPanelView('history');

  };



  const updateAutoBackupEnabled = (enabled: boolean) => {

    if (isExampleMode) {

      return;

    }



    if (enabled && !autoBackupDraft.enabled && globalSettings.snapshotEncryptionEnabled) {

      setConfirmationDialog({

        title: '自动快照将使用快照密码加密',

        message: (

          <>

            <p>忘记快照密码将无法恢复自动生成的加密快照</p>

            <strong>是否继续？</strong>

          </>

        ),

        confirmLabel: '继续开启',

        onConfirm: () =>

          setAutoBackupDraft((currentSettings) =>

            normalizeAutoBackupSettings({

              ...currentSettings,

              enabled: true

            })

          )

      });

      return;

    }



    setAutoBackupDraft((currentSettings) =>

      normalizeAutoBackupSettings({

        ...currentSettings,

        enabled

      })

    );

  };



  const updateAutoBackupCycleValue = (value: string) => {

    if (isExampleMode) {

      return;

    }



    const nextValue = value.replace(/[^\d]/g, '');

    setAutoBackupCycleValueInput(nextValue);



    if (!nextValue) {

      return;

    }



    setAutoBackupDraft((currentSettings) =>

      normalizeAutoBackupSettings({

        ...currentSettings,

        cycle: {

          ...currentSettings.cycle,

          value: Number(nextValue)

        }

      })

    );

  };



  const adjustAutoBackupCycleValue = (direction: 1 | -1) => {

    setAutoBackupDraft((currentSettings) =>

      normalizeAutoBackupSettings({

        ...currentSettings,

        cycle: {

          ...currentSettings.cycle,

          value: Math.max(1, currentSettings.cycle.value + direction)

        }

      })

    );

  };



  const updateAutoBackupCycleUnit = (unit: BackupCycleUnit) => {

    if (isExampleMode) {

      return;

    }



    setAutoBackupDraft((currentSettings) =>

      normalizeAutoBackupSettings({

        ...currentSettings,

        cycle: {

          ...currentSettings.cycle,

          unit

        }

      })

    );

  };



  const selectAutoBackupDirectory = async () => {

    if (isExampleMode) {

      return;

    }



    if (!autoBackupDraft.enabled) {

      return;

    }



    const api = window.electronAPI ?? window.electronWindow;



    if (!api?.selectDirectory) {

      window.alert('当前环境不支持选择目录');

      return;

    }



    try {

      const selectedDirectory = await api.selectDirectory();



      if (!selectedDirectory) {

        return;

      }



      setAutoBackupDraft((currentSettings) =>

        normalizeAutoBackupSettings({

          ...currentSettings,

          directory: selectedDirectory

        })

      );

    } catch (error) {

      console.error('[NetraFlow snapshot] Failed to select auto snapshot directory.', error);

      window.alert('目录选择失败，请稍后再试');

    }

  };



  const saveAutoBackupDraft = () => {

    if (isExampleMode || !canSaveAutoBackupSettings) {

      return;

    }



    const nextSettings = normalizeAutoBackupSettings(autoBackupDraft);



    dispatchSearchState({ type: 'clear-navigation' });

    setAutoBackupSettings(nextSettings);

    setAutoBackupDraft(nextSettings);

    setAutoBackupCycleValueInput(String(nextSettings.cycle.value));

    saveAutoBackupSettings(nextSettings);

    cancelPendingFirstWelcomeForRealChange();

  };



  const createBackupRecord = (backedUpAt: string, method: BackupMethod): BackupRecord => ({

    id: createId('backup-record'),

    backedUpAt,

    historyCount: history.length,

    incrementCount: Math.max(0, history.length - lastBackupHistoryCount),

    method

  });



  const createBackupPayload = (

    backupAt: string,

    backupRecord: BackupRecord,

    nextBackupRecords: BackupRecord[],

    settings: AutoBackupSettings = autoBackupSettings

  ) => ({

    app: PRODUCT_NAME_EN,

    schemaVersion: 1,

    exportedAt: backupAt,

    lastBackupAt: backupAt,

    lastBackupHistoryCount: backupRecord.historyCount,

    backupRecords: nextBackupRecords,

    autoBackupSettings: settings,

    groups,

    history

  });



  const getBackupFileName = (backupAt: string, encrypted: boolean) =>

    `netraflow-snapshot-${formatBackupFileTimestamp(new Date(backupAt))}${

      encrypted ? '.encrypted' : ''

    }.json`;



  const createBackupFileContent = async (

    backupPayload: unknown,

    snapshotPassword: string | null

  ) => {

    if (!snapshotPassword) {

      return JSON.stringify(backupPayload, null, 2);

    }



    const encryptedSnapshot = await encryptSnapshotPayload(backupPayload, snapshotPassword);



    return JSON.stringify(encryptedSnapshot, null, 2);

  };



  const requestVerifiedSnapshotPassword = async (

    promptMessage: string,

    invalidMessage = '快照密码不正确',

    snapshotPasswordHash = globalSettings.snapshotPasswordHash

  ) => {

    if (!snapshotPasswordHash) {

      window.alert('请先设置快照密码');

      return null;

    }



    const snapshotPassword = window.prompt(promptMessage);



    if (snapshotPassword === null) {

      return null;

    }



    const isPasswordValid = await verifyPassword(snapshotPassword, snapshotPasswordHash);



    if (!isPasswordValid) {

      window.alert(invalidMessage);

      return null;

    }



    return snapshotPassword;

  };



  const saveBackupSuccess = (backupRecord: BackupRecord, nextBackupRecords: BackupRecord[]) => {

    dispatchSearchState({ type: 'clear-navigation' });

    setBackupRecords(nextBackupRecords);

    setLastBackupAt(backupRecord.backedUpAt);

    setLastBackupHistoryCount(backupRecord.historyCount);



    if (isExampleMode) {

      return;

    }



    saveBackupRecords(nextBackupRecords);

    saveLastBackupAt(backupRecord.backedUpAt);

    saveLastBackupHistoryCount(backupRecord.historyCount);

  };



  const exportBackup = async () => {

    const api = window.electronAPI ?? window.electronWindow;

    let snapshotPassword: string | null = null;



    if (!api?.selectDirectory || !api?.writeSnapshotFile) {

      window.alert('当前环境不支持导出快照');

      return;

    }



    if (globalSettings.snapshotEncryptionEnabled) {

      const shouldContinue = await requestConfirmationDialog({

        title: '导出加密快照',

        message: '已启用快照加密，导出的快照文件将使用快照密码加密，忘记快照密码将无法恢复',

        confirmLabel: '继续导出',

        cancelLabel: '取消',

        eyebrow: '快照导出'

      });



      if (!shouldContinue) {

        return;

      }

    }



    let selectedDirectory = '';



    try {

      selectedDirectory = await api.selectDirectory();

    } catch (error) {

      console.error('[NetraFlow snapshot] Failed to select manual snapshot directory.', error);

      window.alert('目录选择失败，请稍后再试');

      return;

    }



    if (!selectedDirectory) {

      return;

    }



    if (globalSettings.snapshotEncryptionEnabled) {

      snapshotPassword = await requestVerifiedSnapshotPassword(

        '请输入快照密码，用于加密本次导出的快照'

      );



      if (!snapshotPassword) {

        return;

      }

    }



    const backupAt = new Date().toISOString();

    const backupRecord = createBackupRecord(backupAt, 'manual');

    const nextBackupRecords = mergeBackupRecords(backupRecords, [backupRecord]);

    const backupPayload = createBackupPayload(backupAt, backupRecord, nextBackupRecords);

    let fileContent = '';



    try {

      fileContent = await createBackupFileContent(backupPayload, snapshotPassword);

    } catch (error) {

      console.error('[NetraFlow snapshot] Failed to encrypt manual snapshot.', error);

      window.alert('快照加密失败，请稍后再试');

      return;

    }



    try {

      await api.writeSnapshotFile({

        directory: selectedDirectory,

        fileName: getBackupFileName(backupAt, snapshotPassword !== null),

        content: fileContent

      });

      saveBackupSuccess(backupRecord, nextBackupRecords);

      showToast('手动快照已导出', 'success');

    } catch (error) {

      console.error('[NetraFlow snapshot] Manual snapshot failed.', error);

      showToast('手动快照导出失败，请检查目录', 'error');

    }

  };



  const runStartupAutoBackup = async () => {

    const settings = loadAutoBackupSettings();

    const currentGlobalSettings = loadGlobalSettings();



    if (!settings.enabled) {

      return;

    }



    const directory = settings.directory.trim();



    if (!directory) {

      console.warn('[NetraFlow snapshot] Auto snapshot directory is not configured.');

      showToast('自动快照目录未设置', 'error');

      return;

    }



    const lastBackupTimestamp = getValidTimestamp(loadLastBackupAt());

    const cycleDays = getBackupCycleDays(settings.cycle);

    const shouldRun =

      lastBackupTimestamp === null || Date.now() - lastBackupTimestamp >= cycleDays * DAY_MS;



    if (!shouldRun) {

      return;

    }



    const api = window.electronAPI ?? window.electronWindow;



    if (!api?.writeSnapshotFile) {

      console.error('[NetraFlow snapshot] Snapshot file writer is not available.');

      showToast('自动快照无法写入文件', 'error');

      return;

    }



    let snapshotPassword: string | null = null;



    if (currentGlobalSettings.snapshotEncryptionEnabled) {

      snapshotPassword = await requestVerifiedSnapshotPassword(

        '自动快照文件将使用快照密码加密，请输入快照密码',

        '自动快照已跳过：快照密码不正确',

        currentGlobalSettings.snapshotPasswordHash

      );



      if (!snapshotPassword) {

        showToast('自动快照已跳过', 'info');

        return;

      }

    }



    const progressToastId = showToast('自动快照进行中');

    await new Promise<void>((resolve) => {

      window.setTimeout(resolve, 120);

    });



    const backupAt = new Date().toISOString();

    const backupRecord = createBackupRecord(backupAt, 'auto');

    const latestBackupRecords = loadBackupRecords();

    const nextBackupRecords = mergeBackupRecords(latestBackupRecords, [backupRecord]);

    const backupPayload = createBackupPayload(

      backupAt,

      backupRecord,

      nextBackupRecords,

      settings

    );

    let fileContent = '';



    try {

      fileContent = await createBackupFileContent(backupPayload, snapshotPassword);

      await api.writeSnapshotFile({

        directory,

        fileName: getBackupFileName(backupAt, snapshotPassword !== null),

        content: fileContent

      });

      dismissToast(progressToastId);

      saveBackupSuccess(backupRecord, nextBackupRecords);

      setAutoBackupSettings(settings);

      setAutoBackupDraft(settings);

      setAutoBackupCycleValueInput(String(settings.cycle.value));

      showToast('自动快照已完成', 'success');

    } catch (error) {

      console.error('[NetraFlow snapshot] Auto snapshot failed.', error);

      dismissToast(progressToastId);

      showToast('自动快照失败，请检查目录', 'error');

    }

  };



  useEffect(() => {

    const timerId = window.setTimeout(() => {

      if (hasCheckedStartupAutoBackup) {

        return;

      }



      hasCheckedStartupAutoBackup = true;

      void runStartupAutoBackup();

    }, 0);



    return () => window.clearTimeout(timerId);

  }, []);



  const importBackupData = (value: unknown) => {

    const importedGroups = getBackupGroups(value);

    const groupsAfterImport =

      importedGroups.length > 0 ? mergeGroups(groups, importedGroups) : groups;

    const importedHistory = getBackupHistory(value, groupsAfterImport);



    if (importedGroups.length === 0 && importedHistory.length === 0) {

      throw new Error('No supported snapshot data found.');

    }



    if (isExampleMode) {

      const sandboxGroups = importedGroups.length > 0 ? importedGroups : groups;

      const sandboxHistory = importedHistory.length > 0 ? importedHistory : history;



      updateAppData({

        groups: sandboxGroups,

        history: sandboxHistory

      });



      const importedBackupRecords = normalizeBackupRecords(

        getBackupFieldValue(value, ['backupRecords'])

      );

      const importedLastBackupAt = getBackupFieldValue(value, ['lastBackupAt']);

      const importedLastBackupHistoryCount = getBackupFieldValue(value, [

        'lastBackupHistoryCount'

      ]);

      const importedHistoryCountNumber =

        typeof importedLastBackupHistoryCount === 'number'

          ? importedLastBackupHistoryCount

          : typeof importedLastBackupHistoryCount === 'string'

            ? Number(importedLastBackupHistoryCount)

            : NaN;



      applyBackupState(

        importedBackupRecords.length > 0 ? importedBackupRecords : backupRecords,

        typeof importedLastBackupAt === 'string' &&

          getValidTimestamp(importedLastBackupAt) !== null

          ? importedLastBackupAt

          : lastBackupAt,

        Number.isFinite(importedHistoryCountNumber)

          ? Math.max(0, Math.floor(importedHistoryCountNumber))

          : sandboxHistory.length,

        false

      );

      return;

    }



    updateAppData({

      groups: groupsAfterImport,

      history:

        importedHistory.length > 0

          ? mergeHistoryRecords(history, importedHistory)

          : history

    });



    const importedLastBackupAt = getBackupFieldValue(value, ['lastBackupAt']);



    if (

      typeof importedLastBackupAt === 'string' &&

      getValidTimestamp(importedLastBackupAt) !== null

    ) {

      setLastBackupAt(importedLastBackupAt);

      saveLastBackupAt(importedLastBackupAt);

    }



    const importedLastBackupHistoryCount = getBackupFieldValue(value, [

      'lastBackupHistoryCount'

    ]);

    const importedHistoryCountNumber =

      typeof importedLastBackupHistoryCount === 'number'

        ? importedLastBackupHistoryCount

        : typeof importedLastBackupHistoryCount === 'string'

          ? Number(importedLastBackupHistoryCount)

          : NaN;



    if (Number.isFinite(importedHistoryCountNumber)) {

      const nextHistoryCount = Math.max(0, Math.floor(importedHistoryCountNumber));



      setLastBackupHistoryCount(nextHistoryCount);

      saveLastBackupHistoryCount(nextHistoryCount);

    }



    const importedBackupRecords = normalizeBackupRecords(

      getBackupFieldValue(value, ['backupRecords'])

    );



    if (importedBackupRecords.length > 0) {

      const nextBackupRecords = mergeBackupRecords(backupRecords, importedBackupRecords);



      setBackupRecords(nextBackupRecords);

      saveBackupRecords(nextBackupRecords);

    }



    const importedAutoBackupSettings = getBackupFieldValue(value, ['autoBackupSettings']);



    if (importedAutoBackupSettings !== undefined) {

      const nextAutoBackupSettings = normalizeAutoBackupSettings(importedAutoBackupSettings);



      setAutoBackupSettings(nextAutoBackupSettings);

      setAutoBackupDraft(nextAutoBackupSettings);

      setAutoBackupCycleValueInput(String(nextAutoBackupSettings.cycle.value));

      saveAutoBackupSettings(nextAutoBackupSettings);

    }

  };



  const readImportSnapshotData = async (value: unknown) => {

    if (isPlainObject(value) && value.type === 'netraflow-encrypted-snapshot') {

      if (!isEncryptedSnapshotFile(value)) {

        throw new Error(SNAPSHOT_DECRYPTION_ERROR_MESSAGE);

      }



      const snapshotPassword = window.prompt('该快照已加密，请输入快照密码');



      if (snapshotPassword === null) {

        return null;

      }



      return decryptSnapshotPayload(value, snapshotPassword);

    }



    return value;

  };



  const importBackup = (event: ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0];

    event.target.value = '';



    if (!file) {

      return;

    }



    const reader = new FileReader();



    reader.onload = () => {

      void (async () => {

        try {

          const parsedSnapshot = JSON.parse(String(reader.result ?? ''));

          const snapshotData = await readImportSnapshotData(parsedSnapshot);



          if (snapshotData === null) {

            return;

          }



          importBackupData(snapshotData);

          window.alert('快照已导入，现有数据已按字段合并');

        } catch (error) {

          console.error('[NetraFlow snapshot] Failed to import snapshot.', error);

          window.alert(

            error instanceof Error && error.message === SNAPSHOT_DECRYPTION_ERROR_MESSAGE

              ? SNAPSHOT_DECRYPTION_ERROR_MESSAGE

              : '快照文件无法导入，请确认文件内容'

          );

        }

      })();

    };

    reader.onerror = () => {

      window.alert('快照文件读取失败');

    };

    reader.readAsText(file);

  };



  const selectCalendarDate = (date: Date) => {

    dispatchSearchState({ type: 'clear-navigation' });

    const selectedDate = toDateInputValue(date);

    if (isFutureDateKey(selectedDate)) {

      return;

    }



    if (!historyStartDate || historyEndDate) {

      setHistoryStartDate(selectedDate);

      setHistoryEndDate('');

      setHistoryRangeInput(selectedDate);

      setCalendarMonth(getHistoryCalendarLeadMonth(selectedDate));

      return;

    }



    const nextStartDate = historyStartDate <= selectedDate ? historyStartDate : selectedDate;

    const nextEndDate = historyStartDate <= selectedDate ? selectedDate : historyStartDate;



    setHistoryStartDate(nextStartDate);

    setHistoryEndDate(nextEndDate);

    setHistoryRangeInput(formatDateRangeDisplay(nextStartDate, nextEndDate));

  };



  const isLargeAmountChange = (beforeAmount: number, afterAmount: number) => {

    const delta = Math.abs(afterAmount - beforeAmount);



    if (delta === 0) {

      return false;

    }



    return beforeAmount === 0 ? afterAmount > 0 : delta / beforeAmount > 0.5;

  };



  const performSaveAmount = (editableAmount: number, savedDate: string, note?: string) => {

    if (!editingAccount || !currentAccount) {

      return;

    }



    if (

      currentAccount.archived &&

      hasActiveDuplicateAccountNameExcept(currentAccount.name, currentAccount.id)

    ) {

      window.alert('已存在同名启用账户，请先修改名称后再重新启用');

      return;

    }



    const nextAmount = roundToMoneyPrecision(

      toStoredGroupAmount(editingAccount.groupName, editableAmount)

    );

    const savedAt = toAccountOperationIsoTime(savedDate);

    const nextGroups = groups.map((group) =>

      group.name === editingAccount.groupName

        ? {

            ...group,

            accounts: group.accounts.map((account) =>

              account.id === editingAccount.accountId

                ? {

                    ...account,

                    amount: nextAmount,

                    ...(currentAccount.archived

                      ? { archived: false, archivedAt: undefined }

                      : {})

                  }

                : account

            )

          }

        : group

    );

    const nextHistory = [

      createHistoryRecord(

        '修改',

        currentAccount,

        editingAccount.groupName,

        currentAccount.amount,

        nextAmount,

        savedAt,

        undefined,

        undefined,

        note

      ),

      ...(currentAccount.archived

        ? [

            createHistoryRecord(

              '重新启用',

              currentAccount,

              editingAccount.groupName,

              currentAccount.amount,

              currentAccount.amount,

              savedAt

            )

          ]

        : []),

      ...history

    ];



    updateAppData({ groups: nextGroups, history: nextHistory });

    closeEditor();

  };



  const saveAmount = () => {

    if (!editingAccount || !currentAccount) {

      return;

    }



    const editableAmount =

      editMode === 'set' ? parseNonNegativeAmount(draftAmount) : nextAdjustedEditableAmount;



    if (editableAmount === null || isAdjustAmountInvalid || !activeAmountEditDate) {

      return;

    }



    if (

      currentAccount.archived &&

      hasActiveDuplicateAccountNameExcept(currentAccount.name, currentAccount.id)

    ) {

      window.alert('已存在同名启用账户，请先修改名称后再重新启用');

      return;

    }



    const nextAmount = roundToMoneyPrecision(

      toStoredGroupAmount(editingAccount.groupName, editableAmount)

    );



    if (isLargeAmountChange(currentEditableAmount, editableAmount)) {

      const savedDate = activeAmountEditDate;

      const note = activeAmountEditNote.trim() ? activeAmountEditNote : undefined;



      setConfirmationDialog({

        title: editMode === 'set' ? '确认修改余额' : '确认增减金额',

        message: `${currentAccount.name}：${formatMoney(currentAccount.amount)} → ${formatMoney(nextAmount)}`,

        confirmLabel: '确认',

        onConfirm: () => performSaveAmount(editableAmount, savedDate, note)

      });

      return;

    }



    performSaveAmount(

      editableAmount,

      activeAmountEditDate,

      activeAmountEditNote.trim() ? activeAmountEditNote : undefined

    );

  };



  const saveNewAccount = () => {

    const nextName = newAccountName.trim();

    const editableAmount = parseNonNegativeAmount(newAccountAmount);

    const selectedNewAccountGroupName =

      groups.find(

        (group) =>

          normalizeTypeSearchText(group.name) === normalizeTypeSearchText(newAccountTypeInput)

      )?.name ?? newAccountGroupName;



    if (!selectedNewAccountGroupName) {

      setNewAccountError('请选择类型');

      return;

    }



    if (!nextName) {

      setNewAccountError('请输入账户名称');

      return;

    }



    if (hasActiveDuplicateAccountName(nextName)) {

      setNewAccountError('账户名称必须唯一');

      return;

    }



    const archivedMatch = findArchivedAccountByName(nextName);



    if (archivedMatch) {

      setConfirmationDialog({

        title: '重新启用账户',

        message: `账户名称：${archivedMatch.name}`,

        confirmLabel: '重新启用',

        onConfirm: () => {

          if (restoreAccount(archivedMatch.groupName, archivedMatch)) {

            closeAddAccount();

          }

        }

      });

      return;

    }



    if (editableAmount === null) {

      setNewAccountError('请输入非负金额');

      return;

    }



    const createdAt = new Date().toISOString();

    const nextAccount: Account = {

      id: createId('account'),

      name: nextName,

      amount: roundToMoneyPrecision(

        toStoredGroupAmount(selectedNewAccountGroupName, editableAmount)

      ),

      createdAt

    };

    const nextGroups = groups.map((group) =>

      group.name === selectedNewAccountGroupName

        ? {

            ...group,

            accounts: [...group.accounts, nextAccount]

          }

        : group

    );

    const nextHistory = [

      createHistoryRecord(

        '新增',

        nextAccount,

        selectedNewAccountGroupName,

        null,

        nextAccount.amount,

        createdAt

      ),

      ...history

    ];



    updateAppData({ groups: nextGroups, history: nextHistory });

    updateAssetChartSettings((currentSettings) => ({

      ...currentSettings,

      accountDetailById: {

        ...currentSettings.accountDetailById,

        [nextAccount.id]: normalizeAccountDetailChartSettings(

          getGlobalAccountDetailChartSettings(currentSettings.trend),

          getGlobalAccountDetailChartSettings(currentSettings.trend)

        )

      }

    }));



    if (rollupPendingNewAccountKey) {

      assignRollupAccount(rollupPendingNewAccountKey, {

        groupName: selectedNewAccountGroupName,

        accountId: nextAccount.id

      });

      setRollupPendingNewAccountKey('');

    }



    closeAddAccount();

  };



  const performDeleteAccount = (groupName: string, account: Account) => {

    const deletedAt = new Date().toISOString();

    const nextGroups = groups.map((group) =>

      group.name === groupName

        ? {

            ...group,

            accounts: group.accounts.filter((currentAccount) => currentAccount.id !== account.id)

          }

        : group

    );

    const existingCreateRecord = history.find(

      (record) => record.accountId === account.id && record.type === '新增'

    );

    const createdAt = existingCreateRecord?.time ?? account.createdAt;

    const createRecord: HistoryRecord = {

      ...(existingCreateRecord ??

        createHistoryRecord('新增', account, groupName, null, account.amount, createdAt)),

      relatedTime: deletedAt

    };

    const deleteRecord = createHistoryRecord(

      '删除',

      account,

      groupName,

      account.amount,

      null,

      deletedAt,

      createdAt

    );

    const unrelatedHistory = history.filter((record) => record.accountId !== account.id);



    updateAppData({

      groups: nextGroups,

      history: [deleteRecord, createRecord, ...unrelatedHistory]

    });

    closeAccountDetail();

  };



  const deleteAccount = (groupName: string, account: Account) => {

    setConfirmationDialog({

      title: '删除账户',

      message: (

        <>

          <p>账户名称：{account.name}</p>

          <p>此操作不可恢复</p>

        </>

      ),

      confirmLabel: '确认删除',

      tone: 'danger',

      onConfirm: () => performDeleteAccount(groupName, account)

    });

  };



  const performArchiveAccount = (groupName: string, account: Account) => {

    const archivedAt = new Date().toISOString();

    const nextGroups = groups.map((group) =>

      group.name === groupName

        ? {

            ...group,

            accounts: group.accounts.map((currentAccount) =>

              currentAccount.id === account.id

                ? { ...currentAccount, archived: true, archivedAt }

                : currentAccount

            )

          }

        : group

    );

    const nextHistory = [

      createHistoryRecord('归档', account, groupName, account.amount, account.amount, archivedAt),

      ...history

    ];



    updateAppData({ groups: nextGroups, history: nextHistory });

    closeAccountDetail();

  };



  const archiveAccount = (groupName: string, account: Account) => {

    setConfirmationDialog({

      title: '归档账户',

      message: (

        <>

          {account.amount !== 0 ? <p>当前账户余额不为 0</p> : null}

          <p>账户名称：{account.name}</p>

          <p>账户会进入已归档列表，后续仍可在账户新增 / 恢复中重新启用</p>

        </>

      ),

      confirmLabel: '确认归档',

      onConfirm: () => performArchiveAccount(groupName, account)

    });

  };



  const restoreAccount = (groupName: string, account: Account) => {

    if (hasActiveDuplicateAccountNameExcept(account.name, account.id)) {

      window.alert('已存在同名启用账户，请先修改名称后再重新启用');

      return false;

    }



    const restoredAt = new Date().toISOString();

    const nextGroups = groups.map((group) =>

      group.name === groupName

        ? {

            ...group,

            accounts: group.accounts.map((currentAccount) =>

              currentAccount.id === account.id

                ? { ...currentAccount, archived: false, archivedAt: undefined }

                : currentAccount

            )

          }

        : group

    );

    const nextHistory = [

      createHistoryRecord(

        '重新启用',

        account,

        groupName,

        account.amount,

        account.amount,

        restoredAt

      ),

      ...history

    ];



    updateAppData({ groups: nextGroups, history: nextHistory });

    return true;

  };



  const getHistoryTypeLabel = (type: HistoryType) => (type === '归档' ? '已归档' : type);



  const getAccountNatureLabel = (nature: AccountTypeNature) =>

    accountTypeNatureOptions.find((option) => option.value === nature)?.label ?? nature;



  const searchIndex = useMemo(

    () =>

      createGlobalSearchIndex(groups, sortedHistory, backupRecords, {

        getAccountNatureLabel,

        getHistoryTypeLabel,

        getBackupMethodLabel,

        getAccountMark,

        getHistoryChangeLabel: (record) => getAmountChange(record).label,

        formatMoney,

        formatShortTime,

        formatPreciseBackupTime,

        settingsItems: GLOBAL_SETTINGS_SEARCH_ITEMS

      }),

    [groups, sortedHistory, backupRecords]

  );

  const searchOutput = useMemo(

    () =>

      runGlobalSearch(searchIndex, searchState.query, {

        selectedCategory: searchState.selectedCategory,

        searchLogicMode: globalSettings.searchLogicMode

      }),

    [searchIndex, searchState.query, searchState.selectedCategory, globalSettings.searchLogicMode]

  );



  useEffect(() => {

    if (searchState.weakMode !== searchOutput.weakMode) {

      dispatchSearchState({ type: 'set-weak-mode', weakMode: searchOutput.weakMode });

    }

  }, [searchOutput.weakMode, searchState.weakMode]);



  const strongSearchNavigationTargets = searchOutput.strongNavigationTargets;

  const currentSearchNavigationTarget = searchState.floatingNavigation?.targets.find(

    (target) => target.key === searchState.floatingNavigation?.currentTargetKey

  );

  const searchNavigationCycle = getSearchNavigationCycle(

    searchState.floatingNavigation?.targets ?? [],

    currentSearchNavigationTarget ?? null

  );

  const canMoveSearchNavigation = searchNavigationCycle.length > 1;

  const activeSearchResults = getSearchResultsForCategory(

    searchOutput,

    searchState.selectedCategory

  );

  const focusedSearchResult =

    activeSearchResults.find(

      (result) => getSearchResultItemId(result.target) === searchState.hoveredResultId

    ) ??

    activeSearchResults.find(

      (result) => getSearchResultItemId(result.target) === searchState.focusedResultId

    ) ??

    activeSearchResults[0] ??

    null;



  const markSearchUserInteraction = () => {

    searchInteractionHoldUntilRef.current = Date.now() + 650;

  };



  const handleSearchResultOpen = (result: GlobalSearchResult) => {

    startSearchNavigation(result.target);

  };



  const moveSearchNavigation = (direction: 1 | -1) => {

    if (!searchState.floatingNavigation || !currentSearchNavigationTarget) {

      return;

    }



    const nextTarget = getNextSearchNavigationTarget(

      searchNavigationCycle,

      currentSearchNavigationTarget,

      direction

    );



    if (!nextTarget) {

      return;

    }



    dispatchSearchState({

      type: 'update-navigation-target',

      currentTargetKey: nextTarget.key

    });

    navigateToSearchTarget(nextTarget);

  };



  const returnFromSearchNavigation = () => {

    const navigationState = searchState.floatingNavigation;



    if (!navigationState) {

      return;

    }



    const snapshot = navigationState.returnSnapshot;



    dispatchSearchState({ type: 'return-from-navigation' });

    restoreSearchNavigationSnapshot(snapshot);



  };



  const exitSearchNavigation = () => {

    dispatchSearchState({ type: 'clear-navigation' });

    clearSearchScrollTargets();

  };



  const renderAccountOperationDatePicker = ({

    value,

    selectedDate,

    parsedDate,

    visibleMonth,

    futureHint,

    onInputChange,

    onCalendarSelect,

    onVisibleMonthChange

  }: {

    value: string;

    selectedDate: string | null;

    parsedDate: string | null;

    visibleMonth: Date;

    futureHint?: boolean;

    onInputChange: (value: string) => void;

    onCalendarSelect: (dateValue: string) => void;

    onVisibleMonthChange: (monthDate: Date) => void;

  }) => {

    const todayDateValue = getAccountOperationTodayDateValue();

    const calendarMonth = visibleMonth;

    const isInvalid = parsedDate === null;



    return (

      <div className="account-operation-date-picker">

        <label className="account-operation-field">

          <span>修改时间</span>

          <input

            className="account-operation-input"

            type="text"

            value={value}

            placeholder={futureHint ? '无法选择未来日' : undefined}

            aria-invalid={isInvalid || undefined}

            onChange={(event) => onInputChange(event.target.value)}

            onBlur={() => {

              if (parsedDate && value !== parsedDate) {

                onInputChange(parsedDate);

              }

            }}

          />

        </label>

        {isInvalid ? (

          <span className="account-operation-field-error">请输入单个有效日期</span>

        ) : null}

        <div className="account-operation-calendar" aria-label="选择修改日期">

          <div className="account-operation-calendar__header">

            <button

              type="button"

              aria-label="上一月"

              onClick={() =>

                onVisibleMonthChange(shiftAccountOperationCalendarMonth(calendarMonth, -1))

              }

            >

              ‹

            </button>

            <strong>

              {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月

            </strong>

            <button

              type="button"

              aria-label="下一月"

              onClick={() =>

                onVisibleMonthChange(shiftAccountOperationCalendarMonth(calendarMonth, 1))

              }

            >

              ›

            </button>

          </div>

          <div className="account-operation-calendar__weekdays" aria-hidden="true">

            {['一', '二', '三', '四', '五', '六', '日'].map((dayName) => (

              <span key={dayName}>{dayName}</span>

            ))}

          </div>

          <div className="account-operation-calendar__grid">

            {getCalendarDays(calendarMonth).map((date) => {

              const dateValue = toAccountOperationDateValue(date);

              const isSelected = selectedDate === dateValue;

              const isToday = dateValue === todayDateValue;

              const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();

              const isFuture = isFutureAccountOperationDateValue(dateValue, todayDateValue);

              const className = [

                'account-operation-calendar__day',

                isSelected ? 'is-selected' : '',

                isToday ? 'is-today' : '',

                isCurrentMonth ? '' : 'is-outside-month',

                isFuture ? 'is-future' : ''

              ]

                .filter(Boolean)

                .join(' ');



              return (

                <button

                  key={dateValue}

                  type="button"

                  className={className}

                  aria-pressed={isSelected}

                  disabled={isFuture}

                  onClick={() => {

                    if (!isFuture) {

                      onCalendarSelect(dateValue);

                    }

                  }}

                >

                  {date.getDate()}

                </button>

              );

            })}

          </div>

        </div>

      </div>

    );

  };



  const latestHistoryCalendarLeadMonth = getHistoryCalendarLeadMonth();

  const isHistoryCalendarNextDisabled =

    calendarMonth.getFullYear() > latestHistoryCalendarLeadMonth.getFullYear() ||

    (calendarMonth.getFullYear() === latestHistoryCalendarLeadMonth.getFullYear() &&

      calendarMonth.getMonth() >= latestHistoryCalendarLeadMonth.getMonth());



  const getHistoryCalendarDateState = (date: Date, monthDate: Date) => {

    const dateValue = toDateInputValue(date);



    return {

      isCurrentMonth: date.getMonth() === monthDate.getMonth(),

      isBoundary: dateValue === historyStartDate || dateValue === historyEndDate,

      isInsideRange:

        Boolean(historyStartDate && historyEndDate) &&

        dateValue > historyStartDate &&

        dateValue < historyEndDate,

      isFuture: isFutureDateKey(dateValue),

      recordCount: historyDateCounts[dateValue] ?? 0

    };

  };



  const historyRecordListProps = {

    compareRecords: compareHistoryByTimeDesc,

    getTypeLabel: getHistoryTypeLabel,

    getTone: getHistoryTone,

    getAmountChange,

    formatAmount: formatHistoryAmount,

    formatShortTime,

    renderFlashSourceIcon: renderFlashLightningIcon

  };



  const hasAmountEditorMetadataUnsavedChanges = Boolean(

    accountEditInitialDate &&

      (setAmountDateInput !== accountEditInitialDate ||

        adjustAmountDateInput !== accountEditInitialDate ||

        setAmountNoteInput !== '' ||

        adjustAmountNoteInput !== '')

  );

  const hasAmountEditorUnsavedChanges = Boolean(

    editingAccount &&

      currentAccount &&

      ((editMode === 'set'

        ? draftAmount !== formatMoneyInputValue(currentEditableAmount)

        : adjustAmountInput.trim() !== '') ||

        hasAmountEditorMetadataUnsavedChanges)

  );

  const hasAccountInfoUnsavedChanges = Boolean(

    editingAccountInfo &&

      accountInfoEntry &&

      (accountNameDraft !== accountInfoEntry.name ||

        accountAliasDraft !== limitAccountAliasInput(accountInfoEntry.alias ?? ''))

  );

  const firstGroupName = groups[0]?.name ?? '';

  const hasAddAccountUnsavedChanges = Boolean(

    isAddingAccount &&

      (newAccountName.trim() ||

        newAccountAmount.trim() ||

        newAccountError ||

        newAccountTypeInput !== firstGroupName ||

        newAccountGroupName !== firstGroupName)

  );

  const hasAccountTypeUnsavedChanges = Boolean(

    accountTypeEditor?.mode === 'create'

      ? accountTypeNameDraft.trim() ||

          accountTypeNatureDraft !== 'asset' ||

          accountTypeStatsDraft !== true ||

          accountTypeError

      : accountTypeEditorGroup &&

          (accountTypeNameDraft !== accountTypeEditorGroup.name ||

            accountTypeNatureDraft !== accountTypeEditorGroup.nature ||

            accountTypeStatsDraft !== accountTypeEditorGroup.includeInStats ||

            accountTypeError)

  );

  const hasSnapshotUnsavedChanges =

    isHistoryOpen && historyPanelView !== 'history' && hasAutoBackupDraftChanges;



  const requestDiscardableBack = (hasUnsavedChanges: boolean, onDiscard: () => void) => {

    if (!hasUnsavedChanges) {

      onDiscard();

      return;

    }



    setConfirmationDialog({

      title: '放弃当前编辑',

      message: '当前内容尚未保存，确认后会丢弃这些改动',

      confirmLabel: '放弃',

      tone: 'danger',

      onConfirm: onDiscard

    });

  };



  const requestCloseAccountTypeEditor = () =>

    requestDiscardableBack(hasAccountTypeUnsavedChanges, closeAccountTypeEditor);



  const requestCloseAccountInfoEditor = () =>

    requestDiscardableBack(hasAccountInfoUnsavedChanges, closeAccountInfoEditor);



  const requestCloseEditor = () =>

    requestDiscardableBack(hasAmountEditorUnsavedChanges, closeEditor);



  const requestCloseAddAccount = () =>

    requestDiscardableBack(hasAddAccountUnsavedChanges, closeAddAccount);



  const requestReturnFromBackupPanel = () =>

    requestDiscardableBack(hasSnapshotUnsavedChanges, returnFromBackupPanel);



  const requestReturnFromSearchNavigation = () =>

    requestDiscardableBack(hasSnapshotUnsavedChanges, returnFromSearchNavigation);



  const handleHistoryPanelBack = () => {

    if (historyPanelView === 'backup') {

      requestReturnFromBackupPanel();

      return;

    }



    closeHistoryPanel();

  };



  const currentLayerBack: (() => void) | null = (() => {

    if (firstWelcomeStage === 'welcome') {

      return completeFirstWelcome;

    }



    if (firstWelcomeStage === 'story') {

      return completeFirstWelcome;

    }



    if (searchState.isOpen) {

      return closeSearch;

    }



    if (confirmationDialog) {

      return closeConfirmationDialog;

    }



    if (resetConfirmation) {

      return closeResetConfirmation;

    }



    if (isFlashExitConfirmOpen) {

      return () => setIsFlashExitConfirmOpen(false);

    }



    if (isFlashReturnDateConfirmOpen) {

      return () => setIsFlashReturnDateConfirmOpen(false);

    }



    if (isFlashReturnSequenceConfirmOpen) {

      return () => setIsFlashReturnSequenceConfirmOpen(false);

    }



    if (flashContextMenu) {

      return () => setFlashContextMenu(null);

    }



    if (flashEditingDate) {

      return cancelFlashCellEdit;

    }



    if (isFlashNoteOpen) {

      return requestCloseFlashNote;

    }



    if (isQuickSingleEntryAccountPickerOpen) {

      return closeQuickSingleEntryAccountPicker;

    }



    if (isPasswordDisableConfirmOpen) {

      return closePasswordDisableConfirm;

    }



    if (passwordEditorMode) {

      return resetPasswordEditor;

    }



    if (isSnapshotEncryptionDisableConfirmOpen) {

      return closeSnapshotEncryptionDisableConfirm;

    }



    if (snapshotPasswordEditorMode) {

      return resetSnapshotPasswordEditor;

    }



    if (isAccountTypeEditorVisible) {

      return requestCloseAccountTypeEditor;

    }



    if (editingAccountInfo && accountInfoEntry) {

      return requestCloseAccountInfoEditor;

    }



    if (editingAccount && currentAccount) {

      return requestCloseEditor;

    }



    if (isAddingAccount) {

      return requestCloseAddAccount;

    }



    if (isRollupImportOpen) {

      return closeRollupImport;

    }



    if (isAccountActionMenuOpen) {

      return () => setIsAccountActionMenuOpen(false);

    }



    if (isDangerActionsOpen) {

      return closeDangerActions;

    }



    if (searchState.floatingNavigation) {

      return requestReturnFromSearchNavigation;

    }



    if (isArchivedAccountsOpen) {

      return () => setIsArchivedAccountsOpen(false);

    }



    if (isHistoryOpen) {

      return handleHistoryPanelBack;

    }



    if (isTotalChartsOpen) {

      return closeTotalChartsPage;

    }



    if (isAccountChartsOpen) {

      return closeAccountChartsPage;

    }



    if (isGlobalSettingsOpen) {

      return closeGlobalSettings;

    }



    if (selectedGroupDetailName) {

      return closeGroupDetailPage;

    }



    if (selectedAccount) {

      return closeAccountDetail;

    }



    if (isGroupEditMode) {

      return exitGroupEditMode;

    }



    return null;

  })();



  useEffect(() => {

    const previousMainPageKey = previousMainPageKeyRef.current;

    const previousLeftLayerKey = previousLeftLayerKeyRef.current;

    const shouldSkipMainReset = skipNextMainScrollResetRef.current;

    const memoryMode = globalSettings.pagePositionMemoryMode;



    if (shouldSkipMainReset) {

      skipNextMainScrollResetRef.current = false;

    }



    if (!previousMainPageKey) {

      previousMainPageKeyRef.current = mainPageKey;

      previousLeftLayerKeyRef.current = leftLayerKey;

      return;

    }



    const mainPageCoverage = getPageCoverage(previousMainPageKey, mainPageKey, 'main');

    const leftLayerCoverage = getPageCoverage(previousLeftLayerKey, leftLayerKey, 'main');

    const isMainKeyChange = mainPageCoverage === 'full';

    const isLeftLayerOpening =

      leftLayerCoverage === 'full' && !previousLeftLayerKey && Boolean(leftLayerKey);

    const isMainCoveredEvent = isMainKeyChange || isLeftLayerOpening;



    if (isMainCoveredEvent && !shouldSkipMainReset) {

      if (memoryMode === 'global') {

        if (isMainKeyChange) {

          const savedScrollTop = sessionMainScrollPositionsRef.current[mainPageKey];



          mainContentRef.current?.scrollTo({

            top: typeof savedScrollTop === 'number' ? savedScrollTop : 0

          });

        }

      } else {

        if (isMainKeyChange) {

          delete sessionMainScrollPositionsRef.current[previousMainPageKey];

          mainContentRef.current?.scrollTo({ top: 0 });

        } else {

          delete sessionMainScrollPositionsRef.current[mainPageKey];

          mainContentRef.current?.scrollTo({ top: 0 });

        }



        if (previousMainPageKey === 'home') {

          setExpandedGroupNames([]);

        }

      }

    }



    previousMainPageKeyRef.current = mainPageKey;

    previousLeftLayerKeyRef.current = leftLayerKey;

  }, [leftLayerKey, mainPageKey, globalSettings.pagePositionMemoryMode]);



  useEffect(() => {

    const previousLeftLayerPanelKey = previousLeftLayerPanelKeyRef.current;

    const memoryMode = globalSettings.pagePositionMemoryMode;



    if (!leftLayerKey) {

      previousLeftLayerPanelKeyRef.current = leftLayerKey;

      return;

    }



    if (!previousLeftLayerPanelKey) {

      previousLeftLayerPanelKeyRef.current = leftLayerKey;

      return;

    }



    if (previousLeftLayerPanelKey === leftLayerKey) {

      return;

    }



    window.setTimeout(() => {

      if (memoryMode === 'global') {

        const savedScrollTop = sessionLeftLayerScrollPositionsRef.current[leftLayerKey];



        leftLayerPanelRef.current?.scrollTo({

          top: typeof savedScrollTop === 'number' ? savedScrollTop : 0

        });

      } else {

        delete sessionLeftLayerScrollPositionsRef.current[previousLeftLayerPanelKey];

        leftLayerPanelRef.current?.scrollTo({ top: 0 });

      }

    }, 0);

    previousLeftLayerPanelKeyRef.current = leftLayerKey;

  }, [leftLayerKey, globalSettings.pagePositionMemoryMode]);



  useEffect(() => {

    const previousRightPanelKey = previousRightPanelKeyRef.current;

    const memoryMode = globalSettings.pagePositionMemoryMode;



    if (!previousRightPanelKey) {

      previousRightPanelKeyRef.current = rightPanelKey;

      return;

    }



    if (

      getPageCoverage(previousRightPanelKey, rightPanelKey, 'right') === 'right-panel-only'

    ) {

      if (memoryMode === 'global') {

        const savedScrollTop = sessionRightPanelScrollPositionsRef.current[rightPanelKey];



        rightActionPanelRef.current?.scrollTo({

          top: typeof savedScrollTop === 'number' ? savedScrollTop : 0

        });

      } else {

        delete sessionRightPanelScrollPositionsRef.current[previousRightPanelKey];

        rightActionPanelRef.current?.scrollTo({ top: 0 });

      }

    }



    previousRightPanelKeyRef.current = rightPanelKey;

  }, [rightPanelKey, globalSettings.pagePositionMemoryMode]);



  useEffect(() => {

    const canScrollHistoryPanel = isHistoryOpen && historyPanelView === 'history';
    const canScrollAccountDetail = Boolean(selectedAccount && selectedAccountEntry);

    if (!highlightedHistoryRecordId || (!canScrollHistoryPanel && !canScrollAccountDetail)) {

      return;

    }



    const scrollTimer = window.setTimeout(() => {

      document

        .getElementById(`history-record-${highlightedHistoryRecordId}`)

        ?.scrollIntoView({ block: SEARCH_SCROLL_BLOCK, behavior: 'smooth' });

    }, 80);



    return () => {

      window.clearTimeout(scrollTimer);

    };

  }, [
    highlightedHistoryRecordId,
    searchTargetScrollKey,
    isHistoryOpen,
    historyPanelView,
    filteredHistory.length,
    selectedAccount,
    selectedAccountEntry,
    expandedDetailDates
  ]);



  useEffect(() => {

    if (!highlightedBackupRecordId || !isHistoryOpen || historyPanelView !== 'backup') {

      return;

    }



    const scrollTimer = window.setTimeout(() => {

      document

        .getElementById(`backup-record-${highlightedBackupRecordId}`)

        ?.scrollIntoView({ block: SEARCH_SCROLL_BLOCK, behavior: 'smooth' });

    }, 80);



    return () => {

      window.clearTimeout(scrollTimer);

    };

  }, [
    highlightedBackupRecordId,
    searchTargetScrollKey,
    isHistoryOpen,
    historyPanelView,
    backupRecords.length
  ]);



  useEffect(() => {

    if (!isFlashNoteOpen || flashNoteStage !== 'input') {

      return;

    }



    const focusTimer = window.setTimeout(() => {

      flashSequenceInputRef.current?.focus();

    }, 0);



    return () => window.clearTimeout(focusTimer);

  }, [flashInputCursor, flashNoteStage, isFlashNoteOpen]);



  useEffect(() => {

    if (

      !isFlashNoteOpen ||

      flashNoteStage !== 'select' ||

      !flashActiveDateRule ||

      !flashStartDate ||

      flashEndDate

    ) {

      return;

    }



    applyFlashDateRule(flashActiveDateRule);

  }, [flashVisibleMonth]);



  useEffect(() => {

    if (!flashEditingDate) {

      return;

    }



    const focusTimer = window.setTimeout(() => {

      flashEditInputRef.current?.focus();

      flashEditInputRef.current?.select();

    }, 0);



    return () => window.clearTimeout(focusTimer);

  }, [flashEditingDate]);



  useEffect(() => {

    if (!isFlashNoteOpen) {

      return;

    }



    const handleFlashKeyDown = (event: globalThis.KeyboardEvent) => {

      if (event.defaultPrevented) {

        return;

      }



      if (flashNoteStage === 'sequence-input') {

        if (event.key === 'Enter' || event.key === 'Tab') {

          event.preventDefault();

          commitFlashSequenceInput();

          return;

        }



        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {

          event.preventDefault();

          undoFlashSequenceInput();

          return;

        }

      }



      if (flashNoteStage === 'correction' && event.key === 'Delete' && !flashEditingDate) {

        event.preventDefault();

        deleteSelectedFlashCells();

        return;

      }



      if (flashNoteStage !== 'date-select' && flashNoteStage !== 'correction') {

        return;

      }



      const arrowOffsets: Record<string, number> = {

        ArrowLeft: -1,

        ArrowRight: 1,

        ArrowUp: -7,

        ArrowDown: 7

      };

      const offset = arrowOffsets[event.key];



      if (offset === undefined) {

        return;

      }



      event.preventDefault();

      moveFlashKeyboardDate(offset);

    };



    document.addEventListener('keydown', handleFlashKeyDown);



    return () => {

      document.removeEventListener('keydown', handleFlashKeyDown);

    };

  }, [

    commitFlashSequenceInput,

    deleteSelectedFlashCells,

    flashEditingDate,

    flashNoteStage,

    isFlashNoteOpen,

    moveFlashKeyboardDate,

    undoFlashSequenceInput

  ]);



  useEffect(() => {

    const handleEscapeKeyDown = (event: globalThis.KeyboardEvent) => {

      if (event.key !== 'Escape') {

        return;

      }



      if (isSecretConsoleOpen) {

        event.preventDefault();

        event.stopPropagation();

        closeSecretConsole();

        return;

      }



      if (searchState.isOpen) {

        event.preventDefault();

        event.stopPropagation();



        const searchEscapeAction = getSearchEscapeAction(searchState);



        if (searchEscapeAction) {

          dispatchSearchState(searchEscapeAction);

          if (searchEscapeAction.type !== 'close-and-reset') {

            searchInputRef.current?.focus();

          }

        }



        return;

      }



      if (!currentLayerBack) {

        return;

      }



      const activeElement = document.activeElement;



      if (isTextEditingElement(activeElement)) {

        activeElement.blur();

        event.preventDefault();

        event.stopPropagation();

        return;

      }



      event.preventDefault();

      event.stopPropagation();

      currentLayerBack();

    };



    document.addEventListener('keydown', handleEscapeKeyDown);



    return () => {

      document.removeEventListener('keydown', handleEscapeKeyDown);

    };

  }, [

    isSecretConsoleOpen,

    currentLayerBack,

    searchState.categoryLockedByUser,

    searchState.isOpen,

    searchState.query,

    searchState.selectedCategory

  ]);



  const appShellBackProps = useOverlayBack<HTMLElement>(handleAppShellBack);
  const windowShellBackProps = useOverlayBack<HTMLDivElement>(handleAppShellBack);



  const renderRightPanelSection = (

    title: string | null,

    children: ReactNode,

    eyebrow: string | null = '操作区',

    className = '',

    titleAccessory: ReactNode = null

  ) => (

    <RightPanelSection
      title={title}
      eyebrow={eyebrow}
      className={className}
      titleAccessory={titleAccessory}
    >
      {children}
    </RightPanelSection>

  );



  const renderRightPanelPage = (

    title: string | null,

    children: ReactNode,

    eyebrow: string | null = null,

    className = '',

    titleAccessory: ReactNode = null

  ) => (

    <section className={`right-panel-page${className ? ` ${className}` : ''}`}>

      {eyebrow ? <p className="eyebrow right-panel-eyebrow">{eyebrow}</p> : null}

      {title || titleAccessory ? (

        <div className="right-panel-title-row">

          {title ? <h2 className="right-panel-title">{title}</h2> : <span />}

          {titleAccessory}

        </div>

      ) : null}

      <div className="right-panel-stack">{children}</div>

    </section>

  );



  const renderRightPanelActionButton = (props: RightPanelActionButtonProps) => (
    <RightPanelActionButton {...props} />
  );



  const renderSnapshotSummary = () => (

    <div className="right-panel-facts">

      {[

        {
          label: '上次快照',
          value:
            backupRecords.length === 0
              ? '从未备份'
              : formatRelativeBackupTime(backupRecords[0].backedUpAt)
        },

        { label: '账户数量', value: `${accountCount}` },

        { label: '历史记录', value: `${history.length}` },

        { label: '增量记录', value: incrementalRecordValue }

      ].map((item) => (

        <div key={item.label}>

          <span>{item.label}</span>

          <strong>{item.value}</strong>

        </div>

      ))}

    </div>

  );



  const renderAutoBackupControls = () => {

    const controls = (

      <div className="right-panel-form-grid">

        <div

          className="segmented-control right-panel-segmented"

          aria-label="自动快照开关"

          style={getSegmentedControlStyle(2)}

        >

        {[

          { value: true, label: '开启' },

          { value: false, label: '关闭' }

        ].map((option) => (

          <button

            key={option.label}

            type="button"

            onClick={() => updateAutoBackupEnabled(option.value)}

            className={autoBackupDraft.enabled === option.value ? 'is-selected' : undefined}

          >

            {option.label}

          </button>

        ))}

      </div>



      <div

        aria-disabled={!autoBackupDraft.enabled}

        className="right-panel-form-grid"

        style={{

          opacity: autoBackupDraft.enabled ? 1 : 0.45,

          pointerEvents: autoBackupDraft.enabled ? 'auto' : 'none'

        }}

      >

        <label className="right-panel-label">

          自动快照周期

          <div

            className="stepper-input"

            onWheel={(event) => {

              event.preventDefault();

              event.stopPropagation();



              if (event.deltaY === 0) {

                return;

              }



              adjustAutoBackupCycleValue(event.deltaY > 0 ? -1 : 1);

            }}

          >

            <input

              ref={autoSnapshotCycleInputRef}

              type="text"

              inputMode="numeric"

              disabled={!autoBackupDraft.enabled}

              value={autoBackupCycleValueInput}

              onChange={(event) => updateAutoBackupCycleValue(event.target.value)}

              onBlur={() => {

                if (!autoBackupCycleValueInput) {

                  setAutoBackupCycleValueInput(String(autoBackupDraft.cycle.value));

                }

              }}

              onWheel={(event) => {

                event.preventDefault();

                event.stopPropagation();



                if (event.deltaY === 0) {

                  return;

                }



                adjustAutoBackupCycleValue(event.deltaY > 0 ? -1 : 1);

              }}

            />

            <div className="stepper-input__controls">

              {[

                { label: '增加自动快照周期', direction: 1 as const, path: 'M7 14l5-5 5 5' },

                { label: '减少自动快照周期', direction: -1 as const, path: 'M7 10l5 5 5-5' }

              ].map((control) => (

                <button

                  key={control.label}

                  type="button"

                  aria-label={control.label}

                  disabled={!autoBackupDraft.enabled}

                  onMouseDown={(event) => event.preventDefault()}

                  onClick={() => adjustAutoBackupCycleValue(control.direction)}

                  style={{

                    borderTop:

                      control.direction === -1

                        ? '1px solid var(--border-soft)'

                        : 0

                  }}

                >

                  <svg

                    aria-hidden="true"

                    viewBox="0 0 24 24"

                    fill="none"

                    style={{ width: 12, height: 12 }}

                  >

                    <path

                      d={control.path}

                      stroke="currentColor"

                      strokeWidth="2"

                      strokeLinecap="round"

                      strokeLinejoin="round"

                    />

                  </svg>

                </button>

              ))}

            </div>

          </div>

        </label>



        <div className="right-panel-form-grid">

          <span className="right-panel-label-text">单位</span>

          <div

            className="segmented-control right-panel-segmented"

            style={getSegmentedControlStyle(3)}

          >

            {[

              { value: 'day', label: '日' },

              { value: 'week', label: '周' },

              { value: 'month', label: '月' }

            ].map((option) => (

              <button

                key={option.value}

                type="button"

                disabled={!autoBackupDraft.enabled}

                onClick={() =>

                  updateAutoBackupCycleUnit(option.value as BackupCycleUnit)

                }

                className={

                  autoBackupDraft.cycle.unit === option.value ? 'is-selected' : undefined

                }

              >

                {option.label}

              </button>

            ))}

          </div>

        </div>



        <div className="right-panel-form-grid">

          <span className="right-panel-label-text">导出目录</span>

          <div className="right-panel-path-row">

            <div title={autoBackupDraft.directory || '未选择目录'}>

              {autoBackupDraft.directory || '未选择目录'}

            </div>

            <button

              type="button"

              disabled={!autoBackupDraft.enabled}

              onClick={selectAutoBackupDirectory}

            >

              选择

            </button>

          </div>

        </div>

      </div>



      {hasAutoBackupDraftChanges ? (

        <button

          type="button"

          className="right-panel-primary-button"

          disabled={!canSaveAutoBackupSettings}

          onClick={saveAutoBackupDraft}

        >

          保存自动快照设置

        </button>

      ) : null}

    </div>

    );



    return controls;

  };



  const renderSearchPreview = () => (
    <SearchPreviewPanel
      hasQuery={searchOutput.hasQuery}
      focusedResult={focusedSearchResult}
      sortedHistory={sortedHistory}
      onOpenResult={handleSearchResultOpen}
      onCloseSearch={closeSearch}
      formatMoney={formatMoney}
      formatShortTime={formatShortTime}
      getAmountChange={getAmountChange}
      getAccountNatureLabel={getAccountNatureLabel}
    />
  );



  const renderAccountActions = () => {

    if (!selectedAccount || !selectedAccountEntry) {

      return null;

    }



    return (
      <AccountActionsPanel
        isArchived={selectedAccountIsArchived}
        onEditBalance={() => openEditor(selectedAccount.groupName, selectedAccountEntry, 'set')}
        onEditAccount={() => openAccountInfoEditor(selectedAccount.groupName, selectedAccountEntry)}
        onRestoreAccount={
          selectedAccountIsArchived
            ? () => restoreAccount(selectedAccount.groupName, selectedAccountEntry)
            : undefined
        }
        onOpenDangerActions={openDangerActions}
        onBack={() => currentLayerBack?.()}
      />
    );

  };



  const renderAccountChartSettingsActions = () => {

    if (!selectedAccountEntry) {

      return null;

    }



    const isLockedByGlobal = assetChartSettings.globalChartControlMode === 'locked';

    return (
      <AccountChartSettingsPanel
        isLockedByGlobal={isLockedByGlobal}
        settings={selectedAccountChartSettings}
        onUpdateSettings={(updater) =>
          updateLocalAccountDetailChartSettings(selectedAccountEntry.id, (currentSettings) =>
            updater(currentSettings) as AccountDetailChartSettings
          )
        }
        onBackToAccountDetail={closeAccountChartsPage}
        renderSegmentedControl={renderChartSegmentedControl}
      />
    );

  };



  const renderDangerActions = () => {

    if (!selectedAccount || !selectedAccountEntry) {

      return null;

    }



    return (
      <AccountDangerActionsPanel
        isArchived={selectedAccountIsArchived}
        onArchiveAccount={() => archiveAccount(selectedAccount.groupName, selectedAccountEntry)}
        onDeleteAccount={() => deleteAccount(selectedAccount.groupName, selectedAccountEntry)}
        onBackToAccountDetail={closeDangerActions}
      />
    );

  };



  const renderHistoryActions = () =>

    renderRightPanelPage(

      '历史',

      <>

        {renderRightPanelActionButton({

          label: '快照',

          tone: 'primary',

          onClick: openBackupPanel

        })}

        {renderRightPanelActionButton({

          label: '关闭历史记录',

          onClick: () => currentLayerBack?.()

        })}

      </>,

      null

    );



  const renderSnapshotActions = () => (

    <section className="right-panel-page right-panel-page--snapshot">

      <div className="right-panel-stack right-panel-stack--snapshot">

        <section className="right-panel-subsection">

          <h2>手动快照</h2>

          {renderSnapshotSummary()}

          {renderRightPanelActionButton({

            label: '导出快照',

            tone: 'primary',

            onClick: exportBackup

          })}

          {renderRightPanelActionButton({

            label: '导入快照',

            onClick: () => backupFileInputRef.current?.click()

          })}

        </section>



        <section
          className={`right-panel-subsection${
            isExampleMode ? ' example-mode-disabled-panel right-panel-subsection--auto-snapshot-disabled' : ''
          }`}
          aria-disabled={isExampleMode ? 'true' : undefined}
        >

          <h2>自动快照</h2>

          {renderAutoBackupControls()}

          {isExampleMode ? (
            <div className="example-mode-disabled-panel__banner">示例模式下不可用</div>
          ) : null}

        </section>



        {renderRightPanelActionButton({

          label:

            backupReturnTarget === 'global-settings-backup' ? '返回数据与备份' : '返回历史记录',

          onClick: () => currentLayerBack?.()

        })}

      </div>

    </section>

  );

  const renderArchivedActions = () =>

    renderRightPanelPage(

      '已归档账户',

      <>

        <article className="right-panel-preview">

          <span>归档列表</span>

          <strong>{archivedAccounts.length} 个账户</strong>

          <p>在左侧选择账户后，右侧会切换到账户恢复或删除操作。</p>

        </article>

        {renderRightPanelActionButton({

          label: '返回资产总览',

          onClick: () => setIsArchivedAccountsOpen(false)

        })}

      </>,

      '归档'

    );



  const renderChartSegmentedControl = (

    label: string,

    options: Array<{ value: string; label: string }>,

    currentValue: string,

    onSelect: (value: string) => void,

    disabled = false,

    note?: ReactNode

  ) => (

    <div className={`right-panel-form-grid${disabled ? ' is-chart-control-locked' : ''}`}>

      <span className="right-panel-label-text">{label}</span>

      <div

        className="segmented-control right-panel-segmented"

        style={getSegmentedControlStyle(options.length)}

        aria-disabled={disabled ? 'true' : undefined}

      >

        {options.map((option) => (

          <button

            key={option.value}

            type="button"

            disabled={disabled}

            onClick={() => {

              if (!disabled) {

                onSelect(option.value);

              }

            }}

            className={currentValue === option.value ? 'is-selected' : undefined}

          >

            {option.label}

          </button>

        ))}

      </div>

      {note ? <p className="right-panel-note">{note}</p> : null}

    </div>

  );



  const renderChartSettingsActions = () => {

    const isLockedByGlobal = assetChartSettings.globalChartControlMode === 'locked';



    return (

      <ChartSettingsPanel

        isLockedByGlobal={isLockedByGlobal}

        settings={assetChartSettings}

        onUpdateSettings={(updater) =>

          updateAssetChartSettings((currentSettings) =>

            updater(currentSettings as TotalAssetChartSettings) as AssetChartSettings

          )

        }

        onBackToOverview={closeTotalChartsPage}

        renderSegmentedControl={renderChartSegmentedControl}

      />

    );

  };



  const renderGroupDetailActions = () => {

    if (!selectedGroupDetail) {

      return null;

    }



    const isLockedByGlobal = assetChartSettings.globalChartControlMode === 'locked';

    return (

      <>

        {renderRightPanelSection(

          '账户类型信息',

          <>

            <label className="right-panel-label">

              账户类型

              <input

                type="text"

                value={groupDetailNameDraft}

                onChange={(event) => {

                  setGroupDetailNameDraft(event.target.value);

                  setGroupDetailError('');

                }}

              />

            </label>

            {renderChartSegmentedControl(

              '类型属性',

              accountTypeNatureOptions.map((option) => ({

                value: option.value,

                label: option.label

              })),

              groupDetailNatureDraft,

              (value) => {

                setGroupDetailNatureDraft(value as AccountTypeNature);

                setGroupDetailError('');

              }

            )}

            {renderChartSegmentedControl(

              '参与统计',

              [

                { value: 'yes', label: '是' },

                { value: 'no', label: '否' }

              ],

              groupDetailStatsDraft ? 'yes' : 'no',

              (value) => {

                setGroupDetailStatsDraft(value === 'yes');

                setGroupDetailError('');

              }

            )}

            {groupDetailError ? (

              <p className="right-panel-note" style={{ color: 'var(--danger-text)' }}>

                {groupDetailError}

              </p>

            ) : null}

            {renderRightPanelActionButton({

              label: '保存信息',

              className: 'right-panel-action--save',

              onClick: saveGroupDetailInfo

            })}

          </>,

          null

        )}



        <RightPanelSection
          title="图表参数设置"
          eyebrow={null}
          contentClassName={isLockedByGlobal ? 'example-mode-disabled-panel chart-settings-locked-panel' : ''}
          contentOverlay={
            isLockedByGlobal ? (
              <div className="example-mode-disabled-panel__banner">由全局图表设置锁定</div>
            ) : null
          }
          ariaDisabled={isLockedByGlobal}
        >

            {renderChartSegmentedControl(

              '横轴范围显示',

              [

                { value: '1m', label: '近 1 月' },

                { value: '3m', label: '近 3 月' },

                { value: '6m', label: '近 6 月' },

                { value: '1y', label: '近 1 年' }

              ],

              selectedGroupDetailChartSettings.xAxisRange,

              (value) =>

                updateLocalCategoryDetailChartSettings(

                  selectedGroupDetail.name,

                  (currentSettings) => ({

                    ...currentSettings,

                    xAxisRange: value as TrendXAxisRange

                  })

                ),

              isLockedByGlobal

            )}

            {renderChartSegmentedControl(

              '点值显示',

              [

                { value: 'adaptive', label: '自适应' },

                { value: 'minmax', label: '最高最低' },

                { value: 'none', label: '不显示' }

              ],

              selectedGroupDetailChartSettings.pointValueMode,

              (value) =>

                updateLocalCategoryDetailChartSettings(

                  selectedGroupDetail.name,

                  (currentSettings) => ({

                    ...currentSettings,

                    pointValueMode: value as TrendPointValueMode

                  })

                ),

              isLockedByGlobal

            )}

        </RightPanelSection>

        {renderRightPanelActionButton({
          label: '返回资产总览',
          className: 'right-panel-page-action',
          onClick: closeGroupDetailPage
        })}

      </>

    );

  };



  const renderGlobalSettingsSegmented = (

    label: string,

    options: Array<{ value: string; label: string }>,

    currentValue: string,

    note?: ReactNode,

    onChange?: (value: string) => void,

    statusLabel?: ReactNode | null,

    fieldClassName = ''

  ) => {

    const isEnabled = Boolean(onChange);

    const resolvedStatusLabel =

      statusLabel === undefined ? (isEnabled ? null : '稍后开放') : statusLabel;



    return (

      <section

        className={`global-settings-field${fieldClassName ? ` ${fieldClassName}` : ''}`}

      >

        <div className="global-settings-field__header">

          <h3>{label}</h3>

          {resolvedStatusLabel ? <span>{resolvedStatusLabel}</span> : null}

        </div>

        <div

          className="segmented-control global-settings-segmented"

          style={getSegmentedControlStyle(options.length)}

          aria-label={label}

          aria-disabled={isEnabled ? undefined : 'true'}

        >

          {options.map((option) => (

            <button

              key={option.value}

              type="button"

              disabled={!isEnabled}

              className={currentValue === option.value ? 'is-selected' : undefined}

              onClick={() => onChange?.(option.value)}

            >

              {option.label}

            </button>

          ))}

        </div>

        {note ? <p className="global-settings-note">{note}</p> : null}

      </section>

    );

  };



  const renderGlobalSettingsControl = (

    label: string,

    options: Array<{ value: string; label: string }>,

    currentValue: string,

    onChange: (value: string) => void

  ) => (

    <div className="global-settings-control-row">

      <span className="global-settings-control-label">{label}</span>

      <div

        className="segmented-control global-settings-segmented"

        style={getSegmentedControlStyle(options.length)}

        aria-label={label}

      >

        {options.map((option) => (

          <button

            key={option.value}

            type="button"

            className={currentValue === option.value ? 'is-selected' : undefined}

            onClick={() => onChange(option.value)}

          >

            {option.label}

          </button>

        ))}

      </div>

    </div>

  );



  const renderGlobalSettingsActionControl = (label: string, children: ReactNode) => (

    <div className="global-settings-control-row">

      <span className="global-settings-control-label">{label}</span>

      <div className="global-settings-action-cell">{children}</div>

    </div>

  );



  const renderGlobalSettingsFieldGroup = (

    title: string,

    children: ReactNode,

    note?: ReactNode

  ) => (

    <section className="global-settings-field global-settings-field--chart-group">

      <div className="global-settings-field__header">

        <h3>{title}</h3>

      </div>

      <div className="global-settings-control-stack">{children}</div>

      {note ? <p className="global-settings-note">{note}</p> : null}

    </section>

  );



  const renderSecuritySettingsContentInner = () => (

    <>

      {renderGlobalSettingsFieldGroup(

        '登陆密码保护',

        <>

          {renderGlobalSettingsControl(

            '是否开启登陆密码保护',

            [

              { value: 'yes', label: '是' },

              { value: 'no', label: '否' }

            ],

            globalSettings.passwordProtectionEnabled ? 'yes' : 'no',

            updatePasswordProtection

          )}

          {renderGlobalSettingsActionControl(

            '设置登录密码',

            <button

              type="button"

              className="global-settings-reserved-button"

              onClick={requestOpenPasswordEditor}

            >

              {globalSettings.passwordHash ? '修改登录密码' : '设置登录密码'}

            </button>

          )}

          {renderGlobalSettingsActionControl(

            '自动锁定时间',

            <label className="global-settings-inline-input">

              <input

                type="text"

                inputMode="numeric"

                pattern="[0-9]*"

                value={autoLockMinutesInput}

                onChange={(event) => updateAutoLockMinutesInput(event.target.value)}

                onBlur={resetInvalidAutoLockMinutesInput}

              />

              <span>分钟</span>

            </label>

          )}

          {!globalSettings.passwordProtectionEnabled ? (

            <p className="global-settings-note">开启密码保护后生效</p>

          ) : null}

        </>

      )}

      {renderGlobalSettingsFieldGroup(

        '快照加密',

        <>

          {renderGlobalSettingsControl(

            '是否启用快照加密',

            [

              { value: 'yes', label: '是' },

              { value: 'no', label: '否' }

            ],

            globalSettings.snapshotEncryptionEnabled ? 'yes' : 'no',

            updateSnapshotEncryption

          )}

          {renderGlobalSettingsActionControl(

            '设置快照密码',

            <button

              type="button"

              className="global-settings-reserved-button"

              onClick={requestOpenSnapshotPasswordEditor}

            >

              {globalSettings.snapshotPasswordHash ? '修改快照密码' : '设置快照密码'}

            </button>

          )}

        </>,

        '仅加密手动导出和自动生成的快照文件，不加密本地当前数据。'

      )}

    </>

  );



  const renderSecuritySettingsContent = () => renderSecuritySettingsContentInner();



  const renderPasswordEditor = () => {

    if (!passwordEditorMode) {

      return null;

    }

    return (
      <PasswordEditorDialog
        mode={passwordEditorMode}
        oldPassword={oldPasswordInput}
        newPassword={newPasswordInput}
        confirmPassword={confirmPasswordInput}
        error={passwordEditorError}
        isSaving={isSavingPassword}
        onOldPasswordChange={(value) => {
          setOldPasswordInput(value);
          setPasswordEditorError('');
        }}
        onNewPasswordChange={(value) => {
          setNewPasswordInput(value);
          setPasswordEditorError('');
        }}
        onConfirmPasswordChange={(value) => {
          setConfirmPasswordInput(value);
          setPasswordEditorError('');
        }}
        onSubmit={saveLoginPassword}
        onCancel={resetPasswordEditor}
      />
    );

  };



  const renderSnapshotPasswordEditor = () => {

    if (!snapshotPasswordEditorMode) {

      return null;

    }

    return (
      <SnapshotPasswordEditorDialog
        mode={snapshotPasswordEditorMode}
        oldPassword={oldSnapshotPasswordInput}
        newPassword={newSnapshotPasswordInput}
        confirmPassword={confirmSnapshotPasswordInput}
        visibleField={visibleSnapshotPasswordField}
        error={snapshotPasswordEditorError}
        isSaving={isSavingSnapshotPassword}
        onOldPasswordChange={(value) => {
          setOldSnapshotPasswordInput(value);
          setSnapshotPasswordEditorError('');
        }}
        onNewPasswordChange={(value) => {
          setNewSnapshotPasswordInput(value);
          setSnapshotPasswordEditorError('');
        }}
        onConfirmPasswordChange={(value) => {
          setConfirmSnapshotPasswordInput(value);
          setSnapshotPasswordEditorError('');
        }}
        onToggleVisibility={toggleSnapshotPasswordVisibility}
        onSubmit={saveSnapshotPassword}
        onCancel={resetSnapshotPasswordEditor}
      />
    );

  };



  const renderGlobalSettingsContent = () => {

    if (globalSettingsSection === 'appearance') {

      return (

        <AppearanceSettingsPanel
          positiveNegativeColorMode={globalSettings.positiveNegativeColorMode}
          homeAssetStatMetric={globalSettings.homeAssetStatMetric}
          homeAssetStatLabelMode={globalSettings.homeAssetStatLabelMode}
          homeAssetStatCompact={globalSettings.homeAssetStatCompact}
          themeMode={globalSettings.themeMode}
          themeStyle={globalSettings.themeStyle}
          nyaaThemeUnlocked={globalSettings.nyaaThemeUnlocked}
          pagePositionMemoryMode={globalSettings.pagePositionMemoryMode}
          onPositiveNegativeColorModeChange={updatePositiveNegativeColorMode}
          onHomeAssetStatMetricChange={updateHomeAssetStatMetric}
          onHomeAssetStatLabelModeChange={updateHomeAssetStatLabelMode}
          onHomeAssetStatCompactChange={updateHomeAssetStatCompact}
          onThemeModeChange={updateThemeMode}
          onThemeStyleChange={updateThemeStyle}
          onPagePositionMemoryModeChange={updatePagePositionMemoryMode}
        />

      );

    }



    if (globalSettingsSection === 'charts') {

      return (

        <>

          {renderGlobalSettingsSegmented(

            '图表配色遵循',

            [

              { value: 'createdAt', label: '创建时间优先（固定）' },

              { value: 'share', label: '占比优先（动态）' }

            ],

            globalSettings.chartColorAssignmentMode,

            undefined,

            updateChartColorAssignmentMode,

            null

          )}

          {renderGlobalSettingsFieldGroup(

            '首页缩略图表',

            <>

              {renderGlobalSettingsControl(

                '资产结构显示',

                [

                  { value: 'on', label: '开' },

                  { value: 'off', label: '关' }

                ],

                assetChartSettings.l0.showStructure ? 'on' : 'off',

                (value) =>

                  updateHomeThumbnailChartSettings((currentSettings) => ({

                    ...currentSettings,

                    showStructure: value === 'on'

                  }))

              )}

              {renderGlobalSettingsControl(

                '资产趋势显示',

                [

                  { value: 'on', label: '开' },

                  { value: 'off', label: '关' }

                ],

                assetChartSettings.l0.showTrend ? 'on' : 'off',

                (value) =>

                  updateHomeThumbnailChartSettings((currentSettings) => ({

                    ...currentSettings,

                    showTrend: value === 'on'

                  }))

              )}

              {renderGlobalSettingsControl(

                '横轴范围显示',

                [

                  { value: '1m', label: '近 1 月' },

                  { value: '3m', label: '近 3 月' },

                  { value: '6m', label: '近 6 月' },

                  { value: '1y', label: '近 1 年' }

                ],

                assetChartSettings.l0.xAxisRange,

                (value) =>

                  updateHomeThumbnailChartSettings((currentSettings) => ({

                    ...currentSettings,

                    xAxisRange: value as TrendXAxisRange

                  }))

              )}

            </>

          )}

          {renderGlobalSettingsFieldGroup(

            '全局图表控制',

            <>

              {renderGlobalSettingsControl(

                '控制模式',

                [

                  { value: 'peer', label: '平级设定' },

                  { value: 'locked', label: '全局锁定' }

                ],

                assetChartSettings.globalChartControlMode,

                updateGlobalChartControlMode

              )}

            </>

          )}

          {renderGlobalSettingsFieldGroup(

            '总资产图表设置',

            <>

              {renderGlobalSettingsControl(

                '资产结构显示',

                [

                  { value: 'positive', label: '正资产' },

                  { value: 'negative', label: '负资产' },

                  { value: 'both', label: '正负资产' }

                ],

                assetChartSettings.structure.assetDisplay,

                (value) =>

                  updateAssetChartSettings((currentSettings) => ({

                    ...currentSettings,

                    structure: {

                      ...currentSettings.structure,

                      assetDisplay: value as StructureAssetDisplay

                    }

                  }))

              )}

              {renderGlobalSettingsControl(

                '多重叠加数字',

                [

                  { value: 'yes', label: '是' },

                  { value: 'no', label: '否' }

                ],

                assetChartSettings.structure.showDebtMultiple ? 'yes' : 'no',

                (value) =>

                  updateAssetChartSettings((currentSettings) => ({

                    ...currentSettings,

                    structure: {

                      ...currentSettings.structure,

                      showDebtMultiple: value === 'yes'

                    }

                  }))

              )}

              <div className="global-settings-divider" aria-hidden="true" />

              {renderGlobalSettingsControl(

                '资产趋势显示',

                [

                  { value: 'net', label: '净资产' },

                  { value: 'positive', label: '正资产' },

                  { value: 'positive-negative', label: '正负资产' }

                ],

                assetChartSettings.trend.assetDisplay,

                (value) =>

                  updateAssetChartSettings((currentSettings) => ({

                    ...currentSettings,

                    trend: {

                      ...currentSettings.trend,

                      assetDisplay: value as TrendAssetDisplay

                    }

                  }))

              )}

              {renderGlobalSettingsControl(

                '自适应纵轴',

                [

                  { value: 'on', label: '开' },

                  { value: 'off', label: '关' }

                ],

                assetChartSettings.trend.adaptiveYAxis ? 'on' : 'off',

                (value) =>

                  updateAssetChartSettings((currentSettings) => ({

                    ...currentSettings,

                    trend: {

                      ...currentSettings.trend,

                      adaptiveYAxis: value === 'on'

                    }

                  }))

              )}

              {renderGlobalSettingsControl(

                '横轴范围显示',

                [

                  { value: '1m', label: '近 1 月' },

                  { value: '3m', label: '近 3 月' },

                  { value: '6m', label: '近 6 月' },

                  { value: '1y', label: '近 1 年' }

                ],

                assetChartSettings.trend.xAxisRange,

                (value) =>

                  updateAssetChartSettings((currentSettings) => ({

                    ...currentSettings,

                    trend: {

                      ...currentSettings.trend,

                      xAxisRange: value as TrendXAxisRange

                    }

                  }))

              )}

              {renderGlobalSettingsControl(

                '点值显示',

                [

                  { value: 'adaptive', label: '自适应' },

                  { value: 'minmax', label: '最高最低' },

                  { value: 'none', label: '不显示' }

                ],

                assetChartSettings.trend.pointValueMode,

                (value) =>

                  updateAssetChartSettings((currentSettings) => ({

                    ...currentSettings,

                    trend: {

                      ...currentSettings.trend,

                      pointValueMode: value as TrendPointValueMode

                    }

                  }))

              )}

            </>

          )}

          {renderGlobalSettingsFieldGroup(

            '全局账户类型图表设置',

            <>

              {renderGlobalSettingsControl(

                '横轴范围显示',

                [

                  { value: '1m', label: '近 1 月' },

                  { value: '3m', label: '近 3 月' },

                  { value: '6m', label: '近 6 月' },

                  { value: '1y', label: '近 1 年' }

                ],

                assetChartSettings.globalCategoryDetail.xAxisRange,

                (value) =>

                  updateGlobalCategoryDetailChartSettings((currentSettings) => ({

                    ...currentSettings,

                    xAxisRange: value as TrendXAxisRange

                  }))

              )}

              {renderGlobalSettingsControl(

                '点值显示',

                [

                  { value: 'adaptive', label: '自适应' },

                  { value: 'minmax', label: '最高最低' },

                  { value: 'none', label: '不显示' }

                ],

                assetChartSettings.globalCategoryDetail.pointValueMode,

                (value) =>

                  updateGlobalCategoryDetailChartSettings((currentSettings) => ({

                    ...currentSettings,

                    pointValueMode: value as TrendPointValueMode

                  }))

              )}

            </>

          )}

        </>

      );

    }



    if (globalSettingsSection === 'search') {

      return (
        <SearchSettingsPanel
          searchLogicMode={globalSettings.searchLogicMode}
          onSearchLogicModeChange={updateSearchLogicMode}
        />
      );

    }



    if (globalSettingsSection === 'security') {

      return renderSecuritySettingsContent();

    }



    if (globalSettingsSection === 'backup') {

      return (

        <BackupSettingsPanel
          userSettingsFileInputRef={userSettingsFileInputRef}
          exampleTemplates={EXAMPLE_TEMPLATES}
          selectedExampleTemplateId={selectedExampleTemplateId}
          isExampleMode={isExampleMode}
          onImportUserSettings={importUserSettings}
          onExportUserSettings={exportUserSettings}
          onOpenUserSettingsFile={() => userSettingsFileInputRef.current?.click()}
          onOpenBackupPanel={openBackupPanelFromGlobalSettings}
          onSelectExampleTemplate={setSelectedExampleTemplateId}
          onEnterOrSwitchExampleMode={isExampleMode ? switchExampleTemplate : enterExampleMode}
          onExitExampleMode={exitExampleMode}
          onOpenResetConfirmation={openResetConfirmation}
        />

      );

    }



    return (

      <AboutNetraFlowPanel
        appVersion={window.appInfo?.version ?? APP_VERSION}
        productIconPath={PRODUCT_ICON_PATH}
        productNameZh={PRODUCT_NAME_ZH}
        productNameEn={PRODUCT_NAME_EN}
        isCatPetted={isCatPetted}
        onOpenBilibili={openBilibiliProfile}
        onOpenGithubReleases={openGithubReleases}
        onTriggerEasterEgg={petNyaaCat}
        onStartVersionLongPress={startAboutVersionLongPress}
        onClearVersionLongPress={clearSecretConsoleLongPress}
      />

    );

  };



  const renderGlobalSettingsPage = () => {

    const selectedSection =

      GLOBAL_SETTINGS_NAV_ITEMS.find((item) => item.id === globalSettingsSection) ??

      GLOBAL_SETTINGS_NAV_ITEMS[0];



    return (

      <div
        className="global-settings-page"
      >

        <header className="global-settings-header">

          <h1>{selectedSection.label}</h1>

        </header>

        <div className="global-settings-content">{renderGlobalSettingsContent()}</div>
      </div>

    );

  };



  const renderGlobalSettingsNavigation = () =>

    renderRightPanelPage(

      '全局设置',

      <nav className="global-settings-nav" aria-label="全局设置功能导航">

        {GLOBAL_SETTINGS_NAV_ITEMS.map((item) => (

          <button

            key={item.id}

            type="button"

            className={`right-panel-action global-settings-nav__item${

              globalSettingsSection === item.id ? ' is-selected' : ''

            }`}

            aria-current={globalSettingsSection === item.id ? 'page' : undefined}

            onClick={() => setGlobalSettingsSection(item.id)}

          >

            <strong>{item.label}</strong>

          </button>

        ))}

        <button

          type="button"

          className="right-panel-action global-settings-nav__item global-settings-nav__return"

          onClick={closeGlobalSettings}

        >

          <strong>返回资产总览</strong>

        </button>

      </nav>,

      null

    );



  const getRollupRiskLabel = (riskLevel: RollupRiskLevel, lowRiskKind = 'normalized') => {

    if (riskLevel === 'high') {

      return '高风险';

    }



    if (riskLevel === 'medium') {

      return '中风险';

    }



    return lowRiskKind === 'strict' ? '低风险 · 本地未发现明显问题' : '低风险 · 已本地修正';

  };



  const formatRollupSignedAmount = (record: RollupImportRecord) => {

    const formattedAmount = formatHistoryAmount(Math.abs(record.amount));



    if (record.mode === 'balance') {

      return formattedAmount;

    }



    if (record.amount > 0) {

      return `+${formattedAmount}`;

    }



    if (record.amount < 0) {

      return `-${formattedAmount}`;

    }



    return '0';

  };



  const normalizeRollupMatchText = (value: string) =>

    normalizeAccountName(value).replace(/\s+/g, '');



  const getRollupAccountMatches = (keyword: string) => {

    const normalizedKeyword = normalizeRollupMatchText(keyword);



    if (!normalizedKeyword) {

      return [];

    }



    return rollupActiveAccountOptions

      .map((option, index) => {

        const normalizedName = normalizeRollupMatchText(option.account.name);

        const normalizedAlias = normalizeRollupMatchText(option.account.alias ?? '');

        const score =

          normalizedName === normalizedKeyword || normalizedAlias === normalizedKeyword

            ? 100

            : normalizedName.includes(normalizedKeyword) ||

                Boolean(normalizedAlias && normalizedAlias.includes(normalizedKeyword))

              ? 86

              : normalizedKeyword.includes(normalizedName) && normalizedName.length >= 2

                ? 78

                : 0;



        return { ...option, index, score };

      })

      .filter((option) => option.score >= 72)

      .sort((left, right) => right.score - left.score || left.index - right.index)

      .slice(0, 4);

  };



  const renderRollupImportPage = () => (
    <RollupImportPage
      mode={rollupImportReview ? 'review' : 'prompt'}
      promptTab={rollupPromptTab}
      promptExplanation={ROLLUP_IMPORT_EXPLANATION}
      promptContent={ROLLUP_IMPORT_PROMPT}
      onPromptTabChange={setRollupPromptTab}
      review={rollupImportReview}
      recordGroups={rollupRecordGroups}
      accountGroups={groupTotals}
      accountAssignments={rollupAccountAssignments}
      getAccountMatches={getRollupAccountMatches}
      getRiskLabel={getRollupRiskLabel}
      formatRecordAmount={formatRollupSignedAmount}
      onSelectAccount={selectRollupAccount}
      onCreateAccount={openRollupNewAccount}
    />

  );



  const renderRollupImportActions = () => {

    if (rollupImportReview) {

      return renderRightPanelPage(

        '本次导入',

        <>

          <RollupReviewActionsPanel
            confirmedAccountCount={rollupConfirmedAccountCount}
            accountGroupCount={rollupAccountGroupKeys.length}
            recordCount={rollupImportReview.records.length}
            hasBlockingIssues={rollupImportReview.hasBlockingIssues}
            canConfirm={isRollupImportReady}
            onDiscardImport={discardRollupImportReview}
            onConfirmImport={confirmRollupImportWrite}
            onClose={closeRollupImport}
          />

        </>,

        null,

        'right-panel-page--rollup-import-actions'

      );

    }



    return renderRightPanelPage(

      '汇总导入',

      <>

        {renderRightPanelActionButton({

          label: '复制提示词',

          tone: 'primary',

          onClick: copyRollupPrompt

        })}
        <RollupImportDropzone
          inputValue={rollupPasteText}
          error={rollupImportError}
          onInputChange={(value) => {
            setRollupPasteText(value);
            setRollupImportError('');
          }}
          onImportText={importRollupPastedJson}
          onSelectFile={() => rollupFileInputRef.current?.click()}
        />

        {renderRightPanelActionButton({

          label: '返回资产总览',

          onClick: closeRollupImport,

          className: 'rollup-import-return-action'

        })}

      </>,

      null,

      'right-panel-page--rollup-import-actions'

    );

  };



  const renderHomeActions = () =>

    renderRightPanelPage(

      '下一步',

      <>

        {renderRightPanelActionButton({

          label: '记一笔',

          onClick: openQuickSingleEntry

        })}

        <button

          type="button"

          className="right-panel-action flash-note-entry-action"

          onClick={openFlashNote}

        >

          <strong>闪记</strong>

          <span className="home-action-entry__icon">{renderFlashLightningIcon()}</span>

        </button>

        <button

          type="button"

          className="right-panel-action rollup-import-entry-action"

          onClick={openRollupImport}

        >

          <strong>汇总导入</strong>

          <span className="home-action-entry__icon">

            <NfSvgIcon

              svg={NfRollupSourceWideIcon}

              className="rollup-import-source-icon"

              title="汇总导入"

              decorative

            />

          </span>

        </button>

        {renderRightPanelActionButton({

          label: '全局搜索',

          onClick: openSearch

        })}

        {renderRightPanelActionButton({

          label: '账户新增 / 恢复',

          onClick: openAddAccount

        })}

        {renderRightPanelActionButton({

          label: '历史记录',

          onClick: openHistoryPanel

        })}

        {renderRightPanelActionButton({

          label: '全局设置',

          onClick: openGlobalSettings

        })}

      </>,

      null,

      '',

      isExampleMode ? <div className="home-example-mode-badge">示例模式</div> : null

    );



  const renderPasswordDisableConfirm = () =>

    isPasswordDisableConfirmOpen ? (

      <OverlayBackdrop onBack={closePasswordDisableConfirm} className="modal-backdrop">

        <form

          role="dialog"

          aria-modal="true"

          aria-labelledby="disable-password-protection-title"

          onClick={(event) => event.stopPropagation()}

          onSubmit={confirmDisablePasswordProtection}

          className="modal-card"

        >

          <p className="eyebrow" style={{ marginBottom: 8 }}>

            登录密码确认

          </p>

          <h2

            id="disable-password-protection-title"

            style={{ margin: '0 0 10px', fontSize: '1.26rem' }}

          >

            关闭密码保护

          </h2>

          <p style={{ margin: '0 0 14px', color: 'var(--text-muted)', fontSize: '0.94rem' }}>

            请输入当前登录密码

          </p>

          <label className="right-panel-label">

            登录密码

            <input

              autoFocus

              type="password"

              autoComplete="current-password"

              value={passwordDisableInput}

              onChange={(event) => {

                setPasswordDisableInput(event.target.value);

                setPasswordDisableError('');

              }}

            />

          </label>

          {passwordDisableError ? (

            <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.92rem' }}>

              {passwordDisableError}

            </p>

          ) : null}

          <div className="modal-actions">

            <button

              type="button"

              onClick={closePasswordDisableConfirm}

              className="modal-button modal-button--secondary"

            >

              取消

            </button>

            <button

              type="submit"

              disabled={isDisablingPasswordProtection}

              className="modal-button modal-button--primary"

            >

              {isDisablingPasswordProtection ? '验证中' : '确认关闭'}

            </button>

          </div>

        </form>

      </OverlayBackdrop>

    ) : null;



  const renderSnapshotEncryptionDisableConfirm = () =>

    isSnapshotEncryptionDisableConfirmOpen ? (
      <SnapshotEncryptionDisableDialog
        password={snapshotEncryptionDisableInput}
        error={snapshotEncryptionDisableError}
        isLoading={isDisablingSnapshotEncryption}
        onPasswordChange={(value) => {
          setSnapshotEncryptionDisableInput(value);
          setSnapshotEncryptionDisableError('');
        }}
        onSubmit={confirmDisableSnapshotEncryption}
        onCancel={closeSnapshotEncryptionDisableConfirm}
      />

    ) : null;



  const renderFirstWelcome = () => {

    if (firstWelcomeStage === 'welcome') {

      return (

        <OverlayBackdrop onBack={completeFirstWelcome} className="modal-backdrop">

          <section

            role="dialog"

            aria-modal="true"

            aria-labelledby="first-welcome-title"

            onClick={(event) => event.stopPropagation()}

            className="modal-card first-welcome-modal"

          >

            <h2 id="first-welcome-title" className="first-welcome-modal__message">

              Halo, 你好像是第一次来到净流，需要跟我一起看看吗？

            </h2>

            <div className="modal-actions first-welcome-modal__actions">

              <button

                type="button"

                onClick={openFirstWelcomeStory}

                className="modal-button modal-button--primary"

              >

                拉手~

              </button>

              <button

                type="button"

                onClick={completeFirstWelcome}

                className="modal-button modal-button--secondary"

              >

                不用啦

              </button>

            </div>

          </section>

        </OverlayBackdrop>

      );

    }



    if (firstWelcomeStage === 'story') {

      return (

        <OverlayBackdrop onBack={completeFirstWelcome} className="modal-backdrop">

          <section

            role="dialog"

            aria-modal="true"

            aria-labelledby="first-welcome-story-title"

            onClick={(event) => event.stopPropagation()}

            className="modal-card first-welcome-modal first-welcome-modal--story"

          >

            <div className="first-welcome-story-copy">

              <h2 id="first-welcome-story-title">

                ta轻轻拉住你的手，推开了净流的小门

              </h2>

              <p>然后</p>

            </div>

            <div className="first-welcome-story-grid">

              {FIRST_WELCOME_STORY_ROUTES.map((route) => (

                <button

                  key={route.templateId}

                  type="button"

                  className="first-welcome-story-card"

                  onClick={() => chooseFirstWelcomeStoryRoute(route.templateId)}

                >

                  <strong>{route.title}</strong>

                  <span>{route.description}</span>

                </button>

              ))}

            </div>

            <div className="modal-actions first-welcome-modal__actions">

              <button

                type="button"

                onClick={completeFirstWelcome}

                className="modal-button modal-button--secondary first-welcome-modal__quiet-button"

              >

                还是先不用啦

              </button>

            </div>

          </section>

        </OverlayBackdrop>

      );

    }



    return null;

  };



  const renderLockScreen = () =>

    isLocked ? (

      <div className="lock-screen" role="dialog" aria-modal="true" aria-labelledby="lock-title">

        <form className="lock-screen__panel" onSubmit={unlockApp}>

          <div className="lock-screen__brand">

            <img src={PRODUCT_ICON_PATH} alt="" aria-hidden="true" />

            <div>

              <p className="eyebrow">净流 / NetraFlow</p>

              <h2 id="lock-title">已锁定</h2>

            </div>

          </div>

          <label className="lock-screen__field">

            登录密码

            <input

              autoFocus

              type="password"

              autoComplete="current-password"

              value={unlockPasswordInput}

              onChange={(event) => {

                setUnlockPasswordInput(event.target.value);

                setUnlockError('');

              }}

            />

          </label>

          {unlockError ? <p className="lock-screen__error">{unlockError}</p> : null}

          <button type="submit" disabled={isUnlocking} className="lock-screen__button">

            {isUnlocking ? '解锁中' : '解锁'}

          </button>

        </form>

      </div>

    ) : null;



  const renderRightPanelContent = () => {

    if (searchState.isOpen) {

      return renderSearchPreview();

    }



    if (isRollupImportOpen) {

      return renderRollupImportActions();

    }



    if (isDangerActionsOpen && selectedAccount && selectedAccountEntry) {

      return renderDangerActions();

    }



    if (isAccountChartsOpen && selectedAccount && selectedAccountEntry) {

      return renderAccountChartSettingsActions();

    }



    if (selectedAccount && selectedAccountEntry) {

      return renderAccountActions();

    }



    if (isHistoryOpen && historyPanelView === 'backup') {

      return renderSnapshotActions();

    }



    if (isHistoryOpen) {

      return renderHistoryActions();

    }



    if (isArchivedAccountsOpen) {

      return renderArchivedActions();

    }



    if (isTotalChartsOpen) {

      return renderChartSettingsActions();

    }



    if (selectedGroupDetail) {

      return renderGroupDetailActions();

    }



    if (isGlobalSettingsOpen) {

      return renderGlobalSettingsNavigation();

    }



    return renderHomeActions();

  };



  const isSecuritySettingsPageDisabled =
    isGlobalSettingsOpen && globalSettingsSection === 'security' && isExampleMode;

  const mainPanelClassName = [
    isFlashNoteOpen ? 'flash-note-container left-browse-panel' : 'card left-browse-panel',
    isSecuritySettingsPageDisabled
      ? 'example-mode-disabled-panel example-mode-disabled-panel--left-page'
      : ''
  ]
    .filter(Boolean)
    .join(' ');



  return (

    <div
      className="window-shell"
      data-theme={resolvedTheme}
      data-theme-style={effectiveThemeStyle}
      {...windowShellBackProps}
    >

      <header className="title-bar window-titlebar" aria-label="Application title bar">

        <div className="window-titlebar__brand">

          <img

            src={PRODUCT_ICON_PATH}

            alt=""

            aria-hidden="true"

            className="window-titlebar__icon"

          />

          <strong className="window-titlebar__title">

            {window.appInfo?.name ?? PRODUCT_NAME_EN}

          </strong>

        </div>



        <div className="window-controls">

          <button

            type="button"

            className="window-control-button"

            onPointerUp={() => {

              const api = window.electronAPI ?? window.electronWindow;



              if (!api) {

                console.error('electronAPI is not available');

                return;

              }



              api.minimize();

            }}

            aria-label="最小化"

          >

            {renderWindowControlIcon('minimize')}

          </button>

          <button

            type="button"

            className={`window-control-button${isWindowMaximized ? ' maximized' : ''}`}

            onPointerUp={() => {

              const api = window.electronAPI ?? window.electronWindow;



              if (!api) {

                console.error('electronAPI is not available');

                return;

              }



              api.toggleMaximize();

            }}

            aria-label={isWindowMaximized ? '还原' : '最大化'}

          >

            {renderWindowControlIcon('maximize', isWindowMaximized)}

          </button>

          <button

            type="button"

            className="window-control-button window-control-button--close"

            onPointerUp={() => {

              const api = window.electronAPI ?? window.electronWindow;



              if (!api) {

                console.error('electronAPI is not available');

                return;

              }



              api.close();

            }}

            aria-label="关闭"

          >

            {renderWindowControlIcon('close')}

          </button>

        </div>

      </header>



      <main

        className={`app-shell${isFlashNoteOpen ? ' app-shell--flash-note' : ''}`}

        {...appShellBackProps}

        style={signedAmountCssVariables}

      >

        <input

          ref={backupFileInputRef}

          type="file"

          accept="application/json,.json"

          onChange={importBackup}

          style={{ display: 'none' }}

        />

        <input

          ref={rollupFileInputRef}

          type="file"

          accept="application/json,.json"

          onChange={importRollupFile}

          style={{ display: 'none' }}

        />

        <section

          ref={mainContentRef}

          className={mainPanelClassName}

          aria-disabled={isSecuritySettingsPageDisabled ? 'true' : undefined}

          onClick={handleMainContentBlankClick}

          onScroll={(event) => {

            sessionMainScrollPositionsRef.current[mainPageKey] = event.currentTarget.scrollTop;

          }}

        >

        {isFlashNoteOpen ? (

          renderFlashNotePage()

        ) : isRollupImportOpen ? (

          renderRollupImportPage()

        ) : isGlobalSettingsOpen ? (

          renderGlobalSettingsPage()

        ) : isTotalChartsOpen ? (

          <AssetChartsPanel

            title="总资产图表"

            totalLabel="净资产"

            totalValue={formatChartNumber(totalAssets)}

            allocationContent={(

              <AssetAllocationPanel

                data={assetStructureData}

                settings={assetChartSettings.structure}

                formatMoney={formatChartNumber}

                formatPercent={formatChartPercent}

              />

            )}

            trendContent={(

              <AssetTrendPanel

                points={assetTrendPoints}

                settings={assetChartSettings.trend}

                formatMoney={formatChartNumber}

              />

            )}

          />

        ) : isAccountChartsOpen && selectedAccount && selectedAccountEntry ? (

          <div className="asset-chart-page">

            <header className="asset-chart-page__header chart-visual-text">

              <div>

                <h1>{selectedAccountTitle}</h1>

              </div>

              <div className="asset-chart-page__totals">

                <span>当前余额</span>

                <strong>{formatChartNumber(selectedAccountEntry.amount)}</strong>

              </div>

            </header>

            <AccountTrendPanel

              points={selectedAccountTrendPoints}

              settings={selectedAccountChartSettings}

            />

          </div>

        ) : selectedGroupDetail && selectedGroupDetailStructureData && selectedGroupDetailTrendData ? (

          <div className="asset-chart-page">

            <header className="asset-chart-page__header chart-visual-text">

              <div>

                <h1>{selectedGroupDetail.name}</h1>

              </div>

              <div className="asset-chart-page__totals">

                <span>当前合计</span>

                <strong>{formatChartNumber(selectedGroupDetailStructureData.signedTotal)}</strong>

              </div>

            </header>

            {assetChartSettings.categoryVisibility.showStructure ? (

              <GroupDetailStructurePanel

                data={selectedGroupDetailStructureData}

              />

            ) : null}

            {assetChartSettings.categoryVisibility.showTrend ? (

              <GroupDetailTrendPanel

                data={selectedGroupDetailTrendData}

                settings={selectedGroupDetailChartSettings}

              />

            ) : null}

            {!assetChartSettings.categoryVisibility.showStructure &&

            !assetChartSettings.categoryVisibility.showTrend ? (

              <section className="asset-chart-panel">

                <p className="asset-chart-empty chart-visual-text">图表已关闭</p>

              </section>

            ) : null}

          </div>

        ) : selectedAccount && selectedAccountEntry ? (

          <AccountDetailPanel
            groupName={selectedAccount.groupName}
            account={selectedAccountEntry}
            currentAmount={selectedAccountEntry.amount}
            historyRecords={selectedAccountHistory}
            formatMoney={formatMoney}
            chartPreview={(
              <AssetTrendChart
                points={selectedAccountTrendPoints}
                settings={{
                  assetDisplay: 'net',
                  adaptiveYAxis: selectedAccountChartSettings.adaptiveYAxis,
                  xAxisRange: selectedAccountChartSettings.xAxisRange,
                  pointValueMode: selectedAccountChartSettings.pointValueMode
                }}
                formatMoney={formatChartNumber}
                compact
              />
            )}
            onOpenChart={openAccountChartsPage}
            historyList={(
              <AccountHistoryList
                groups={selectedAccountHistoryByDate}
                expandedDates={expandedDetailDates}
                onToggleDate={toggleDetailDate}
                {...historyRecordListProps}
              />
            )}
          />

        ) : (

          <>

            <header

              style={{

                display: 'flex',

                justifyContent: 'space-between',

                flexWrap: 'wrap',

                gap: 24,

                alignItems: 'flex-start',

                marginBottom: 32

              }}

            >

              <div>

                <div className="net-worth-summary">

                  <h1 className="net-worth-summary__heading">

                    <span className="net-worth-summary__label">{homeAssetStatLabel}</span>

                    <span className="net-worth-summary__amount">

                      {formatHomeMoneyAmount(homeAssetStatValue, {

                        compact: globalSettings.homeAssetStatCompact

                      })}

                    </span>

                  </h1>

                  <div

                    className={`net-worth-change${

                      recentNetWorthChange && recentNetWorthChange.amount > 0

                        ? ' is-positive'

                        : recentNetWorthChange && recentNetWorthChange.amount < 0

                          ? ' is-negative'

                          : ''

                    }`}

                  >

                    {recentNetWorthChange && recentNetWorthChange.amount !== 0 ? (

                      <>

                        <strong>

                          {recentNetWorthChange.amount > 0 ? '▲' : '▼'}{' '}

                          {formatChartNumber(Math.abs(recentNetWorthChange.amount))}

                        </strong>

                        <span>{recentNetWorthChange.relativeLabel}</span>

                      </>

                    ) : (

                      <strong>暂无变化</strong>

                    )}

                  </div>

                </div>

              </div>

              {shouldShowL0Charts ? (

                <div className="l0-chart-strip">

                  {assetChartSettings.l0.showStructure ? (

                    <button

                      type="button"

                      aria-label="打开总资产图表"

                      className="l0-chart-button l0-chart-button--structure"

                      onClick={openTotalChartsPage}

                    >

                      <AssetStructureGraphic

                        data={assetStructureData}

                        display="both"

                        compact

                        showDebtMultiple={assetChartSettings.structure.showDebtMultiple}

                        formatMoney={formatChartNumber}

                      />

                    </button>

                  ) : null}

                  {assetChartSettings.l0.showTrend ? (

                    <button

                      type="button"

                      aria-label="打开总资产趋势图"

                      className="l0-chart-button l0-chart-button--trend"

                      onClick={openTotalChartsPage}

                    >

                      <AssetTrendChart

                        points={homeThumbnailTrendPoints}

                        settings={{

                          ...assetChartSettings.trend,

                          assetDisplay: assetChartSettings.trend.assetDisplay,

                          xAxisRange: assetChartSettings.l0.xAxisRange

                        }}

                        formatMoney={formatChartNumber}

                        compact

                      />

                    </button>

                  ) : null}

                </div>

              ) : null}

              <div style={{ display: 'none', gap: 8, alignItems: 'center' }}>

                <button

                  type="button"

                  aria-label="打开全局搜索"

                  onClick={openSearch}

                  className="top-icon-button"

                >

                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none">

                    <path

                      d="M10.7 18.4a7.7 7.7 0 1 1 0-15.4 7.7 7.7 0 0 1 0 15.4zM16.3 16.3L21 21"

                      stroke="currentColor"

                      strokeWidth="1.8"

                      strokeLinecap="round"

                      strokeLinejoin="round"

                    />

                  </svg>

                </button>

                <button

                  type="button"

                  aria-label="打开已归档账户"

                  onClick={() => setIsArchivedAccountsOpen(true)}

                  className="top-icon-button"

                >

                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none">

                    <path

                      d="M4 7h16M6 10.5v7.5h12v-7.5M10 13h4"

                      stroke="currentColor"

                      strokeWidth="1.8"

                      strokeLinecap="round"

                      strokeLinejoin="round"

                    />

                  </svg>

                </button>

                <button

                  type="button"

                  aria-label="打开历史记录"

                  onClick={openHistoryPanel}

                  className="top-icon-button"

                >

                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none">

                    <path

                      d="M5 7h14M5 12h14M5 17h9"

                      stroke="currentColor"

                      strokeWidth="1.8"

                      strokeLinecap="round"

                    />

                  </svg>

                </button>

                <button

                  type="button"

                  aria-label="添加账户"

                  onClick={openAddAccount}

                  className="top-icon-button"

                >

                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none">

                    <path

                      d="M12 5v14M5 12h14"

                      stroke="currentColor"

                      strokeWidth="1.8"

                      strokeLinecap="round"

                    />

                  </svg>

                </button>

              </div>

            </header>



            <div style={{ display: 'grid', gap: 12 }}>

              {groupTotals.map((group) => {

                const expanded = expandedGroupNames.includes(group.name);

                const legendColor =

                  homeGroupLegendColorByName.get(group.name) ?? 'var(--chart-empty)';



                return (

                  <section

                    key={group.name}

                    data-account-type-entry="true"

                    draggable={isGroupEditMode}

                    onDragStart={(event) => handleGroupDragStart(event, group.name)}

                    onDragOver={(event) => handleGroupDragOver(event, group.name)}

                    onDrop={(event) => handleGroupDrop(event, group.name)}

                    onDragEnd={handleGroupDragEnd}

                    style={{

                      border: '1px solid var(--border-soft)',

                      borderRadius: 14,

                      background: 'var(--surface-soft)',

                      overflow: 'hidden',

                      opacity: draggingGroupName === group.name ? 0.54 : 1,

                      transition: 'opacity 0.16s ease, box-shadow 0.16s ease',

                      boxShadow: isGroupEditMode

                        ? '0 10px 26px rgba(52, 43, 30, 0.08)'

                        : 'none'

                    }}

                  >

                    <button

                      type="button"

                      onPointerDown={(event) => startGroupPointerInteraction(event, group.name)}

                      onPointerMove={moveGroupPointerInteraction}

                      onPointerUp={finishGroupPointerInteraction}

                      onPointerLeave={cancelGroupPointerInteraction}

                      onPointerCancel={cancelGroupPointerInteraction}

                      onClick={() => handleGroupClick(group.name)}

                      style={{

                        display: 'grid',

                        gridTemplateColumns: 'minmax(0, 1fr) auto',

                        gap: 16,

                        alignItems: 'center',

                        position: 'relative',

                        width: '100%',

                        border: 0,

                        padding: '16px 18px',

                        background: 'transparent',

                        color: 'var(--text-main)',

                        cursor: isGroupEditMode ? 'grab' : 'pointer',

                        font: 'inherit',

                        textAlign: 'left'

                      }}

                    >

                      <div style={{ opacity: isGroupEditMode ? 0.62 : 1 }}>

                        <h2 className="account-type-entry-title">

                          <span

                            className="account-type-legend-swatch"

                            style={{ background: legendColor }}

                            aria-hidden="true"

                          />

                          <span>{group.name}</span>

                        </h2>

                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>

                          {group.activeAccounts.length} 个账户

                        </p>

                      </div>

                      {isGroupEditMode ? (

                        <span

                          aria-hidden="true"

                          style={{

                            position: 'absolute',

                            top: '50%',

                            left: '50%',

                            display: 'grid',

                            gap: 6,

                            color:

                              draggingGroupName === group.name

                                ? 'var(--nf-sort-icon-active-color)'

                                : 'var(--nf-sort-icon-color)',

                            pointerEvents: 'none',

                            transform: 'translate(-50%, -50%)'

                          }}

                        >

                          <span

                            style={{

                              display: 'grid',

                              placeItems: 'center',

                              width: 28,

                              height: 28,

                              borderRadius: 9,

                              background: 'var(--surface-bg)',

                              boxShadow: 'var(--shadow-popover)'

                            }}

                          >

                            <NfSvgIcon svg={NfSortIcon} className="account-sort-icon" decorative />

                          </span>

                        </span>

                      ) : null}

                      <div style={{ textAlign: 'right', opacity: isGroupEditMode ? 0.62 : 1 }}>

                        <strong style={{ display: 'block', fontSize: '1.06rem' }}>

                          {formatHomeMoneyAmount(group.total)}

                        </strong>

                        <span

                          style={{

                            color: getPercentageColor(group.nature, group.includeInStats),

                            fontSize: '0.88rem'

                          }}

                        >

                          {getGroupPercentageLabel(group)}

                        </span>

                      </div>

                    </button>



                    {expanded ? (

                      <div

                        style={{

                          display: 'grid',

                          gap: 8,

                          borderTop: '1px solid var(--border-soft)',

                          padding: 10

                        }}

                      >

                        {group.activeAccounts.length === 0 ? (

                          <p style={{ margin: '6px 8px', color: 'var(--text-muted)' }}>暂无账户</p>

                        ) : (

                          group.activeAccounts.map((account) => (

                            <button

                              key={account.id}

                              id={`account-row-${account.id}`}

                              type="button"

                              onClick={() => openAccountDetail(group.name, account)}

                              style={{

                                display: 'flex',

                                alignItems: 'center',

                                gap: 10,

                                width: '100%',

                                border: '1px solid transparent',

                                borderRadius: 10,

                                background: 'var(--surface-muted)',

                                boxShadow: 'none',

                                padding: '9px 10px',

                                color: 'var(--text-secondary)',

                                cursor: 'pointer',

                                font: 'inherit',

                                textAlign: 'left'

                              }}

                            >

                              <AccountMark account={account} className="account-mark--list" />

                              <span style={{ flex: 1 }}>{account.name}</span>

                              <span style={{ textAlign: 'right' }}>

                                <span style={{ display: 'block' }}>

                                  {formatHomeMoneyAmount(account.amount)}

                                </span>

                                <span

                                  style={{

                                    display: 'block',

                                    color: getPercentageColor(

                                      group.nature,

                                      group.includeInStats

                                    ),

                                    fontSize: '0.78rem'

                                  }}

                                >

                                  {getAccountPercentageLabel(group, account)}

                                </span>

                              </span>

                            </button>
                          ))

                        )}

                      </div>

                    ) : null}

                  </section>

                );

              })}

            </div>



            <footer

              aria-label="产品信息"

              style={{

                display: 'flex',

                alignItems: 'center',

                gap: 10,

                marginTop: 24,

                paddingTop: 18,

                borderTop: '1px solid var(--border-soft)',

                color: 'var(--text-muted)'

              }}

            >

              <img

                src={PRODUCT_ICON_PATH}

                alt=""

                aria-hidden="true"

                style={{

                  width: 28,

                  height: 28,

                  display: 'block',

                  objectFit: 'contain',

                  borderRadius: 0,

                  flex: '0 0 auto'

                }}

              />

              <span style={{ display: 'grid', gap: 2 }}>

                <strong style={{ color: 'var(--text-main)', fontSize: '0.94rem' }}>

                  {PRODUCT_NAME_ZH} {PRODUCT_NAME_EN}

                </strong>

                <span style={{ fontSize: '0.84rem' }}>{PRODUCT_TAGLINE}</span>

              </span>

            </footer>

          </>

        )}

        {isSecuritySettingsPageDisabled ? (
          <div className="example-mode-disabled-panel__banner">示例模式下不可用</div>
        ) : null}

      </section>



      {isFlashNoteOpen ? null : (

        <aside

          ref={rightActionPanelRef}

          className="right-action-panel"

          aria-label="操作面板"

          onClick={(event) => event.stopPropagation()}

          onScroll={(event) => {

            sessionRightPanelScrollPositionsRef.current[rightPanelKey] =

              event.currentTarget.scrollTop;

          }}

        >

          {renderRightPanelContent()}

        </aside>

      )}



      {renderPasswordEditor()}

      {renderSnapshotPasswordEditor()}

      {renderPasswordDisableConfirm()}

      {renderSnapshotEncryptionDisableConfirm()}

      {isArchivedAccountsOpen ? (

        <OverlayBackdrop

          onBack={() => currentLayerBack?.()}

          className="layout-layer layout-layer--left"

          style={{

            position: 'fixed',

            inset: 0,

            display: 'grid',

            placeItems: 'center',

            padding: 24,

            background: 'var(--modal-backdrop)'

          }}

        >

          <section

            ref={leftLayerPanelRef}

            onClick={(event) => event.stopPropagation()}

            onScroll={(event) => {

              sessionLeftLayerScrollPositionsRef.current[leftLayerKey] =

                event.currentTarget.scrollTop;

            }}

            style={{

              width: 'min(640px, 100%)',

              maxHeight: '80vh',

              overflowY: 'auto',

              borderRadius: 16,

              padding: 24,

              background: 'var(--surface-strong)',

              boxShadow: 'var(--shadow-popover)'

            }}

          >

            <header

              style={{

                display: 'flex',

                justifyContent: 'space-between',

                gap: 16,

                alignItems: 'baseline',

                marginBottom: 16

              }}

            >

              <div>

                <p className="eyebrow" style={{ marginBottom: 8 }}>

                  已归档账户

                </p>

                <h2 style={{ margin: 0, fontSize: '1.45rem' }}>

                  共 {archivedAccounts.length} 个账户

                </h2>

              </div>

              <button

                type="button"

                onClick={() => setIsArchivedAccountsOpen(false)}

                style={{

                  border: '1px solid var(--border-medium)',

                  borderRadius: 8,

                  padding: '8px 12px',

                  background: 'var(--surface-strong)',

                  color: 'var(--text-secondary)',

                  cursor: 'pointer',

                  font: 'inherit'

                }}

              >

                关闭

              </button>

            </header>



            {archivedAccounts.length === 0 ? (

              <p style={{ margin: 0, color: 'var(--text-muted)' }}>暂无已归档账户</p>

            ) : (

              <div style={{ display: 'grid', gap: 10 }}>

                {archivedAccounts.map((account) => (

                  <article

                    key={account.id}

                    id={`account-row-${account.id}`}

                    style={{

                      display: 'grid',

                      gridTemplateColumns: 'minmax(0, 1fr)',

                      gap: 12,

                      alignItems: 'center',

                      borderRadius: 14,

                      padding: '12px 14px',

                      background: 'rgba(37, 99, 235, 0.08)',

                      border: '1px solid rgba(37, 99, 235, 0.12)',

                      boxShadow: 'none'

                    }}

                  >

                    <button

                      type="button"

                      onClick={() => openAccountDetail(account.groupName, account)}

                      style={{

                        display: 'flex',

                        alignItems: 'center',

                        gap: 12,

                        minWidth: 0,

                        border: 0,

                        padding: 0,

                        background: 'transparent',

                        color: 'var(--text-main)',

                        cursor: 'pointer',

                        font: 'inherit',

                        textAlign: 'left'

                      }}

                    >

                      <AccountMark account={account} className="account-mark--archived" />

                      <span style={{ minWidth: 0 }}>

                        <strong style={{ display: 'block' }}>{account.name}</strong>

                        <span

                          style={{

                            display: 'block',

                            marginTop: 4,

                            color: 'var(--text-secondary)',

                            fontSize: '0.92rem'

                          }}

                        >

                          {account.groupName} · {formatMoney(account.amount)}

                        </span>

                        {account.archivedAt ? (

                          <span

                            style={{

                              display: 'block',

                              marginTop: 4,

                              color: 'var(--text-muted)',

                              fontSize: '0.82rem'

                            }}

                          >

                            归档于 {formatShortTime(account.archivedAt)}

                          </span>

                        ) : null}

                      </span>

                    </button>

                    <button

                      type="button"

                      onClick={() => restoreAccount(account.groupName, account)}

                      style={{

                        display: 'none',

                        border: '1px solid rgba(37, 99, 235, 0.22)',

                        borderRadius: 8,

                        padding: '8px 10px',

                        background: 'var(--surface-strong)',

                        color: '#2563eb',

                        cursor: 'pointer',

                        font: 'inherit'

                      }}

                    >

                      重新启用

                    </button>

                  </article>
                ))}

              </div>

            )}

          </section>

        </OverlayBackdrop>

      ) : null}



      {isHistoryOpen ? (

        <OverlayBackdrop

          onBack={() => currentLayerBack?.()}

          className="layout-layer layout-layer--left"

          style={{

            position: 'fixed',

            inset: 0,

            display: 'grid',

            placeItems: 'center',

            padding: 24,

            background: 'var(--modal-backdrop)'

          }}

        >

          <HistoryPanel

            ref={leftLayerPanelRef}

            view={historyPanelView}

            onPanelClick={(event) => event.stopPropagation()}

            onPanelScroll={(event) => {

              sessionLeftLayerScrollPositionsRef.current[leftLayerKey] =

                event.currentTarget.scrollTop;

            }}

            historyContent={(

              <>

                <HistoryFilterToolbar

                  rangeInput={historyRangeInput}

                  isCalendarVisible={isCalendarVisible}

                  onRangeInputFocus={clearHistoryRange}

                  onRangeInputClick={clearHistoryRange}

                  onRangeInputConfirm={confirmSingleHistoryDate}

                  onRangeInputChange={handleHistoryRangeInput}

                  onToggleCalendar={() => setIsCalendarVisible((visible) => !visible)}

                  onSelectPreviousWeek={setLastWeekHistoryRange}

                  onSelectRecentSevenDays={setRecent7HistoryRange}

                  onClearRange={clearHistoryRange}

                  calendarContent={(

                    <HistoryCalendarPanel

                      calendarMonth={calendarMonth}

                      isNextDisabled={isHistoryCalendarNextDisabled}

                      getCalendarDays={getCalendarDays}

                      getDateValue={toDateInputValue}

                      getDateState={getHistoryCalendarDateState}

                      onPreviousMonth={() =>

                        setCalendarMonth(

                          (currentMonth) =>

                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)

                        )

                      }

                      onNextMonth={() =>

                        setCalendarMonth(

                          (currentMonth) =>

                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)

                        )

                      }

                      onDateClick={selectCalendarDate}

                    />

                  )}

                />

                <HistoryRecordList

                  records={filteredHistory}

                  highlightedRecordId={highlightedHistoryRecordId}

                  emptyText="暂无匹配记录"

                  {...historyRecordListProps}

                />

              </>

            )}

            backupContent={(

              <div style={{ display: 'grid', gap: 16 }}>

                <input

                  ref={backupFileInputRef}

                  type="file"

                  accept="application/json,.json"

                  onChange={importBackup}

                  style={{ display: 'none' }}

                />

                <BackupRecordList

                  records={backupRecords}

                  formatPreciseBackupTime={formatPreciseBackupTime}

                  getBackupMethodLabel={getBackupMethodLabel}

                />

              </div>

            )}

          />

        </OverlayBackdrop>

      ) : null}



      {searchState.isOpen ? (

        <OverlayBackdrop

          onBack={closeSearch}

          className="layout-layer layout-layer--left layout-layer--search"

          style={{

            position: 'fixed',

            inset: 0,

            zIndex: 90,

            display: 'grid',

            placeItems: 'start center',

            padding: '74px 24px 24px',

            background: 'var(--modal-backdrop)'

          }}

        >

          <GlobalSearchPanel

            output={searchOutput}

            query={searchState.query}

            selectedCategory={searchState.selectedCategory}

            categoryLockedByUser={searchState.categoryLockedByUser}

            focusedItemId={searchState.focusedResultId}

            hoveredItemId={searchState.hoveredResultId}

            resultLimit={searchState.resultLimit}

            scrollTop={searchState.scrollTop}

            lastOpenedResultId={searchState.lastOpenedResultId}

            inputRef={searchInputRef}

            onQueryChange={(query) => dispatchSearchState({ type: 'query-changed', query })}

            onClearQuery={() => dispatchSearchState({ type: 'clear-query' })}

            onSelectCategory={(category) =>

              dispatchSearchState({ type: 'select-category', category, lock: category !== 'all' })

            }

            onShowAll={() =>

              dispatchSearchState({ type: 'select-category', category: 'all', lock: false })

            }

            onFocusItem={(itemId) => dispatchSearchState({ type: 'focus-item', itemId })}

            onHoverItem={(itemId) => dispatchSearchState({ type: 'hover-item', itemId })}

            onClearHover={() => dispatchSearchState({ type: 'clear-hover' })}

            onLoadMoreResults={(minimum) =>

              dispatchSearchState({ type: 'load-more-results', minimum })

            }

            onScrollChange={(scrollTop) => dispatchSearchState({ type: 'scroll', scrollTop })}

            onOpenResult={handleSearchResultOpen}

            onPointerIntent={markSearchUserInteraction}

          />

        </OverlayBackdrop>

      ) : null}



      {currentSearchNavigationTarget ? (

        <SearchFloatingNavigator

          currentTarget={currentSearchNavigationTarget}

          canMove={canMoveSearchNavigation}

          onPrevious={() => moveSearchNavigation(-1)}

          onNext={() => moveSearchNavigation(1)}

          onReturn={returnFromSearchNavigation}

          onExit={exitSearchNavigation}

        />

      ) : null}



      {toastMessages.length > 0 ? (

        <div

          aria-live="polite"

          style={{

            position: 'fixed',

            right: 22,

            bottom: 22,

            zIndex: 120,

            display: 'grid',

            gap: 10,

            width: 'min(320px, calc(100vw - 44px))',

            pointerEvents: 'none'

          }}

        >

          {toastMessages.map((toast) => (

            <div

              key={toast.id}

              style={{

                border: `1px solid ${

                  toast.tone === 'success'

                    ? 'rgba(22, 163, 74, 0.18)'

                    : toast.tone === 'error'

                      ? 'rgba(185, 28, 28, 0.18)'

                      : 'var(--border-soft)'

                }`,

                borderRadius: 10,

                padding: '11px 13px',

                background:

                  toast.tone === 'success'

                    ? 'rgba(240, 253, 244, 0.94)'

                    : toast.tone === 'error'

                      ? 'rgba(254, 242, 242, 0.94)'

                      : 'var(--panel-bg-strong)',

                color:

                  toast.tone === 'success'

                    ? '#166534'

                    : toast.tone === 'error'

                      ? '#991b1b'

                      : 'var(--text-main)',

                boxShadow: 'var(--shadow-popover)',

                backdropFilter: 'blur(10px)',

                fontSize: '0.92rem',

                fontWeight: 700

              }}

            >

              {toast.message}

            </div>

          ))}

        </div>

      ) : null}



      {noticeDialog ? (
        <NoticeDialog
          title={noticeDialog.title}
          message={noticeDialog.message}
          closeLabel={noticeDialog.confirmLabel}
          onClose={closeNoticeDialog}
        />
      ) : null}

      {inputDialog ? (
        <InputDialog
          title={inputDialog.title}
          message={inputDialog.message}
          label={inputDialog.label}
          value={inputDialogValue}
          confirmLabel={inputDialog.confirmLabel}
          inputType={inputDialog.inputType}
          autoComplete={inputDialog.autoComplete}
          onValueChange={setInputDialogValue}
          onConfirm={confirmInputDialog}
          onCancel={closeInputDialog}
        />
      ) : null}

      {confirmationDialog ? (
        <ConfirmDialog
          title={confirmationDialog.title}
          message={confirmationDialog.message}
          confirmLabel={confirmationDialog.confirmLabel}
          cancelLabel={confirmationDialog.cancelLabel}
          eyebrow={confirmationDialog.eyebrow}
          tone={confirmationDialog.tone}
          onConfirm={confirmAndClose}
          onCancel={closeConfirmationDialog}
        />
      ) : null}



      {resetConfirmation ? (

        <OverlayBackdrop onBack={closeResetConfirmation} className="modal-backdrop">

          <form

            role="dialog"

            aria-modal="true"

            aria-labelledby="reset-confirmation-title"

            onClick={(event) => event.stopPropagation()}

            onSubmit={(event) => {

              event.preventDefault();

              confirmResetAction();

            }}

            className="modal-card"

          >

            <p className="eyebrow" style={{ marginBottom: 8 }}>

              重置功能

            </p>

            <h2

              id="reset-confirmation-title"

              style={{ margin: '0 0 10px', fontSize: '1.26rem' }}

            >

              {getResetActionLabel(resetConfirmation.action)}

            </h2>

            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.94rem' }}>

              您正在进行{getResetActionLabel(resetConfirmation.action)}操作，请注意该操作无法恢复

            </p>

              <div className="reset-confirmation-code" aria-label="确认数字">

              {resetConfirmation.code}

            </div>

            <label className="right-panel-label" style={{ marginTop: 14 }}>

              输入上方 4 位数字

              <input

                autoFocus

                type="text"

                inputMode="numeric"

                pattern="[0-9]*"

                maxLength={4}

                value={resetConfirmationInput}

                onChange={(event) =>

                  setResetConfirmationInput(event.target.value.replace(/[^\d]/g, '').slice(0, 4))

                }

              />

            </label>

            {resetConfirmationInput && resetConfirmationInput !== resetConfirmation.code ? (

              <p className="global-settings-note">数字不匹配</p>

            ) : null}

            <div className="modal-actions">

              <button

                type="button"

                onClick={closeResetConfirmation}

                className="modal-button modal-button--secondary"

              >

                取消

              </button>

              <button

                type="submit"

                disabled={resetConfirmationInput !== resetConfirmation.code}

                className="modal-button modal-button--danger"

              >

                确认执行

              </button>

            </div>

          </form>

        </OverlayBackdrop>

      ) : null}



      {isQuickSingleEntryAccountPickerOpen ? (

        <OverlayBackdrop

          onBack={closeQuickSingleEntryAccountPicker}

          className="modal-backdrop"

        >

          <QuickEntryPanel accountPickerContent={renderQuickSingleEntryAccountPicker()} />

        </OverlayBackdrop>

      ) : null}



      {editingAccount && currentAccount ? (
        <AccountAmountEditorDialog
          title={`${currentGroup?.name ?? editingAccount.groupName} - ${currentAccount.name}`}
          editMode={editMode}
          draftAmount={draftAmount}
          setAmountDatePicker={renderAccountOperationDatePicker({
            value: setAmountDateInput,
            selectedDate: setAmountSelectedDate,
            parsedDate: parsedSetAmountDate,
            visibleMonth: setAmountVisibleMonth,
            futureHint: setAmountDateFutureHint,
            onInputChange: updateSetAmountDateInput,
            onCalendarSelect: selectSetAmountCalendarDate,
            onVisibleMonthChange: setSetAmountVisibleMonth
          })}
          setAmountNote={setAmountNoteInput}
          adjustAmount={adjustAmountInput}
          adjustDirection={adjustDirection}
          isAdjustAmountInvalid={isAdjustAmountInvalid}
          currentAmountLabel={formatMoney(currentAccount.amount)}
          nextAdjustedAmountLabel={formatMoney(
            toStoredGroupAmount(editingAccount.groupName, nextAdjustedEditableAmount)
          )}
          signedAdjustAmountLabel={signedAdjustAmountLabel}
          signedAdjustAmountColor={
            getSignedAmountTone(
              signedAdjustAmount,
              globalSettings.positiveNegativeColorMode
            ).color
          }
          adjustDatePicker={renderAccountOperationDatePicker({
            value: adjustAmountDateInput,
            selectedDate: adjustAmountSelectedDate,
            parsedDate: parsedAdjustAmountDate,
            visibleMonth: adjustAmountVisibleMonth,
            futureHint: adjustAmountDateFutureHint,
            onInputChange: updateAdjustAmountDateInput,
            onCalendarSelect: selectAdjustAmountCalendarDate,
            onVisibleMonthChange: setAdjustAmountVisibleMonth
          })}
          adjustAmountNote={adjustAmountNoteInput}
          isEditingArchivedAccount={isEditingArchivedAccount}
          isSubmitDisabled={isAmountEditorSubmitDisabled}
          onEditModeChange={(mode) => {
            setEditMode(mode);
            setAdjustAmountInput('');
            setAdjustDirection('increase');
          }}
          onDraftAmountInputChange={(value) => {
            const nextValue = sanitizeNonNegativeInput(value);

            if (isNonNegativeInput(nextValue)) {
              setDraftAmount(nextValue);
            }
          }}
          onSetAmountNoteChange={setSetAmountNoteInput}
          onAdjustAmountInputChange={(value) => {
            const nextValue = sanitizeNonNegativeInput(value);

            if (isNonNegativeInput(nextValue)) {
              setAdjustAmountInput(nextValue);
            }
          }}
          onAdjustDirectionChange={setAdjustDirection}
          onAdjustAmountNoteChange={setAdjustAmountNoteInput}
          onSubmit={saveAmount}
          onCancel={requestCloseEditor}
        />

      ) : null}



      {editingAccountInfo && accountInfoEntry ? (
        <AccountInfoEditorDialog
          title={accountInfoEntry.name}
          accountName={accountNameDraft}
          accountAlias={accountAliasDraft}
          accountAliasMaxLength={ACCOUNT_MARK_MAX_CHARS}
          aliasPreview={(
            <AccountMark
              account={{
                name: accountNameDraft.trim() || accountInfoEntry.name,
                alias: accountAliasDraft
              }}
              className="account-mark--list"
            />
          )}
          error={accountInfoError}
          onAccountNameChange={(value) => {
            setAccountNameDraft(value);
            setAccountInfoError('');
          }}
          onAccountAliasChange={(value) => setAccountAliasDraft(limitAccountAliasInput(value))}
          onSubmit={saveAccountInfo}
          onCancel={requestCloseAccountInfoEditor}
        />

      ) : null}



      {isAddingAccount ? (
        <AccountRestoreDialog
          archivedAccounts={archivedAccounts}
          filteredAccounts={filteredArchivedAccountsForRestore}
          searchQuery={archivedAccountSearchQuery}
          onSearchQueryChange={setArchivedAccountSearchQuery}
          getRestoreTitle={getArchivedAccountRestoreTitle}
          getArchivedAtLabel={getArchivedAccountArchivedAtLabel}
          formatMoney={formatMoney}
          onRestore={(account) => {
            if (restoreAccount(account.groupName, account)) {
              closeAddAccount();
            }
          }}
          onCancel={requestCloseAddAccount}
        />

      ) : null}



      {isAddingAccount ? (
        <AccountCreateDialog
          accountTypeInputRef={newAccountTypeInputRef}
          accountTypeInput={newAccountTypeInput}
          accountTypeGhostText={newAccountTypeGhostText}
          accountTypeCount={groups.length}
          newAccountName={newAccountName}
          newAccountAmount={newAccountAmount}
          error={newAccountError}
          onAccountTypeInputChange={updateNewAccountTypeInput}
          onConfirmAccountTypeInput={confirmNewAccountTypeInput}
          onAccountTypeWheel={handleNewAccountGroupWheel}
          onSwitchAccountType={switchNewAccountGroup}
          onOpenCreateAccountType={() => openCreateAccountType()}
          onNameChange={(value) => {
            setNewAccountName(value);
            setNewAccountError('');
          }}
          onAmountInputChange={(value) => {
            const nextValue = sanitizeNonNegativeInput(value);

            if (isNonNegativeInput(nextValue)) {
              setNewAccountAmount(nextValue);
              setNewAccountError('');
            }
          }}
          onSubmit={saveNewAccount}
          onCancel={requestCloseAddAccount}
        />

      ) : null}



      {accountTypeEditor && isAccountTypeEditorVisible ? (

        <OverlayBackdrop

          onBack={requestCloseAccountTypeEditor}

          className="layout-layer layout-layer--right"

          style={{

            position: 'fixed',

            inset: 0,

            zIndex: 40,

            display: 'grid',

            placeItems: 'center',

            padding: 24,

            background: 'var(--modal-backdrop)'

          }}

        >

          <form

            onClick={(event) => event.stopPropagation()}

            onSubmit={(event) => {

              event.preventDefault();

              saveAccountType();

            }}

            className="account-type-editor-panel"

            style={{

              width: 'min(400px, 100%)',

              borderRadius: 14,

              padding: 24,

              background: 'var(--panel-bg)',

              boxShadow: 'var(--shadow-panel)'

            }}

          >

            <h2 className="account-add-restore-panel__title" style={{ margin: '0 0 18px' }}>

              {accountTypeEditor.mode === 'create' ? '新增账户类型' : '编辑账户类型'}

            </h2>



            <label style={{ display: 'grid', gap: 8, color: 'var(--text-secondary)' }}>

              账户类型名称

              <input

                autoFocus

                type="text"

                value={accountTypeNameDraft}

                onChange={(event) => {

                  setAccountTypeNameDraft(event.target.value);

                  setAccountTypeError('');

                }}

                style={{

                  width: '100%',

                  border: '1px solid var(--border-medium)',

                  borderRadius: 8,

                  padding: '10px 12px',

                  background: 'transparent',

                  color: 'var(--text-main)',

                  font: 'inherit'

                }}

              />

            </label>



            <div style={{ display: 'grid', gap: 8, color: 'var(--text-secondary)', marginTop: 14 }}>

              <span>类型性质</span>

              <div

                style={{

                  display: 'grid',

                  gridTemplateColumns: 'repeat(3, 1fr)',

                  gap: 4,

                  height: 'var(--segmented-control-height)',

                  borderRadius: 10,

                  padding: 4,

                  background: 'var(--surface-muted)'

                }}

              >

                {accountTypeNatureOptions.map((option) => (

                  <button

                    key={option.value}

                    type="button"

                    onClick={() => {

                      setAccountTypeNatureDraft(option.value);

                      setAccountTypeError('');

                    }}

                    style={{

                      border: 0,

                      borderRadius: 8,

                      padding: '8px 0',

                      background:

                        accountTypeNatureDraft === option.value

                          ? 'var(--button-primary-bg)'

                          : 'transparent',

                      color:

                        accountTypeNatureDraft === option.value

                          ? 'var(--button-primary-text)'

                          : 'var(--text-secondary)',

                      cursor: 'pointer',

                      font: 'inherit',

                      fontWeight: 700

                    }}

                  >

                    {option.label}

                  </button>

                ))}

              </div>

            </div>



            <div style={{ display: 'grid', gap: 8, color: 'var(--text-secondary)', marginTop: 14 }}>

              <span>是否参与统计</span>

              <div

                style={{

                  display: 'grid',

                  gridTemplateColumns: '1fr 1fr',

                  gap: 4,

                  height: 'var(--segmented-control-height)',

                  borderRadius: 10,

                  padding: 4,

                  background: 'var(--surface-muted)'

                }}

              >

                {[

                  { value: true, label: '是' },

                  { value: false, label: '否' }

                ].map((option) => (

                  <button

                    key={option.label}

                    type="button"

                    onClick={() => {

                      setAccountTypeStatsDraft(option.value);

                      setAccountTypeError('');

                    }}

                    style={{

                      border: 0,

                      borderRadius: 8,

                      padding: '8px 0',

                      background:

                        accountTypeStatsDraft === option.value

                          ? 'var(--button-primary-bg)'

                          : 'transparent',

                      color:

                        accountTypeStatsDraft === option.value

                          ? 'var(--button-primary-text)'

                          : 'var(--text-secondary)',

                      cursor: 'pointer',

                      font: 'inherit',

                      fontWeight: 700

                    }}

                  >

                    {option.label}

                  </button>

                ))}

              </div>

            </div>



            {accountTypeError ? (

              <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.92rem' }}>

                {accountTypeError}

              </p>

            ) : null}



            <div

              style={{

                display: 'flex',

                justifyContent: 'flex-end',

                gap: 10,

                marginTop: 22

              }}

            >

              <button

                type="button"

                onClick={requestCloseAccountTypeEditor}

                style={{

                  border: '1px solid var(--border-medium)',

                  borderRadius: 8,

                  padding: '9px 14px',

                  background: 'var(--surface-strong)',

                  color: 'var(--text-secondary)',

                  cursor: 'pointer',

                  font: 'inherit'

                }}

              >

                取消

              </button>

              <button

                type="submit"

                style={{

                  border: 0,

                  borderRadius: 8,

                  padding: '9px 14px',

                  background: 'var(--button-primary-bg)',

                  color: 'var(--button-primary-text)',

                  cursor: 'pointer',

                  font: 'inherit'

                }}

              >

                确定

              </button>

            </div>

          </form>

        </OverlayBackdrop>

      ) : null}

      {renderFirstWelcome()}

      {renderLockScreen()}

      {isSecretConsoleOpen ? (

        <div

          className="secret-console-layer"

          onMouseDown={closeSecretConsole}

          onTouchStart={closeSecretConsole}

        >

          <input

            ref={secretConsoleInputRef}

            className={`secret-console-input${

              isSecretConsoleHighlighted ? ' is-highlighted' : ''

            }`}

            value={secretConsoleInput}

            placeholder={secretConsolePlaceholder}

            aria-label="隐藏控制台"

            spellCheck={false}

            autoComplete="off"

            onMouseDown={(event) => {

              event.stopPropagation();

              clearSecretConsoleResultPlaceholder();

            }}

            onTouchStart={(event) => {

              event.stopPropagation();

              clearSecretConsoleResultPlaceholder();

            }}

            onChange={(event) => {

              clearSecretConsoleResultPlaceholder();

              setSecretConsoleInput(event.target.value);

            }}

            onKeyDown={handleSecretConsoleKeyDown}

          />

        </div>

      ) : null}

      </main>

    </div>

  );

}



export default App;

