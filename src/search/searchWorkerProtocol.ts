import { isSearchIndexConfig, type SearchIndexConfig } from './searchIndexConfig';
import type {
  AssetGroupWithAccounts,
  BackupRecord,
  GlobalSearchOutput,
  HistoryRecord,
  SearchLogicMode,
  SearchNavigationTarget,
  SearchResultLimitsByCategory,
  SearchResultCategory,
  SettingsSearchItem
} from './searchTypes';

export type BuildIndexRequest = {
  type: 'build-index';
  revision: number;
  groups: AssetGroupWithAccounts[];
  historyRecords: HistoryRecord[];
  backupRecords: BackupRecord[];
  config: SearchIndexConfig;
  settingsItems: SettingsSearchItem[];
};

export type QueryRequest = {
  type: 'query';
  requestId: number;
  revision: number;
  query: string;
  searchLogicMode: SearchLogicMode;
  resultLimitsByCategory: SearchResultLimitsByCategory;
};

export type DisposeRequest = { type: 'dispose' };

export type SearchWorkerRequest = BuildIndexRequest | QueryRequest | DisposeRequest;

export type IndexBuildingResponse = {
  type: 'index-building';
  revision: number;
};

export type IndexReadyResponse = {
  type: 'index-ready';
  revision: number;
  totals: Record<SearchResultCategory, number>;
  durationMs: number;
};

export type QueryResultResponse = {
  type: 'query-result';
  requestId: number;
  revision: number;
  output: GlobalSearchOutput;
  durationMs: number;
};

export type SearchWorkerOperation = 'build-index' | 'query' | 'protocol' | 'worker';
export type SearchWorkerErrorCode =
  | 'invalid-request'
  | 'invalid-response'
  | 'stale-revision'
  | 'build-failed'
  | 'query-failed'
  | 'worker-failed';

export type WorkerErrorResponse = {
  type: 'worker-error';
  operation: SearchWorkerOperation;
  revision: number;
  requestId?: number;
  code: SearchWorkerErrorCode;
};

export type SearchWorkerResponse =
  | IndexBuildingResponse
  | IndexReadyResponse
  | QueryResultResponse
  | WorkerErrorResponse;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const isPositiveInteger = (value: unknown): value is number =>
  isNonNegativeInteger(value) && value > 0;

const isNullableFiniteNumber = (value: unknown) =>
  value === null || (typeof value === 'number' && Number.isFinite(value));

const isOptionalString = (value: unknown) => value === undefined || typeof value === 'string';

const isAccount = (value: unknown) => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.groupId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    typeof value.createdAt === 'string' &&
    isOptionalString(value.alias) &&
    (value.archived === undefined || typeof value.archived === 'boolean') &&
    isOptionalString(value.archivedAt)
  );
};

const isGroup = (value: unknown) => {
  if (!isObjectRecord(value) || !Array.isArray(value.accounts)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.nature === 'asset' || value.nature === 'receivable' || value.nature === 'liability') &&
    typeof value.includeInStats === 'boolean' &&
    typeof value.sortOrder === 'number' &&
    value.accounts.every(isAccount)
  );
};

const isHistoryRecord = (value: unknown) => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.accountId === 'string' &&
    typeof value.type === 'string' &&
    typeof value.groupName === 'string' &&
    typeof value.accountName === 'string' &&
    isNullableFiniteNumber(value.beforeAmount) &&
    isNullableFiniteNumber(value.afterAmount) &&
    typeof value.time === 'string' &&
    isOptionalString(value.relatedTime) &&
    isOptionalString(value.note) &&
    isOptionalString(value.source)
  );
};

const isBackupRecord = (value: unknown) => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.backedUpAt === 'string' &&
    isNonNegativeInteger(value.historyCount) &&
    isNonNegativeInteger(value.incrementCount) &&
    (value.method === 'manual' || value.method === 'auto')
  );
};

const isSettingsItem = (value: unknown) => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.group === 'string' &&
    typeof value.description === 'string' &&
    typeof value.section === 'string'
  );
};

