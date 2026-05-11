/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGlobalSearchIndex,
  runGlobalSearch,
  shouldAutoSelectSearchCategory
} from '../searchEngine';
import {
  createAccountSearchTarget,
  createHistorySearchTarget,
  createSettingsSearchTarget,
  createSnapshotSearchTarget,
  getNextKeyboardEntry,
  getNextSearchNavigationTarget,
  getSearchCategoryItemId,
  getSearchEnterResolution,
  getSearchKeyboardEntries,
  getSearchNavigationCycle,
  getSearchTargetPresentation,
  getVisibleSearchCategories,
  SEARCH_RETURN_HIGHLIGHT_MS,
  SEARCH_SCROLL_BLOCK,
  SEARCH_TARGET_HIGHLIGHT_MS
} from '../searchNavigation';
import {
  createInitialSearchState,
  getSearchEscapeAction,
  searchStateReducer
} from '../searchState';
import type {
  AccountTypeNature,
  AssetGroup,
  BackupMethod,
  BackupRecord,
  GlobalSearchOutput,
  HistoryRecord,
  HistoryType,
  SearchCategoryCounts,
  SettingsSearchItem
} from '../searchTypes';
import {
  SEARCH_CATEGORY_LABELS,
  SEARCH_CATEGORY_TABS,
  SEARCH_RESULT_CATEGORIES
} from '../searchTypes';

const fixedNow = new Date('2026-04-30T12:00:00.000Z').getTime();
const realDateNow = Date.now;

Date.now = () => fixedNow;
test.after(() => {
  Date.now = realDateNow;
});

const natureLabels: Record<AccountTypeNature, string> = {
  asset: '资产',
  receivable: '应收',
  liability: '负债'
};

const historyTypeLabels: Record<HistoryType, string> = {
  新增: '新增',
  删除: '删除',
  修改: '修改',
  归档: '已归档',
  重新启用: '重新启用'
};

const backupMethodLabels: Record<BackupMethod, string> = {
  manual: '手动快照',
  auto: '自动快照'
};

const formatSignedMoney = (amount: number | null) => {
  if (amount === null) {
    return '无';
  }

  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';

  return `${sign}${Math.abs(amount).toFixed(2)}`;
};

const formatDate = (value: string) => value.slice(0, 10);

const groups: AssetGroup[] = [
  {
    name: '现金',
    nature: 'asset',
    includeInStats: true,
    sortOrder: 0,
    accounts: [
      {
        id: 'cash',
        name: '现金',
        amount: 200,
        createdAt: '2026-04-29T09:00:00.000Z'
      },
      {
        id: 'cash-reserve',
        name: '现金备用',
        amount: 260,
        createdAt: '2026-04-26T09:00:00.000Z',
        alias: '备用'
      }
    ]
  },
  {
    name: '信用',
    nature: 'liability',
    includeInStats: true,
    sortOrder: 1,
    accounts: [
      {
        id: 'credit-card',
        name: '信用卡',
        amount: -200,
        createdAt: '2026-04-29T09:00:00.000Z'
      },
      {
        id: 'number-name',
        name: '200号卡',
        amount: 88,
        createdAt: '2026-03-01T09:00:00.000Z'
      }
    ]
  },
  {
    name: '投资',
    nature: 'asset',
    includeInStats: true,
    sortOrder: 2,
    accounts: [
      {
        id: 'stock',
        name: '股票',
        amount: 1200,
        createdAt: '2026-01-08T09:00:00.000Z',
        alias: 'GP'
      }
    ]
  }
];

const historyRecords: HistoryRecord[] = [
  {
    id: 'h-exact',
    accountId: 'cash',
    type: '修改',
    groupName: '现金',
    accountName: '现金',
    beforeAmount: 0,
    afterAmount: 200,
    time: '2026-04-29T10:00:00.000Z'
  },
  {
    id: 'h-plus-1',
    accountId: 'credit-card',
    type: '修改',
    groupName: '信用',
    accountName: '信用卡',
    beforeAmount: 0,
    afterAmount: -200,
    time: '2026-04-30T10:00:00.000Z',
    note: '信用卡账单'
  },
  {
    id: 'h-plus-2',
    accountId: 'stock',
    type: '新增',
    groupName: '投资',
    accountName: '股票',
    beforeAmount: 500,
    afterAmount: 520,
    time: '2026-05-01T10:00:00.000Z'
  },
  {
    id: 'h-minus-3',
    accountId: 'rent',
    type: '修改',
    groupName: '生活',
    accountName: '租房',
    beforeAmount: 100,
    afterAmount: 130,
    time: '2026-04-26T10:00:00.000Z',
    note: '月度调整'
  },
  {
    id: 'h-outside-tolerance',
    accountId: 'food',
    type: '修改',
    groupName: '生活',
    accountName: '餐饮',
    beforeAmount: 100,
    afterAmount: 140,
    time: '2026-04-25T10:00:00.000Z'
  }
];

