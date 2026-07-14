import { useCallback, useEffect, useRef, useState } from 'react';
import {
  hasSearchRevisionIdentityChanged,
  shouldBuildSearchRevision
} from './searchIndexLifecycle';
import type { SearchIndexConfig } from './searchIndexConfig';
import {
  acceptCurrentSearchResult,
  createInitialSearchResultPresentation,
  type SearchIndexLifecycleState
} from './searchResultPresentation';
import {
  isSearchWorkerResponse,
  shouldAcceptSearchWorkerResponse,
  type BuildIndexRequest,
  type QueryRequest
} from './searchWorkerProtocol';
import type {
  AssetGroupWithAccounts,
  BackupRecord,
  HistoryRecord,
  SearchLogicMode,
  SearchResultLimitsByCategory,
  SettingsSearchItem
} from './searchTypes';

export type UseGlobalSearchWorkerOptions = {
  groups: AssetGroupWithAccounts[];
  historyRecords: HistoryRecord[];
  backupRecords: BackupRecord[];
  config: SearchIndexConfig;
  settingsItems: SettingsSearchItem[];
  query: string;
  searchLogicMode: SearchLogicMode;
  resultLimitsByCategory: SearchResultLimitsByCategory;
  isOpen: boolean;
};

type SearchWorkerInputs = Pick<
  UseGlobalSearchWorkerOptions,
  'groups' | 'historyRecords' | 'backupRecords' | 'config' | 'settingsItems'
>;