const isCategoryNumberRecord = (value: unknown, includeAll: boolean) => {
  if (!isObjectRecord(value)) {
    return false;
  }

  const keys = includeAll
    ? ['all', 'account', 'history', 'snapshot', 'settings']
    : ['account', 'history', 'snapshot', 'settings'];

  return keys.every(
    (key) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0
  );
};

const isStringArrayRecord = (value: unknown) => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return ['all', 'account', 'history', 'snapshot', 'settings'].every(
    (key) => Array.isArray(value[key]) && (value[key] as unknown[]).every((item) => typeof item === 'string')
  );
};

const isPositiveCategoryNumberRecord = (value: unknown) =>
  isObjectRecord(value) &&
  ['all', 'account', 'history', 'snapshot', 'settings'].every(
    (key) => isPositiveInteger(value[key])
  );

export const isBuildIndexRequest = (value: unknown): value is BuildIndexRequest => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    value.type === 'build-index' &&
    isPositiveInteger(value.revision) &&
    Array.isArray(value.groups) &&
    value.groups.every(isGroup) &&
    Array.isArray(value.historyRecords) &&
    value.historyRecords.every(isHistoryRecord) &&
    Array.isArray(value.backupRecords) &&
    value.backupRecords.every(isBackupRecord) &&
    isSearchIndexConfig(value.config) &&
    Array.isArray(value.settingsItems) &&
    value.settingsItems.every(isSettingsItem)
  );
};

export const isQueryRequest = (value: unknown): value is QueryRequest => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    value.type === 'query' &&
    isPositiveInteger(value.requestId) &&
    isPositiveInteger(value.revision) &&
    typeof value.query === 'string' &&
    (value.searchLogicMode === 'strict' || value.searchLogicMode === 'infer') &&
    isPositiveCategoryNumberRecord(value.resultLimitsByCategory)
  );
};

export const isSearchWorkerRequest = (value: unknown): value is SearchWorkerRequest =>
  (isObjectRecord(value) && value.type === 'dispose') ||
  isBuildIndexRequest(value) ||
  isQueryRequest(value);

const isNavigationTarget = (value: unknown): value is SearchNavigationTarget => {
  if (!isObjectRecord(value) || typeof value.key !== 'string') {
    return false;
  }

  switch (value.category) {
    case 'account':
      return typeof value.groupId === 'string' && typeof value.accountId === 'string';
    case 'history':
    case 'snapshot':
      return typeof value.recordId === 'string';
    case 'settings':
      return typeof value.settingsId === 'string' && typeof value.settingsSection === 'string';
    default:
      return false;
  }
};

