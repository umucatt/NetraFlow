/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { createGlobalSearchIndex, runGlobalSearch } from '../searchEngine';
import {
  createHistorySearchTarget,
  createSnapshotSearchTarget,
  createSettingsSearchTarget,
  getNextKeyboardEntry,
  getNextSearchNavigationTarget,
  getSearchEnterResolution,
  getSearchKeyboardEntries,
  getSearchNavigationCycle,
  getSearchResultsForCategory,
  getSearchTargetPresentation,
  SEARCH_SCROLL_BLOCK
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
  HistoryRecord,
  HistoryType,
  SearchCategoryCounts,
  SettingsSearchItem
} from '../searchTypes';
import { SEARCH_CATEGORY_LABELS, SEARCH_CATEGORY_TABS } from '../searchTypes';
import { SEARCH_INITIAL_RESULT_LIMIT } from '../searchWeights';

const fixedNow = new Date('2026-05-19T12:00:00.000Z').getTime();
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
  归档: '归档',
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
const MODIFY_HISTORY_TYPE: HistoryType = '\u4fee\u6539';

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
        createdAt: '2026-05-19T09:00:00.000Z'
      },
      {
        id: 'cash-reserve',
        name: '现金备用',
        amount: 260,
        createdAt: '2026-05-18T09:00:00.000Z',
        alias: '备用'
      }
    ]
  },
  {
    name: '流动资金',
    nature: 'asset',
    includeInStats: true,
    sortOrder: 1,
    accounts: [
      {
        id: 'ccb-card',
        name: '建设银行储蓄卡',
        amount: 999.99,
        createdAt: '2026-05-10T09:00:00.000Z',
        alias: '建行'
      }
    ]
  },
  {
    name: '信用',
    nature: 'liability',
    includeInStats: true,
    sortOrder: 2,
    accounts: [
      {
        id: 'credit-card',
        name: '信用卡',
        amount: -200,
        createdAt: '2026-05-01T09:00:00.000Z'
      }
    ]
  }
];

const historyRecords: HistoryRecord[] = [
  {
    id: 'h-cash-plus',
    accountId: 'cash',
    type: '修改',
    groupName: '现金',
    accountName: '现金',
    beforeAmount: 0,
    afterAmount: 200,
    time: '2026-05-19T10:00:00.000Z',
    note: '主字段之外的备注'
  },
  {
    id: 'h-credit-minus',
    accountId: 'credit-card',
    type: '修改',
    groupName: '信用',
    accountName: '信用卡',
    beforeAmount: 0,
    afterAmount: -200,
    time: '2026-05-18T10:00:00.000Z',
    note: '信用卡账单'
  },
  {
    id: 'h-ccb-near',
    accountId: 'ccb-card',
    type: '修改',
    groupName: '流动资金',
    accountName: '建设银行储蓄卡',
    beforeAmount: 1000,
    afterAmount: 999.99,
    time: '2026-05-17T10:00:00.000Z',
    note: '近似金额备注'
  },
  {
    id: 'h-may12-positive-5203',
    accountId: 'cash',
    type: MODIFY_HISTORY_TYPE,
    groupName: 'Numeric',
    accountName: 'Positive Amount',
    beforeAmount: 0,
    afterAmount: 5203,
    time: '2026-05-12T10:00:00.000Z',
    note: 'numeric date fixture'
  },
  {
    id: 'h-may12-negative-5203',
    accountId: 'cash',
    type: MODIFY_HISTORY_TYPE,
    groupName: 'Numeric',
    accountName: 'Negative Amount',
    beforeAmount: 0,
    afterAmount: -5203,
    time: '2026-05-12T11:00:00.000Z',
    note: 'signed amount fixture'
  },
  {
    id: 'h-may12-negative-5260',
    accountId: 'cash',
    type: MODIFY_HISTORY_TYPE,
    groupName: 'Numeric',
    accountName: 'Loose Amount',
    beforeAmount: 0,
    afterAmount: -5260,
    time: '2026-05-12T12:00:00.000Z',
    note: 'rejected loose near amount fixture'
  },
  {
    id: 'h-may11-negative-760',
    accountId: 'cash',
    type: MODIFY_HISTORY_TYPE,
    groupName: 'Numeric',
    accountName: 'Far Amount',
    beforeAmount: 0,
    afterAmount: -760,
    time: '2026-05-11T10:00:00.000Z',
    note: 'rejected far near amount fixture'
  },
  {
    id: 'h-may12-near-15060',
    accountId: 'cash',
    type: MODIFY_HISTORY_TYPE,
    groupName: 'Numeric',
    accountName: 'Near Amount',
    beforeAmount: 0,
    afterAmount: 15060,
    time: '2026-05-12T13:00:00.000Z',
    note: 'accepted tight near amount fixture'
  },
  {
    id: 'h-may12-near-25020',
    accountId: 'cash',
    type: MODIFY_HISTORY_TYPE,
    groupName: 'Numeric',
    accountName: 'Near Twenty Five Thousand',
    beforeAmount: 0,
    afterAmount: 25020,
    time: '2026-05-12T13:30:00.000Z',
    note: 'accepted tight amount fixture'
  },
  {
    id: 'h-aug15-negative-14160',
    accountId: 'cash',
    type: MODIFY_HISTORY_TYPE,
    groupName: 'Numeric',
    accountName: 'Distant Date Amount',
    beforeAmount: 39240,
    afterAmount: 25080,
    time: '2025-08-15T13:45:00.000Z',
    note: 'accepted balance amount fixture'
  },
  {
    id: 'h-may12-positive-21220',
    accountId: 'cash',
    type: MODIFY_HISTORY_TYPE,
    groupName: 'Numeric',
    accountName: 'Distant Positive Amount',
    beforeAmount: 0,
    afterAmount: 21220,
    time: '2026-05-12T14:00:00.000Z',
    note: 'rejected positive near amount fixture'
  },
  {
    id: 'h-may12-negative-14630',
    accountId: 'cash',
    type: MODIFY_HISTORY_TYPE,
    groupName: 'Numeric',
    accountName: 'Distant Negative Amount',
    beforeAmount: 0,
    afterAmount: -14630,
    time: '2026-05-12T15:00:00.000Z',
    note: 'rejected negative near amount fixture'
  }
];