const snapshots: BackupRecord[] = [
  {
    id: 'b-exact',
    backedUpAt: '2026-04-29T08:00:00.000Z',
    historyCount: 200,
    incrementCount: 4,
    method: 'manual'
  },
  {
    id: 'b-plus-3',
    backedUpAt: '2026-05-02T08:00:00.000Z',
    historyCount: 999,
    incrementCount: 3,
    method: 'auto'
  },
  {
    id: 'b-outside-tolerance',
    backedUpAt: '2026-05-03T08:00:00.000Z',
    historyCount: 1000,
    incrementCount: 1,
    method: 'auto'
  }
];

const settingsItems: SettingsSearchItem[] = [
  {
    id: 'appearance',
    title: '显示与界面',
    group: '全局设置',
    description: '主题、正负值颜色与首页资产统计显示。',
    section: 'appearance',
    keywords: ['外观', '显示', '界面', '主题', '数字正负值显示', '资产统计数值类型', '显示类型', '紧凑数字格式', '页面主题'],
    pinyinKeywords: ['xian shi', 'jie mian', 'wai guan', 'zhu ti', 'jin cou shu zi ge shi'],
    pinyinInitials: ['xs', 'jm', 'wg', 'zt', 'jcszgs']
  },
  {
    id: 'charts',
    title: '图表设置',
    group: '全局设置',
    description: '图表配色、首页缩略图表与全局图表控制。',
    section: 'charts',
    keywords: ['图表', '趋势图', '资产结构显示', '资产趋势显示', '图表配色', '多重叠加数字', '自适应纵轴', '横轴范围显示', '点值显示', '近 1 月', '近 3 月', '近 6 月', '近 1 年'],
    pinyinKeywords: ['tu biao', 'qu shi tu', 'zi shi ying zong zhou'],
    pinyinInitials: ['tb', 'qst', 'zsyzz']
  },
  {
    id: 'search',
    title: '全局搜索',
    group: '全局设置',
    description: '搜索逻辑与关键词匹配方式。',
    section: 'search',
    keywords: ['搜索设置', '搜索逻辑'],
    pinyinKeywords: ['quan ju sou suo', 'sou suo'],
    pinyinInitials: ['qjss', 'ss']
  },
  {
    id: 'backup',
    title: '数据与备份',
    group: '全局设置',
    description: '用户配置文件、历史记录备份、快照与示例数据。',
    section: 'backup',
    keywords: ['数据', '备份', '快照设置'],
    pinyinKeywords: ['shu ju', 'bei fen', 'kuai zhao'],
    pinyinInitials: ['sj', 'bf', 'kz']
  },
  {
    id: 'security',
    title: '安全',
    group: '全局设置',
    description: '登录密码、自动锁定与快照加密。',
    section: 'security',
    keywords: ['安全', '密码'],
    pinyinKeywords: ['an quan', 'mi ma'],
    pinyinInitials: ['aq', 'mm']
  },
  {
    id: 'about',
    title: '关于净流',
    group: '全局设置',
    description: '软件信息、字体许可、联系与版本信息。',
    section: 'about',
    keywords: ['字体许可']
  }
];

const createIndex = (
  sourceHistory: HistoryRecord[] = historyRecords,
  sourceSnapshots: BackupRecord[] = snapshots
) =>
  createGlobalSearchIndex(groups, sourceHistory, sourceSnapshots, {
    getAccountNatureLabel: (nature) => natureLabels[nature],
    getHistoryTypeLabel: (type) => historyTypeLabels[type],
    getBackupMethodLabel: (method) => backupMethodLabels[method],
    getAccountMark: (account) => account.alias ?? account.name.slice(0, 1),
    getHistoryChangeLabel: (record) => {
      const beforeAmount = record.beforeAmount ?? 0;
      const afterAmount = record.afterAmount ?? 0;

      return formatSignedMoney(afterAmount - beforeAmount);
    },
    formatMoney: formatSignedMoney,
    formatShortTime: formatDate,
    formatPreciseBackupTime: (time) => `快照 ${formatDate(time)}`,
    settingsItems
  });