type SearchWorkerInstance = {
  worker: Worker;
  generation: number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const scheduleIdleBuild = (callback: () => void) => {
  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 1500 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const timer = window.setTimeout(callback, 500);
  return () => window.clearTimeout(timer);
};

export const useGlobalSearchWorker = ({
  groups,
  historyRecords,
  backupRecords,
  config,
  settingsItems,
  query,
  searchLogicMode,
  resultLimitsByCategory,
  isOpen
}: UseGlobalSearchWorkerOptions) => {
  const inputRevisionRef = useRef<
    SearchWorkerInputs & { revision: number }
  >({
    groups,
    historyRecords,
    backupRecords,
    config,
    settingsItems,
    revision: 1
  });
  const previousInputs = inputRevisionRef.current;

  if (hasSearchRevisionIdentityChanged(previousInputs, {
    groups,
    historyRecords,
    backupRecords,
    config,
    settingsItems
  })) {
    inputRevisionRef.current = {
      groups,
      historyRecords,
      backupRecords,
      config,
      settingsItems,
      revision: previousInputs.revision + 1
    };
  }

  const revision = inputRevisionRef.current.revision;
  const currentDataRef = useRef({
    ...inputRevisionRef.current,
    query,
    searchLogicMode,
    resultLimitsByCategory,
    isOpen
  });
  currentDataRef.current = {
    ...inputRevisionRef.current,
    query,
    searchLogicMode,
    resultLimitsByCategory,
    isOpen
  };

  const [lifecycle, setLifecycle] = useState<SearchIndexLifecycleState>('idle');
  const [presentation, setPresentation] = useState(() =>
    createInitialSearchResultPresentation(searchLogicMode)
  );
  const workerRef = useRef<SearchWorkerInstance | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const readyRevisionRef = useRef(0);
  const buildingRevisionRef = useRef(0);
  const latestRequestIdRef = useRef(0);
  const latestQueryRequestRef = useRef<QueryRequest | null>(null);
  const latestQuerySignatureRef = useRef('');
  const cancelScheduledBuildRef = useRef<(() => void) | null>(null);
  const issueQueryRef = useRef<() => void>(() => undefined);
  const handleResponseRef = useRef<(response: unknown, generation: number) => void>(
    () => undefined
  );

  const resetPresentation = useCallback(() => {
    latestRequestIdRef.current += 1;
    latestQueryRequestRef.current = null;
    latestQuerySignatureRef.current = '';
    setPresentation(
      createInitialSearchResultPresentation(currentDataRef.current.searchLogicMode)
    );
  }, []);

  const failWorker = useCallback(() => {
    const currentWorker = workerRef.current;

    if (currentWorker) {
      currentWorker.worker.terminate();
    }

    workerRef.current = null;
    buildingRevisionRef.current = 0;
    readyRevisionRef.current = 0;
    latestQueryRequestRef.current = null;
    latestQuerySignatureRef.current = '';

    if (mountedRef.current) {
      setLifecycle('error');
    }
  }, []);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) {
      return workerRef.current;
    }

    try {
      const worker = new Worker(new URL('./searchWorker.ts', import.meta.url), {
        type: 'module'
      });
      generationRef.current += 1;
      const instance = { worker, generation: generationRef.current };
      worker.onmessage = (event: MessageEvent<unknown>) =>
        handleResponseRef.current(event.data, instance.generation);
      worker.onerror = () => failWorker();
      worker.onmessageerror = () => failWorker();
      workerRef.current = instance;
      return instance;
    } catch {
      failWorker();
      return null;
    }
  }, [failWorker]);

  const issueQuery = useCallback(() => {
    const current = currentDataRef.current;
    const instance = workerRef.current;

    if (
      !current.isOpen ||
      !instance ||
      readyRevisionRef.current !== current.revision ||
      !mountedRef.current
    ) {
      return;
    }

    const signature = [
      current.revision,
      current.query,
      current.searchLogicMode,
      current.resultLimitsByCategory.all,
      current.resultLimitsByCategory.account,
      current.resultLimitsByCategory.history,
      current.resultLimitsByCategory.snapshot,
      current.resultLimitsByCategory.settings
    ].join('\u0000');

    if (signature === latestQuerySignatureRef.current) {
      return;
    }

    latestQuerySignatureRef.current = signature;
    latestRequestIdRef.current += 1;
    const request: QueryRequest = {
      type: 'query',
      requestId: latestRequestIdRef.current,
      revision: current.revision,
      query: current.query,
      searchLogicMode: current.searchLogicMode,
      resultLimitsByCategory: current.resultLimitsByCategory
    };
    latestQueryRequestRef.current = request;

    try {
      instance.worker.postMessage(request);
    } catch {
      failWorker();
    }
  }, [failWorker]);
  issueQueryRef.current = issueQuery;

  const handleResponse = useCallback((payload: unknown, generation: number) => {
    if (!isSearchWorkerResponse(payload)) {
      failWorker();
      return;
    }

    const current = currentDataRef.current;
    const instance = workerRef.current;
    const gate = {
      generation,
      currentGeneration: instance?.generation ?? 0,
      currentRevision: current.revision,
      latestRequestId: latestRequestIdRef.current,
      isOpen: current.isOpen,
      isDisposed: !mountedRef.current
    };

    if (!shouldAcceptSearchWorkerResponse(payload, gate)) {
      return;
    }

    if (payload.type === 'worker-error') {
      failWorker();
      return;
    }

    if (payload.type === 'index-building') {
      setLifecycle('building');
      return;
    }

    if (payload.type === 'index-ready') {
      readyRevisionRef.current = payload.revision;
      buildingRevisionRef.current = 0;
      latestQuerySignatureRef.current = '';
      setLifecycle('ready');

      if (current.isOpen) {
        issueQueryRef.current();
      }
      return;
    }

    const request = latestQueryRequestRef.current;

    if (!request || request.requestId !== payload.requestId) {
      return;
    }

    setPresentation((previous) =>
      acceptCurrentSearchResult(previous, payload.output, request, current)
    );
  }, [failWorker]);
  handleResponseRef.current = handleResponse;

  const buildCurrentRevision = useCallback(() => {
    cancelScheduledBuildRef.current?.();
    cancelScheduledBuildRef.current = null;
    const current = currentDataRef.current;

    if (
      !shouldBuildSearchRevision(
        current.revision,
        readyRevisionRef.current,
        buildingRevisionRef.current
      ) ||
      !mountedRef.current
    ) {
      return;
    }

    const instance = ensureWorker();

    if (!instance) {
      return;
    }

    buildingRevisionRef.current = current.revision;
    const request: BuildIndexRequest = {
      type: 'build-index',
      revision: current.revision,
      groups: current.groups,
      historyRecords: current.historyRecords,
      backupRecords: current.backupRecords,
      config: current.config,
      settingsItems: current.settingsItems
    };

    try {
      instance.worker.postMessage(request);
    } catch {
      failWorker();
    }
  }, [ensureWorker, failWorker]);

  useEffect(() => {
    latestRequestIdRef.current += 1;
    latestQueryRequestRef.current = null;
    latestQuerySignatureRef.current = '';

    if (readyRevisionRef.current === revision) {
      setLifecycle('ready');
      return;
    }

    setLifecycle(readyRevisionRef.current > 0 ? 'stale' : 'scheduled');
    cancelScheduledBuildRef.current?.();
    cancelScheduledBuildRef.current = scheduleIdleBuild(buildCurrentRevision);

    return () => {
      cancelScheduledBuildRef.current?.();
      cancelScheduledBuildRef.current = null;
    };
  }, [buildCurrentRevision, revision]);

  useEffect(() => {
    if (!isOpen) {
      latestRequestIdRef.current += 1;
      latestQueryRequestRef.current = null;
      latestQuerySignatureRef.current = '';
      return;
    }

    if (readyRevisionRef.current !== revision) {
      buildCurrentRevision();
      return;
    }

    issueQuery();
  }, [
    buildCurrentRevision,
    isOpen,
    issueQuery,
    query,
    resultLimitsByCategory,
    revision,
    searchLogicMode
  ]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cancelScheduledBuildRef.current?.();
      latestRequestIdRef.current += 1;
      latestQueryRequestRef.current = null;
      const instance = workerRef.current;

      if (instance) {
        try {
          instance.worker.postMessage({ type: 'dispose' });
        } finally {
          instance.worker.terminate();
        }
      }

      workerRef.current = null;
      buildingRevisionRef.current = 0;
      readyRevisionRef.current = 0;
      latestQuerySignatureRef.current = '';
    };
  }, []);

  const isUpdating =
    readyRevisionRef.current > 0 &&
    readyRevisionRef.current !== revision &&
    lifecycle !== 'error';
  const statusText = lifecycle === 'error'
    ? '搜索暂时不可用'
    : lifecycle === 'ready'
      ? null
      : isUpdating
        ? '正在更新搜索'
        : '正在准备搜索';

  return {
    presentation,
    lifecycle,
    revision,
    statusText,
    resetPresentation,
    canNavigate: lifecycle === 'ready' && readyRevisionRef.current === revision
  };
};