const snapshots: BackupRecord[] = [
  {
    id: 'b-auto',
    backedUpAt: '2026-05-19T08:00:00.000Z',
    historyCount: 200,
    incrementCount: 4,
    method: 'auto'
  },
  {
    id: 'b-manual',
    backedUpAt: '2026-04-30T08:00:00.000Z',
    historyCount: 999,
    incrementCount: 1,
    method: 'manual'
  }
];

const settingsItems: SettingsSearchItem[] = [
  {
    id: 'search',
    title: '全局搜索',
    group: '全局设置',
    description: '搜索逻辑、允许推断、只显示命中。',
    section: 'search',
    keywords: ['搜索设置', '搜索逻辑', '允许推断', '关闭推断', '只显示命中'],
    pinyinKeywords: ['quan ju sou suo', 'sou suo'],
    pinyinInitials: ['qjss', 'ss']
  },
  {
    id: 'charts',
    title: '图表设置',
    group: '全局设置',
    description: '图表配色、资产结构显示、资产趋势显示。',
    section: 'charts',
    keywords: ['图表', '图表配色', '资产结构显示', '资产趋势显示'],
    pinyinKeywords: ['tu biao', 'tu biao she zhi'],
    pinyinInitials: ['tb', 'tbsz']
  },
  {
    id: 'backup',
    title: '数据与备份',
    group: '全局设置',
    description: '用户配置文件、历史记录备份、快照。',
    section: 'backup',
    keywords: ['数据', '备份', '快照'],
    pinyinKeywords: ['shu ju', 'bei fen', 'kuai zhao'],
    pinyinInitials: ['sj', 'bf', 'kz']
  }
];

const createIndex = () =>
  createGlobalSearchIndex(groups, historyRecords, snapshots, {
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
    formatPreciseBackupTime: (time) => formatDate(time),
    settingsItems
  });

const index = createIndex();
const search = (query: string) => runGlobalSearch(index, query);
const getResultIds = (query: string) => search(query).allResults.map((result) => result.id);
const getHighlightedText = (value: string, ranges: Array<{ start: number; end: number }>) =>
  ranges.map((range) => value.slice(range.start, range.end)).join('');

const categoryCounts = (query: string): SearchCategoryCounts => search(query).counts;