const index = createIndex();

const search = (query: string) => runGlobalSearch(index, query);

const categoryCounts = (output: GlobalSearchOutput) => ({
  all: output.counts.all,
  account: output.counts.account,
  history: output.counts.history,
  snapshot: output.counts.snapshot,
  settings: output.counts.settings
});

const assertCounts = (
  output: GlobalSearchOutput,
  expected: SearchCategoryCounts,
  message: string
) => {
  assert.deepEqual(categoryCounts(output), expected, message);
};

const requiredQueries = [
  '现金',
  'xj',
  '200',
  '+200',
  '-200',
  '0429',
  '20260429',
  '260429',
  '2026',
  '现金 200',
  '无结果关键词',
  '弱相关关键词'
];

test('required global-search queries all execute through the engine', () => {
  requiredQueries.forEach((query) => {
    assert.equal(search(query).query, query);
  });
});

test('category counts, category order, and Chinese priority are stable', () => {
  assert.deepEqual(SEARCH_CATEGORY_TABS, ['all', 'account', 'history', 'snapshot', 'settings']);
  assert.equal(SEARCH_CATEGORY_LABELS.settings, '设置项');
  assert.deepEqual(SEARCH_RESULT_CATEGORIES, ['account', 'history', 'snapshot']);

  const output = search('现金');

  assertCounts(
    output,
    { all: 3, account: 2, history: 1, snapshot: 0, settings: 0 },
    '现金 should match two accounts and one history record'
  );
  assert.equal(output.bestCategory, 'account');
  assert.equal(output.accountResults[0]?.id, 'cash');
  assert.equal(output.accountResults[1]?.id, 'cash-reserve');
  assert.ok(
    output.accountResults[0].score > search('xj').accountResults[0].score,
    'Chinese exact text should outrank pinyin initials'
  );
});

test('settings search is a manual-only top-level category outside all results', () => {
  const output = search('全局搜索');

  assertCounts(
    output,
    { all: 0, account: 0, history: 0, snapshot: 0, settings: 1 },
    'settings results should not contribute to 全部'
  );
  assert.equal(output.bestCategory, null);
  assert.equal(shouldAutoSelectSearchCategory(output, 'all'), null);
  assert.deepEqual(getVisibleSearchCategories('all', output.counts), []);
  assert.deepEqual(getVisibleSearchCategories('settings', output.counts), ['settings']);
  assert.equal(output.settingsResults[0]?.title, '全局搜索');
  assert.equal(output.settingsResults[0]?.target.category, 'settings');
  assert.equal(
    output.settingsResults[0]?.target.category === 'settings'
      ? output.settingsResults[0].target.settingsSection
      : '',
    'search'
  );
});

test('settings search returns parent setting pages and sorts by keyword strength', () => {
  const output = search('搜索逻辑');

  assert.equal(output.counts.all, 0);
  assert.equal(output.counts.settings, 1);
  assert.deepEqual(
    output.settingsResults.map((result) => result.title),
    ['全局搜索'],
    'child setting text should resolve to the parent settings page'
  );
  assert.ok(!output.settingsResults.some((result) => result.title === '搜索逻辑'));

  const broaderOutput = search('设置');

  assert.ok(broaderOutput.settingsResults.length > 1);
  assert.equal(
    broaderOutput.settingsResults[0]?.title,
    '图表设置',
    'direct title hits should outrank description-only matches'
  );
});

test('settings search covers visible option keywords while chart children resolve to parent', () => {
  const appearanceOutput = search('紧凑数字格式');
  const chartChildOutput = search('近 3 月');
  const chartPinyinOutput = search('zsyzz');

  assertCounts(
    appearanceOutput,
    { all: 0, account: 0, history: 0, snapshot: 0, settings: 1 },
    'visible appearance option keywords should be searchable only in settings'
  );
  assert.equal(appearanceOutput.settingsResults[0]?.title, '显示与界面');
  assert.deepEqual(
    chartChildOutput.settingsResults.map((result) => result.title),
    ['图表设置']
  );
  assert.deepEqual(
    chartPinyinOutput.settingsResults.map((result) => result.title),
    ['图表设置']
  );
  assert.equal(chartPinyinOutput.bestCategory, null);
  assert.deepEqual(chartPinyinOutput.strongNavigationTargets, []);
});

