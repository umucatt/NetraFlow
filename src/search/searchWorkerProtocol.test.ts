import assert from 'node:assert/strict';
import test from 'node:test';
import { createGlobalSearchIndex, runGlobalSearch } from './searchEngine';
import {
  createSearchIndexOptionsFromConfig,
  type SearchIndexConfig
} from './searchIndexConfig';
import {
  isBuildIndexRequest,
  isQueryRequest,
  isSearchWorkerResponse,
  shouldAcceptSearchWorkerResponse,
  type BuildIndexRequest,
  type QueryRequest,
  type SearchWorkerResponse
} from './searchWorkerProtocol';
import { createSearchWorkerRuntime } from './searchWorkerRuntime';

const config: SearchIndexConfig = {
  locale: 'zh-CN',
  currency: 'CNY',
  accountNatureLabels: {
    asset: '资产',
    receivable: '应收',
    liability: '负债'
  },
  historyTypeLabels: {
    创建: '创建',
    删除: '删除',
    修改: '修改',
    归档: '已归档',
    重新启用: '重新启用'
  },
  backupMethodLabels: {
    manual: '手动快照',
    auto: '自动快照'
  }
};

const resultLimitsByCategory = {
  all: 99,
  account: 99,
  history: 99,
  snapshot: 99,
  settings: 99
};

const buildRequest: BuildIndexRequest = {
  type: 'build-index',
  revision: 1,
  groups: [
    {
      id: 'group-1',
      name: '现金',
      nature: 'asset',
      includeInStats: true,
      sortOrder: 0,
      accounts: [
        {
          id: 'account-1',
          groupId: 'group-1',
          name: '现金账户',
          amount: 100,
          createdAt: '2026-05-12T00:00:00.000Z'
        }
      ]
    }
  ],
  historyRecords: [],
  backupRecords: [],
  config,
  settingsItems: []
};

const queryRequest: QueryRequest = {
  type: 'query',
  requestId: 1,
  revision: 1,
  query: '现金',
  searchLogicMode: 'infer',
  resultLimitsByCategory
};

test('worker protocol accepts valid build and query requests and rejects malformed payloads', () => {
  assert.equal(isBuildIndexRequest(buildRequest), true);
  assert.equal(isQueryRequest(queryRequest), true);
  assert.equal(isBuildIndexRequest({ ...buildRequest, groups: [{ id: 'unsafe' }] }), false);
  assert.equal(isQueryRequest({
    ...queryRequest,
    resultLimitsByCategory: { ...resultLimitsByCategory, all: 0 }
  }), false);
});

test('worker runtime builds, queries, and emits only validated response shapes', () => {
  const responses: SearchWorkerResponse[] = [];
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  const runtime = createSearchWorkerRuntime({
    postMessage: (response) => responses.push(response),
    setTimer: (callback) => {
      nextTimer += 1;
      timers.set(nextTimer, callback);
      return nextTimer;
    },
    clearTimer: (timer) => timers.delete(timer)
  });

  runtime.handleMessage(buildRequest);
  runtime.handleMessage(queryRequest);
  timers.forEach((callback) => callback());

  assert.deepEqual(responses.map((response) => response.type), [
    'index-building',
    'index-ready',
    'query-result'
  ]);
  assert.equal(responses.every(isSearchWorkerResponse), true);
  const queryResponse = responses.find((response) => response.type === 'query-result');
  assert.equal(queryResponse?.type === 'query-result' ? queryResponse.output.counts.all : 0, 1);
});

test('worker runtime rejects stale revisions and coalesces queries that have not started', () => {
  const responses: SearchWorkerResponse[] = [];
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  const runtime = createSearchWorkerRuntime({
    postMessage: (response) => responses.push(response),
    setTimer: (callback) => {
      nextTimer += 1;
      timers.set(nextTimer, callback);
      return nextTimer;
    },
    clearTimer: (timer) => timers.delete(timer)
  });

  runtime.handleMessage(buildRequest);
  runtime.handleMessage({ ...queryRequest, requestId: 2, revision: 2 });
  const staleTimer = timers.get(1);
  timers.delete(1);
  staleTimer?.();
  runtime.handleMessage({ ...queryRequest, requestId: 3, query: '账户' });
  runtime.handleMessage({ ...queryRequest, requestId: 4, query: '现金' });
  const latestTimer = timers.get(2);
  timers.delete(2);
  latestTimer?.();

  const queryResponses = responses.filter((response) => response.type === 'query-result');
  const staleErrors = responses.filter(
    (response) => response.type === 'worker-error' && response.code === 'stale-revision'
  );

  assert.equal(staleErrors.length, 1);
  assert.deepEqual(
    queryResponses.map((response) => response.type === 'query-result' ? response.requestId : 0),
    [4]
  );
});