test('default categories and unified all-result stream include settings', () => {
  assert.deepEqual(SEARCH_CATEGORY_TABS, ['all', 'account', 'history', 'snapshot', 'settings']);
  assert.equal(SEARCH_CATEGORY_LABELS.all, '全部');
  assert.equal(SEARCH_CATEGORY_LABELS.settings, '设置项');

  const output = search('搜索');

  assert.equal(output.counts.settings > 0, true);
  assert.equal(output.counts.all, output.allResults.length);
  assert.equal(output.allResults.some((result) => result.category === 'settings'), true);
  assert.deepEqual(
    getSearchResultsForCategory(output, 'all').map((result) => result.id),
    output.allResults.map((result) => result.id)
  );
});

test('direct hits and inferred matches use only 命中/推断 semantics', () => {
  const direct = search('现金');
  const ordered = search('建储');
  const pinyin = search('xj');
  const typo = search('建设银航储蓄卡');

  assert.equal(direct.accountResults[0]?.matchLabel, 'hit');
  assert.equal(direct.accountResults[0]?.matchKind, 'exact');
  assert.equal(ordered.accountResults[0]?.id, 'ccb-card');
  assert.equal(ordered.accountResults[0]?.matchLabel, 'hit');
  assert.equal(pinyin.accountResults[0]?.matchLabel, 'inferred');
  assert.equal(pinyin.accountResults[0]?.matchKind, 'pinyin-initials');
  assert.equal(typo.allResults[0]?.matchLabel, 'inferred');
});

test('account and snapshot display fields avoid repeated detail copy', () => {
  const accountResult = search('建设银行储蓄卡').accountResults.find(
    (result) => result.id === 'ccb-card'
  );
  const snapshotResult = search('自动快照').snapshotResults.find((result) => result.id === 'b-auto');

  assert.equal(accountResult?.title, '建设银行储蓄卡');
  assert.equal(accountResult?.subtitle, '流动资金');
  assert.equal(accountResult?.subtitle.includes('资产'), false);
  assert.equal(accountResult?.subtitle.includes('建行'), false);

  assert.equal(snapshotResult?.title, '2026-05-19');
  assert.equal(snapshotResult?.subtitle, '自动快照');
  assert.equal(snapshotResult?.value, '200 / 4');
});

test('inference setting filters pinyin, typo, and approximate amount while keeping hits', () => {
  const strictPinyin = runGlobalSearch(index, 'xj', { searchLogicMode: 'strict' });
  const strictTypo = runGlobalSearch(index, '建设银航储蓄卡', { searchLogicMode: 'strict' });
  const strictNearAmount = runGlobalSearch(index, '1000', { searchLogicMode: 'strict' });
  const strictTightNearAmount = runGlobalSearch(index, '25051', { searchLogicMode: 'strict' });
  const strictExactAmount = runGlobalSearch(index, '5203', { searchLogicMode: 'strict' });
  const strictDateMonth = runGlobalSearch(index, '202605', { searchLogicMode: 'strict' });
  const inferNearAmount = runGlobalSearch(index, '1000');
  const strictDirect = runGlobalSearch(index, '现金', { searchLogicMode: 'strict' });

  assert.equal(strictPinyin.counts.all, 0);
  assert.equal(strictTypo.counts.all, 0);
  assert.equal(
    inferNearAmount.allResults.some((result) => result.matchLabel === 'inferred'),
    true
  );
  assert.equal(
    strictNearAmount.allResults.some((result) => result.matchLabel === 'inferred'),
    false
  );
  assert.equal(
    strictTightNearAmount.allResults.some((result) => result.id === 'h-may12-near-25020'),
    false
  );
  assert.equal(
    strictExactAmount.allResults.some((result) => result.id === 'h-may12-positive-5203'),
    true
  );
  assert.equal(
    strictDateMonth.allResults.some((result) => result.matchKind === 'date-month'),
    true
  );
  assert.equal(strictDirect.accountResults[0]?.id, 'cash');
});

test('amount, date, field, and multi-key weights follow the PR priority', () => {
  const positiveAmount = search('+200');
  const negativeAmount = search('-200');
  const year = search('2026');
  const fullDate = search('2026-05-19');
  const accountNameVsNote = search('信用卡');
  const multi = search('现金 200');

  assert.equal(positiveAmount.allResults[0]?.category, 'history');
  assert.equal(positiveAmount.allResults[0]?.id, 'h-cash-plus');
  assert.equal(negativeAmount.allResults[0]?.id, 'h-credit-minus');
  assert.equal(fullDate.historyResults[0]?.id, 'h-cash-plus');
  assert.ok((fullDate.historyResults[0]?.score ?? 0) > (year.historyResults[0]?.score ?? 0));
  assert.equal(accountNameVsNote.allResults[0]?.category, 'account');
  assert.equal(multi.allResults[0]?.matchedTermCount, 2);
  assert.equal(multi.allResults[0]?.id, 'cash');
});