test('settings search supports full pinyin and initials with isolated scoring', () => {
  const fullPinyin = search('tubiao');
  const spacedPinyin = search('tu biao');
  const initials = search('tb');
  const multiKeyword = search('xian shi');

  assertCounts(
    fullPinyin,
    { all: 0, account: 0, history: 0, snapshot: 0, settings: 1 },
    'settings pinyin should not contribute to 全部'
  );
  assert.equal(fullPinyin.settingsResults[0]?.title, '图表设置');
  assert.equal(spacedPinyin.settingsResults[0]?.title, '图表设置');
  assert.equal(initials.settingsResults[0]?.title, '图表设置');
  assert.equal(multiKeyword.settingsResults[0]?.title, '显示与界面');
  assert.equal(multiKeyword.settingsResults[0]?.matchedTermCount, 2);
  assert.equal(fullPinyin.bestCategory, null);
  assert.deepEqual(fullPinyin.strongNavigationTargets, []);
  assert.equal(shouldAutoSelectSearchCategory(fullPinyin, 'all'), null);
});

test('pinyin only applies to pure-letter tokens', () => {
  const pinyinOutput = search('xj');

  assertCounts(
    pinyinOutput,
    { all: 3, account: 2, history: 1, snapshot: 0, settings: 0 },
    'xj should use initials for 现金'
  );
  assert.equal(search('xj200').counts.all, 0, 'mixed letters and digits must not trigger pinyin');
});

test('history notes are searchable as history records and affect navigation', () => {
  const monthly = search('月度');
  const creditBill = search('信用卡账单');

  assertCounts(
    monthly,
    { all: 1, account: 0, history: 1, snapshot: 0, settings: 0 },
    'history note text should contribute to history results only'
  );
  assert.equal(monthly.historyResults[0]?.id, 'h-minus-3');
  assert.equal(monthly.historyResults[0]?.category, 'history');
  assert.equal(monthly.bestCategory, 'history');
  assert.equal(monthly.focusTarget?.category, 'history');
  assert.equal(shouldAutoSelectSearchCategory(monthly, 'all'), 'history');
  assert.equal(creditBill.historyResults[0]?.id, 'h-plus-1');
  assert.equal(creditBill.historyResults[0]?.category, 'history');
});

test('amount search is numeric, supports signs by absolute value, and preserves signed display', () => {
  const unsigned = search('200');
  const positive = search('+200');
  const negative = search('-200');

  [unsigned, positive, negative].forEach((output) => {
    assertCounts(
      output,
      { all: 5, account: 2, history: 2, snapshot: 1, settings: 0 },
      '200 variants should match numeric amount fields only'
    );
    assert.ok(!output.accountResults.some((result) => result.id === 'number-name'));
  });

  assert.equal(negative.accountResults.find((result) => result.id === 'cash')?.value, '+200.00');
  assert.equal(
    negative.accountResults.find((result) => result.id === 'credit-card')?.value,
    '-200.00'
  );
  assert.equal(
    negative.historyResults.find((result) => result.id === 'h-plus-1')?.value,
    '-200.00'
  );
});

test('date parsing supports compact formats, years, and one-to-three day tolerance', () => {
  assertCounts(
    search('0429'),
    { all: 4, account: 2, history: 1, snapshot: 1, settings: 0 },
    '0429 should match the exact month-day'
  );

  ['20260429', '260429'].forEach((query) => {
    const output = search(query);

    assertCounts(
      output,
      { all: 9, account: 3, history: 4, snapshot: 2, settings: 0 },
      `${query} should include exact date plus ±1-3 day tolerant matches`
    );
    assert.deepEqual(
      output.historyResults.map((result) => result.id).sort(),
      ['h-exact', 'h-minus-3', 'h-plus-1', 'h-plus-2']
    );
    assert.ok(!output.historyResults.some((result) => result.id === 'h-outside-tolerance'));
    assert.ok(!output.snapshotResults.some((result) => result.id === 'b-outside-tolerance'));
  });

  assertCounts(
    search('2026'),
    { all: 13, account: 5, history: 5, snapshot: 3, settings: 0 },
    '2026 should be recognized as a year across all categories'
  );
});