test('worker runtime reports invalid payloads safely and ignores work after disposal', () => {
  const responses: SearchWorkerResponse[] = [];
  const runtime = createSearchWorkerRuntime({
    postMessage: (response) => responses.push(response),
    setTimer: () => 1,
    clearTimer: () => undefined
  });

  runtime.handleMessage({ type: 'query', query: { unsafe: true } });
  runtime.handleMessage({ type: 'dispose' });
  runtime.handleMessage(buildRequest);

  assert.deepEqual(responses, [
    {
      type: 'worker-error',
      operation: 'protocol',
      code: 'invalid-request',
      revision: 0
    }
  ]);
});

test('renderer response gate rejects stale revision, stale request, old worker, and disposed results', () => {
  const response: SearchWorkerResponse = {
    type: 'query-result',
    requestId: 8,
    revision: 3,
    output: {
      intent: { query: '', terms: [] },
      query: '',
      hasQuery: false,
      searchLogicMode: 'infer',
      allResults: [],
      accountResults: [],
      historyResults: [],
      snapshotResults: [],
      settingsResults: [],
      resultsByCategory: { account: [], history: [], snapshot: [], settings: [] },
      counts: { all: 0, account: 0, history: 0, snapshot: 0, settings: 0 },
      topScores: { account: 0, history: 0, snapshot: 0, settings: 0 },
      bestCategory: null,
      focusTarget: null,
      weakMode: false,
      sortedResultIds: { all: [], account: [], history: [], snapshot: [], settings: [] },
      strongNavigationTargets: []
    },
    durationMs: 1
  };
  const acceptedGate = {
    generation: 2,
    currentGeneration: 2,
    currentRevision: 3,
    latestRequestId: 8,
    isOpen: true,
    isDisposed: false
  };

  assert.equal(shouldAcceptSearchWorkerResponse(response, acceptedGate), true);
  assert.equal(
    shouldAcceptSearchWorkerResponse(response, { ...acceptedGate, latestRequestId: 9 }),
    false
  );
  assert.equal(
    shouldAcceptSearchWorkerResponse(response, { ...acceptedGate, currentRevision: 4 }),
    false
  );
  assert.equal(
    shouldAcceptSearchWorkerResponse(response, { ...acceptedGate, currentGeneration: 3 }),
    false
  );
  assert.equal(
    shouldAcceptSearchWorkerResponse(response, { ...acceptedGate, isDisposed: true }),
    false
  );
});

test('worker query path preserves bounded search semantics across text, pinyin, amount, date, and categories', () => {
  const semanticBuild: BuildIndexRequest = {
    ...buildRequest,
    historyRecords: [
      {
        id: 'history-1',
        accountId: 'account-1',
        type: '修改',
        groupName: '现金',
        accountName: '现金账户',
        beforeAmount: 100,
        afterAmount: 300,
        time: '2026-05-12T10:00:00.000Z',
        note: '日常记录'
      }
    ],
    backupRecords: [
      {
        id: 'snapshot-1',
        backedUpAt: '2026-05-12T08:00:00.000Z',
        historyCount: 1,
        incrementCount: 1,
        method: 'manual'
      }
    ],
    settingsItems: [
      {
        id: 'search',
        title: '全局搜索',
        group: '搜索设置',
        description: '搜索匹配方式',
        section: 'search'
      }
    ]
  };
  const directIndex = createGlobalSearchIndex(
    semanticBuild.groups,
    semanticBuild.historyRecords,
    semanticBuild.backupRecords,
    createSearchIndexOptionsFromConfig(config, semanticBuild.settingsItems)
  );
  const responses: SearchWorkerResponse[] = [];
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  const runtime = createSearchWorkerRuntime({
    postMessage: (response) => responses.push(response),
    setTimer: (callback) => {
      nextTimer += 1;
      timers.set(nextTimer, callback);
      return nextTimer;
    },
    clearTimer: (timer) => timers.delete(timer)
  });
  runtime.handleMessage(semanticBuild);
  const cases = [
    { query: '现金', searchLogicMode: 'infer' as const },
    { query: 'xianjin', searchLogicMode: 'infer' as const },
    { query: '200', searchLogicMode: 'strict' as const },
    { query: '20260512', searchLogicMode: 'infer' as const },
    { query: '搜索', searchLogicMode: 'infer' as const }
  ];

  cases.forEach((currentCase, index) => {
    const request: QueryRequest = {
      type: 'query',
      requestId: index + 1,
      revision: 1,
      resultLimitsByCategory: {
        all: 2,
        account: 2,
        history: 2,
        snapshot: 2,
        settings: 2
      },
      ...currentCase
    };
    runtime.handleMessage(request);
    const timer = timers.get(index + 1);
    timers.delete(index + 1);
    timer?.();
    const workerOutput = responses.find(
      (response) => response.type === 'query-result' && response.requestId === request.requestId
    );
    const directOutput = runGlobalSearch(directIndex, request.query, {
      searchLogicMode: request.searchLogicMode,
      resultLimitsByCategory: request.resultLimitsByCategory
    });

    assert.deepEqual(
      workerOutput?.type === 'query-result' ? workerOutput.output : null,
      directOutput
    );
  });
});