test('numeric date input is recognized before amount matching', () => {
  const month = search('202605');
  const fullDay = search('20260512');
  const monthDay = search('0512');
  const invalidFullDay = search('20260230');
  const invalidMonthDay = search('0230');
  const incompleteShortDate = search('25051');

  assert.equal(month.allResults.some((result) => result.matchKind === 'date-month'), true);
  assert.equal(getResultIds('202605').includes('h-may12-positive-5203'), true);
  assert.equal(month.allResults.some((result) => result.matchKind === 'amount-near'), false);
  assert.equal(fullDay.historyResults.some((result) => result.id === 'h-may12-positive-5203'), true);
  assert.equal(fullDay.allResults.some((result) => result.matchKind === 'amount-near'), false);
  assert.equal(monthDay.historyResults.some((result) => result.id === 'h-may12-positive-5203'), true);
  assert.equal(monthDay.allResults.some((result) => result.matchKind === 'amount-near'), false);
  assert.equal(invalidFullDay.allResults.some((result) => result.matchKind.startsWith('date-')), false);
  assert.equal(invalidMonthDay.allResults.some((result) => result.matchKind === 'date-month-day'), false);
  assert.equal(incompleteShortDate.allResults.some((result) => result.matchKind.startsWith('date-')), false);
});

test('amount matching keeps signs strict and approximation narrow', () => {
  const unsignedIds = getResultIds('5203');
  const positiveIds = getResultIds('+5203');
  const negativeIds = getResultIds('-5203');
  const near25051 = search('25051');
  const near25051Ids = near25051.allResults.map((result) => result.id);
  const near25051Result = near25051.historyResults.find(
    (result) => result.id === 'h-may12-near-25020'
  );
  const near25051BalanceResult = near25051.historyResults.find(
    (result) => result.id === 'h-aug15-negative-14160'
  );
  const nearAmount = search('15038');
  const strictNearAmount = runGlobalSearch(index, '15038', { searchLogicMode: 'strict' });
  const nearResult = nearAmount.historyResults.find((result) => result.id === 'h-may12-near-15060');

  assert.equal(unsignedIds.includes('h-may12-positive-5203'), true);
  assert.equal(unsignedIds.includes('h-may12-negative-5203'), true);
  assert.equal(unsignedIds.includes('h-may11-negative-760'), false);
  assert.equal(unsignedIds.includes('h-may12-negative-5260'), false);
  assert.equal(positiveIds.includes('h-may12-positive-5203'), true);
  assert.equal(positiveIds.includes('h-may12-negative-5203'), false);
  assert.equal(negativeIds.includes('h-may12-negative-5203'), true);
  assert.equal(negativeIds.includes('h-may12-positive-5203'), false);
  assert.equal(near25051Ids.includes('h-may12-near-25020'), true);
  assert.equal(near25051Result?.matchKind, 'amount-near');
  assert.equal(near25051Result?.matchLabel, 'inferred');
  assert.equal(near25051Result?.matchedAmount?.field, 'delta');
  assert.equal(near25051Ids.includes('h-aug15-negative-14160'), true);
  assert.equal(near25051BalanceResult?.matchKind, 'amount-near');
  assert.equal(near25051BalanceResult?.matchLabel, 'inferred');
  assert.equal(near25051BalanceResult?.matchedAmount?.field, 'balanceAfter');
  assert.equal(near25051BalanceResult?.matchedAmount?.displayMode, 'balance-range');
  assert.equal(near25051BalanceResult?.value, '39,240 → 25,080');
  assert.equal(near25051Ids.includes('h-may12-positive-21220'), false);
  assert.equal(nearResult?.matchKind, 'amount-near');
  assert.equal(nearResult?.matchLabel, 'inferred');
  assert.equal(getResultIds('15038').includes('h-may12-negative-14630'), false);
  assert.equal(
    strictNearAmount.allResults.some((result) => result.id === 'h-may12-near-15060'),
    false
  );
});

