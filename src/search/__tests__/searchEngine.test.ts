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
    id: 'h-credit-negative-balance',
    accountId: 'credit-card',
    type: '修改',
    groupName: '信用',
    accountName: '信用卡',
    beforeAmount: -1000,
    afterAmount: -1200,
    time: '2026-05-16T10:00:00.000Z',
    note: '负债余额保留负号'
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
    keywords: ['图表', '图表显示', '图表配色', '资产结构显示', '资产趋势显示'],
    pinyinKeywords: ['tu biao', 'tu biao she zhi'],
    pinyinInitials: ['tb', 'tbsz']
  },
  {
    id: 'appearance',
    title: '显示与界面',
    group: '全局设置',
    description: '数字正负值显示、资产统计数值类型、页面主题与页面位置记忆。',
    section: 'appearance',
    keywords: ['显示与界面', '显示', '界面', '页面位置记忆', '页面位置'],
    pinyinKeywords: ['xian shi yu jie mian', 'ye mian wei zhi ji yi'],
    pinyinInitials: ['xsyjm', 'ymwzjy']
  },
  {
    id: 'appearance-page-position-memory',
    title: '页面位置记忆',
    group: '显示与界面',
    description: '切换页面保留滚动位置和堆叠组状态。',
    section: 'appearance',
    blockId: 'global-settings-page-position-memory',
    keywords: ['页面位置', '滚动位置', '堆叠组状态'],
    pinyinKeywords: ['ye mian wei zhi ji yi'],
    pinyinInitials: ['ymwzjy']
  },
  {
    id: 'backup',
    title: '数据与备份',
    group: '全局设置',
    description: '用户配置文件、历史记录备份、快照。',
    section: 'backup',
    keywords: ['数据', '备份', '快照', '快照设置'],
    pinyinKeywords: ['shu ju', 'bei fen', 'kuai zhao'],
    pinyinInitials: ['sj', 'bf', 'kz']
  },
  {
    id: 'backup-history-snapshot',
    title: '历史记录备份',
    group: '数据与备份',
    description: '快照、手动快照与自动快照设置。',
    section: 'backup',
    keywords: ['快照设置', '历史记录备份', '手动快照', '自动快照'],
    pinyinKeywords: ['kuai zhao she zhi'],
    pinyinInitials: ['kzsz']
  },
  {
    id: 'security',
    title: '安全',
    group: '全局设置',
    description: '登录密码保护、自动锁定和快照加密。',
    section: 'security',
    keywords: ['安全', '安全设置', '登录密码保护', '快照加密'],
    pinyinKeywords: ['an quan', 'an quan she zhi'],
    pinyinInitials: ['aq', 'aqsz']
  },
  {
    id: 'security-password-protection',
    title: '登录密码保护',
    group: '安全',
    description: '设置登录密码与自动锁定时间。',
    section: 'security',
    keywords: ['安全设置', '登录密码', '自动锁定'],
    pinyinKeywords: ['deng lu mi ma', 'an quan she zhi'],
    pinyinInitials: ['dlmm', 'aqsz']
  }
];

const createSearchIndexFor = (
  sourceGroups: AssetGroup[] = groups,
  sourceHistoryRecords: HistoryRecord[] = historyRecords,
  sourceSnapshots: BackupRecord[] = snapshots,
  sourceSettingsItems: SettingsSearchItem[] = settingsItems
) =>
  createGlobalSearchIndex(sourceGroups, sourceHistoryRecords, sourceSnapshots, {
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
    settingsItems: sourceSettingsItems
  });

const createIndex = () => createSearchIndexFor();

const index = createIndex();
const search = (query: string) => runGlobalSearch(index, query);
const getResultIds = (query: string) => search(query).allResults.map((result) => result.id);
const getSettingsResultIds = (query: string) =>
  search(query).settingsResults.map((result) => result.id);