test('multi-key matches are weighted above single-key and prefix-only hits stay secondary', () => {
  const single = search('现金');
  const multi = search('现金 200');

  assertCounts(
    multi,
    { all: 2, account: 1, history: 1, snapshot: 0, settings: 0 },
    '现金 200 should require both text and amount intent in default mode'
  );
  assert.equal(multi.accountResults[0]?.id, 'cash');
  assert.equal(multi.accountResults[0]?.matchedTermCount, 2);
  assert.ok(multi.accountResults[0].score > single.accountResults[0].score);
  assert.equal(single.accountResults[0]?.id, 'cash');
  assert.equal(single.accountResults[1]?.id, 'cash-reserve');
});

test('weak related mode only runs after default search has no result and is excluded from navigation', () => {
  const standard = search('现金');
  const noResult = search('无结果关键词');
  const literalWeakKeyword = search('弱相关关键词');
  const weak = search('zhanghu');

  assert.equal(standard.weakMode, false);
  assert.ok(standard.accountResults.every((result) => !result.isWeakRelated));
  assert.equal(noResult.weakMode, true);
  assert.equal(noResult.counts.all, 0);
  assert.equal(literalWeakKeyword.weakMode, true);
  assert.equal(literalWeakKeyword.counts.all, 0);

  assert.equal(weak.weakMode, true);
  assert.ok(weak.accountResults.length > 0);
  assert.ok(weak.accountResults.every((result) => result.isWeakRelated));
  assert.equal(weak.strongNavigationTargets.length, 0);
  assert.equal(getSearchNavigationCycle(weak.accountResults.map((result) => result.target), weak.accountResults[0].target).length, 0);
});

test('strict search logic filters inferred matches without changing infer mode', () => {
  const strictPinyin = runGlobalSearch(index, 'xj', { searchLogicMode: 'strict' });
  const strictDate = runGlobalSearch(index, '20260429', { searchLogicMode: 'strict' });
  const strictAmountApprox = runGlobalSearch(index, '201', { searchLogicMode: 'strict' });
  const inferAmountApprox = runGlobalSearch(index, '201');
  const strictWeakFallback = runGlobalSearch(index, 'zhanghu', { searchLogicMode: 'strict' });

  assert.equal(strictPinyin.weakMode, false);
  assertCounts(
    strictPinyin,
    { all: 0, account: 0, history: 0, snapshot: 0, settings: 0 },
    'strict mode should filter pinyin-only hits'
  );

  assertCounts(
    strictDate,
    { all: 4, account: 2, history: 1, snapshot: 1, settings: 0 },
    'strict mode should keep exact same-day hits and remove date tolerance'
  );
  assert.deepEqual(strictDate.historyResults.map((result) => result.id), ['h-exact']);
  assert.deepEqual(strictDate.snapshotResults.map((result) => result.id), ['b-exact']);

  assertCounts(
    strictAmountApprox,
    { all: 0, account: 0, history: 0, snapshot: 0, settings: 0 },
    'strict mode should filter approximate amount hits'
  );
  assert.ok(inferAmountApprox.counts.all > strictAmountApprox.counts.all);

  assert.equal(strictWeakFallback.weakMode, false);
  assertCounts(
    strictWeakFallback,
    { all: 0, account: 0, history: 0, snapshot: 0, settings: 0 },
    'strict mode should not run weak fallback'
  );
});

