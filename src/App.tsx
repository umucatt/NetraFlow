import {
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import packageInfo from '../package.json';

import {
  DAY_MS,
  compareHistoryByTimeDesc,
  formatHistoryRecordDate,
  getCalendarDays,
  getValidTimestamp,
  toDateInputValue
} from './app/dateUtils';
import {
  getExampleModeBadgeSettingsNavigation
} from './app/exampleModeNavigation';
import {
  createExtremeTestDataInRealAppData,
  createTestDataInRealAppData
} from './app/appDataLifecycleLogic';
import { useAppDataLifecycleController } from './app/useAppDataLifecycleController';
import { useAppDialogController } from './app/useAppDialogController';
import { FatalErrorPage } from './app/fatalError';
import { CoreIntegrityDialog } from './app/coreIntegrity';
import { createCloseBeforeController } from './app/closeBeforeController';
import {
  createCoreSaveCoordinator,
  type CoreSaveCoordinator,
  type CoreSaveRequest,
  type CoreSaveScheduleOptions
} from './app/coreSaveCoordinator';
import {
  isPositiveNature,
  toStoredAmountByNature
} from './app/accountNature';
import { isPlainObject } from './app/objectUtils';
import {
  canDeleteAssetGroup,
  cloneAppData,
  deleteAssetGroupFromAppData,
  deriveGroupsWithAccounts,
  getArchivedAccountEntries,
  normalizeGroupsAndAccounts,
  stripRuntimeAccountsFromGroups
} from './app/accountData';
import {
  createAppDataFromCoreDocument,
  createCoreDocumentFromAppData,
  createRuntimeGlobalSettings,
  createSecurityDocumentFromRuntime,
  createSettingsDocumentFromRuntime,
  acknowledgeCoreIntegrityIssue,
  disableCoreProtection,
  enableCoreProtection,
  enterDemoPersistenceEnvironment,
  exitDemoPersistenceEnvironment,
  getRuntimeBackupState,
  isExternalCoreModificationError,
  lockCoreDocument,
  promoteDemoCoreToRealPersistenceEnvironment,
  readCoreDocument,
  readRuntimePersistenceSnapshot,
  unlockCoreDocument,
  changeCorePassword,
  writeCoreDocument,
  writeSecurityDocument,
  writeSettingsDocument,
  writeStateDocument,
  type RuntimePersistenceSnapshot
} from './app/persistence/runtimePersistence';
import {
  createDefaultCoreDocument,
  createDefaultSecurityDocument,
  createDefaultSettingsDocument,
  createDefaultStateDocument,
  normalizeSecurityDocument,
  normalizeSettingsDocument,
  normalizeStateDocument
} from './app/persistence/persistenceDefaults';
import type {
  SecurityDocument,
  SettingsDocument,
  StateDocument
} from './app/persistence/persistenceDocuments';
import { createStableGroupId } from './app/ids';
import {
  NfFlashnoteSourceIcon
} from './assets/icons';
import { WindowFrame } from './app/windowFrame';
import { AppShell } from './app/shell';
import {
  createMainContentRendererProps,
  getMainContentMode,
  MainContentRenderer,
  type MainContentRendererProps
} from './app/mainContent';
import {
  AppDialogLayer,
  ToastViewport,
  createAppDialogLayerProps,
  useToastController
} from './app/feedback';
import { AccountDialogLayer } from './app/accountDialogs';
import {
  createSnapshotSecurityDialogLayerProps,
  SnapshotSecurityDialogLayer,
  type SnapshotSecurityDialogLayerProps
} from './app/snapshotSecurityDialogs';
import {
  FirstWelcomeLayer,
  normalizeFirstWelcomeState,
  shouldShowFirstWelcome,
  type FirstWelcomeStage,
  type FirstWelcomeState,
  type FirstWelcomeStoryRoute
} from './app/firstWelcome';
import {
  DEFAULT_GLOBAL_SETTINGS,
  THEME_MEDIA_QUERY,
  getSystemTheme,
  isMainContentPosition,
  isPagePositionMemoryMode,
  isPositiveNegativeColorMode,
  isSearchLogicMode,
  isThemeMode,
  isThemeStyle,
  normalizeGlobalSettings,
  resolveThemeMode
} from './app/globalSettings';
import { SecretConsoleLayer } from './app/secretConsole';
import {
  SearchOverlayLayer
} from './app/searchOverlay';
import {
  createRightPanelRendererProps,
  getRightPanelMode,
  RightPanelRenderer,
  type RightPanelRendererProps
} from './app/rightPanel';
import { ResetDangerDialogLayer } from './app/resetDangerDialog';
import { LockScreenLayer } from './app/lockScreen';
import { QuickEntryPickerLayer } from './app/quickEntryLayer';
import { ArchivedAccountsLayer } from './app/archivedAccountsLayer';
import { HistoryBackupLayer } from './app/historyBackupLayer';
import {
  createArchivedAccountsLayerProps,
  createHistoryBackupLayerProps,
  createLockScreenLayerProps,
  createQuickEntryPickerLayerProps,
  createResetDangerDialogLayerProps,
  createSearchOverlayLayerProps
} from './app/layers';
import { useOverlayBack } from './app/overlay';
import { getPageCoverage } from './app/navigation';
import {
  forgetPageScrollTop,
  readPageScrollTop,
  rememberPageScrollTop
} from './app/scroll';

import AccountMark from './components/AccountMark';
import NfSvgIcon from './components/NfSvgIcon';

import {
  useAccountOperationsController
} from './features/account';
import {
  findBestAccountTypeMatch,
  getAccountTypeGhostText,
  normalizeTypeSearchText
} from './features/account/accountTypeSearch';
import {
  updateAccountTypeInAppData
} from './features/account/accountTypeLogic';
import { useAccountTypeController } from './features/account/useAccountTypeController';
import {
  DUPLICATE_NAME_PLACEHOLDER,
  hasDuplicateAccountName,
  hasDuplicateAccountTypeName
} from './features/account/accountNameUniqueness';
import {
  createNewAccountInAppData,
  getNewAccountTypeInputMatch,
  hasAddAccountUnsavedChanges as getAddAccountUnsavedChanges,
  isNonNegativeAccountInput as isNonNegativeInput,
  parseNonNegativeAccountAmount as parseNonNegativeAmount,
  sanitizeNonNegativeAccountInput as sanitizeNonNegativeInput
} from './features/account/accountEditorLogic';
import {
  filterArchivedAccountsForRestore,
  type ArchivedRestoreSource
} from './features/account/archivedAccountLogic';
import {
  DEFAULT_ASSET_CHART_SETTINGS,
  formatChartNumber,
  getGlobalAccountDetailChartSettings,
  normalizeAccountDetailChartSettings,
  normalizeAssetChartSettings,
  normalizeCategoryDetailChartSettings,
  useChartDataController
} from './features/charts';
import { useDashboardController } from './features/dashboard/useDashboardController';
import { useFlashNoteController } from './features/flashNote/useFlashNoteController';
import {
  createAccountHistoryRecordListProps,
  createHistoryRecordListProps
} from './features/history/historyGroupLogic';
import { useHistoryController } from './features/history/useHistoryController';
import {
  useRollupImportController
} from './features/rollupImport';
import {
  GLOBAL_SETTINGS_SEARCH_ITEMS,
  isGlobalSettingsSection
} from './features/settings/settingsSectionLogic';
import type {
  GlobalSettingsSection,
  SettingsPageProps
} from './features/settings/settingsPageTypes';
import {
  DEFAULT_AUTO_BACKUP_SETTINGS,
  getBackupMethodLabel
} from './features/backup/snapshotBackupLogic';
import { useSnapshotBackupController } from './features/backup/useSnapshotBackupController';
import { useSecuritySettingsController } from './features/security/useSecuritySettingsController';
import { useUserSettingsFileController } from './features/userSettings/useUserSettingsFileController';

import {
  getAccountDisplayMark,
  getEffectiveAccountAbbreviation
} from './accountMark';
import {
  getAccountOperationTodayDateValue,
  isFutureAccountOperationDateValue,
  shiftAccountOperationCalendarMonth,
  toAccountOperationDateValue
} from './accountOperationDate';
import {
  cloneCategoryChartSettings,
  isChartColorAssignmentMode,
  normalizeGlobalChartControlMode,
  syncCategoryChartSettingsFromGlobal
} from './chartLogic';
import {
  EXAMPLE_TEMPLATES,
  createExampleData,
  createExtremeExampleData
} from './exampleData';
import {
  isHomeAssetStatLabelMode,
  isHomeAssetStatMetric
} from './homeAssetStats';
import {
  formatCurrencyMoneyValue,
  formatHomeMoney,
  formatMoneyValue
} from './money';
import {
  useSearchTargetHighlightController
} from './search/searchHighlightLogic';
import {
  resolveSearchNavigationTarget
} from './search/searchNavigationLogic';
import { useGlobalSearchController } from './search/useGlobalSearchController';

import type {
  Account,
  AccountPointer,
  AccountTypeNature,
  AppData,
  ArchivedAccountEntry,
  AssetGroup,
  AssetGroupWithAccounts,
  AutoBackupSettings,
  BackupRecord,
  CommitAppDataUpdate,
  HistoryRecord,
  HistoryType,
  SnapshotImportRecord
} from './app/types';
import type { FlashHistoryRecordInput } from './features/flashNote/flashNoteWriteLogic';
import type { QuickEntryAccountGroup } from './features/quickEntry';
import type {
  AccountDetailChartSettings,
  AssetChartSettings,
  CategoryDetailChartSettings,
  HomeThumbnailChartSettings,
} from './features/charts';
import type { ExampleTemplateId } from './exampleData';
import type {
  CreateSearchIndexOptions,
  SearchNavigationTarget
} from './search/searchTypes';
import type {
  GlobalSettings,
  PositiveNegativeColorMode,
  ResolvedTheme,
  ThemeStyle
} from './features/security/securitySettingsTypes';


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



type GroupPointerInteraction = {

  pointerId: number;

  groupId: string;

  startX: number;

  startY: number;

  moved: boolean;

  longPressTriggered: boolean;

};

type GroupDropIndicator = {
  groupId: string;
  position: 'before' | 'after';
} | null;



type SignedAmountCssVariables = CSSProperties & {

  '--signed-positive-color': string;

  '--signed-negative-color': string;

  '--signed-positive-background': string;

  '--signed-negative-background': string;

};



type HistoryPanelView = 'history' | 'backup';

type BackupReturnTarget = 'history' | 'global-settings-backup';



type SearchNavigationSnapshot = {

  selectedAccount: AccountPointer;

  selectedGroupDetailId: string;

  isAccountChartsOpen: boolean;

  expandedGroupIds: string[];

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

const GROUP_CLICK_DELAY_MS = 220;

const GROUP_DOUBLE_CLICK_MS = 320;

const GROUP_POINTER_MOVE_THRESHOLD_PX = 7;

const SECRET_CONSOLE_LONG_PRESS_MS = 1500;

const SECRET_CONSOLE_DEFAULT_PLACEHOLDER = '嘘...轻一点';

const SECRET_CONSOLE_TEST_DATA_SUCCESS = '示例数据已写入真实数据';

const SECRET_CONSOLE_EXTREME_TEST_DATA_SUCCESS = '极端测试数据已写入真实数据';

const SECRET_CONSOLE_AUTO_BACKUP_DUE_ONCE_SUCCESS = '已设置下次启动自动备份检测命中';

const SECRET_CONSOLE_NYAA_SUCCESS = '已解锁nyaa主题';

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

const startupPersistenceState = (() => {
  try {
    return {
      snapshot: readRuntimePersistenceSnapshot(),
      error: null
    };
  } catch (error) {
    console.error('[NetraFlow persistence] Failed to read startup documents.', error);

    return {
      snapshot: {
        core: createDefaultCoreDocument(),
        settings: createDefaultSettingsDocument(),
        state: createDefaultStateDocument(),
        security: createDefaultSecurityDocument(),
        coreProtection: {
          enabled: false,
          locked: false
        }
      },
      error
    };
  }
})();

const startupPersistenceSnapshot = startupPersistenceState.snapshot;
const startupPersistenceError = startupPersistenceState.error;
const startupAppData = createAppDataFromCoreDocument(startupPersistenceSnapshot.core);
const startupFirstWelcomeState = normalizeFirstWelcomeState(
  startupPersistenceSnapshot.state.firstWelcome
);
const startupGlobalSettings = createRuntimeGlobalSettings(
  startupPersistenceSnapshot.settings,
  startupPersistenceSnapshot.state,
  startupPersistenceSnapshot.security,
  startupPersistenceSnapshot.coreProtection
);
const startupBackupState = getRuntimeBackupState(
  startupPersistenceSnapshot.state,
  startupAppData.history.length
);

const arePersistenceDocumentsEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);


const FIRST_WELCOME_STORY_ROUTES: FirstWelcomeStoryRoute[] = [

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



const getStringField = (value: Record<string, unknown>, fieldNames: string[]) => {

  for (const fieldName of fieldNames) {

    const fieldValue = value[fieldName];



    if (typeof fieldValue === 'string') {

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



const normalizeHistoryType = (type: unknown): HistoryType | null => {

  if (type === '创建' || type === '删除' || type === '修改' || type === '重新启用') {

    return type;

  }



  if (type === '归档' || type === '已归档') {

    return '归档';

  }



  return null;

};



const DEFAULT_HISTORY_TYPE: HistoryType = '修改';



const normalizeStoredAccountData = (
  groupsValue: unknown,
  accountsValue?: unknown
) => normalizeGroupsAndAccounts(groupsValue, accountsValue);



const findAccountByLegacyRecord = (

  groups: AssetGroupWithAccounts[],

  groupName: string,

  accountName: string

) =>

  groups

    .find((group) => group.name === groupName)

    ?.accounts.find((account) => account.name === accountName);



const findAccountById = (groups: AssetGroupWithAccounts[], accountId: string) => {

  for (const group of groups) {

    const account = group.accounts.find((currentAccount) => currentAccount.id === accountId);



    if (account) {

      return { group, account };

    }

  }



  return undefined;

};



const normalizeHistory = (value: unknown, groups: AssetGroupWithAccounts[]): HistoryRecord[] => {

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



const getBackupAccountData = (value: unknown) => {
  if (Array.isArray(value)) {
    return normalizeStoredAccountData(value);
  }

  const groupsValue = getBackupFieldValue(value, ['groups', 'assetGroups']);
  const accountsValue = getBackupFieldValue(value, ['accounts']);

  return Array.isArray(groupsValue) || isPlainObject(groupsValue) || accountsValue !== undefined
    ? normalizeStoredAccountData(groupsValue ?? [], accountsValue)
    : { groups: [], accounts: [] };
};



const getBackupHistory = (value: unknown, groups: AssetGroupWithAccounts[]) => {

  const historyValue = getBackupFieldValue(value, ['history', 'historyRecords']);



  return Array.isArray(historyValue) || isPlainObject(historyValue)

    ? normalizeHistory(historyValue, groups)

    : [];

};



const saveAppData = (

  { groups, accounts, history }: AppData,

  options: {
    allowEmptyHistoryOverwrite?: boolean;
    allowExternalCoreOverwrite?: boolean;
  } = {}

) => {
  writeCoreDocument(
    createCoreDocumentFromAppData({ groups, accounts, history }),
    {
      allowExternalCoreOverwrite: options.allowExternalCoreOverwrite
    }
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



const getAccountMark = (account: Account) => getAccountDisplayMark(account);



const getArchivedAccountRestoreTitle = (account: ArchivedAccountEntry) => {

  const groupName = account.groupName.trim();



  return groupName ? `${groupName} - ${account.name}` : account.name;

};



const getAccountDetailTitle = (groupName: string | undefined, accountName: string) => {

  const trimmedGroupName = groupName?.trim() ?? '';



  return trimmedGroupName ? `${trimmedGroupName} - ${accountName}` : accountName;

};

const getStartupPersistenceErrorCode = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const matches = message.match(/[A-Z][A-Z0-9_]+/g);

  return matches?.[matches.length - 1] ?? 'PERSISTENCE_READ_FAILED';
};

type AppCoreSaveRequest = CoreSaveRequest<AppData>;

type CoreIntegrityPromptState = {
  pendingSave: AppCoreSaveRequest | null;
  onAcknowledge?: () => void;
  onContinueSave?: () => void;
};

function StartupPersistenceErrorScreen({ error }: { error: unknown }) {
  const errorCode = getStartupPersistenceErrorCode(error);

  return (
    <FatalErrorPage
      title="核心数据无法读取"
      description="核心数据异常，NetraFlow 无法正常读取"
      suggestion="检查 core.json 后重启"
      technicalInfo={`错误代码 ${errorCode}`}
      primaryAction={{
        label: '打开数据目录',
        onClick: () => {
          void window.electronAPI?.openUserDataDirectory?.();
        }
      }}
      secondaryAction={{
        label: '退出 NetraFlow',
        onClick: () => {
          if (window.electronAPI?.forceClose) {
            window.electronAPI.forceClose();
          } else {
            window.close();
          }
        }
      }}
    />
  );
}



function App() {

  if (startupPersistenceError) {
    return <StartupPersistenceErrorScreen error={startupPersistenceError} />;
  }

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

  const groupClickTimerRef = useRef<number | null>(null);

  const groupDoubleClickCandidateRef = useRef<{ groupId: string; time: number } | null>(null);

  const suppressGroupClickRef = useRef(false);

  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  const rollupFileInputRef = useRef<HTMLInputElement | null>(null);

  const userSettingsFileInputRef = useRef<HTMLInputElement | null>(null);

  const globalSearchControllerRef = useRef<{ clearNavigation: () => void } | null>(null);

  const newAccountTypeInputRef = useRef<HTMLInputElement | null>(null);

  const autoSnapshotCycleInputRef = useRef<HTMLInputElement | null>(null);

  const catPetTimerRef = useRef<number | null>(null);

  const secretConsoleInputRef = useRef<HTMLInputElement | null>(null);

  const secretConsoleLongPressTimerRef = useRef<number | null>(null);

  const secretConsoleHighlightTimerRef = useRef<number | null>(null);

  const lastCatPetAtRef = useRef(0);

  const catPetCountRef = useRef(0);

  const settingsDocumentRef = useRef<SettingsDocument>(startupPersistenceSnapshot.settings);

  const stateDocumentRef = useRef<StateDocument>(startupPersistenceSnapshot.state);

  const securityDocumentRef = useRef<SecurityDocument>(startupPersistenceSnapshot.security);

  const persistenceGenerationRef = useRef(0);

  const coreSaveCoordinatorRef = useRef<CoreSaveCoordinator<AppData> | null>(null);

  const closeBeforeControllerRef = useRef(createCloseBeforeController());

  const latestRealAppDataRef = useRef<AppData>(cloneAppData(startupAppData));

  const [appData, setAppData] = useState<AppData>(() => cloneAppData(startupAppData));
  const [runtimePersistenceError, setRuntimePersistenceError] = useState<unknown | null>(null);
  const [coreIntegrityPrompt, setCoreIntegrityPrompt] =
    useState<CoreIntegrityPromptState | null>(() =>
      'integrityWarning' in startupPersistenceSnapshot.coreProtection &&
      startupPersistenceSnapshot.coreProtection.integrityWarning &&
      !startupPersistenceSnapshot.coreProtection.locked
        ? { pendingSave: null }
        : null
    );

  const [, setFirstWelcomeState] = useState<FirstWelcomeState>(startupFirstWelcomeState);

  const [firstWelcomeStage, setFirstWelcomeStage] = useState<FirstWelcomeStage>(() =>

    shouldShowFirstWelcome(startupFirstWelcomeState) ? 'welcome' : null

  );

  const [selectedAccount, setSelectedAccount] = useState<AccountPointer>(null);

  const [isQuickSingleEntryAccountPickerOpen, setIsQuickSingleEntryAccountPickerOpen] =

    useState(false);

  const [isRollupImportOpen, setIsRollupImportOpen] = useState(false);

  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

  const [isGroupEditMode, setIsGroupEditMode] = useState(false);

  const [isAddingAccount, setIsAddingAccount] = useState(false);

  const [isArchivedAccountsOpen, setIsArchivedAccountsOpen] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [historyPanelView, setHistoryPanelView] = useState<HistoryPanelView>('history');

  const [backupReturnTarget, setBackupReturnTarget] =

    useState<BackupReturnTarget>('history');

  const [assetChartSettings, setAssetChartSettings] = useState(
    startupPersistenceSnapshot.settings.assetChart
  );

  const [globalSettings, setGlobalSettings] = useState(startupGlobalSettings);

  const [selectedExampleTemplateId, setSelectedExampleTemplateId] =

    useState<ExampleTemplateId>('light');

  const [isExampleMode, setIsExampleMode] = useState(false);

  const renderPersistenceGeneration = persistenceGenerationRef.current;

  const isCurrentPersistenceGeneration = () =>
    renderPersistenceGeneration === persistenceGenerationRef.current;

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  const [isAccountActionMenuOpen, setIsAccountActionMenuOpen] = useState(false);

  const {
    confirmationDialog,
    noticeDialog,
    inputDialog,
    inputDialogValue,
    requestConfirmationDialog,
    showConfirmationDialog,
    closeConfirmationDialog,
    confirmAndClose,
    showNoticeDialog,
    closeNoticeDialog,
    requestInputDialog,
    closeInputDialog,
    confirmInputDialog,
    setInputDialogValue,
    getImportContentAfterIntegrityCheck
  } = useAppDialogController();

  const [isCatPetted, setIsCatPetted] = useState(false);

  const [isSecretConsoleOpen, setIsSecretConsoleOpen] = useState(false);

  const [secretConsoleInput, setSecretConsoleInput] = useState('');

  const [secretConsolePlaceholder, setSecretConsolePlaceholder] = useState(

    SECRET_CONSOLE_DEFAULT_PLACEHOLDER

  );

  const [isSecretConsoleHighlighted, setIsSecretConsoleHighlighted] = useState(false);

  const [expandedDetailDates, setExpandedDetailDates] = useState<string[]>([]);

  const [groupDetailNameDraft, setGroupDetailNameDraft] = useState('');

  const [groupDetailNatureDraft, setGroupDetailNatureDraft] =

    useState<AccountTypeNature>('asset');

  const [groupDetailStatsDraft, setGroupDetailStatsDraft] = useState(true);

  const [groupDetailError, setGroupDetailError] = useState('');

  const [draggingGroupId, setDraggingGroupId] = useState('');

  const [groupDropIndicator, setGroupDropIndicator] = useState<GroupDropIndicator>(null);

  const [newAccountGroupId, setNewAccountGroupId] = useState('');

  const [newAccountTypeInput, setNewAccountTypeInput] = useState('');

  const [newAccountTypeInputPlaceholder, setNewAccountTypeInputPlaceholder] = useState('');

  const [newAccountName, setNewAccountName] = useState('');

  const [newAccountNamePlaceholder, setNewAccountNamePlaceholder] = useState('');

  const [newAccountAmount, setNewAccountAmount] = useState('');

  const [newAccountError, setNewAccountError] = useState('');

  const [archivedAccountSearchQuery, setArchivedAccountSearchQuery] = useState('');

  const [isTotalChartsOpen, setIsTotalChartsOpen] = useState(false);

  const [isAccountChartsOpen, setIsAccountChartsOpen] = useState(false);

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  const [selectedGroupDetailId, setSelectedGroupDetailId] = useState('');

  const [globalSettingsSection, setGlobalSettingsSection] =

    useState<GlobalSettingsSection>('appearance');

  const { toastMessages, showToast, dismissToast } = useToastController();

  const showCoreIntegrityPrompt = (pendingSave: AppCoreSaveRequest | null) => {
    closeConfirmationDialog();
    setCoreIntegrityPrompt((currentPrompt) =>
      currentPrompt
        ? {
            ...currentPrompt,
            pendingSave: pendingSave ?? currentPrompt.pendingSave
          }
        : { pendingSave }
    );
  };

  const showCoreIntegrityActionPrompt = ({
    pendingSave = null,
    onAcknowledge,
    onContinueSave
  }: {
    pendingSave?: AppCoreSaveRequest | null;
    onAcknowledge?: () => void;
    onContinueSave?: () => void;
  }) => {
    closeConfirmationDialog();
    setCoreIntegrityPrompt({
      pendingSave,
      onAcknowledge,
      onContinueSave
    });
  };

  const acknowledgeCurrentCoreIntegrity = () => {
    acknowledgeCoreIntegrityIssue();
  };

  const coreSaveCoordinator =
    coreSaveCoordinatorRef.current ??
    createCoreSaveCoordinator<AppData>({
      timerApi: {
        setTimeout: (handler, delayMs) => window.setTimeout(handler, delayMs),
        clearTimeout: (timerId) => window.clearTimeout(timerId as number)
      },
      cloneAppData,
      saveAppData,
      isExternalCoreModificationError,
      showCoreIntegrityPrompt,
      onCoalescedSaveError: (error) => {
        console.error('[NetraFlow persistence] Failed to save coalesced core data.', error);
        setRuntimePersistenceError(error);
      }
    });
  coreSaveCoordinatorRef.current = coreSaveCoordinator;
  coreSaveCoordinator.setHandlers({
    timerApi: {
      setTimeout: (handler, delayMs) => window.setTimeout(handler, delayMs),
      clearTimeout: (timerId) => window.clearTimeout(timerId as number)
    },
    cloneAppData,
    saveAppData,
    isExternalCoreModificationError,
    showCoreIntegrityPrompt,
    onCoalescedSaveError: (error) => {
      console.error('[NetraFlow persistence] Failed to save coalesced core data.', error);
      setRuntimePersistenceError(error);
    }
  });

  const clearCoreAutoSaveTimer = coreSaveCoordinator.clearAutoSaveTimer;

  const getLatestPendingCoreSaveRequest =
    coreSaveCoordinator.getLatestPendingSaveRequest;

  const hasPendingCoreSaveData = coreSaveCoordinator.hasPendingSaveData;

  const flushLatestCoreSave = coreSaveCoordinator.flushLatestSave;

  const saveAppDataWithExternalModificationCheck = (
    nextAppData: AppData,
    options: { allowEmptyHistoryOverwrite?: boolean } = {},
    onSaved: () => void,
    scheduleOptions: CoreSaveScheduleOptions = {}
  ) => {
    return coreSaveCoordinator.saveWithExternalModificationCheck(
      nextAppData,
      options,
      onSaved,
      scheduleOptions
    );
  };

  const acknowledgeCoreIntegrityPrompt = () => {
    if (closeBeforeControllerRef.current.handleAcknowledgePrompt()) {
      return;
    }

    const prompt = coreIntegrityPrompt;

    try {
      acknowledgeCurrentCoreIntegrity();
    } catch (error) {
      console.error('[NetraFlow persistence] Failed to acknowledge core integrity issue.', error);
      return;
    }

    if (prompt?.pendingSave) {
      coreSaveCoordinator.acknowledgePendingSaveWithoutPersisting(
        prompt.pendingSave.revision
      );
    }

    prompt?.onAcknowledge?.();
    setCoreIntegrityPrompt(null);
  };

  const continueCoreIntegritySave = () => {
    if (closeBeforeControllerRef.current.handleContinueSavePrompt()) {
      return;
    }

    const pendingSave = coreIntegrityPrompt?.pendingSave;

    if (coreIntegrityPrompt?.onContinueSave) {
      try {
        acknowledgeCurrentCoreIntegrity();
      } catch (error) {
        console.error('[NetraFlow persistence] Failed to acknowledge core integrity issue.', error);
        return;
      }

      const continueSave = coreIntegrityPrompt.onContinueSave;
      setCoreIntegrityPrompt(null);
      continueSave();
      return;
    }

    if (!pendingSave) {
      acknowledgeCoreIntegrityPrompt();
      return;
    }

    try {
      acknowledgeCurrentCoreIntegrity();
    } catch (error) {
      console.error('[NetraFlow persistence] Failed to acknowledge core integrity issue.', error);
      return;
    }

    setCoreIntegrityPrompt(null);
    clearCoreAutoSaveTimer();
    void flushLatestCoreSave(true);
  };

  const forceCloseApp = () => {
    if (window.electronAPI?.forceClose) {
      window.electronAPI.forceClose();
      return;
    }

    window.close();
  };

  const allowControlledAppClose = () => {
    if (window.electronAPI?.allowClose) {
      window.electronAPI.allowClose();
      return;
    }

    forceCloseApp();
  };

  const cancelControlledAppCloseRequest = () => {
    window.electronAPI?.cancelCloseRequest?.();
  };

  const acknowledgePendingSaveWithoutPersisting = () => {
    coreSaveCoordinator.acknowledgePendingSaveWithoutPersisting();
  };

  closeBeforeControllerRef.current.setHandlers({
    hasRuntimePersistenceError: () => runtimePersistenceError !== null,
    hasVisibleIntegrityPrompt: () => coreIntegrityPrompt !== null,
    upgradeVisibleIntegrityPromptForClose: () => {
      closeConfirmationDialog();
      const pendingSave = getLatestPendingCoreSaveRequest();

      setCoreIntegrityPrompt((currentPrompt) =>
        currentPrompt
          ? {
              ...currentPrompt,
              pendingSave: pendingSave ?? currentPrompt.pendingSave
            }
          : { pendingSave }
      );
    },
    readHasIntegrityWarning: () =>
      Boolean(readRuntimePersistenceSnapshot().coreProtection.integrityWarning),
    hasPendingSave: hasPendingCoreSaveData,
    showIntegrityPromptForClose: () => {
      showCoreIntegrityPrompt(getLatestPendingCoreSaveRequest());
    },
    acknowledgeCoreIntegrity: acknowledgeCurrentCoreIntegrity,
    acknowledgePendingSaveWithoutPersisting,
    flushPendingSaveForClose: flushLatestCoreSave,
    reportRuntimePersistenceError: (error) => {
      console.error('[NetraFlow persistence] Failed to complete close-before flow.', error);
      setRuntimePersistenceError(error);
    },
    clearIntegrityPrompt: () => {
      setCoreIntegrityPrompt(null);
    },
    allowClose: allowControlledAppClose,
    cancelCloseRequest: cancelControlledAppCloseRequest
  });

  const requestControlledAppClose = () => {
    closeBeforeControllerRef.current.requestClose();
  };

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onCloseRequest?.(requestControlledAppClose);

    return () => {
      unsubscribe?.();
    };
  }, [coreIntegrityPrompt, runtimePersistenceError]);

  const persistSettingsDocument = (document: SettingsDocument) => {
    if (!isCurrentPersistenceGeneration()) {
      return;
    }

    const normalizedDocument = normalizeSettingsDocument(document);

    if (arePersistenceDocumentsEqual(settingsDocumentRef.current, normalizedDocument)) {
      return;
    }

    writeSettingsDocument(normalizedDocument);
    settingsDocumentRef.current = normalizedDocument;
  };

  const persistStateDocument = (
    createNextDocument: (currentDocument: StateDocument) => StateDocument
  ) => {
    if (!isCurrentPersistenceGeneration()) {
      return stateDocumentRef.current;
    }

    const normalizedDocument = normalizeStateDocument(
      createNextDocument(stateDocumentRef.current)
    );

    if (arePersistenceDocumentsEqual(stateDocumentRef.current, normalizedDocument)) {
      return stateDocumentRef.current;
    }

    writeStateDocument(normalizedDocument);
    stateDocumentRef.current = normalizedDocument;
    return normalizedDocument;
  };

  const persistSecurityDocument = (document: SecurityDocument) => {
    if (!isCurrentPersistenceGeneration()) {
      return;
    }

    const normalizedDocument = normalizeSecurityDocument(document);

    if (arePersistenceDocumentsEqual(securityDocumentRef.current, normalizedDocument)) {
      return;
    }

    writeSecurityDocument(normalizedDocument);
    securityDocumentRef.current = normalizedDocument;
  };

  const saveAssetChartSettings = (settings: AssetChartSettings) => {
    persistSettingsDocument({
      ...settingsDocumentRef.current,
      assetChart: normalizeAssetChartSettings(settings)
    });
  };

  const persistAutoBackupSettings = (settings: AutoBackupSettings) => {
    persistSettingsDocument({
      ...settingsDocumentRef.current,
      autoBackup: settings
    });
  };

  const saveGlobalSettings = (settings: GlobalSettings) => {
    const normalizedSettings = normalizeGlobalSettings(settings);
    const nextSettingsDocument = createSettingsDocumentFromRuntime({
      autoBackupSettings: settingsDocumentRef.current.autoBackup,
      assetChartSettings: settingsDocumentRef.current.assetChart,
      globalSettings: normalizedSettings
    });
    const nextSecurityDocument = createSecurityDocumentFromRuntime(normalizedSettings);
    const shouldPersistNyaaThemeUnlocked = normalizedSettings.nyaaThemeUnlocked === true;
    const currentPersonalization = stateDocumentRef.current.personalization;
    const { nyaaThemeUnlocked: _currentNyaaThemeUnlocked, ...otherPersonalization } =
      currentPersonalization;

    persistSettingsDocument(nextSettingsDocument);
    persistSecurityDocument(nextSecurityDocument);
    persistStateDocument((currentDocument) => ({
      ...currentDocument,
      personalization: shouldPersistNyaaThemeUnlocked
        ? { ...otherPersonalization, nyaaThemeUnlocked: true }
        : otherPersonalization
    }));
  };

  const persistBackupState = ({
    records,
    lastBackupAt,
    lastBackupHistoryCount
  }: {
    records: BackupRecord[];
    lastBackupAt: string;
    lastBackupHistoryCount: number;
  }) => {
    persistStateDocument((currentDocument) => ({
      ...currentDocument,
      backup: {
        ...(lastBackupAt ? { lastBackupAt } : {}),
        lastBackupHistoryCount: Math.max(0, Math.floor(lastBackupHistoryCount)),
        records,
        importRecords: currentDocument.backup.importRecords,
        ...(currentDocument.backup.forceAutoBackupDueOnce
          ? { forceAutoBackupDueOnce: true as const }
          : {})
      }
    }));
  };

  const persistSnapshotImportRecords = (records: SnapshotImportRecord[]) => {
    persistStateDocument((currentDocument) => ({
      ...currentDocument,
      backup: {
        ...currentDocument.backup,
        importRecords: records
      }
    }));
  };

  const markAutoBackupDueOnce = () => {
    persistStateDocument((currentDocument) => ({
      ...currentDocument,
      backup: {
        ...currentDocument.backup,
        forceAutoBackupDueOnce: true
      }
    }));
  };

  const consumeAutoBackupDueOnce = () => {
    if (stateDocumentRef.current.backup.forceAutoBackupDueOnce !== true) {
      return false;
    }

    persistStateDocument((currentDocument) => {
      const { forceAutoBackupDueOnce: _forceAutoBackupDueOnce, ...backup } =
        currentDocument.backup;

      return {
        ...currentDocument,
        backup
      };
    });

    return true;
  };

  const resolvedTheme = useMemo(

    () => resolveThemeMode(globalSettings.themeMode, systemTheme),

    [globalSettings.themeMode, systemTheme]

  );

  const effectiveThemeStyle: ThemeStyle = globalSettings.nyaaThemeUnlocked

    ? globalSettings.themeStyle

    : 'default';

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

    const root = document.documentElement;

    root.dataset.themeMode = globalSettings.themeMode;

    root.dataset.theme = resolvedTheme;

    root.dataset.resolvedTheme = resolvedTheme;

    root.dataset.themeStyle = effectiveThemeStyle;

    root.style.setProperty('color-scheme', resolvedTheme);

    root.style.removeProperty('background-color');

  }, [effectiveThemeStyle, globalSettings.themeMode, resolvedTheme]);



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



  useEffect(

    () => () => {

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



      if (groupClickTimerRef.current !== null) {

        window.clearTimeout(groupClickTimerRef.current);

        groupClickTimerRef.current = null;

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



  const { groups: assetGroups, accounts, history } = appData;
  const groups = useMemo(
    () => deriveGroupsWithAccounts(assetGroups, accounts),
    [assetGroups, accounts]
  );

  const newAccountTypeMatch = findBestAccountTypeMatch(groups, newAccountTypeInput);

  const newAccountTypeGhostText = getAccountTypeGhostText(

    newAccountTypeInput,

    newAccountTypeMatch

  );

  const historyController = useHistoryController({
    history,
    selectedAccountId: selectedAccount?.accountId ?? '',
    onHistoryInteraction: () => globalSearchControllerRef.current?.clearNavigation()
  });

  const {
    historyStartDate,
    historyEndDate,
    historyRangeInput,
    historyRangeInputPlaceholder,
    calendarMonth,
    calendarSecondMonth,
    isCalendarVisible,
    sortedHistory,
    filteredHistory,
    selectedAccountHistory,
    selectedAccountHistoryByDate
  } = historyController;



  const archivedAccounts: ArchivedAccountEntry[] = useMemo(
    () => getArchivedAccountEntries(groups, accounts, history),
    [groups, accounts, history]
  );

  const selectedGroupDetail = selectedGroupDetailId

    ? groups.find((group) => group.id === selectedGroupDetailId)

    : undefined;

  const filteredArchivedAccountsForRestore = filterArchivedAccountsForRestore(
    archivedAccounts,
    archivedAccountSearchQuery
  );

  const selectedGroup = selectedAccount

    ? groups.find((group) => group.id === selectedAccount.groupId)

    : undefined;

  const selectedAccountEntry = selectedGroup?.accounts.find(

    (account) => account.id === selectedAccount?.accountId

  );

  const homeAssetStatSettings = useMemo(
    () => ({
      homeAssetStatMetric: globalSettings.homeAssetStatMetric,
      homeAssetStatLabelMode: globalSettings.homeAssetStatLabelMode,
      homeAssetStatCompact: globalSettings.homeAssetStatCompact
    }),
    [
      globalSettings.homeAssetStatMetric,
      globalSettings.homeAssetStatLabelMode,
      globalSettings.homeAssetStatCompact
    ]
  );
  const {
    accountGroups: groupTotals,
    dashboardStats,
    homeAssetStat,
    recentNetWorthChange,
    accountCount
  } = useDashboardController({
    groups,
    history,
    homeAssetStatSettings
  });
  const totalAssets = dashboardStats.netWorth;

  const {
    assetStructureData,
    homeGroupLegendColorByName,
    assetTrendPoints,
    homeThumbnailTrendPoints,
    homeThumbnailTrendSettings,
    shouldShowL0Charts,
    selectedGroupDetailChartSettings,
    selectedGroupDetailStructureData,
    selectedGroupDetailTrendData,
    selectedAccountChartSettings,
    selectedAccountTrendPoints,
    selectedAccountPreviewTrendSettings
  } = useChartDataController({
    groups,
    history,
    assetChartSettings,
    colorAssignmentMode: globalSettings.chartColorAssignmentMode,
    selectedGroupDetail,
    selectedAccountEntry
  });

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

  const selectedAccountTitle =

    selectedAccountEntry && selectedAccount

      ? getAccountDetailTitle(selectedGroup?.name ?? selectedAccount.groupName, selectedAccountEntry.name)

      : '';

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



  const completeFirstWelcome = () => {

    const nextState: FirstWelcomeState = {

      completed: true,

      pendingAfterClearAll: false

    };



    persistStateDocument((currentDocument) => ({
      ...currentDocument,
      firstWelcome: normalizeFirstWelcomeState(nextState)
    }));

    setFirstWelcomeState(nextState);

    setFirstWelcomeStage(null);

  };



  const markPendingFirstWelcomeAfterClearAll = () => {

    const nextState: FirstWelcomeState = {

      completed: false,

      pendingAfterClearAll: true

    };



    persistStateDocument((currentDocument) => ({
      ...currentDocument,
      firstWelcome: normalizeFirstWelcomeState(nextState)
    }));

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



      persistStateDocument((currentDocument) => ({
        ...currentDocument,
        firstWelcome: normalizeFirstWelcomeState(nextState)
      }));

      return nextState;

    });

    setFirstWelcomeStage(null);

  };



  const updateAppData = (nextData: AppData, scheduleOptions: CoreSaveScheduleOptions = {}) => {
    if (!isCurrentPersistenceGeneration()) {
      return;
    }

    const normalizedData: AppData = {
      groups: stripRuntimeAccountsFromGroups(nextData.groups),
      accounts: nextData.accounts,
      history: nextData.history
    };

    saveAppDataWithExternalModificationCheck(
      normalizedData,
      {},
      () => {
        if (!isExampleMode) {
          latestRealAppDataRef.current = cloneAppData(normalizedData);
        }

        globalSearch.clearNavigation();

        setAppData(normalizedData);

        if (!isExampleMode) {
          cancelPendingFirstWelcomeForRealChange();
        }
      },
      scheduleOptions
    );

  };

  const commitAppDataUpdate: CommitAppDataUpdate = (apply) => {
    if (!isCurrentPersistenceGeneration()) {
      return { ok: false };
    }

    const coordinator = coreSaveCoordinator.getState();
    const latestData =
      coordinator.dirtyRevision > coordinator.persistedRevision
        ? cloneAppData(latestRealAppDataRef.current)
        : createAppDataFromCoreDocument(readCoreDocument());
    const outcome = apply(latestData);

    if (!outcome.ok) {
      return outcome;
    }

    const normalizedData: AppData = {
      groups: stripRuntimeAccountsFromGroups(outcome.nextData.groups),
      accounts: outcome.nextData.accounts,
      history: outcome.nextData.history
    };

    const saved = saveAppDataWithExternalModificationCheck(normalizedData, {}, () => {
      if (!isExampleMode) {
        latestRealAppDataRef.current = cloneAppData(normalizedData);
      }

      globalSearch.clearNavigation();
      setAppData(normalizedData);

      if (!isExampleMode) {
        cancelPendingFirstWelcomeForRealChange();
      }
    });

    if (!saved) {
      return { ok: false };
    }

    return {
      ok: true,
      nextData: normalizedData,
      value: outcome.value
    };
  };



  const updateAssetChartSettings = (

    createNextSettings: (currentSettings: AssetChartSettings) => AssetChartSettings

  ) => {

    setAssetChartSettings((currentSettings) => {

      if (!isCurrentPersistenceGeneration()) {
        return currentSettings;
      }

      const nextSettings = normalizeAssetChartSettings(createNextSettings(currentSettings));



      saveAssetChartSettings(nextSettings);

      return nextSettings;

    });
  };



  const updateGlobalSettings = (

    createNextSettings: (currentSettings: GlobalSettings) => GlobalSettings

  ) => {

    setGlobalSettings((currentSettings) => {

      if (!isCurrentPersistenceGeneration()) {
        return currentSettings;
      }

      const nextSettings = normalizeGlobalSettings(createNextSettings(currentSettings));



      saveGlobalSettings(nextSettings);

      return nextSettings;

    });
  };

  const syncCreatedAccountTypeSideEffects = (group: AssetGroup) => {
    updateAssetChartSettings((currentSettings) => ({
      ...currentSettings,
      categoryDetailById: {
        ...currentSettings.categoryDetailById,
        [group.id]: cloneCategoryChartSettings(currentSettings.globalCategoryDetail)
      }
    }));
    setNewAccountGroupId(group.id);
    setNewAccountTypeInput(group.name);
    setNewAccountTypeInputPlaceholder('');
  };

  const syncUpdatedAccountTypeSideEffects = ({
    groupId,
    previousName,
    nextName
  }: {
    groupId: string;
    previousName: string;
    nextName: string;
  }) => {
    if (previousName !== nextName) {
      updateAssetChartSettings((currentSettings) => {
        const preservedSettings =
          currentSettings.categoryDetailById[groupId] ??
          currentSettings.globalCategoryDetail;
        const nextSettingsById = { ...currentSettings.categoryDetailById };

        nextSettingsById[groupId] = cloneCategoryChartSettings(preservedSettings);

        return {
          ...currentSettings,
          categoryDetailById: nextSettingsById
        };
      });
    }

    setNewAccountTypeInput((typeInput) => (typeInput === previousName ? nextName : typeInput));
    setSelectedAccount((account) =>
      account?.groupId === groupId ? { ...account, groupName: nextName } : account
    );
    accountOperations.syncAccountGroupName(groupId, nextName);
  };

  const {
    accountTypeEditor,
    isAccountTypeEditorVisible,
    accountTypeNameDraft,
    setAccountTypeNameDraft,
    accountTypeNatureDraft,
    setAccountTypeNatureDraft,
    accountTypeStatsDraft,
    setAccountTypeStatsDraft,
    accountTypeError,
    setAccountTypeError,
    hasAccountTypeUnsavedChanges,
    openCreateAccountType,
    closeAccountTypeEditor,
    saveAccountType
  } = useAccountTypeController({
    appData: { groups: assetGroups, accounts, history },
    groups,
    archivedAccounts,
    createGroupId: () => createStableGroupId(assetGroups.map((group) => group.id)),
    commitAppDataUpdate,
    onCreateAccountType: syncCreatedAccountTypeSideEffects,
    onUpdateAccountType: syncUpdatedAccountTypeSideEffects
  });

  const {
    lastBackupAt,
    lastBackupHistoryCount,
    backupRecords,
    snapshotImportRecords,
    autoBackupSettings,
    autoBackupDraft,
    autoBackupCycleValueInput,
    setAutoBackupCycleValueInput,
    incrementalRecordValue,
    hasAutoBackupDraftChanges,
    canSaveAutoBackupSettings,
    applyBackupState,
    resetSnapshotImportRecords,
    resetAutoBackupSettings,
    resetAutoBackupDraft,
    updateAutoBackupEnabled,
    updateAutoBackupCycleValue,
    adjustAutoBackupCycleValue,
    updateAutoBackupCycleUnit,
    selectAutoBackupDirectory,
    saveAutoBackupDraft,
    exportBackup,
    importBackup
  } = useSnapshotBackupController({
    productName: PRODUCT_NAME_EN,
    assetGroups,
    accounts,
    history,
    isExampleMode,
    globalSettings,
    initialAutoBackupSettings: startupPersistenceSnapshot.settings.autoBackup,
    initialBackupState: startupBackupState,
    updateAppData,
    persistAutoBackupSettings,
    persistBackupState,
    persistSnapshotImportRecords,
    consumeAutoBackupDueOnce,
    isPersistenceCurrent: isCurrentPersistenceGeneration,
    clearSearchNavigation: () => globalSearch.clearNavigation(),
    getBackupFieldValue,
    getBackupAccountData,
    getBackupHistory,
    requestConfirmationDialog,
    requestInputDialog,
    showNoticeDialog,
    getImportContentAfterIntegrityCheck,
    showToast,
    dismissToast
  });

  const {
    isLocked,
    unlockPasswordInput,
    setUnlockPasswordInput,
    unlockError,
    setUnlockError,
    isUnlocking,
    passwordEditorMode,
    oldPasswordInput,
    setOldPasswordInput,
    newPasswordInput,
    setNewPasswordInput,
    confirmPasswordInput,
    setConfirmPasswordInput,
    passwordEditorError,
    setPasswordEditorError,
    isSavingPassword,
    autoLockMinutesInput,
    isPasswordDisableConfirmOpen,
    passwordDisableInput,
    setPasswordDisableInput,
    passwordDisableError,
    setPasswordDisableError,
    isDisablingPasswordProtection,
    isSnapshotEncryptionDisableConfirmOpen,
    snapshotEncryptionDisableInput,
    setSnapshotEncryptionDisableInput,
    snapshotEncryptionDisableError,
    setSnapshotEncryptionDisableError,
    isDisablingSnapshotEncryption,
    closePasswordDisableConfirm,
    resetPasswordEditor,
    requestOpenPasswordEditor,
    updatePasswordProtection,
    confirmDisablePasswordProtection,
    saveLoginPassword,
    closeSnapshotEncryptionDisableConfirm,
    updateSnapshotEncryption,
    updateForceSnapshotEncryption,
    confirmDisableSnapshotEncryption,
    updateAutoLockMinutesInput,
    resetInvalidAutoLockMinutesInput,
    unlockApp,
    resetSecurityState
  } = useSecuritySettingsController({
    globalSettings,
    initialCoreProtectionLocked: startupPersistenceSnapshot.coreProtection.locked,
    autoBackupEnabled: autoBackupSettings.enabled,
    getCurrentCoreDocument: () =>
      createCoreDocumentFromAppData({ groups: assetGroups, accounts, history }),
    unlockCoreDocument: (password) => {
      unlockCoreDocument(password);
    },
    enableCoreProtection,
    changeCorePassword,
    disableCoreProtection,
    lockCoreDocument,
    updateGlobalSettings,
    isPersistenceCurrent: isCurrentPersistenceGeneration,
    showConfirmationDialog,
    showCoreIntegrityDialog: showCoreIntegrityActionPrompt,
    showToast
  });

  const { exportUserSettings, importUserSettings } = useUserSettingsFileController({
    globalSettings,
    effectiveThemeStyle,
    assetChartSettings,
    isExampleMode,
    normalizeAssetChartSettings,
    updateGlobalSettings,
    setAssetChartSettings: (settings) => {
      if (isCurrentPersistenceGeneration()) {
        setAssetChartSettings(settings);
      }
    },
    saveAssetChartSettings,
    isPersistenceCurrent: isCurrentPersistenceGeneration,
    getImportContentAfterIntegrityCheck,
    showNoticeDialog
  });

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

    const categoryIds = groups.map((group) => group.id);



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

  const updateMainContentPosition = (value: string) => {

    if (!isMainContentPosition(value)) {

      return;

    }



    updateGlobalSettings((currentSettings) => ({

      ...currentSettings,

      mainContentPosition: value

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

    globalSearch.clearNavigation();

    setSelectedAccount(null);

    setSelectedGroupDetailId('');

    resetAccountOperations();

    closeAccountTypeEditor();

    setIsQuickSingleEntryAccountPickerOpen(false);

    setIsRollupImportOpen(false);
    rollupImport.dismissPage();

    setIsAddingAccount(false);

    setIsArchivedAccountsOpen(false);

    setIsAccountActionMenuOpen(false);

    setExpandedGroupIds([]);

    setExpandedDetailDates([]);

    globalSearch.closeSearch();

  };

  const createDemoRuntimePersistenceSnapshot = (
    templateId: ExampleTemplateId
  ): RuntimePersistenceSnapshot => {
    const generatedData = createExampleData(templateId);
    const settings = createDefaultSettingsDocument();
    const security = createDefaultSecurityDocument();
    const state = normalizeStateDocument({
      ...createDefaultStateDocument(),
      backup: {
        ...(generatedData.lastBackupAt ? { lastBackupAt: generatedData.lastBackupAt } : {}),
        lastBackupHistoryCount: generatedData.lastBackupHistoryCount,
        records: generatedData.backupRecords,
        importRecords: []
      },
      firstWelcome: {
        completed: true,
        pendingAfterClearAll: false
      }
    });

    return {
      core: createCoreDocumentFromAppData(generatedData.appData),
      settings,
      state,
      security,
      coreProtection: {
        enabled: false,
        locked: false
      }
    };
  };

  const applyRuntimePersistenceSnapshot = (
    snapshot: RuntimePersistenceSnapshot,
    nextIsExampleMode: boolean
  ) => {
    const nextAppData = createAppDataFromCoreDocument(snapshot.core);
    const nextFirstWelcomeState = normalizeFirstWelcomeState(snapshot.state.firstWelcome);
    const nextGlobalSettings = createRuntimeGlobalSettings(
      snapshot.settings,
      snapshot.state,
      snapshot.security,
      snapshot.coreProtection
    );
    const nextBackupState = getRuntimeBackupState(snapshot.state, nextAppData.history.length);

    settingsDocumentRef.current = snapshot.settings;
    stateDocumentRef.current = snapshot.state;
    securityDocumentRef.current = snapshot.security;

    setAppData(nextAppData);
    setAssetChartSettings(snapshot.settings.assetChart);
    setGlobalSettings(nextGlobalSettings);
    resetAutoBackupSettings(snapshot.settings.autoBackup);
    applyBackupState(
      nextBackupState.backupRecords,
      nextBackupState.lastBackupAt,
      nextBackupState.lastBackupHistoryCount,
      false
    );
    setFirstWelcomeState(nextFirstWelcomeState);
    setFirstWelcomeStage(shouldShowFirstWelcome(nextFirstWelcomeState) ? 'welcome' : null);
    setIsExampleMode(nextIsExampleMode);

    if (!nextIsExampleMode) {
      latestRealAppDataRef.current = cloneAppData(nextAppData);
    }
  };

  const showDemoLifecycleFailure = (error: unknown) => {
    const message =
      error instanceof Error && error.message.includes('程序所在目录不可写')
        ? error.message
        : '示例模式初始化失败，请稍后重试。';

    void showNoticeDialog({
      title: '示例模式不可用',
      message
    });
  };

  const maybeShowDemoCleanupFailure = (cleanup: unknown) => {
    if (isPlainObject(cleanup) && cleanup.ok === false) {
      void showNoticeDialog({
        title: '示例模式清理失败',
        message: '已恢复真实模式，但临时示例目录未能删除。下次启动会再次尝试清理。'
      });
    }
  };

  const startExampleModeSession = (templateId: ExampleTemplateId) => {
    try {
      const transition = enterDemoPersistenceEnvironment(
        createDemoRuntimePersistenceSnapshot(templateId)
      );

      persistenceGenerationRef.current += 1;
      setSelectedExampleTemplateId(templateId);
      applyRuntimePersistenceSnapshot(transition.snapshot, true);
      return true;
    } catch (error) {
      console.error('[NetraFlow demo] Failed to enter demo mode.', error);
      showDemoLifecycleFailure(error);
      return false;
    }
  };

  const switchExampleModeSession = (templateId: ExampleTemplateId) => {
    if (isExampleMode && !exitExampleModeSession()) {
      return false;
    }

    return startExampleModeSession(templateId);
  };

  const exitExampleModeSession = () => {
    try {
      const transition = exitDemoPersistenceEnvironment();

      persistenceGenerationRef.current += 1;
      applyRuntimePersistenceSnapshot(transition.snapshot, false);
      maybeShowDemoCleanupFailure(transition.cleanup);
      return true;
    } catch (error) {
      console.error('[NetraFlow demo] Failed to exit demo mode.', error);
      void showNoticeDialog({
        title: '退出示例模式失败',
        message: '真实数据重新读取失败，请重启应用后再试。'
      });
      return false;
    }
  };

  const promoteCurrentDemoCoreToRealData = () => {
    try {
      const transition = promoteDemoCoreToRealPersistenceEnvironment();

      persistenceGenerationRef.current += 1;
      applyRuntimePersistenceSnapshot(transition.snapshot, false);
      maybeShowDemoCleanupFailure(transition.cleanup);
      return true;
    } catch (error) {
      console.error('[NetraFlow demo] Failed to promote demo core to real data.', error);
      void showNoticeDialog({
        title: '写入测试数据失败',
        message: '当前示例数据未能写入真实数据，示例模式已保留。'
      });
      return false;
    }
  };

  const writeTestDataToRealData = () => {
    if (isExampleMode) {
      return promoteCurrentDemoCoreToRealData();
    }

    const nextAppData = createTestDataInRealAppData(createExampleData);

    return saveAppDataWithExternalModificationCheck(
      nextAppData,
      { allowEmptyHistoryOverwrite: true },
      () => {
        latestRealAppDataRef.current = cloneAppData(nextAppData);
        setAppData(nextAppData);
        setIsExampleMode(false);
      },
      { flush: true }
    );
  };

  const writeExtremeTestDataToRealData = () => {
    if (isExampleMode) {
      return promoteCurrentDemoCoreToRealData();
    }

    const nextAppData = createExtremeTestDataInRealAppData(createExtremeExampleData);

    return saveAppDataWithExternalModificationCheck(
      nextAppData,
      { allowEmptyHistoryOverwrite: true },
      () => {
        latestRealAppDataRef.current = cloneAppData(nextAppData);
        setAppData(nextAppData);
        setIsExampleMode(false);
      },
      { flush: true }
    );
  };



  const {
    resetConfirmation,
    resetConfirmationInput,
    setResetConfirmationInput,
    enterExampleMode,
    switchExampleTemplate,
    exitExampleMode,
    chooseFirstWelcomeStoryRoute,
    writeExampleDataToRealData,
    openResetConfirmation,
    closeResetConfirmation,
    confirmResetAction,
    getResetActionLabel
  } = useAppDataLifecycleController({
    selectedExampleTemplateId,
    setSelectedExampleTemplateId,
    isExampleMode,
    setIsExampleMode,
    defaultGlobalSettings: DEFAULT_GLOBAL_SETTINGS,
    defaultAssetChartSettings: DEFAULT_ASSET_CHART_SETTINGS,
    defaultAutoBackupSettings: DEFAULT_AUTO_BACKUP_SETTINGS,
    setAppData,
    setGlobalSettings,
    saveGlobalSettings,
    setAssetChartSettings,
    saveAssetChartSettings,
    resetAutoBackupSettings,
    resetSecurityState,
    resetDataViews,
    applyBackupState,
    resetSnapshotImportRecords,
    persistEmptyAssetData: () => {
      const emptyData: AppData = { groups: [], accounts: [], history: [] };

      saveAppDataWithExternalModificationCheck(
        emptyData,
        { allowEmptyHistoryOverwrite: true },
        () => {
          latestRealAppDataRef.current = cloneAppData(emptyData);
        },
        { flush: true }
      );
    },
    startExampleModeSession,
    switchExampleModeSession,
    exitExampleModeSession,
    writeTestDataToRealData,
    showConfirmationDialog,
    markPendingFirstWelcomeAfterClearAll
  });



  const runSecretConsoleCommand = (rawCommand: string) => {

    const command = rawCommand.trim();



    if (command === 'testdatain') {

      return writeExampleDataToRealData() ? SECRET_CONSOLE_TEST_DATA_SUCCESS : null;

    }

    if (command === 'testexpdatain') {

      return writeExtremeTestDataToRealData()
        ? SECRET_CONSOLE_EXTREME_TEST_DATA_SUCCESS
        : null;

    }



    if (command === 'doautobackup') {

      markAutoBackupDueOnce();

      return SECRET_CONSOLE_AUTO_BACKUP_DUE_ONCE_SUCCESS;

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



  const openFirstWelcomeStory = () => {

    setFirstWelcomeStage('story');

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



  const formatMoney = (amount: number | null, options: { compact?: boolean } = {}) =>

    formatCurrencyMoneyValue(amount, options);



  const formatHomeMoneyAmount = (

    amount: number | null,

    options: { compact?: boolean } = {}

  ) => formatHomeMoney(amount, options);



  const formatHistoryAmount = (amount: number | null) =>

    amount === null ? '0' : formatMoneyValue(amount);

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



  const getGroupNature = (groupId: string) =>

    groups.find((group) => group.id === groupId)?.nature ?? 'asset';



  const toStoredGroupAmount = (groupId: string, amount: number) =>

    toStoredAmountByNature(getGroupNature(groupId), amount);

  const scrollMainToTop = (behavior: ScrollBehavior = 'auto') => {
    mainContentRef.current?.scrollTo({ top: 0, behavior });
  };

  const openRollupNewAccountForm = (keyword: string) => {
    const firstGroup = groups[0];

    setIsAddingAccount(true);
    setNewAccountGroupId(firstGroup?.id ?? '');
    setNewAccountTypeInput(firstGroup?.name ?? '');
    setNewAccountTypeInputPlaceholder('');
    setNewAccountName(keyword.trim());
    setNewAccountNamePlaceholder('');
    setNewAccountAmount('0');
    setNewAccountError('');
  };

  const rollupImport = useRollupImportController({
    groups,
    accountGroups: groupTotals,
    isExampleMode,
    initialImportedHashes: stateDocumentRef.current.rollupImportHashes,
    commitAppDataUpdate,
    persistImportedHashes: (hashes) => {
      persistStateDocument((currentDocument) => ({
        ...currentDocument,
        rollupImportHashes: hashes
      }));
    },
    createHistoryRecord: ({
      account,
      afterAmount,
      beforeAmount,
      groupName,
      source,
      time
    }) =>
      createHistoryRecord(
        '修改',
        account,
        groupName,
        beforeAmount,
        afterAmount,
        time,
        undefined,
        source
      ),
    showToast,
    onClosePage: () => setIsRollupImportOpen(false),
    onSelectFile: () => rollupFileInputRef.current?.click(),
    onRequestCreateAccount: openRollupNewAccountForm,
    onScrollMainToTop: scrollMainToTop
  });


  const accountOperations = useAccountOperationsController({
    appData: { groups: assetGroups, accounts, history },
    groups,
    selectedAccount,
    selectedAccountEntry,
    assetGroups,
    formatMoney,
    createHistoryRecordId: () => createId('history'),
    commitAppDataUpdate,
    showConfirmationDialog,
    showNoticeDialog,
    normalizeAlias: getEffectiveAccountAbbreviation,
    onCloseAccountDetail: () => closeAccountDetail(),
    onCloseAccountActionMenu: () => setIsAccountActionMenuOpen(false),
    onReturnFromActionPanel: () => currentLayerBack?.(),
    onAmountEditorReturnHome: () => {
      setSelectedAccount(null);
      setExpandedDetailDates([]);
      setIsAccountActionMenuOpen(false);
    },
    onCompleteArchivedRestoreSource: (source: ArchivedRestoreSource) => {
      if (source === 'account-restore-dialog') {
        closeAddAccount();
      }
    }
  });

  const {
    editingAccount,
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
    setAmountDateFutureHint,
    setAmountNoteInput,
    setSetAmountNoteInput,
    adjustAmountDateInput,
    adjustAmountSelectedDate,
    adjustAmountVisibleMonth,
    setAdjustAmountVisibleMonth,
    adjustAmountDateFutureHint,
    adjustAmountNoteInput,
    setAdjustAmountNoteInput,
    accountNameDraft,
    setAccountNameDraft,
    accountAliasDraft,
    setAccountAliasDraft,
    accountInfoError,
    setAccountInfoError,
    currentGroup,
    currentAccount,
    accountInfoEntry,
    signedAdjustAmount,
    isAdjustAmountInvalid,
    nextAdjustedEditableAmount,
    parsedSetAmountDate,
    parsedAdjustAmountDate,
    isEditingArchivedAccount,
    isAmountEditorSubmitDisabled,
    signedAdjustAmountLabel,
    accountActionsPanelProps,
    accountDangerActionsPanelProps,
    openEditor,
    closeEditor,
    requestCloseEditor,
    closeAccountInfoEditor,
    requestCloseAccountInfoEditor,
    saveAccountInfo,
    closeDangerActions,
    resetAccountOperations,
    updateSetAmountDateInput,
    selectSetAmountCalendarDate,
    updateAdjustAmountDateInput,
    selectAdjustAmountCalendarDate,
    saveAmount,
    restoreAccount,
    cancelPendingArchivedRestore,
    choosePendingArchivedRestoreGroup
  } = accountOperations;

  const flashNote = useFlashNoteController({
    accountGroups: groupTotals,
    accounts,
    assetGroups,
    groups,
    history,
    sortedHistory,
    createHistoryRecord: ({
      account,
      afterAmount,
      beforeAmount,
      groupName,
      source,
      time
    }: FlashHistoryRecordInput) =>
      createHistoryRecord(
        '修改',
        account,
        groupName,
        beforeAmount,
        afterAmount,
        time,
        undefined,
        source
      ),
    onWriteComplete: (targetAccount) => {
      setSelectedAccount(targetAccount);
      setExpandedDetailDates([]);
    },
    commitAppDataUpdate
  });

  const openFlashNote = () => {
    globalSearch.clearNavigation();

    exitGroupEditMode();

    setSelectedAccount(null);

    setSelectedGroupDetailId('');

    setIsQuickSingleEntryAccountPickerOpen(false);

    setIsGlobalSettingsOpen(false);

    setIsTotalChartsOpen(false);

    setIsHistoryOpen(false);

    setIsArchivedAccountsOpen(false);

    flashNote.open();

    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: 0 });

    }, 0);

  };
  const renderFlashLightningIcon = (className = 'flash-note-lightning') => (

    <NfSvgIcon svg={NfFlashnoteSourceIcon} className={className} decorative />

  );



  const getQuickSingleEntryAccount = (groupId: string, accountId: string) =>
    groupTotals
      .find((group) => group.id === groupId)
      ?.activeAccounts.find((account) => account.id === accountId);

  const quickSingleEntryAccountGroups: QuickEntryAccountGroup[] = groupTotals.map((group) => ({
    id: group.id,
    name: group.name,
    accounts: group.activeAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      groupId: group.id,
      groupName: group.name,
      archived: account.archived
    }))
  }));

  const chooseQuickSingleEntryAccountById = (groupId: string, accountId: string) => {
    const account = getQuickSingleEntryAccount(groupId, accountId);

    if (account) {
      chooseQuickSingleEntryAccount(groupId, account);
    }
  };


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
    const baseTone = {
      background: 'var(--surface-bg)',
      border: 'var(--border-soft)',
      emphasisBorder: 'var(--border-medium)',
      divider: 'var(--border-soft)',
      nestedBackground: 'var(--surface-strong)'
    };

    if (record.type === '删除') {

      return {

        ...baseTone,

        text: 'var(--danger-text)',

        labelBackground: 'var(--danger-chip-bg)'

      };

    }



    if (record.type === '归档') {

      return {

        ...baseTone,

        text: 'var(--info-text)',

        labelBackground: 'var(--info-chip-bg)'

      };

    }



    if (record.type === '创建' || record.type === '重新启用') {

      return {

        ...baseTone,

        text: 'var(--success-text)',

        labelBackground: 'var(--success-chip-bg)'

      };

    }



    return {

      ...baseTone,

      text: 'var(--text-secondary)',

      labelBackground: 'var(--surface-muted)'

    };

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



  const toggleGroup = (groupId: string) => {

    setExpandedGroupIds((currentGroups) =>

      currentGroups.includes(groupId)

        ? currentGroups.filter((currentGroup) => currentGroup !== groupId)

        : [...currentGroups, groupId]

    );

  };

  const clearPendingGroupClick = () => {

    if (groupClickTimerRef.current !== null) {

      window.clearTimeout(groupClickTimerRef.current);

      groupClickTimerRef.current = null;

    }

    groupDoubleClickCandidateRef.current = null;

  };



  const clearGroupLongPress = () => {

    if (groupLongPressTimerRef.current !== null) {

      window.clearTimeout(groupLongPressTimerRef.current);

      groupLongPressTimerRef.current = null;

    }

  };



  const exitGroupEditMode = () => {

    clearGroupLongPress();

    clearPendingGroupClick();

    setIsGroupEditMode(false);

    setDraggingGroupId('');

    setGroupDropIndicator(null);

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

    groupId: string

  ) => {

    if ((event.pointerType === 'mouse' && event.button !== 0) || isGroupEditMode) {

      return;

    }



    clearGroupLongPress();

    groupPointerInteractionRef.current = {

      pointerId: event.pointerId,

      groupId,

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

      setExpandedGroupIds([]);

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

    clearPendingGroupClick();



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



    if (interaction.longPressTriggered || interaction.moved || draggingGroupId) {

      suppressNextGroupClick(interaction.longPressTriggered ? 350 : 0);

    }



    groupPointerInteractionRef.current = null;

  };



  const cancelGroupPointerInteraction = () => {

    clearGroupLongPress();

    groupPointerInteractionRef.current = null;

  };



  const openGroupDetailPage = (groupId: string) => {

    const group = groups.find((currentGroup) => currentGroup.id === groupId);



    if (!group) {

      return;

    }



    globalSearch.clearNavigation();

    exitGroupEditMode();

    setSelectedAccount(null);

    setIsGlobalSettingsOpen(false);

    setIsArchivedAccountsOpen(false);

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setIsTotalChartsOpen(false);

    setSelectedGroupDetailId(group.id);

    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    }, 0);

  };



  const closeGroupDetailPage = () => {

    globalSearch.clearNavigation();

    setSelectedGroupDetailId('');

  };



  const handleGroupClick = (groupId: string, clickDetail = 1) => {

    if (suppressGroupClickRef.current) {

      suppressGroupClickRef.current = false;

      clearPendingGroupClick();

      return;

    }



    if (isGroupEditMode) {

      clearPendingGroupClick();

      return;

    }



    if (clickDetail === 0) {

      clearPendingGroupClick();

      toggleGroup(groupId);

      return;

    }



    const now = Date.now();

    const previousClick = groupDoubleClickCandidateRef.current;



    if (

      previousClick &&

      previousClick.groupId === groupId &&

      now - previousClick.time <= GROUP_DOUBLE_CLICK_MS

    ) {

      clearPendingGroupClick();

      openGroupDetailPage(groupId);

      return;

    }



    clearPendingGroupClick();

    groupDoubleClickCandidateRef.current = { groupId, time: now };

    groupClickTimerRef.current = window.setTimeout(() => {

      groupClickTimerRef.current = null;

      groupDoubleClickCandidateRef.current = null;

      toggleGroup(groupId);

    }, GROUP_CLICK_DELAY_MS);

  };



  const saveGroupDetailInfo = () => {

    if (!selectedGroupDetail) {

      return;

    }



    const groupId = selectedGroupDetail.id;
    const result = commitAppDataUpdate((latestData) => {
      const latestGroups = deriveGroupsWithAccounts(latestData.groups, latestData.accounts);
      const latestArchivedAccounts = getArchivedAccountEntries(
        latestGroups,
        latestData.accounts,
        latestData.history
      );
      const updateResult = updateAccountTypeInAppData({
        appData: latestData,
        archivedAccounts: latestArchivedAccounts,
        groupId,
        name: groupDetailNameDraft,
        nature: groupDetailNatureDraft,
        includeInStats: groupDetailStatsDraft
      });

      return updateResult.ok
        ? {
            ok: true,
            nextData: updateResult.nextData,
            value: {
              previousName: updateResult.previousGroup.name,
              nextName: updateResult.group.name
            }
          }
        : updateResult;
    });

    if (!result.ok) {
      if (result.error === DUPLICATE_NAME_PLACEHOLDER) {
        setGroupDetailNameDraft('');
      }

      setGroupDetailError(result.error ?? '账户类型保存失败');
      return;
    }

    syncUpdatedAccountTypeSideEffects({
      groupId,
      previousName: result.value.previousName,
      nextName: result.value.nextName
    });

    setGroupDetailError('');

  };



  const getGroupDropPosition = (draggedGroupId: string, targetGroupId: string) => {
    const fromIndex = assetGroups.findIndex((group) => group.id === draggedGroupId);
    const toIndex = assetGroups.findIndex((group) => group.id === targetGroupId);

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      return null;
    }

    return fromIndex < toIndex ? 'after' : 'before';
  };



  const reorderGroups = (draggedGroupId: string, targetGroupId: string) => {

    if (draggedGroupId === targetGroupId) {

      return;

    }



    commitAppDataUpdate((latestData) => {
      const nextGroups = [...latestData.groups];
      const fromIndex = nextGroups.findIndex((group) => group.id === draggedGroupId);
      const toIndex = nextGroups.findIndex((group) => group.id === targetGroupId);

      if (fromIndex < 0 || toIndex < 0) {
        return { ok: false };
      }

      const [draggedGroup] = nextGroups.splice(fromIndex, 1);

      if (!draggedGroup) {
        return { ok: false };
      }

      nextGroups.splice(toIndex, 0, draggedGroup);

      return {
        ok: true,
        nextData: {
          groups: nextGroups.map((group, index) => ({ ...group, sortOrder: index })),
          accounts: latestData.accounts,
          history: latestData.history
        },
        value: null
      };
    });

  };



  const handleGroupDragStart = (event: DragEvent<HTMLElement>, groupId: string) => {

    if (!isGroupEditMode) {

      return;

    }



    setDraggingGroupId(groupId);
    setGroupDropIndicator(null);

    suppressGroupClickRef.current = true;

    clearPendingGroupClick();

    event.dataTransfer.effectAllowed = 'move';

    event.dataTransfer.setData('text/plain', groupId);

  };



  const handleGroupDragOver = (event: DragEvent<HTMLElement>, groupId: string) => {

    if (!isGroupEditMode || !draggingGroupId || draggingGroupId === groupId) {

      return;

    }



    const position = getGroupDropPosition(draggingGroupId, groupId);

    if (position) {
      setGroupDropIndicator({ groupId, position });
    }

    event.preventDefault();

    event.dataTransfer.dropEffect = 'move';

  };



  const handleGroupDragLeave = (event: DragEvent<HTMLElement>, groupId: string) => {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setGroupDropIndicator((currentIndicator) =>
      currentIndicator?.groupId === groupId ? null : currentIndicator
    );
  };



  const handleGroupDrop = (event: DragEvent<HTMLElement>, groupId: string) => {

    if (!isGroupEditMode) {

      return;

    }



    event.preventDefault();

    const draggedId = event.dataTransfer.getData('text/plain') || draggingGroupId;

    reorderGroups(draggedId, groupId);

    suppressNextGroupClick(350);

    clearPendingGroupClick();

    setDraggingGroupId('');
    setGroupDropIndicator(null);

  };



  const handleGroupDragEnd = () => {

    setDraggingGroupId('');
    setGroupDropIndicator(null);

    window.setTimeout(() => {

      suppressGroupClickRef.current = false;

    }, 0);

  };



  const openAccountDetail = (groupId: string, account: Account) => {

    const group = groups.find((currentGroup) => currentGroup.id === groupId);



    if (!group) {

      return;

    }



    globalSearch.clearNavigation();

    setIsArchivedAccountsOpen(false);

    setIsQuickSingleEntryAccountPickerOpen(false);

    setSelectedGroupDetailId('');

    setIsAccountChartsOpen(false);

    setSelectedAccount({ groupId, groupName: group.name, accountId: account.id });

    setExpandedDetailDates([]);

    setIsAccountActionMenuOpen(false);

    closeDangerActions();

  };



  const closeAccountDetail = () => {

    globalSearch.clearNavigation();

    setSelectedAccount(null);

    setIsAccountChartsOpen(false);

    setExpandedDetailDates([]);

    setIsAccountActionMenuOpen(false);

    closeDangerActions();

  };



  const openAccountChartsPage = () => {

    if (!selectedAccount || !selectedAccountEntry) {

      return;

    }



    globalSearch.clearNavigation();

    setIsAccountChartsOpen(true);

    setIsAccountActionMenuOpen(false);

    closeDangerActions();

    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    }, 0);

  };



  const closeAccountChartsPage = () => {

    globalSearch.clearNavigation();

    setIsAccountChartsOpen(false);

  };



  const openTotalChartsPage = () => {

    globalSearch.clearNavigation();

    exitGroupEditMode();

    setSelectedAccount(null);

    setSelectedGroupDetailId('');

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

    globalSearch.clearNavigation();

    setIsTotalChartsOpen(false);

  };



  const scrollGlobalSettingsTargetIntoView = (
    blockId?: string,
    block: ScrollLogicalPosition = 'start'
  ) => {
    window.setTimeout(() => {
      const targetElement = blockId ? document.getElementById(blockId) : null;

      if (targetElement) {
        targetElement.scrollIntoView({ block, behavior: 'smooth' });
        return;
      }

      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const openGlobalSettingsView = (
    section: GlobalSettingsSection = 'appearance',
    blockId?: string,
    scrollBlock: ScrollLogicalPosition = 'start'
  ) => {

    globalSearch.clearNavigation();

    if (blockId) {
      skipNextMainScrollResetRef.current = true;
    }

    exitGroupEditMode();

    resetAutoBackupDraft();

    resetPasswordEditor();

    closePasswordDisableConfirm();

    closeSnapshotEncryptionDisableConfirm();

    closeConfirmationDialog();

    setSelectedAccount(null);

    setSelectedGroupDetailId('');

    setIsQuickSingleEntryAccountPickerOpen(false);

    setIsRollupImportOpen(false);
    rollupImport.dismissPage();

    resetAccountOperations();

    closeAccountTypeEditor();

    setIsAccountActionMenuOpen(false);

    closeDangerActions();

    setIsAddingAccount(false);

    setIsArchivedAccountsOpen(false);

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setIsTotalChartsOpen(false);

    setGlobalSettingsSection(section);

    setIsGlobalSettingsOpen(true);

    scrollGlobalSettingsTargetIntoView(blockId, scrollBlock);

  };

  const openGlobalSettings = () => {

    openGlobalSettingsView();

  };

  const openExampleDataSettingsFromHome = () => {

    const navigation = getExampleModeBadgeSettingsNavigation(isExampleMode);

    if (!navigation) {

      return;

    }

    openGlobalSettingsView(navigation.settingsSection, navigation.blockId, navigation.scrollBlock);

  };



  const closeGlobalSettings = () => {

    globalSearch.clearNavigation();

    resetPasswordEditor();

    closePasswordDisableConfirm();

    closeSnapshotEncryptionDisableConfirm();

    setIsGlobalSettingsOpen(false);

  };



  const toggleDetailDate = (date: string) => {

    setExpandedDetailDates((currentDates) =>

      currentDates.includes(date)

        ? currentDates.filter((currentDate) => currentDate !== date)

        : [...currentDates, date]

    );

  };



  const openQuickSingleEntry = () => {

    globalSearch.clearNavigation();

    exitGroupEditMode();

    setSelectedGroupDetailId('');

    setIsGlobalSettingsOpen(false);

    setIsTotalChartsOpen(false);

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setIsArchivedAccountsOpen(false);

    setIsAccountActionMenuOpen(false);

    closeDangerActions();

    setIsRollupImportOpen(false);
    rollupImport.dismissPage();

    setIsQuickSingleEntryAccountPickerOpen(true);

  };



  const closeQuickSingleEntryAccountPicker = () => {

    setIsQuickSingleEntryAccountPickerOpen(false);

  };



  const closeRollupImport = () => {
    rollupImport.closeSession();

  };



  const openRollupImport = () => {

    globalSearch.clearNavigation();

    exitGroupEditMode();

    setSelectedAccount(null);

    setSelectedGroupDetailId('');

    setIsGlobalSettingsOpen(false);

    setIsTotalChartsOpen(false);

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setIsArchivedAccountsOpen(false);

    setIsAccountActionMenuOpen(false);

    closeDangerActions();

    setIsQuickSingleEntryAccountPickerOpen(false);

    resetAccountOperations();

    closeAccountTypeEditor();

    setIsAddingAccount(false);

    rollupImport.openSession();

    setIsRollupImportOpen(true);

    window.setTimeout(() => {

      scrollMainToTop('smooth');

    }, 0);

  };



  const chooseQuickSingleEntryAccount = (groupId: string, account: Account) => {
    const group = groups.find((currentGroup) => currentGroup.id === groupId);

    closeQuickSingleEntryAccountPicker();

    setSelectedAccount({ groupId, groupName: group?.name, accountId: account.id });

    setExpandedDetailDates([]);

    setSelectedGroupDetailId('');

    setIsAccountActionMenuOpen(false);

    closeDangerActions();

    openEditor(groupId, account, 'set', 'quick-single-entry');

  };



  const openAddAccount = () => {

    const firstGroup = groups[0];



    setIsAddingAccount(true);

    setNewAccountGroupId(firstGroup?.id ?? '');

    setNewAccountTypeInput(firstGroup?.name ?? '');
    setNewAccountTypeInputPlaceholder('');

    setNewAccountName('');
    setNewAccountNamePlaceholder('');

    setNewAccountAmount('');

    setNewAccountError('');

    setArchivedAccountSearchQuery('');

    rollupImport.clearPendingNewAccount();

  };



  const closeAddAccount = () => {

    setIsAddingAccount(false);

    setNewAccountGroupId('');

    setNewAccountTypeInput('');
    setNewAccountTypeInputPlaceholder('');

    setNewAccountName('');
    setNewAccountNamePlaceholder('');

    setNewAccountAmount('');

    setNewAccountError('');

    setArchivedAccountSearchQuery('');

  };



  const updateNewAccountTypeInput = (value: string) => {

    const exactMatch = getNewAccountTypeInputMatch(groups, value);



    setNewAccountTypeInput(value);
    setNewAccountTypeInputPlaceholder('');

    setNewAccountGroupId(exactMatch?.id ?? '');

    setNewAccountError('');

  };



  const confirmNewAccountTypeInput = () => {

    const trimmedInput = newAccountTypeInput.trim();



    if (newAccountTypeMatch) {

      setNewAccountGroupId(newAccountTypeMatch.id);

      setNewAccountTypeInput(newAccountTypeMatch.name);
      setNewAccountTypeInputPlaceholder('');

      setNewAccountError('');

      return;

    }



    if (!trimmedInput) {

      setNewAccountError('请输入账户类型');

      return;

    }

    if (
      hasDuplicateAccountTypeName({
        groups,
        archivedAccounts,
        name: trimmedInput
      })
    ) {

      setNewAccountTypeInput('');
      setNewAccountTypeInputPlaceholder(DUPLICATE_NAME_PLACEHOLDER);
      setNewAccountError(DUPLICATE_NAME_PLACEHOLDER);

      return;

    }



    showConfirmationDialog({

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



    const currentIndex = groups.findIndex((group) => group.id === newAccountGroupId);

    const safeIndex = currentIndex >= 0 ? currentIndex : 0;

    const nextGroup = groups[(safeIndex + direction + groups.length) % groups.length];



    if (nextGroup) {

      setNewAccountGroupId(nextGroup.id);

      setNewAccountTypeInput(nextGroup.name);
      setNewAccountTypeInputPlaceholder('');

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



  const prepareSearchNavigation = () => {

    resetAutoBackupDraft();

    closeConfirmationDialog();

    setIsArchivedAccountsOpen(false);

    setIsHistoryOpen(false);

    setIsTotalChartsOpen(false);

    setIsAccountChartsOpen(false);

    setIsGlobalSettingsOpen(false);

    setIsRollupImportOpen(false);
    rollupImport.dismissPage();

    setIsAddingAccount(false);

    setIsAccountActionMenuOpen(false);

    resetAccountOperations();

    closeAccountTypeEditor();

    setSelectedAccount(null);

    setSelectedGroupDetailId('');

  };



  const createSearchNavigationSnapshot = (): SearchNavigationSnapshot => ({

    selectedAccount,

    selectedGroupDetailId,

    isAccountChartsOpen,

    expandedGroupIds,

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

    setSelectedGroupDetailId(snapshot.selectedGroupDetailId);

    setIsAccountChartsOpen(snapshot.isAccountChartsOpen);

    setExpandedGroupIds(snapshot.expandedGroupIds);

    setIsTotalChartsOpen(snapshot.isTotalChartsOpen);

    setIsGlobalSettingsOpen(snapshot.isGlobalSettingsOpen);

    setGlobalSettingsSection(snapshot.globalSettingsSection);

    setIsArchivedAccountsOpen(snapshot.isArchivedAccountsOpen);

    setIsHistoryOpen(snapshot.isHistoryOpen);

    setHistoryPanelView(snapshot.historyPanelView);

    historyController.restoreHistoryFilterSnapshot({
      startDate: snapshot.historyStartDate,
      endDate: snapshot.historyEndDate,
      rangeInput: snapshot.historyRangeInput,
      calendarMonth: snapshot.calendarMonth
    });

    closeConfirmationDialog();

    setIsQuickSingleEntryAccountPickerOpen(false);

    setIsRollupImportOpen(false);
    rollupImport.dismissPage();

    setIsAddingAccount(false);

    setIsAccountActionMenuOpen(false);

    resetAccountOperations();

    closeAccountTypeEditor();

    resetAutoBackupDraft();



    window.setTimeout(() => {

      mainContentRef.current?.scrollTo({ top: snapshot.mainScrollTop });

    }, 0);

  };



  const navigateToSearchTarget = (target: SearchNavigationTarget) => {

    const intent = resolveSearchNavigationTarget<GlobalSettingsSection>(target, {
      groups,
      historyRecords: sortedHistory,
      backupRecords,
      settingsItems: GLOBAL_SETTINGS_SEARCH_ITEMS,
      defaultSettingsSection: 'appearance',
      isSettingsSection: isGlobalSettingsSection,
      getHistoryRecordDate: (record) => toDateInputValue(new Date(record.time))
    });

    if (intent.type === 'none') {

      return;

    }



    if (intent.type === 'settings' && intent.blockId) {

      skipNextMainScrollResetRef.current = true;

    }



    prepareSearchNavigation();



    if (intent.type === 'account') {

      const { group, account } = intent;



      setExpandedGroupIds((currentNames) =>

        currentNames.includes(group.id) ? currentNames : [...currentNames, group.id]

      );

      setSelectedAccount({ groupId: group.id, groupName: group.name, accountId: account.id });

      setExpandedDetailDates([]);

      setIsAccountActionMenuOpen(false);

      return;

    }



    if (intent.type === 'settings') {

      setGlobalSettingsSection(intent.section);

      setIsGlobalSettingsOpen(true);

      scrollGlobalSettingsTargetIntoView(intent.blockId);

      return;

    }



    if (intent.type === 'history') {

      const { group, account, recordDate } = intent;

      setExpandedGroupIds((currentNames) =>
        currentNames.includes(group.id) ? currentNames : [...currentNames, group.id]
      );

      setSelectedAccount({ groupId: group.id, groupName: group.name, accountId: account.id });

      setExpandedDetailDates((currentDates) =>
        currentDates.includes(recordDate) ? currentDates : [...currentDates, recordDate]
      );

      setIsAccountActionMenuOpen(false);



      searchTargetHighlight.requestSearchTargetScroll(intent.target);

      return;

    }



    setHistoryPanelView('backup');

    setIsHistoryOpen(true);

    searchTargetHighlight.requestSearchTargetScroll(intent.target);

  };



  const closeHistoryPanel = () => {

    globalSearch.clearNavigation();

    setIsHistoryOpen(false);

    setHistoryPanelView('history');

    setBackupReturnTarget('history');

    searchTargetHighlight.clearSearchScrollTargets();

    resetAutoBackupDraft();

  };



  const openHistoryPanel = () => {

    globalSearch.clearNavigation();

    searchTargetHighlight.clearSearchScrollTargets();

    setHistoryPanelView('history');

    setIsHistoryOpen(true);

  };



  const openBackupPanel = () => {

    globalSearch.clearNavigation();

    searchTargetHighlight.clearSearchScrollTargets();

    resetAutoBackupDraft();

    setBackupReturnTarget('history');

    setIsHistoryOpen(true);

    setHistoryPanelView('backup');

  };



  const openBackupPanelFromGlobalSettings = () => {

    globalSearch.clearNavigation();

    searchTargetHighlight.clearSearchScrollTargets();

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



  const saveNewAccount = () => {

    const nextName = newAccountName.trim();

    const editableAmount = parseNonNegativeAmount(newAccountAmount);

    const selectedNewAccountGroup =

      groups.find((group) => group.id === newAccountGroupId) ??
      groups.find(

        (group) =>

          normalizeTypeSearchText(group.name) === normalizeTypeSearchText(newAccountTypeInput)

      );



    if (!selectedNewAccountGroup) {

      setNewAccountError('请选择账户类型');

      return;

    }



    if (!nextName) {

      setNewAccountError('请输入账户名称');

      return;

    }



    if (hasDuplicateAccountName(accounts, nextName)) {

      setNewAccountName('');
      setNewAccountNamePlaceholder(DUPLICATE_NAME_PLACEHOLDER);
      setNewAccountError(DUPLICATE_NAME_PLACEHOLDER);

      return;

    }



    if (editableAmount === null) {

      setNewAccountError('请输入账户金额');

      return;

    }



    const createdAt = new Date().toISOString();
    const historyRecordId = createId('history');
    const result = commitAppDataUpdate((latestData) => {
      const latestGroups = deriveGroupsWithAccounts(latestData.groups, latestData.accounts);
      const latestArchivedAccounts = getArchivedAccountEntries(
        latestGroups,
        latestData.accounts,
        latestData.history
      );
      const createResult = createNewAccountInAppData({
        appData: latestData,
        groups: latestGroups,
        archivedAccounts: latestArchivedAccounts,
        groupId: newAccountGroupId,
        accountTypeInput: newAccountTypeInput,
        accountNameInput: newAccountName,
        amountInput: newAccountAmount,
        createdAt,
        historyRecordId
      });

      return createResult.ok
        ? {
            ok: true,
            nextData: createResult.nextData,
            value: {
              account: createResult.account,
              group: createResult.group
            }
          }
        : createResult;
    });

    if (!result.ok) {
      if ('error' in result && result.error === DUPLICATE_NAME_PLACEHOLDER) {
        setNewAccountName('');
        setNewAccountNamePlaceholder(DUPLICATE_NAME_PLACEHOLDER);
      }

        setNewAccountError(result.error ?? '账户创建失败');
      return;
    }

    updateAssetChartSettings((currentSettings) => ({

      ...currentSettings,

      accountDetailById: {

        ...currentSettings.accountDetailById,

        [result.value.account.id]: normalizeAccountDetailChartSettings(

          getGlobalAccountDetailChartSettings(currentSettings.trend),

          getGlobalAccountDetailChartSettings(currentSettings.trend)

        )

      }

    }));



    rollupImport.completePendingNewAccount({
      groupId: result.value.group.id,
      groupName: result.value.group.name,
      accountId: result.value.account.id
    });



    closeAddAccount();

  };



  const clearDeletedAssetGroupUiState = (groupId: string, groupName: string) => {
    clearGroupLongPress();
    groupPointerInteractionRef.current = null;
    clearPendingGroupClick();
    suppressNextGroupClick(250);
    setIsGroupEditMode(false);
    setDraggingGroupId('');
    setGroupDropIndicator(null);
    setExpandedGroupIds((currentGroupIds) =>
      currentGroupIds.filter((currentGroupId) => currentGroupId !== groupId)
    );

    if (selectedGroupDetailId === groupId) {
      setSelectedGroupDetailId('');
    }

    if (selectedAccount?.groupId === groupId) {
      setSelectedAccount(null);
      setIsAccountChartsOpen(false);
      setExpandedDetailDates([]);
      setIsAccountActionMenuOpen(false);
      closeDangerActions();
    }

    if (editingAccount?.groupId === groupId) {
      closeEditor();
    }

    if (editingAccountInfo?.groupId === groupId) {
      closeAccountInfoEditor();
    }

    if (flashNote.selectedAccount?.groupId === groupId) {
      flashNote.close();
    }

    if (accountTypeEditor?.mode === 'edit' && accountTypeEditor.groupId === groupId) {
      closeAccountTypeEditor();
    }

    setNewAccountGroupId((currentGroupId) => (currentGroupId === groupId ? '' : currentGroupId));
    setNewAccountTypeInput((currentInput) => {
      const shouldClearCurrentInput =
        newAccountGroupId === groupId ||
        (!newAccountGroupId &&
          normalizeTypeSearchText(currentInput) === normalizeTypeSearchText(groupName));

      return shouldClearCurrentInput ? '' : currentInput;
    });
    setNewAccountError('');
    rollupImport.removeAssignmentsForGroup(groupId);
  };

  const deleteAssetGroup = (groupId: string) => {
    const group = assetGroups.find((currentGroup) => currentGroup.id === groupId);

    if (!group || !canDeleteAssetGroup(groupId, accounts)) {
      return;
    }

    const result = commitAppDataUpdate((latestData) => {
      const latestGroup = latestData.groups.find((currentGroup) => currentGroup.id === groupId);

      if (!latestGroup || !canDeleteAssetGroup(groupId, latestData.accounts)) {
        return { ok: false };
      }

      const nextData = deleteAssetGroupFromAppData(latestData, groupId);

      if (nextData.groups.length === latestData.groups.length) {
        return { ok: false };
      }

      return {
        ok: true,
        nextData,
        value: {
          id: latestGroup.id,
          name: latestGroup.name
        }
      };
    });

    if (!result.ok || !result.value) {
      return;
    }

    clearDeletedAssetGroupUiState(result.value.id, result.value.name);
  };

  const getHistoryTypeLabel = (type: HistoryType) => (type === '归档' ? '已归档' : type);



  const getAccountNatureLabel = (nature: AccountTypeNature) =>

    accountTypeNatureOptions.find((option) => option.value === nature)?.label ?? nature;



  const searchTargetHighlight = useSearchTargetHighlightController({
    canScrollHistoryTarget: Boolean(
      (isHistoryOpen && historyPanelView === 'history') ||
        (selectedAccount && selectedAccountEntry)
    ),
    canScrollBackupTarget: isHistoryOpen && historyPanelView === 'backup',
    historyRenderKey: [
      filteredHistory.length,
      selectedAccount?.groupId ?? '',
      selectedAccount?.accountId ?? '',
      selectedAccountEntry?.id ?? '',
      expandedDetailDates.join('|')
    ].join(':'),
    backupRenderKey: backupRecords.length
  });

  const searchIndexOptions = useMemo<CreateSearchIndexOptions>(
    () => ({
      getAccountNatureLabel,
      getHistoryTypeLabel,
      getBackupMethodLabel,
      getAccountMark,
      getHistoryChangeLabel: (record) => getAmountChange(record).label,
      formatMoney,
      formatShortTime: formatHistoryRecordDate,
      formatPreciseBackupTime,
      settingsItems: GLOBAL_SETTINGS_SEARCH_ITEMS
    }),
    []
  );

  const globalSearch = useGlobalSearchController<SearchNavigationSnapshot>({
    groups,
    historyRecords: sortedHistory,
    backupRecords,
    createIndexOptions: searchIndexOptions,
    searchLogicMode: globalSettings.searchLogicMode,
    createNavigationSnapshot: createSearchNavigationSnapshot,
    restoreNavigationSnapshot: restoreSearchNavigationSnapshot,
    navigateToTarget: navigateToSearchTarget,
    onExitNavigation: searchTargetHighlight.clearSearchScrollTargets
  });

  globalSearchControllerRef.current = globalSearch;

  const mainPageKey = flashNote.isOpen

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

              ? `group-detail:${selectedGroupDetail.id}`

              : selectedAccount && selectedAccountEntry

                ? `account-detail:${selectedAccountEntry.id}`

                : 'home';

  const leftLayerKey = isHistoryOpen

    ? `history:${historyPanelView}`

    : isArchivedAccountsOpen

      ? 'archived-accounts'

      : '';

  const rightPanelKey = globalSearch.isOpen

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

                    ? `group-detail-actions:${selectedGroupDetail.id}`

                    : isGlobalSettingsOpen

                      ? `global-settings:${globalSettingsSection}`

                      : 'home-actions';

  const rightPanelMode = getRightPanelMode({
    isSearchOpen: globalSearch.isOpen,
    isRollupImportOpen,
    isDangerActionsOpen,
    hasSelectedAccountDetail: Boolean(selectedAccount && selectedAccountEntry),
    isAccountChartsOpen,
    isHistoryOpen,
    isHistoryBackupView: historyPanelView === 'backup',
    isArchivedAccountsOpen,
    isTotalChartsOpen,
    hasSelectedGroupDetail: Boolean(selectedGroupDetail),
    isGlobalSettingsOpen
  });

  useEffect(() => {

    if (mainPageKey !== 'home') {

      clearPendingGroupClick();

    }

  }, [mainPageKey]);



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



  const historyRecordListProps = createHistoryRecordListProps<HistoryRecord>({
    getTypeLabel: getHistoryTypeLabel,
    getTone: getHistoryTone,
    getAmountChange,
    formatAmount: formatHistoryAmount,
    formatShortTime: formatHistoryRecordDate,
    renderFlashSourceIcon: renderFlashLightningIcon
  });

  const accountHistoryRecordListProps =
    createAccountHistoryRecordListProps(historyRecordListProps);



  const firstGroupName = groups[0]?.name ?? '';
  const firstGroupId = groups[0]?.id ?? '';

  const hasAddAccountUnsavedChanges = getAddAccountUnsavedChanges({
    isAddingAccount,
    newAccountName,
    newAccountAmount,
    newAccountError,
    newAccountTypeInput,
    newAccountGroupId,
    firstGroupName,
    firstGroupId
  });

  const hasSnapshotUnsavedChanges =

    isHistoryOpen && historyPanelView !== 'history' && hasAutoBackupDraftChanges;



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



  const requestCloseAccountTypeEditor = () =>

    requestDiscardableBack(hasAccountTypeUnsavedChanges, closeAccountTypeEditor);



  const requestCloseAddAccount = () =>

    requestDiscardableBack(hasAddAccountUnsavedChanges, closeAddAccount);



  const requestReturnFromBackupPanel = () =>

    requestDiscardableBack(hasSnapshotUnsavedChanges, returnFromBackupPanel);



  const requestReturnFromSearchNavigation = () =>

    requestDiscardableBack(hasSnapshotUnsavedChanges, globalSearch.returnFromNavigation);



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



    if (globalSearch.isOpen) {

      return globalSearch.closeSearch;

    }



    if (confirmationDialog) {

      return closeConfirmationDialog;

    }



    if (resetConfirmation) {

      return closeResetConfirmation;

    }



    if (flashNote.isExitConfirmOpen) {

      return flashNote.dismissExitConfirm;

    }



    if (flashNote.isReturnDateConfirmOpen) {

      return flashNote.dismissReturnDateConfirm;

    }



    if (flashNote.editingDate) {

      return flashNote.cancelCellEdit;

    }



    if (flashNote.isOpen) {

      return flashNote.requestClose;

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



    if (globalSearch.hasFloatingNavigation) {

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



    if (selectedGroupDetailId) {

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

          mainContentRef.current?.scrollTo({

            top: readPageScrollTop(sessionMainScrollPositionsRef.current, mainPageKey)

          });

        }

      } else {

        if (isMainKeyChange) {

          forgetPageScrollTop(sessionMainScrollPositionsRef.current, previousMainPageKey);

          mainContentRef.current?.scrollTo({ top: 0 });

        } else {

          forgetPageScrollTop(sessionMainScrollPositionsRef.current, mainPageKey);

          mainContentRef.current?.scrollTo({ top: 0 });

        }



        if (previousMainPageKey === 'home') {

          setExpandedGroupIds([]);

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

        leftLayerPanelRef.current?.scrollTo({

          top: readPageScrollTop(sessionLeftLayerScrollPositionsRef.current, leftLayerKey)

        });

      } else {

        forgetPageScrollTop(
          sessionLeftLayerScrollPositionsRef.current,
          previousLeftLayerPanelKey
        );

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

        rightActionPanelRef.current?.scrollTo({

          top: readPageScrollTop(sessionRightPanelScrollPositionsRef.current, rightPanelKey)

        });

      } else {

        forgetPageScrollTop(sessionRightPanelScrollPositionsRef.current, previousRightPanelKey);

        rightActionPanelRef.current?.scrollTo({ top: 0 });

      }

    }



    previousRightPanelKeyRef.current = rightPanelKey;

  }, [rightPanelKey, globalSettings.pagePositionMemoryMode]);



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



      if (globalSearch.isOpen) {

        event.preventDefault();

        event.stopPropagation();



        globalSearch.handleEscape();



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

    globalSearch.handleEscape,

    globalSearch.isOpen

  ]);



  const appShellBackProps = useOverlayBack<HTMLElement>(handleAppShellBack);
  const windowShellBackProps = useOverlayBack<HTMLDivElement>(handleAppShellBack);



  const snapshotSecurityDialogLayerProps: SnapshotSecurityDialogLayerProps =
    createSnapshotSecurityDialogLayerProps({
      passwordEditor: {
        mode: passwordEditorMode,
        oldPassword: oldPasswordInput,
        newPassword: newPasswordInput,
        confirmPassword: confirmPasswordInput,
        error: passwordEditorError,
        isSaving: isSavingPassword,
        onOldPasswordChange: (value) => {
          setOldPasswordInput(value);
          setPasswordEditorError('');
        },
        onNewPasswordChange: (value) => {
          setNewPasswordInput(value);
          setPasswordEditorError('');
        },
        onConfirmPasswordChange: (value) => {
          setConfirmPasswordInput(value);
          setPasswordEditorError('');
        },
        onSubmit: saveLoginPassword,
        onCancel: resetPasswordEditor
      },
      passwordProtectionDisable: {
        isOpen: isPasswordDisableConfirmOpen,
        password: passwordDisableInput,
        error: passwordDisableError,
        isLoading: isDisablingPasswordProtection,
        onPasswordChange: (value) => {
          setPasswordDisableInput(value);
          setPasswordDisableError('');
        },
        onSubmit: confirmDisablePasswordProtection,
        onCancel: closePasswordDisableConfirm
      },
      snapshotEncryptionDisable: {
        isOpen: isSnapshotEncryptionDisableConfirmOpen,
        password: snapshotEncryptionDisableInput,
        error: snapshotEncryptionDisableError,
        isLoading: isDisablingSnapshotEncryption,
        onPasswordChange: (value) => {
          setSnapshotEncryptionDisableInput(value);
          setSnapshotEncryptionDisableError('');
        },
        onSubmit: confirmDisableSnapshotEncryption,
        onCancel: closeSnapshotEncryptionDisableConfirm
      }
    });
  const isSecuritySettingsPageDisabled =
    isGlobalSettingsOpen && globalSettingsSection === 'security' && isExampleMode;
  const selectedGroupDetailIdForRightPanel = selectedGroupDetail?.id ?? '';

  const mainPanelClassName = [
    flashNote.isOpen ? 'flash-note-container left-browse-panel' : 'card left-browse-panel',
    isSecuritySettingsPageDisabled
      ? 'example-mode-disabled-panel example-mode-disabled-panel--left-page'
      : ''
  ]
    .filter(Boolean)
    .join(' ');

  const settingsPageProps: SettingsPageProps = {
    section: globalSettingsSection,
    globalSettings,
    assetChartSettings,
    userSettingsFileInputRef,
    exampleTemplates: EXAMPLE_TEMPLATES,
    selectedExampleTemplateId,
    isExampleMode,
    appVersion: window.appInfo?.version ?? APP_VERSION,
    productIconPath: PRODUCT_ICON_PATH,
    productNameZh: PRODUCT_NAME_ZH,
    productNameEn: PRODUCT_NAME_EN,
    autoLockMinutesInput,
    onPositiveNegativeColorModeChange: updatePositiveNegativeColorMode,
    onHomeAssetStatMetricChange: updateHomeAssetStatMetric,
    onHomeAssetStatLabelModeChange: updateHomeAssetStatLabelMode,
    onHomeAssetStatCompactChange: updateHomeAssetStatCompact,
    onThemeModeChange: updateThemeMode,
    onThemeStyleChange: updateThemeStyle,
    onMainContentPositionChange: updateMainContentPosition,
    onPagePositionMemoryModeChange: updatePagePositionMemoryMode,
    onChartColorAssignmentModeChange: updateChartColorAssignmentMode,
    onGlobalChartControlModeChange: updateGlobalChartControlMode,
    onUpdateAssetChartSettings: updateAssetChartSettings,
    onUpdateHomeThumbnailChartSettings: updateHomeThumbnailChartSettings,
    onUpdateGlobalCategoryDetailChartSettings: updateGlobalCategoryDetailChartSettings,
    onSearchLogicModeChange: updateSearchLogicMode,
    onPasswordProtectionChange: updatePasswordProtection,
    onOpenPasswordEditor: requestOpenPasswordEditor,
    onAutoLockMinutesInputChange: updateAutoLockMinutesInput,
    onResetInvalidAutoLockMinutesInput: resetInvalidAutoLockMinutesInput,
    onForceSnapshotEncryptionChange: updateForceSnapshotEncryption,
    onSnapshotEncryptionChange: updateSnapshotEncryption,
    onImportUserSettings: importUserSettings,
    onExportUserSettings: exportUserSettings,
    onOpenUserSettingsFile: () => {
      if (isExampleMode) {
        void showNoticeDialog({
          title: '示例模式下不可导入用户配置',
          message: '示例模式不会读写真实外部配置文件'
        });
        return;
      }

      userSettingsFileInputRef.current?.click();
    },
    onOpenBackupPanel: openBackupPanelFromGlobalSettings,
    onSelectExampleTemplate: setSelectedExampleTemplateId,
    onEnterOrSwitchExampleMode: isExampleMode ? switchExampleTemplate : enterExampleMode,
    onExitExampleMode: exitExampleMode,
    onOpenResetConfirmation: openResetConfirmation,
    onOpenBilibili: openBilibiliProfile,
    onOpenGithubReleases: openGithubReleases,
    onStartVersionLongPress: startAboutVersionLongPress,
    onClearVersionLongPress: clearSecretConsoleLongPress
  };

  const mainContentMode = getMainContentMode({
    isFlashNoteOpen: flashNote.isOpen,
    isRollupImportOpen,
    isGlobalSettingsOpen,
    isTotalChartsOpen,
    isAccountChartsOpen,
    hasSelectedAccountDetail: Boolean(selectedAccount && selectedAccountEntry),
    hasSelectedGroupDetail: Boolean(
      selectedGroupDetail && selectedGroupDetailStructureData && selectedGroupDetailTrendData
    )
  });

  const mainContentRendererProps: MainContentRendererProps = createMainContentRendererProps({
    mode: mainContentMode,
    dashboard: {
      homeAssetStat,
      recentNetWorthChange,
      shouldShowL0Charts,
      showStructure: assetChartSettings.l0.showStructure,
      showTrend: assetChartSettings.l0.showTrend,
      structureData: assetStructureData,
      showDebtMultiple: assetChartSettings.structure.showDebtMultiple,
      trendPoints: homeThumbnailTrendPoints,
      trendSettings: homeThumbnailTrendSettings,
      groups: groupTotals,
      accounts,
      expandedGroupIds,
      isGroupEditMode,
      draggingGroupId,
      groupDropIndicator,
      legendColorByName: homeGroupLegendColorByName,
      productIconPath: PRODUCT_ICON_PATH,
      productNameZh: PRODUCT_NAME_ZH,
      productNameEn: PRODUCT_NAME_EN,
      productTagline: PRODUCT_TAGLINE,
      formatHomeMoneyAmount,
      formatChartMoney: formatChartNumber,
      onGroupClick: handleGroupClick,
      onOpenAccount: openAccountDetail,
      onDeleteGroup: deleteAssetGroup,
      onGroupPointerDown: startGroupPointerInteraction,
      onGroupPointerMove: moveGroupPointerInteraction,
      onGroupPointerUp: finishGroupPointerInteraction,
      onGroupPointerLeave: cancelGroupPointerInteraction,
      onGroupPointerCancel: cancelGroupPointerInteraction,
      onGroupDragStart: handleGroupDragStart,
      onGroupDragOver: handleGroupDragOver,
      onGroupDragLeave: handleGroupDragLeave,
      onGroupDrop: handleGroupDrop,
      onGroupDragEnd: handleGroupDragEnd,
      onOpenTotalCharts: openTotalChartsPage,
      onOpenSearch: globalSearch.openSearch,
      onOpenArchivedAccounts: () => setIsArchivedAccountsOpen(true),
      onOpenHistory: openHistoryPanel,
      onOpenAddAccount: openAddAccount
    },
    account: {
      selectedAccount,
      selectedGroup,
      selectedAccountEntry,
      selectedAccountHistory,
      selectedAccountTrendPoints,
      selectedAccountPreviewTrendSettings,
      selectedAccountHistoryByDate,
      expandedDetailDates,
      accountHistoryRecordListProps,
      selectedAccountTitle,
      selectedAccountChartSettings,
      formatMoney,
      formatChartMoney: formatChartNumber,
      onOpenChart: openAccountChartsPage,
      onToggleDate: toggleDetailDate
    },
    charts: {
      totalAssets,
      structureData: assetStructureData,
      trendPoints: assetTrendPoints,
      assetChartSettings,
      selectedGroupDetail,
      selectedGroupDetailStructureData,
      selectedGroupDetailTrendData,
      selectedGroupDetailChartSettings,
      categoryVisibility: assetChartSettings.categoryVisibility,
      formatMoney: formatChartNumber
    },
    settings: {
      pageProps: settingsPageProps
    },
    rollupImport: {
      pageProps: rollupImport.pageProps
    },
    flashNote: {
      isOpen: flashNote.isOpen,
      pageProps: flashNote.pageProps,
      isExitConfirmOpen: flashNote.isExitConfirmOpen,
      onCancelExit: flashNote.dismissExitConfirm,
      onConfirmExit: flashNote.confirmExit,
      isReturnDateConfirmOpen: flashNote.isReturnDateConfirmOpen,
      onCancelReturnDate: flashNote.dismissReturnDateConfirm,
      onConfirmReturnDate: flashNote.confirmReturnDateSelection
    },
    security: {
      isSettingsPageDisabled: isSecuritySettingsPageDisabled
    }
  });

  const rightPanelRendererProps: RightPanelRendererProps = createRightPanelRendererProps({
    mode: rightPanelMode,
    search: {
      hasQuery: globalSearch.output.hasQuery,
      focusedResult: globalSearch.focusedResult,
      sortedHistory,
      onOpenResult: globalSearch.openResult,
      onCloseSearch: globalSearch.closeSearch,
      formatMoney,
      formatShortTime: formatHistoryRecordDate,
      getAmountChange,
      getAccountNatureLabel
    },
    account: {
      selectedAccount,
      selectedAccountEntry,
      actions: accountActionsPanelProps,
      dangerActions: accountDangerActionsPanelProps,
      assetChartSettings,
      selectedAccountChartSettings,
      onUpdateLocalAccountDetailChartSettings: updateLocalAccountDetailChartSettings,
      onBackToAccountDetail: closeAccountChartsPage
    },
    history: {
      onOpenBackupPanel: openBackupPanel,
      backupRecordCount: backupRecords.length,
      latestBackupLabel: backupRecords.length === 0
        ? ''
        : formatRelativeBackupTime(backupRecords[0].backedUpAt),
      accountCount,
      historyCount: history.length,
      incrementalRecordValue,
      autoBackupDraft,
      autoBackupCycleValueInput,
      autoSnapshotCycleInputRef,
      latestAutoBackupAt:
        backupRecords.find((record) => record.method === 'auto')?.backedUpAt ?? '',
      isExampleMode,
      hasAutoBackupDraftChanges,
      canSaveAutoBackupSettings,
      onExportBackup: exportBackup,
      onImportBackup: () => {
        if (isExampleMode) {
          void showNoticeDialog({
            title: '示例模式下不可导入快照',
            message: '示例模式不会读写真实外部快照文件'
          });
          return;
        }

        backupFileInputRef.current?.click();
      },
      onAutoBackupEnabledChange: updateAutoBackupEnabled,
      onAutoBackupCycleValueChange: updateAutoBackupCycleValue,
      onAutoBackupCycleValueInputReset: setAutoBackupCycleValueInput,
      onAdjustAutoBackupCycleValue: adjustAutoBackupCycleValue,
      onAutoBackupCycleUnitChange: updateAutoBackupCycleUnit,
      onSelectAutoBackupDirectory: selectAutoBackupDirectory,
      onSaveAutoBackupDraft: saveAutoBackupDraft
    },
    archived: {
      accountCount: archivedAccounts.length,
      onBackToOverview: () => setIsArchivedAccountsOpen(false)
    },
    totalChart: {
      assetChartSettings,
      onUpdateAssetChartSettings: updateAssetChartSettings,
      onBackToOverview: closeTotalChartsPage
    },
    groupDetail: {
      selectedGroupDetail,
      nameDraft: groupDetailNameDraft,
      namePlaceholder:
        groupDetailError === DUPLICATE_NAME_PLACEHOLDER
          ? DUPLICATE_NAME_PLACEHOLDER
          : undefined,
      statsDraft: groupDetailStatsDraft,
      error: groupDetailError,
      chartSettings: selectedGroupDetailChartSettings,
      isLockedByGlobal: assetChartSettings.globalChartControlMode === 'locked',
      onNameDraftChange: (value) => {
        setGroupDetailNameDraft(value);
        setGroupDetailError('');
      },
      onStatsDraftChange: (value) => {
        setGroupDetailStatsDraft(value);
        setGroupDetailError('');
      },
      onSaveInfo: saveGroupDetailInfo,
      onUpdateChartSettings: (updater) =>
        updateLocalCategoryDetailChartSettings(selectedGroupDetailIdForRightPanel, updater),
      onBackToOverview: closeGroupDetailPage
    },
    settings: {
      selectedSection: globalSettingsSection,
      navigationSide: globalSettings.mainContentPosition === 'right' ? 'left' : 'right',
      isCatPetted,
      onSelectSection: setGlobalSettingsSection,
      onTriggerEasterEgg: petNyaaCat,
      onClose: closeGlobalSettings
    },
    rollupImport: {
      title: rollupImport.actionsTitle,
      actionsClassName: rollupImport.actionsClassName,
      actionsPanelProps: rollupImport.actionsPanelProps
    },
    home: {
      isExampleMode,
      renderFlashIcon: () => renderFlashLightningIcon(),
      onOpenQuickSingleEntry: openQuickSingleEntry,
      onOpenFlashNote: openFlashNote,
      onOpenRollupImport: openRollupImport,
      onOpenSearch: globalSearch.openSearch,
      onOpenAddAccount: openAddAccount,
      onOpenHistoryPanel: openHistoryPanel,
      onOpenGlobalSettings: openGlobalSettings,
      onOpenExampleDataSettings: openExampleDataSettingsFromHome
    }
  });

  const appDialogLayerProps = createAppDialogLayerProps({
    confirmationDialog,
    noticeDialog,
    inputDialog,
    inputDialogValue,
    closeConfirmationDialog,
    confirmAndClose,
    closeNoticeDialog,
    closeInputDialog,
    confirmInputDialog,
    setInputDialogValue
  });

  const archivedAccountsLayerProps = createArchivedAccountsLayerProps({
    isOpen: isArchivedAccountsOpen,
    archivedAccounts,
    panelRef: leftLayerPanelRef,
    formatMoney,
    formatArchivedTime: formatShortTime,
    onBack: () => currentLayerBack?.(),
    onClose: () => setIsArchivedAccountsOpen(false),
    onSelect: (account) => openAccountDetail(account.groupId, account),
    onRestore: (account) => {
      restoreAccount(account.groupId, account, 'archived-accounts-list');
    },
    onPanelScroll: (scrollTop) => {
      rememberPageScrollTop(
        sessionLeftLayerScrollPositionsRef.current,
        leftLayerKey,
        scrollTop
      );
    }
  });

  const historyBackupLayerProps = createHistoryBackupLayerProps({
    isOpen: isHistoryOpen,
    view: historyPanelView,
    rangeInput: historyRangeInput,
    rangeInputPlaceholder: historyRangeInputPlaceholder,
    isCalendarVisible,
    calendarMonth,
    calendarSecondMonth,
    isNextDisabled: historyController.isHistoryCalendarNextDisabled,
    getCalendarDays: historyController.getCalendarDays,
    getDateValue: historyController.getDateValue,
    getDateState: historyController.getHistoryCalendarDateState,
    records: filteredHistory,
    highlightedRecordId: searchTargetHighlight.highlightedHistoryRecordId,
    emptyText: '暂无匹配记录',
    recordListProps: historyRecordListProps,
    backupRecords,
    snapshotImportRecords,
    formatPreciseBackupTime,
    getBackupMethodLabel,
    onBack: () => currentLayerBack?.(),
    onPanelScroll: (scrollTop) => {
      rememberPageScrollTop(
        sessionLeftLayerScrollPositionsRef.current,
        leftLayerKey,
        scrollTop
      );
    },
    onRangeInputFocus: historyController.clearHistoryRange,
    onRangeInputClick: historyController.clearHistoryRange,
    onRangeInputConfirm: historyController.confirmSingleHistoryDate,
    onRangeInputChange: historyController.handleHistoryRangeInput,
    onToggleCalendar: historyController.toggleCalendarVisibility,
    onSelectPreviousWeek: historyController.setLastWeekHistoryRange,
    onSelectRecentSevenDays: historyController.setRecent7HistoryRange,
    onClearRange: historyController.clearHistoryRange,
    onPreviousMonth: historyController.showPreviousCalendarMonth,
    onNextMonth: historyController.showNextCalendarMonth,
    onDateClick: historyController.selectCalendarDate,
    onImportBackup: importBackup,
    panelRef: leftLayerPanelRef,
    backupFileInputRef
  });

  const searchOverlayLayerProps = createSearchOverlayLayerProps({
    isOpen: globalSearch.isOpen,
    panelProps: globalSearch.panelProps,
    currentNavigationTarget: globalSearch.currentNavigationTarget,
    canMoveNavigation: globalSearch.canMoveNavigation,
    onPreviousNavigationTarget: globalSearch.moveToPreviousTarget,
    onNextNavigationTarget: globalSearch.moveToNextTarget,
    onReturnFromNavigation: globalSearch.returnFromNavigation,
    onExitNavigation: globalSearch.exitNavigation,
    onClose: globalSearch.closeSearch
  });

  const resetDangerDialogLayerProps = createResetDangerDialogLayerProps({
    confirmation: resetConfirmation,
    inputValue: resetConfirmationInput,
    getActionLabel: getResetActionLabel,
    onInputChange: setResetConfirmationInput,
    onCancel: closeResetConfirmation,
    onConfirm: confirmResetAction
  });

  const quickEntryPickerLayerProps = createQuickEntryPickerLayerProps({
    isOpen: isQuickSingleEntryAccountPickerOpen,
    groups: quickSingleEntryAccountGroups,
    onClose: closeQuickSingleEntryAccountPicker,
    onChooseAccount: chooseQuickSingleEntryAccountById
  });

  const lockScreenLayerProps = createLockScreenLayerProps({
    isLocked,
    productIconPath: PRODUCT_ICON_PATH,
    password: unlockPasswordInput,
    error: unlockError,
    isUnlocking,
    onPasswordChange: (value) => {
      setUnlockPasswordInput(value);
      setUnlockError('');
    },
    onSubmit: unlockApp
  });



  if (runtimePersistenceError) {
    return <StartupPersistenceErrorScreen error={runtimePersistenceError} />;
  }




  return (

    <WindowFrame
      productIconPath={PRODUCT_ICON_PATH}
      productName={window.appInfo?.name ?? PRODUCT_NAME_EN}
      data-theme-mode={globalSettings.themeMode}
      data-theme={resolvedTheme}
      data-resolved-theme={resolvedTheme}
      data-theme-style={effectiveThemeStyle}
      {...windowShellBackProps}
    >

      <AppShell
        className={`app-shell${flashNote.isOpen ? ' app-shell--flash-note' : ''}`}
        mainContentPosition={flashNote.isOpen ? 'left' : globalSettings.mainContentPosition}
        shellProps={appShellBackProps}
        style={signedAmountCssVariables}
        hiddenControls={(
          <>
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
              onChange={rollupImport.importFile}
              style={{ display: 'none' }}
            />
          </>
        )}
        mainContentRef={mainContentRef}
        mainContentClassName={mainPanelClassName}
        mainContentAriaDisabled={isSecuritySettingsPageDisabled}
        onMainContentClick={handleMainContentBlankClick}
        onMainContentScroll={(event) => {
          rememberPageScrollTop(
            sessionMainScrollPositionsRef.current,
            mainPageKey,
            event.currentTarget.scrollTop
          );
        }}
        rightPanel={
          flashNote.isOpen ? null : <RightPanelRenderer {...rightPanelRendererProps} />
        }
        rightPanelRef={rightActionPanelRef}
        rightPanelAriaLabel="操作面板"
        onRightPanelClick={(event) => event.stopPropagation()}
        onRightPanelScroll={(event) => {
          rememberPageScrollTop(
            sessionRightPanelScrollPositionsRef.current,
            rightPanelKey,
            event.currentTarget.scrollTop
          );
        }}
        mainContent={(
          <MainContentRenderer {...mainContentRendererProps} />
        )}
      >







      <SnapshotSecurityDialogLayer {...snapshotSecurityDialogLayerProps} />

      <ArchivedAccountsLayer {...archivedAccountsLayerProps} />



      <HistoryBackupLayer {...historyBackupLayerProps} />




      <SearchOverlayLayer {...searchOverlayLayerProps} />



      <ToastViewport messages={toastMessages} />



      <AppDialogLayer {...appDialogLayerProps} />


      {coreIntegrityPrompt ? (
        <CoreIntegrityDialog
          hasPendingSave={
            !!coreIntegrityPrompt.pendingSave || !!coreIntegrityPrompt.onContinueSave
          }
          onAcknowledge={acknowledgeCoreIntegrityPrompt}
          onContinueSave={continueCoreIntegritySave}
        />
      ) : null}


      <ResetDangerDialogLayer {...resetDangerDialogLayerProps} />



      <QuickEntryPickerLayer {...quickEntryPickerLayerProps} />



      <AccountDialogLayer
        amountEditor={
          editingAccount && currentAccount
            ? {
                title: `${currentGroup?.name ?? editingAccount.groupName ?? ''} - ${currentAccount.name}`,
                editMode,
                draftAmount,
                setAmountDatePicker: renderAccountOperationDatePicker({
                  value: setAmountDateInput,
                  selectedDate: setAmountSelectedDate,
                  parsedDate: parsedSetAmountDate,
                  visibleMonth: setAmountVisibleMonth,
                  futureHint: setAmountDateFutureHint,
                  onInputChange: updateSetAmountDateInput,
                  onCalendarSelect: selectSetAmountCalendarDate,
                  onVisibleMonthChange: setSetAmountVisibleMonth
                }),
                setAmountNote: setAmountNoteInput,
                adjustAmount: adjustAmountInput,
                adjustDirection,
                isAdjustAmountInvalid,
                currentAmountLabel: formatMoney(currentAccount.amount),
                nextAdjustedAmountLabel: formatMoney(
                  toStoredGroupAmount(editingAccount.groupId, nextAdjustedEditableAmount)
                ),
                signedAdjustAmountLabel,
                signedAdjustAmountColor: getSignedAmountTone(
                  signedAdjustAmount,
                  globalSettings.positiveNegativeColorMode
                ).color,
                adjustDatePicker: renderAccountOperationDatePicker({
                  value: adjustAmountDateInput,
                  selectedDate: adjustAmountSelectedDate,
                  parsedDate: parsedAdjustAmountDate,
                  visibleMonth: adjustAmountVisibleMonth,
                  futureHint: adjustAmountDateFutureHint,
                  onInputChange: updateAdjustAmountDateInput,
                  onCalendarSelect: selectAdjustAmountCalendarDate,
                  onVisibleMonthChange: setAdjustAmountVisibleMonth
                }),
                adjustAmountNote: adjustAmountNoteInput,
                isEditingArchivedAccount,
                isSubmitDisabled: isAmountEditorSubmitDisabled,
                onEditModeChange: (mode) => {
                  setEditMode(mode);
                  setAdjustAmountInput('');
                  setAdjustDirection('increase');
                },
                onDraftAmountInputChange: (value) => {
                  const nextValue = sanitizeNonNegativeInput(value);

                  if (isNonNegativeInput(nextValue)) {
                    setDraftAmount(nextValue);
                  }
                },
                onSetAmountNoteChange: setSetAmountNoteInput,
                onAdjustAmountInputChange: (value) => {
                  const nextValue = sanitizeNonNegativeInput(value);

                  if (isNonNegativeInput(nextValue)) {
                    setAdjustAmountInput(nextValue);
                  }
                },
                onAdjustDirectionChange: setAdjustDirection,
                onAdjustAmountNoteChange: setAdjustAmountNoteInput,
                onSubmit: saveAmount,
                onCancel: requestCloseEditor
              }
            : null
        }
        infoEditor={
          editingAccountInfo && accountInfoEntry
            ? {
                title: accountInfoEntry.name,
                accountName: accountNameDraft,
                accountAlias: accountAliasDraft,
                aliasPreview: (
                  <AccountMark
                    account={{
                      name: accountNameDraft.trim() || accountInfoEntry.name,
                      alias: accountAliasDraft
                    }}
                    className="account-mark--list"
                  />
                ),
                error: accountInfoError,
                accountNamePlaceholder:
                  accountInfoError === DUPLICATE_NAME_PLACEHOLDER
                    ? DUPLICATE_NAME_PLACEHOLDER
                    : undefined,
                onAccountNameChange: (value) => {
                  setAccountNameDraft(value);
                  setAccountInfoError('');
                },
                onAccountAliasChange: setAccountAliasDraft,
                onSubmit: saveAccountInfo,
                onCancel: requestCloseAccountInfoEditor
              }
            : null
        }
        restore={
          isAddingAccount
            ? {
                archivedAccounts,
                filteredAccounts: filteredArchivedAccountsForRestore,
                searchQuery: archivedAccountSearchQuery,
                onSearchQueryChange: setArchivedAccountSearchQuery,
                getRestoreTitle: getArchivedAccountRestoreTitle,
                getArchivedAtLabel: getArchivedAccountArchivedAtLabel,
                formatMoney,
                onRestore: (account) => {
                  if (restoreAccount(account.groupId, account, 'account-restore-dialog')) {
                    closeAddAccount();
                  }
                },
                onCancel: requestCloseAddAccount
              }
            : null
        }
        restoreTarget={
          pendingArchivedRestore && pendingArchivedRestoreAccount
            ? {
                groups: archivedRestoreTargetGroups,
                onChooseGroup: choosePendingArchivedRestoreGroup,
                onCancel: cancelPendingArchivedRestore
              }
            : null
        }
        create={
          isAddingAccount
            ? {
                accountTypeInputRef: newAccountTypeInputRef,
                accountTypeInput: newAccountTypeInput,
                accountTypeInputPlaceholder: newAccountTypeInputPlaceholder,
                accountTypeGhostText: newAccountTypeGhostText,
                accountTypeCount: groups.length,
                newAccountName,
                newAccountNamePlaceholder,
                newAccountAmount,
                error: newAccountError,
                onAccountTypeInputChange: updateNewAccountTypeInput,
                onConfirmAccountTypeInput: confirmNewAccountTypeInput,
                onAccountTypeWheel: handleNewAccountGroupWheel,
                onSwitchAccountType: switchNewAccountGroup,
                onOpenCreateAccountType: () => openCreateAccountType(),
                onNameChange: (value) => {
                  setNewAccountName(value);
                  setNewAccountNamePlaceholder('');
                  setNewAccountError('');
                },
                onAmountInputChange: (value) => {
                  const nextValue = sanitizeNonNegativeInput(value);

                  if (isNonNegativeInput(nextValue)) {
                    setNewAccountAmount(nextValue);
                    setNewAccountError('');
                  }
                },
                onSubmit: saveNewAccount,
                onCancel: requestCloseAddAccount
              }
            : null
        }
        accountType={
          accountTypeEditor && isAccountTypeEditorVisible
            ? {
                editor: accountTypeEditor,
                nameDraft: accountTypeNameDraft,
                natureDraft: accountTypeNatureDraft,
                statsDraft: accountTypeStatsDraft,
                error: accountTypeError,
                namePlaceholder:
                  accountTypeError === DUPLICATE_NAME_PLACEHOLDER
                    ? DUPLICATE_NAME_PLACEHOLDER
                    : undefined,
                natureOptions: accountTypeNatureOptions,
                onNameChange: (value) => {
                  setAccountTypeNameDraft(value);
                  setAccountTypeError('');
                },
                onNatureChange: (value) => {
                  setAccountTypeNatureDraft(value);
                  setAccountTypeError('');
                },
                onStatsChange: (value) => {
                  setAccountTypeStatsDraft(value);
                  setAccountTypeError('');
                },
                onSubmit: saveAccountType,
                onCancel: requestCloseAccountTypeEditor
              }
            : null
        }
      />


      <FirstWelcomeLayer
        stage={firstWelcomeStage}
        storyRoutes={FIRST_WELCOME_STORY_ROUTES}
        onComplete={completeFirstWelcome}
        onOpenStory={openFirstWelcomeStory}
        onChooseStoryRoute={chooseFirstWelcomeStoryRoute}
      />

      <LockScreenLayer {...lockScreenLayerProps} />


      {isSecretConsoleOpen ? (
        <SecretConsoleLayer
          ref={secretConsoleInputRef}
          value={secretConsoleInput}
          placeholder={secretConsolePlaceholder}
          isHighlighted={isSecretConsoleHighlighted}
          onClose={closeSecretConsole}
          onClearResultPlaceholder={clearSecretConsoleResultPlaceholder}
          onChange={setSecretConsoleInput}
          onKeyDown={handleSecretConsoleKeyDown}
        />
      ) : null}

      </AppShell>

    </WindowFrame>

  );

}



export default App;