const assertSettingsResultBefore = (query: string, expectedFirst: string, expectedLater: string) => {
  const resultIds = getSettingsResultIds(query);
  const firstIndex = resultIds.indexOf(expectedFirst);
  const laterIndex = resultIds.indexOf(expectedLater);

  assert.notEqual(firstIndex, -1, `${query} should include ${expectedFirst}`);
  assert.notEqual(laterIndex, -1, `${query} should include ${expectedLater}`);
  assert.equal(
    firstIndex < laterIndex,
    true,
    `${query} should rank ${expectedFirst} before ${expectedLater}`
  );
};
const getHighlightedText = (value: string, ranges: Array<{ start: number; end: number }>) =>
  ranges.map((range) => value.slice(range.start, range.end)).join('');

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

test('plain settings words keep stronger real-domain results near the top boundary', () => {
  const plainGroups: AssetGroup[] = [
    {
      name: '普通词账户组',
      nature: 'asset',
      includeInStats: true,
      sortOrder: 0,
      accounts: [
        {
          id: 'plain-account',
          name: '账户现金',
          amount: 800,
          createdAt: '2026-05-10T09:00:00.000Z'
        }
      ]
    }
  ];
  const plainHistory: HistoryRecord[] = [
    {
      id: 'plain-amount-history',
      accountId: 'plain-account',
      type: MODIFY_HISTORY_TYPE,
      groupName: '普通词账户组',
      accountName: '金额记录',
      beforeAmount: 0,
      afterAmount: 100,
      time: '2026-05-10T10:00:00.000Z'
    },
    {
      id: 'plain-date-history',
      accountId: 'plain-account',
      type: MODIFY_HISTORY_TYPE,
      groupName: '普通词账户组',
      accountName: '日期记录',
      beforeAmount: 100,
      afterAmount: 120,
      time: '2026-05-11T10:00:00.000Z'
    }
  ];
  const plainSnapshots: BackupRecord[] = [
    {
      id: 'plain-snapshot',
      backedUpAt: '2026-05-12T08:00:00.000Z',
      historyCount: 2,
      incrementCount: 1,
      method: 'manual'
    }
  ];
  const plainSettings: SettingsSearchItem[] = [
    {
      id: 'search-accounts',
      title: '搜索账户',
      group: '全局搜索',
      description: '账户名称可参与搜索。',
      section: 'search',
      keywords: ['账户']
    },
    {
      id: 'search-history',
      title: '搜索历史记录',
      group: '全局搜索',
      description: '历史记录日期和金额可参与搜索。',
      section: 'search',
      keywords: ['日期', '金额']
    },
    {
      id: 'backup',
      title: '数据与备份',
      group: '全局设置',
      description: '快照。',
      section: 'backup',
      keywords: ['快照']
    }
  ];
  const plainIndex = createSearchIndexFor(
    plainGroups,
    plainHistory,
    plainSnapshots,
    plainSettings
  );
  const plainSearch = (query: string) => runGlobalSearch(plainIndex, query);

  const snapshotResults = plainSearch('快照').allResults;
  const snapshotIndex = snapshotResults.findIndex((result) => result.id === 'plain-snapshot');

  assert.equal(plainSearch('账户').allResults[0]?.id, 'plain-account');
  assert.equal(plainSearch('金额').allResults[0]?.id, 'plain-amount-history');
  assert.equal(plainSearch('日期').allResults[0]?.id, 'plain-date-history');
  assert.equal(snapshotIndex >= 0 && snapshotIndex <= 1, true);
});