test('search state covers locks, escape, clear, weak reset, return, and exit behavior', () => {
  let state = createInitialSearchState<{ view: string }>();

  assert.equal(state.selectedCategory, 'all');

  state = searchStateReducer(state, { type: 'open' });
  state = searchStateReducer(state, { type: 'select-category', category: 'history', lock: true });
  state = searchStateReducer(state, { type: 'query-changed', query: '现金' });
  state = searchStateReducer(state, { type: 'auto-select-category', category: 'account' });

  assert.equal(state.selectedCategory, 'history');
  assert.equal(state.categoryLockedByUser, true);

  const escapeToAll = getSearchEscapeAction(state);

  assert.deepEqual(escapeToAll, { type: 'select-category', category: 'all', lock: false });
  state = searchStateReducer(state, escapeToAll);
  assert.equal(state.selectedCategory, 'all');
  assert.equal(state.categoryLockedByUser, false);

  state = searchStateReducer(state, { type: 'set-weak-mode', weakMode: true });
  state = searchStateReducer(state, { type: 'query-changed', query: 'xj' });
  assert.equal(state.weakMode, false);

  state = searchStateReducer(state, { type: 'clear-query' });
  assert.equal(state.query, '');
  assert.equal(state.selectedCategory, 'all');
  assert.equal(state.scrollTop, 0);

  const target = createHistorySearchTarget('h-exact');

  state = {
    ...state,
    query: '现金',
    selectedCategory: 'history',
    categoryLockedByUser: true,
    focusedResultId: 'search-result:history:h-exact',
    scrollTop: 128
  };
  state = searchStateReducer(state, {
    type: 'set-navigation',
    navigation: {
      returnSnapshot: { view: 'before-search' },
      targets: [target],
      currentTargetKey: target.key
    },
    openedResultId: target.key
  });
  assert.equal(state.isOpen, false);
  assert.equal(state.lastOpenedResultId, target.key);

  state = searchStateReducer(state, { type: 'return-from-navigation' });
  assert.equal(state.isOpen, true);
  assert.equal(state.query, '现金');
  assert.equal(state.selectedCategory, 'history');
  assert.equal(state.categoryLockedByUser, true);
  assert.equal(state.scrollTop, 128);
  assert.equal(state.focusedResultId, 'search-result:history:h-exact');
  assert.equal(state.floatingNavigation, null);

  state = searchStateReducer(
    { ...state, floatingNavigation: { returnSnapshot: { view: 'x' }, targets: [target], currentTargetKey: target.key } },
    { type: 'clear-navigation' }
  );
  assert.equal(state.floatingNavigation, null);
});

test('keyboard navigation loops across categories and Enter selects categories or opens results', () => {
  const output = search('20260429');
  const entries = getSearchKeyboardEntries(output, 'all');
  const visibleCategories = getVisibleSearchCategories('all', output.counts);

  assert.deepEqual(visibleCategories, ['account', 'history', 'snapshot']);
  assert.deepEqual(
    entries.slice(0, 5).map((entry) => entry.id),
    (['all', 'account', 'history', 'snapshot', 'settings'] as const).map((category) =>
      getSearchCategoryItemId(category)
    )
  );

  const resultEntries = entries.filter((entry) => entry.kind === 'result');
  const firstHistoryIndex = resultEntries.findIndex((entry) => entry.target.category === 'history');
  const lastAccountEntry = resultEntries[firstHistoryIndex - 1];
  const firstHistoryEntry = resultEntries[firstHistoryIndex];

  assert.equal(lastAccountEntry.target.category, 'account');
  assert.equal(
    getNextKeyboardEntry(entries, lastAccountEntry.id, 1)?.id,
    firstHistoryEntry.id,
    'ArrowDown should cross from accounts into history'
  );
  const lastEntry = entries[entries.length - 1];

  assert.equal(getNextKeyboardEntry(entries, lastEntry?.id ?? '', 1)?.id, entries[0].id);
  assert.equal(getNextKeyboardEntry(entries, entries[0].id, -1)?.id, lastEntry?.id);

  const historyOnlyEntries = getSearchKeyboardEntries(output, 'history');
  assert.ok(
    historyOnlyEntries
      .filter((entry) => entry.kind === 'result')
      .every((entry) => entry.target.category === 'history')
  );

  assert.deepEqual(
    getSearchEnterResolution(entries, getSearchCategoryItemId('snapshot'), output),
    { kind: 'select-category', category: 'snapshot' }
  );

  const firstResultResolution = getSearchEnterResolution(entries, '', output);

  assert.equal(firstResultResolution?.kind, 'open-result');
  assert.equal(firstResultResolution?.kind === 'open-result' ? firstResultResolution.result.id : '', 'cash');
});