const isGlobalSearchOutput = (value: unknown): value is GlobalSearchOutput => {
  if (!isObjectRecord(value)) {
    return false;
  }

  const resultArrays = [
    value.allResults,
    value.accountResults,
    value.historyResults,
    value.snapshotResults,
    value.settingsResults
  ];
  const isSearchResult = (result: unknown) => {
    if (
      !isObjectRecord(result) ||
      typeof result.id !== 'string' ||
      (result.category !== 'account' &&
        result.category !== 'history' &&
        result.category !== 'snapshot' &&
        result.category !== 'settings') ||
      !isNavigationTarget(result.target) ||
      result.target.category !== result.category ||
      typeof result.title !== 'string' ||
      typeof result.subtitle !== 'string' ||
      typeof result.value !== 'string' ||
      typeof result.score !== 'number' ||
      !Number.isFinite(result.score) ||
      !isNonNegativeInteger(result.index) ||
      !isNonNegativeInteger(result.matchedTermCount) ||
      (result.matchLabel !== 'hit' && result.matchLabel !== 'inferred') ||
      typeof result.matchKind !== 'string' ||
      typeof result.isWeakRelated !== 'boolean' ||
      typeof result.strength !== 'string' ||
      !isObjectRecord(result.highlights) ||
      !isObjectRecord(result.primaryMatch)
    ) {
      return false;
    }

    switch (result.category) {
      case 'account':
        return isGroup(result.group) && isAccount(result.account) && typeof result.mark === 'string';
      case 'history':
        return isHistoryRecord(result.record) && result.icon === 'history';
      case 'snapshot':
        return isBackupRecord(result.record) && result.icon === 'snapshot';
      case 'settings':
        return isSettingsItem(result.item) && result.icon === 'settings';
    }
  };
  const resultsByCategory = isObjectRecord(value.resultsByCategory)
    ? value.resultsByCategory
    : null;
  const resultsByCategoryValid =
    resultsByCategory !== null &&
    ['account', 'history', 'snapshot', 'settings'].every(
      (key) =>
        Array.isArray(resultsByCategory[key]) &&
        (resultsByCategory[key] as unknown[]).every(isSearchResult)
    );

  return (
    isObjectRecord(value.intent) &&
    typeof value.intent.query === 'string' &&
    Array.isArray(value.intent.terms) &&
    typeof value.query === 'string' &&
    typeof value.hasQuery === 'boolean' &&
    (value.searchLogicMode === 'strict' || value.searchLogicMode === 'infer') &&
    resultArrays.every(Array.isArray) &&
    resultArrays.every((results) => (results as unknown[]).every(isSearchResult)) &&
    Array.isArray(value.strongNavigationTargets) &&
    (value.strongNavigationTargets as unknown[]).every(isNavigationTarget) &&
    isCategoryNumberRecord(value.counts, true) &&
    isCategoryNumberRecord(value.topScores, false) &&
    resultsByCategoryValid &&
    (value.bestCategory === null ||
      value.bestCategory === 'account' ||
      value.bestCategory === 'history' ||
      value.bestCategory === 'snapshot' ||
      value.bestCategory === 'settings') &&
    (value.focusTarget === null || isNavigationTarget(value.focusTarget)) &&
    typeof value.weakMode === 'boolean' &&
    isStringArrayRecord(value.sortedResultIds)
  );
};

const isWorkerErrorCode = (value: unknown): value is SearchWorkerErrorCode =>
  value === 'invalid-request' ||
  value === 'invalid-response' ||
  value === 'stale-revision' ||
  value === 'build-failed' ||
  value === 'query-failed' ||
  value === 'worker-failed';

export const isSearchWorkerResponse = (value: unknown): value is SearchWorkerResponse => {
  if (!isObjectRecord(value)) {
    return false;
  }

  if (value.type === 'index-building') {
    return isPositiveInteger(value.revision);
  }

  if (value.type === 'index-ready') {
    return (
      isPositiveInteger(value.revision) &&
      isCategoryNumberRecord(value.totals, false) &&
      typeof value.durationMs === 'number' &&
      Number.isFinite(value.durationMs)
    );
  }

  if (value.type === 'query-result') {
    return (
      isPositiveInteger(value.requestId) &&
      isPositiveInteger(value.revision) &&
      isGlobalSearchOutput(value.output) &&
      typeof value.durationMs === 'number' &&
      Number.isFinite(value.durationMs)
    );
  }

  if (value.type === 'worker-error') {
    return (
      (value.operation === 'build-index' ||
        value.operation === 'query' ||
        value.operation === 'protocol' ||
        value.operation === 'worker') &&
      isNonNegativeInteger(value.revision) &&
      (value.requestId === undefined || isPositiveInteger(value.requestId)) &&
      isWorkerErrorCode(value.code)
    );
  }

  return false;
};

export type SearchWorkerResponseGate = {
  generation: number;
  currentGeneration: number;
  currentRevision: number;
  latestRequestId: number;
  isOpen: boolean;
  isDisposed: boolean;
};

export const shouldAcceptSearchWorkerResponse = (
  response: SearchWorkerResponse,
  gate: SearchWorkerResponseGate
) => {
  if (
    gate.isDisposed ||
    gate.generation !== gate.currentGeneration ||
    response.revision !== gate.currentRevision
  ) {
    return false;
  }

  return response.type !== 'query-result' ||
    (gate.isOpen && response.requestId === gate.latestRequestId);
};