test('representative settings queries resolve concrete navigation targets', () => {
  const cases = [
    {
      query: '页面位置',
      settingsId: 'appearance-page-position-memory',
      section: 'appearance',
      blockId: 'global-settings-page-position-memory'
    },
    { query: '图表显示', settingsId: 'charts', section: 'charts' },
    { query: '快照设置', settingsId: 'backup-history-snapshot', section: 'backup' },
    { query: '安全设置', settingsId: 'security-password-protection', section: 'security' }
  ];

  cases.forEach(({ query, settingsId, section, blockId }) => {
    const result = search(query).settingsResults.find(
      (currentResult) => currentResult.id === settingsId
    );

    assert.equal(result?.target.category, 'settings');
    assert.equal(result?.target.settingsId, settingsId);
    assert.equal(result?.target.settingsSection, section);
    assert.equal(result?.target.blockId, blockId);
  });
});

test('specific settings matches rank ahead of parent category matches', () => {
  assertSettingsResultBefore('yemianweizhi', 'appearance-page-position-memory', 'appearance');
  assertSettingsResultBefore('页面位置', 'appearance-page-position-memory', 'appearance');

  assert.equal(getSettingsResultIds('显示与界面')[0], 'appearance');
  assert.equal(getSettingsResultIds('图表显示').includes('charts'), true);
  assertSettingsResultBefore('快照设置', 'backup-history-snapshot', 'backup');
  assertSettingsResultBefore('安全设置', 'security-password-protection', 'security');
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

test('month-day shorthand uses the mocked current system year only', () => {
  const currentYearRecord: HistoryRecord = {
    id: 'h-current-year-may12',
    accountId: 'cash',
    type: MODIFY_HISTORY_TYPE,
    groupName: '现金',
    accountName: '现金',
    beforeAmount: 0,
    afterAmount: 100,
    time: '2031-05-12T10:00:00.000Z'
  };
  const otherYearRecord: HistoryRecord = {
    ...currentYearRecord,
    id: 'h-other-year-may12',
    time: '2026-05-12T10:00:00.000Z'
  };
  const monthDayIndex = createSearchIndexFor(
    groups,
    [currentYearRecord, otherYearRecord],
    [],
    []
  );
  const previousDateNow = Date.now;

  Date.now = () => new Date('2031-02-01T00:00:00.000Z').getTime();

  try {
    ['0512', '5/12', '05.12', '5月12日'].forEach((query) => {
      const resultIds = runGlobalSearch(monthDayIndex, query).historyResults.map(
        (result) => result.id
      );

      assert.equal(resultIds.includes('h-current-year-may12'), true, `${query} should use 2031`);
      assert.equal(
        resultIds.includes('h-other-year-may12'),
        false,
        `${query} should not infer from other record years`
      );
    });
  } finally {
    Date.now = previousDateNow;
  }
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

test('liability history balance matches keep negative before and after signs', () => {
  const liabilityBeforeBalance = search('-1000').historyResults.find(
    (result) => result.id === 'h-credit-negative-balance'
  );
  const liabilityAfterBalance = search('-1200').historyResults.find(
    (result) => result.id === 'h-credit-negative-balance'
  );

  assert.equal(liabilityBeforeBalance?.matchedAmount?.field, 'balanceBefore');
  assert.equal(liabilityBeforeBalance?.primaryMatch.field, 'balanceBefore');
  assert.equal(liabilityBeforeBalance?.value, '-1,000 → -1,200');
  assert.equal(liabilityAfterBalance?.matchedAmount?.field, 'balanceAfter');
  assert.equal(liabilityAfterBalance?.primaryMatch.field, 'balanceAfter');
  assert.equal(liabilityAfterBalance?.value, '-1,000 → -1,200');
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

test('large-data pressure covers mixed data and continuous input', () => {
  const createPressureIndex = (historyCount: number) => {
    const pressureNatures: AccountTypeNature[] = ['asset', 'receivable', 'liability'];
    const pressureGroups: AssetGroup[] = Array.from({ length: 40 }, (_, groupIndex) => ({
      name:
        groupIndex % 3 === 0
          ? `现金组${groupIndex}`
          : groupIndex % 3 === 1
            ? `信用组${groupIndex}`
            : `投资组${groupIndex}`,
      nature: pressureNatures[groupIndex % pressureNatures.length] ?? 'asset',
      includeInStats: true,
      sortOrder: groupIndex,
      accounts: Array.from({ length: 10 }, (_, accountIndex) => ({
        id: `pressure-account-${groupIndex}-${accountIndex}`,
        name: `${
          groupIndex % 3 === 0 ? '现金' : groupIndex % 3 === 1 ? '信用卡' : '基金'
        }账户${groupIndex}-${accountIndex}`,
        amount: (groupIndex % 3 === 1 ? -1 : 1) * (1000 + groupIndex * 37 + accountIndex * 11),
        createdAt: `2026-05-${String((accountIndex % 28) + 1).padStart(2, '0')}T09:00:00.000Z`,
        alias: `P${groupIndex}${accountIndex}`
      }))
    }));
    const pressureAccounts = pressureGroups.flatMap((group) =>
      group.accounts.map((account) => ({ group, account }))
    );
    const pressureHistory: HistoryRecord[] = Array.from({ length: historyCount }, (_, index) => {
      const entry = pressureAccounts[index % pressureAccounts.length];
      const day = String((index % 28) + 1).padStart(2, '0');
      const beforeAmount = (index % 7 === 0 ? -1 : 1) * (1000 + (index % 9000));
      const delta = index % 2 === 0 ? 200 : -200;

      return {
        id: `pressure-history-${index}`,
        accountId: entry.account.id,
        type: MODIFY_HISTORY_TYPE,
        groupName: entry.group.name,
        accountName: entry.account.name,
        beforeAmount,
        afterAmount: beforeAmount + delta,
        time: `2026-05-${day}T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
        note: index % 5 === 0 ? '现金备注 快照 回归' : '常规备注'
      };
    });
    const pressureSnapshots: BackupRecord[] = Array.from({ length: 300 }, (_, index) => ({
      id: `pressure-snapshot-${index}`,
      backedUpAt: `2026-05-${String((index % 28) + 1).padStart(2, '0')}T08:00:00.000Z`,
      historyCount: 1000 + index,
      incrementCount: index % 30,
      method: index % 2 === 0 ? 'auto' : 'manual'
    }));

    return createSearchIndexFor(
      pressureGroups,
      pressureHistory,
      pressureSnapshots,
      settingsItems
    );
  };
  const searchQueries = ['', '现', '现金', '200', '+200', '20260512', '快照'];
  const continuousQueries = ['现', '现金', '现金 2', '现金 20', '现金 200'];

  [10000, 20000].forEach((historyCount) => {
    const pressureIndex = createPressureIndex(historyCount);
    let maxSingleQueryDuration = 0;

    searchQueries.forEach((query) => {
      const start = performance.now();
      const output = runGlobalSearch(pressureIndex, query);
      const duration = performance.now() - start;

      maxSingleQueryDuration = Math.max(maxSingleQueryDuration, duration);

      if (query) {
        assert.equal(output.counts.all > 0, true, `${query} should return pressure results`);
      } else {
        assert.equal(
          output.counts.all,
          Object.values(pressureIndex.totals).reduce((total, count) => total + count, 0)
        );
      }
    });

    const sequenceStart = performance.now();

    continuousQueries.forEach((query) => {
      runGlobalSearch(pressureIndex, query);
    });

    const sequenceDuration = performance.now() - sequenceStart;
    const singleQueryBudget = historyCount === 20000 ? 1200 : 800;
    const sequenceBudget = historyCount === 20000 ? 3500 : 2400;

    assert.ok(
      maxSingleQueryDuration < singleQueryBudget,
      `${historyCount} history records single-query max should stay under ${singleQueryBudget}ms, got ${maxSingleQueryDuration.toFixed(2)}ms`
    );
    assert.ok(
      sequenceDuration < sequenceBudget,
      `${historyCount} history records continuous input should stay under ${sequenceBudget}ms, got ${sequenceDuration.toFixed(2)}ms`
    );
  });
});
