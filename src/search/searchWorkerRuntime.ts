import { createGlobalSearchIndex, runGlobalSearch } from './searchEngine';
import { createSearchIndexOptionsFromConfig } from './searchIndexConfig';
import {
  isBuildIndexRequest,
  isQueryRequest,
  type QueryRequest,
  type SearchWorkerRequest,
  type SearchWorkerResponse,
  type WorkerErrorResponse
} from './searchWorkerProtocol';
import type { SearchIndexedData } from './searchTypes';

export type SearchWorkerRuntime = {
  handleMessage: (payload: unknown) => void;
  dispose: () => void;
};

export type CreateSearchWorkerRuntimeOptions<TTimer> = {
  postMessage: (response: SearchWorkerResponse) => void;
  setTimer: (callback: () => void) => TTimer;
  clearTimer: (timer: TTimer) => void;
  onDispose?: () => void;
};

const createErrorResponse = (
  operation: WorkerErrorResponse['operation'],
  code: WorkerErrorResponse['code'],
  revision: number,
  requestId?: number
): WorkerErrorResponse => ({
  type: 'worker-error',
  operation,
  code,
  revision,
  ...(requestId === undefined ? {} : { requestId })
});

export const createSearchWorkerRuntime = <TTimer>({
  postMessage,
  setTimer,
  clearTimer,
  onDispose
}: CreateSearchWorkerRuntimeOptions<TTimer>): SearchWorkerRuntime => {
  let index: SearchIndexedData | null = null;
  let indexRevision = 0;
  let pendingQuery: QueryRequest | null = null;
  let pendingQueryTimer: TTimer | null = null;
  let disposed = false;

  const dispose = () => {
    if (disposed) {
      return;
    }

    disposed = true;
    index = null;
    pendingQuery = null;

    if (pendingQueryTimer !== null) {
      clearTimer(pendingQueryTimer);
      pendingQueryTimer = null;
    }

    onDispose?.();
  };

  const runLatestQuery = () => {
    pendingQueryTimer = null;
    const request = pendingQuery;
    pendingQuery = null;

    if (!request || disposed) {
      return;
    }

    if (!index || request.revision !== indexRevision) {
      postMessage(
        createErrorResponse('query', 'stale-revision', request.revision, request.requestId)
      );
      return;
    }

    const startedAt = performance.now();

    try {
      const output = runGlobalSearch(index, request.query, {
        searchLogicMode: request.searchLogicMode,
        resultLimitsByCategory: request.resultLimitsByCategory
      });

      if (disposed) {
        return;
      }

      postMessage({
        type: 'query-result',
        requestId: request.requestId,
        revision: request.revision,
        output,
        durationMs: performance.now() - startedAt
      });
    } catch {
      postMessage(
        createErrorResponse('query', 'query-failed', request.revision, request.requestId)
      );
    }
  };

  const scheduleQuery = (request: QueryRequest) => {
    pendingQuery = request;

    if (pendingQueryTimer !== null) {
      return;
    }

    pendingQueryTimer = setTimer(runLatestQuery);
  };

  const buildIndex = (request: Extract<SearchWorkerRequest, { type: 'build-index' }>) => {
    postMessage({ type: 'index-building', revision: request.revision });
    const startedAt = performance.now();

    try {
      const nextIndex = createGlobalSearchIndex(
        request.groups,
        request.historyRecords,
        request.backupRecords,
        createSearchIndexOptionsFromConfig(request.config, request.settingsItems)
      );

      if (disposed) {
        return;
      }

      index = nextIndex;
      indexRevision = request.revision;
      postMessage({
        type: 'index-ready',
        revision: request.revision,
        totals: nextIndex.totals,
        durationMs: performance.now() - startedAt
      });
    } catch {
      index = null;
      indexRevision = 0;
      postMessage(createErrorResponse('build-index', 'build-failed', request.revision));
    }
  };

  return {
    handleMessage: (payload) => {
      if (disposed) {
        return;
      }

      if (payload && typeof payload === 'object' && (payload as { type?: unknown }).type === 'dispose') {
        dispose();
        return;
      }

      if (isBuildIndexRequest(payload)) {
        pendingQuery = null;
        buildIndex(payload);
        return;
      }

      if (isQueryRequest(payload)) {
        scheduleQuery(payload);
        return;
      }

      const revision =
        payload && typeof payload === 'object' &&
        typeof (payload as { revision?: unknown }).revision === 'number'
          ? Math.max(0, Math.floor((payload as { revision: number }).revision))
          : 0;
      postMessage(createErrorResponse('protocol', 'invalid-request', revision));
    },
    dispose
  };
};