test('history balance amount matches explain the displayed value field', () => {
  const beforeBalance = search('39240').historyResults.find(
    (result) => result.id === 'h-aug15-negative-14160'
  );
  const afterBalance = search('25080').historyResults.find(
    (result) => result.id === 'h-aug15-negative-14160'
  );
  const delta = search('14160').historyResults.find(
    (result) => result.id === 'h-aug15-negative-14160'
  );

  assert.equal(beforeBalance?.matchLabel, 'hit');
  assert.equal(beforeBalance?.matchedAmount?.field, 'balanceBefore');
  assert.equal(beforeBalance?.primaryMatch.field, 'balanceBefore');
  assert.equal(beforeBalance?.value, '39,240 → 25,080');
  assert.equal(afterBalance?.matchLabel, 'hit');
  assert.equal(afterBalance?.matchedAmount?.field, 'balanceAfter');
  assert.equal(afterBalance?.primaryMatch.field, 'balanceAfter');
  assert.equal(afterBalance?.value, '39,240 → 25,080');
  assert.equal(delta?.matchedAmount?.field, 'delta');
  assert.equal(delta?.value, '-14,160');
});

test('pure numeric queries never use text inference fallbacks', () => {
  const forbiddenKinds = ['ordered', 'partial-text', 'typo', 'pinyin-full', 'pinyin-initials'];

  ['25051', '5203', '202605', '20260512'].forEach((query) => {
    const output = search(query);

    assert.equal(
      output.allResults.some((result) => forbiddenKinds.includes(result.matchKind)),
      false,
      `${query} should not use ordered, typo, partial, or pinyin fallbacks`
    );
  });
});

test('search result highlights come only from hit matches', () => {
  const cash = search('\u73b0\u91d1').accountResults.find((result) => result.id === 'cash');
  const ordered = search('\u5efa\u50a8').accountResults.find((result) => result.id === 'ccb-card');
  const wordAll = search('\u5efa\u8bbe \u50a8\u84c4\u5361').accountResults.find(
    (result) => result.id === 'ccb-card'
  );
  const pinyin = search('xj').accountResults.find((result) => result.id === 'cash');
  const amount = search('+200').historyResults.find((result) => result.id === 'h-cash-plus');
  const date = search('20260512').historyResults.find(
    (result) => result.id === 'h-may12-positive-5203'
  );
  const nearAmount = search('15038').historyResults.find(
    (result) => result.id === 'h-may12-near-15060'
  );

  assert.equal(cash?.matchLabel, 'hit');
  assert.equal(getHighlightedText(cash?.title ?? '', cash?.highlights.title ?? []), '\u73b0\u91d1');
  assert.equal(ordered?.matchKind, 'ordered');
  assert.equal(
    getHighlightedText(ordered?.title ?? '', ordered?.highlights.title ?? []),
    '\u5efa\u50a8'
  );
  assert.equal(
    getHighlightedText(wordAll?.title ?? '', wordAll?.highlights.title ?? []),
    '\u5efa\u8bbe\u50a8\u84c4\u5361'
  );
  assert.equal(pinyin?.matchLabel, 'inferred');
  assert.deepEqual(pinyin?.highlights.title, []);
  assert.match(getHighlightedText(amount?.value ?? '', amount?.highlights.value ?? []), /^\+?200/);
  assert.match(getHighlightedText(date?.subtitle ?? '', date?.highlights.subtitle ?? []), /2026-05-12/);
  assert.equal(nearAmount?.matchLabel, 'inferred');
  assert.deepEqual(nearAmount?.highlights.value, []);
});

test('category filtering never changes automatically when query changes', () => {
  let state = createInitialSearchState<{ view: string }>();

  state = searchStateReducer(state, { type: 'open' });
  state = searchStateReducer(state, { type: 'select-category', category: 'history', lock: true });
  state = searchStateReducer(state, { type: 'focus-item', itemId: 'search-result:history:h-cash-plus' });
  state = searchStateReducer(state, { type: 'hover-item', itemId: 'search-result:history:h-credit-minus' });
  state = searchStateReducer(state, { type: 'load-more-results' });
  state = searchStateReducer(state, { type: 'query-changed', query: '现金' });

  assert.equal(state.selectedCategory, 'history');
  assert.equal(state.categoryLockedByUser, true);
  assert.equal(state.focusedResultId, '');
  assert.equal(state.hoveredResultId, '');
  assert.equal(state.resultLimit, SEARCH_INITIAL_RESULT_LIMIT);

  state = searchStateReducer(state, { type: 'query-changed', query: '' });
  assert.equal(state.selectedCategory, 'history');

  const escapeToAll = getSearchEscapeAction(state);
  assert.deepEqual(escapeToAll, { type: 'select-category', category: 'all', lock: false });
});