test('target navigation distinguishes account, history, snapshot, strong cycles, weak disables, and return timing', () => {
  const accountTarget = createAccountSearchTarget('现金', 'cash');
  const historyTarget = createHistorySearchTarget('h-exact');
  const snapshotTarget = createSnapshotSearchTarget('b-exact');
  const settingsTarget = createSettingsSearchTarget('search', 'search');
  const weakTarget = createHistorySearchTarget('h-weak', true);
  const strongTargets = [historyTarget, createHistorySearchTarget('h-plus-1'), snapshotTarget];
  const cycle = getSearchNavigationCycle(strongTargets, historyTarget);

  assert.deepEqual(getSearchTargetPresentation(accountTarget), {
    destination: 'account-detail',
    shouldHighlight: false,
    highlightMs: 0,
    scrollBlock: null
  });
  assert.deepEqual(getSearchTargetPresentation(historyTarget), {
    destination: 'history-panel',
    shouldHighlight: true,
    highlightMs: SEARCH_TARGET_HIGHLIGHT_MS,
    scrollBlock: SEARCH_SCROLL_BLOCK
  });
  assert.deepEqual(getSearchTargetPresentation(snapshotTarget), {
    destination: 'snapshot-panel',
    shouldHighlight: true,
    highlightMs: SEARCH_TARGET_HIGHLIGHT_MS,
    scrollBlock: SEARCH_SCROLL_BLOCK
  });
  assert.deepEqual(getSearchTargetPresentation(settingsTarget), {
    destination: 'global-settings',
    shouldHighlight: false,
    highlightMs: 0,
    scrollBlock: null
  });
  assert.equal(SEARCH_TARGET_HIGHLIGHT_MS >= 2000 && SEARCH_TARGET_HIGHLIGHT_MS <= 3000, true);
  assert.equal(SEARCH_RETURN_HIGHLIGHT_MS, 1000);
  assert.equal(SEARCH_SCROLL_BLOCK, 'center');
  assert.equal(cycle.length, 2, 'same-category strong results should form the preferred cycle');
  assert.equal(getNextSearchNavigationTarget(cycle, historyTarget, 1)?.key, 'history:h-plus-1');
  assert.equal(
    getNextSearchNavigationTarget(cycle, cycle[cycle.length - 1], 1)?.key,
    historyTarget.key
  );
  assert.equal(getSearchNavigationCycle([weakTarget], weakTarget).length, 0);
});

test('category auto-selection respects user lock and score confidence', () => {
  const output = search('现金 200');
  const unlocked = shouldAutoSelectSearchCategory(output, 'all');
  const lockedState = searchStateReducer(
    {
      ...createInitialSearchState(),
      selectedCategory: 'history',
      categoryLockedByUser: true,
      query: '现金 200'
    },
    { type: 'auto-select-category', category: unlocked ?? 'account' }
  );

  assert.equal(unlocked, 'account');
  assert.equal(lockedState.selectedCategory, 'history');
});

test('mock-data pressure stays inside the search budget', () => {
  const budgets = [
    { count: 100, maxMs: 10 },
    { count: 1000, maxMs: 30 },
    { count: 3000, maxMs: 30 },
    { count: 10000, maxMs: 80 }
  ];

  budgets.forEach(({ count, maxMs }) => {
    const mockHistory = Array.from({ length: count }, (_, index): HistoryRecord => {
      const day = String((index % 28) + 1).padStart(2, '0');

      return {
        id: `mock-history-${index}`,
        accountId: index % 2 === 0 ? 'cash' : 'credit-card',
        type: '修改',
        groupName: index % 2 === 0 ? '现金' : '信用',
        accountName: index % 2 === 0 ? '现金' : '信用卡',
        beforeAmount: index,
        afterAmount: index + (index % 2 === 0 ? 200 : -200),
        time: `2026-04-${day}T10:00:00.000Z`
      };
    });
    const mockIndex = createIndex(mockHistory, snapshots);
    const startMark = `search-perf-${count}-start`;
    const endMark = `search-perf-${count}-end`;
    const measureName = `search-perf-${count}`;

    performance.mark(startMark);
    const output = runGlobalSearch(mockIndex, '现金 200');
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    const measures = performance.getEntriesByName(measureName);
    const duration = measures[measures.length - 1]?.duration ?? 0;

    console.log(`[search perf] ${count} history records: ${duration.toFixed(2)}ms`);
    assert.ok(output.counts.all > 0);
    assert.ok(
      duration < maxMs,
      `${count} history records should search under ${maxMs}ms, got ${duration.toFixed(2)}ms`
    );

    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
  });
});