test('keyboard helpers only navigate result entries and Enter opens the preview result', () => {
  const output = search('2026');
  const allEntries = getSearchKeyboardEntries(output, 'all');
  const firstEntry = allEntries[0];
  const secondEntry = allEntries[1];
  const lastEntry = allEntries[allEntries.length - 1];

  assert.equal(allEntries.every((entry) => entry.kind === 'result'), true);
  assert.equal(getNextKeyboardEntry(allEntries, '', 1)?.id, firstEntry?.id);
  assert.equal(getNextKeyboardEntry(allEntries, firstEntry?.id ?? '', 1)?.id, secondEntry?.id);
  assert.equal(getNextKeyboardEntry(allEntries, lastEntry?.id ?? '', 1)?.id, lastEntry?.id);

  const resolution = getSearchEnterResolution(allEntries, '', output);

  assert.equal(resolution?.kind, 'open-result');
  assert.equal(resolution?.kind === 'open-result' ? resolution.result.id : '', output.allResults[0]?.id);
});

test('loading-more state preserves category and selection until the user chooses another item', () => {
  let state = createInitialSearchState();

  state = searchStateReducer(state, { type: 'open' });
  state = searchStateReducer(state, { type: 'select-category', category: 'account', lock: true });
  state = searchStateReducer(state, { type: 'focus-item', itemId: 'search-result:account:现金:cash' });
  state = searchStateReducer(state, { type: 'load-more-results', minimum: 145 });

  assert.equal(state.selectedCategory, 'account');
  assert.equal(state.focusedResultId, 'search-result:account:现金:cash');
  assert.equal(state.resultLimit >= 145, true);
});

test('target navigation keeps existing account, history, snapshot, settings behavior', () => {
  const historyTarget = createHistorySearchTarget('h-cash-plus');
  const snapshotTarget = createSnapshotSearchTarget('b-auto');
  const settingsTarget = createSettingsSearchTarget('search', 'search');
  const cycle = getSearchNavigationCycle(
    [historyTarget, createHistorySearchTarget('h-credit-minus')],
    historyTarget
  );

  assert.deepEqual(getSearchTargetPresentation(historyTarget), {
    destination: 'account-detail',
    shouldHighlight: false,
    highlightMs: 0,
    scrollBlock: SEARCH_SCROLL_BLOCK
  });
  assert.deepEqual(getSearchTargetPresentation(snapshotTarget), {
    destination: 'snapshot-panel',
    shouldHighlight: false,
    highlightMs: 0,
    scrollBlock: SEARCH_SCROLL_BLOCK
  });
  assert.deepEqual(getSearchTargetPresentation(settingsTarget), {
    destination: 'global-settings',
    shouldHighlight: false,
    highlightMs: 0,
    scrollBlock: null
  });
  assert.equal(getNextSearchNavigationTarget(cycle, historyTarget, 1)?.key, 'history:h-credit-minus');
});

test('mock-data pressure stays inside the search budget', () => {
  const mockHistory = Array.from({ length: 3000 }, (_, index): HistoryRecord => {
    const day = String((index % 28) + 1).padStart(2, '0');

    return {
      id: `mock-history-${index}`,
      accountId: index % 2 === 0 ? 'cash' : 'credit-card',
      type: '修改',
      groupName: index % 2 === 0 ? '现金' : '信用',
      accountName: index % 2 === 0 ? '现金' : '信用卡',
      beforeAmount: index,
      afterAmount: index + (index % 2 === 0 ? 200 : -200),
      time: `2026-05-${day}T10:00:00.000Z`
    };
  });
  const mockIndex = createGlobalSearchIndex(groups, mockHistory, snapshots, {
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
    formatPreciseBackupTime: (time) => formatDate(time),
    settingsItems
  });
  const startMark = 'search-perf-start';
  const endMark = 'search-perf-end';
  const measureName = 'search-perf';

  performance.mark(startMark);
  const output = runGlobalSearch(mockIndex, '现金 200');
  performance.mark(endMark);
  performance.measure(measureName, startMark, endMark);

  const measures = performance.getEntriesByName(measureName);
  const duration = measures[measures.length - 1]?.duration ?? 0;

  assert.equal(output.counts.all > 0, true);
  assert.ok(duration < 80, `3000 history records should search under 80ms, got ${duration.toFixed(2)}ms`);

  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);
});
