/// <reference types="node" />

import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import type { Account, AccountTypeNature, AssetGroup, HistoryRecord } from '../../app/types';
import { NETRAFLOW_CHART_PALETTE, type ChartColorAssignmentMode } from '../../chartLogic';
import {
  deriveGroupDetailTrendData,
  type GroupDetailTrendData
} from './groupDetailTrendData';

const FIXED_NOW = new Date('2026-05-27T12:00:00');
const SETTINGS = { xAxisRange: '1m' as const };
const HISTORY_TYPE = {
  create: '\u65b0\u589e' as HistoryRecord['type'],
  delete: '\u5220\u9664' as HistoryRecord['type'],
  modify: '\u4fee\u6539' as HistoryRecord['type'],
  archive: '\u5f52\u6863' as HistoryRecord['type'],
  restore: '\u91cd\u65b0\u542f\u7528' as HistoryRecord['type']
};

afterEach(() => {
  mock.timers.reset();
});

const atNoon = (date: string) => `${date}T12:00:00`;

const account = (id: string, amount: number, overrides: Partial<Account> = {}): Account => ({
  id,
  name: overrides.name ?? id,
  amount,
  createdAt: overrides.createdAt ?? atNoon('2026-04-20'),
  alias: overrides.alias,
  archived: overrides.archived,
  archivedAt: overrides.archivedAt
});

const group = (
  name: string,
  nature: AccountTypeNature,
  accounts: Account[],
  overrides: Partial<AssetGroup> = {}
): AssetGroup => ({
  name,
  nature,
  includeInStats: true,
  sortOrder: 0,
  accounts,
  ...overrides
});

const historyRecord = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: overrides.id ?? `history-${overrides.accountId ?? 'cash'}-${overrides.time ?? 'unknown'}`,
  accountId: 'cash',
  type: HISTORY_TYPE.modify,
  groupName: 'Cash',
  accountName: overrides.accountName ?? overrides.accountId ?? 'cash',
  beforeAmount: 0,
  afterAmount: 0,
  time: atNoon('2026-05-01'),
  ...overrides
});

const derive = (
  targetGroup: AssetGroup,
  history: HistoryRecord[],
  colorAssignmentMode: ChartColorAssignmentMode = 'share'
) => deriveGroupDetailTrendData(targetGroup, history, SETTINGS, colorAssignmentMode);

const getDateIndex = (data: GroupDetailTrendData, date: string) => {
  const index = data.dates.indexOf(date);

  if (index < 0) {
    assert.fail(`missing group detail trend date ${date}`);
  }

  return index;
};

const getSeries = (data: GroupDetailTrendData, id: string) => {
  const series = data.series.find((item) => item.id === id);

  if (!series) {
    assert.fail(`missing group detail trend series ${id}`);
  }

  return series;
};

const getValue = (data: GroupDetailTrendData, seriesId: string, date: string) =>
  getSeries(data, seriesId).values[getDateIndex(data, date)] ?? Number.NaN;

const latestValue = (data: GroupDetailTrendData, seriesId: string) => {
  const series = getSeries(data, seriesId);
  return series.values[series.values.length - 1] ?? Number.NaN;
};

const assertAligned = (data: GroupDetailTrendData) => {
  assert.equal(data.pointKinds.length, data.dates.length);
  assert.equal(data.totals.length, data.dates.length);
  data.series.forEach((series) => {
    assert.equal(series.values.length, data.dates.length);
  });
  data.dates.forEach((_, index) => {
    assert.equal(
      data.totals[index],
      data.series.reduce((sum, series) => sum + (series.values[index] ?? 0), 0)
    );
  });
};

test('keeps asset, receivable, and liability group trend values signed by nature', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const assetData = derive(
    group('Cash', 'asset', [account('cash', 300)]),
    [
      historyRecord({
        id: 'cash-create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'cash-modify',
        beforeAmount: 100,
        afterAmount: 300,
        time: atNoon('2026-05-10')
      })
    ]
  );
  const receivableData = derive(
    group('Receivable', 'receivable', [account('invoice', 80)]),
    [
      historyRecord({
        id: 'invoice-create',
        accountId: 'invoice',
        groupName: 'Receivable',
        accountName: 'Invoice',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 40,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'invoice-modify',
        accountId: 'invoice',
        groupName: 'Receivable',
        accountName: 'Invoice',
        beforeAmount: 40,
        afterAmount: 80,
        time: atNoon('2026-05-04')
      })
    ]
  );
  const liabilityData = derive(
    group('Debt', 'liability', [account('loan', -300)]),
    [
      historyRecord({
        id: 'loan-modify-1',
        accountId: 'loan',
        groupName: 'Debt',
        accountName: 'Loan',
        beforeAmount: -100,
        afterAmount: -200,
        time: atNoon('2026-04-29')
      }),
      historyRecord({
        id: 'loan-modify-2',
        accountId: 'loan',
        groupName: 'Debt',
        accountName: 'Loan',
        beforeAmount: -200,
        afterAmount: -300,
        time: atNoon('2026-05-15')
      })
    ]
  );

  assert.equal(assetData.nature, 'asset');
  assert.equal(getValue(assetData, 'cash', '2026-04-28'), 100);
  assert.equal(getValue(assetData, 'cash', '2026-05-10'), 300);
  assert.equal(receivableData.nature, 'receivable');
  assert.equal(getValue(receivableData, 'invoice', '2026-05-04'), 80);
  assert.equal(receivableData.totals[getDateIndex(receivableData, '2026-05-04')], 80);
  assert.equal(liabilityData.nature, 'liability');
  assert.equal(getValue(liabilityData, 'loan', '2026-05-14'), -200);
  assert.equal(getValue(liabilityData, 'loan', '2026-05-15'), -300);
  assert.equal(liabilityData.totals[getDateIndex(liabilityData, '2026-05-15')], -300);
});

test('aggregates multiple accounts and keeps series values aligned with stacked totals', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const data = derive(
    group('Cash', 'asset', [account('cash', 150), account('wallet', 50)]),
    [
      historyRecord({
        id: 'cash-create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'wallet-create',
        accountId: 'wallet',
        accountName: 'Wallet',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 50,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'cash-modify',
        beforeAmount: 100,
        afterAmount: 150,
        time: atNoon('2026-05-10')
      })
    ]
  );

  assertAligned(data);
  assert.equal(getValue(data, 'cash', '2026-04-28'), 100);
  assert.equal(getValue(data, 'wallet', '2026-04-28'), 50);
  assert.equal(data.totals[getDateIndex(data, '2026-04-28')], 150);
  assert.equal(data.totals[getDateIndex(data, '2026-05-10')], 200);
});

test('excludes current archived accounts but restores their pre-archive dates by rollback', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const data = derive(
    group('Cash', 'asset', [
      account('old-card', 90, { archived: true, archivedAt: atNoon('2026-05-05') })
    ]),
    [
      historyRecord({
        id: 'old-card-create',
        accountId: 'old-card',
        accountName: 'Old card',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 90,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'old-card-archive',
        accountId: 'old-card',
        accountName: 'Old card',
        type: HISTORY_TYPE.archive,
        beforeAmount: 90,
        afterAmount: 90,
        time: atNoon('2026-05-05')
      })
    ]
  );
  const series = getSeries(data, 'old-card');

  assert.equal(getValue(data, 'old-card', '2026-05-04'), 90);
  assert.equal(getValue(data, 'old-card', '2026-05-05'), 0);
  assert.equal(latestValue(data, 'old-card'), 0);
  assert.equal(series.archived, true);
});

test('keeps restored accounts at zero during archived gaps and resumes on restore date', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const data = derive(
    group('Cash', 'asset', [account('cash', 120)]),
    [
      historyRecord({
        id: 'cash-create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 120,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'cash-archive',
        type: HISTORY_TYPE.archive,
        beforeAmount: 120,
        afterAmount: 120,
        time: atNoon('2026-05-01')
      }),
      historyRecord({
        id: 'cash-restore',
        type: HISTORY_TYPE.restore,
        beforeAmount: 120,
        afterAmount: 120,
        time: atNoon('2026-05-08')
      })
    ]
  );

  assert.equal(getValue(data, 'cash', '2026-04-30'), 120);
  assert.equal(getValue(data, 'cash', '2026-05-07'), 0);
  assert.equal(getValue(data, 'cash', '2026-05-08'), 120);
});

test('keeps history ordering behavior for unordered records, same-day records, and same timestamps', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const unorderedGroup = group('Cash', 'asset', [account('cash', 240)]);
  const earlyRecord = historyRecord({
    id: 'early',
    beforeAmount: 100,
    afterAmount: 160,
    time: atNoon('2026-04-29')
  });
  const lateRecord = historyRecord({
    id: 'late',
    beforeAmount: 160,
    afterAmount: 240,
    time: atNoon('2026-05-16')
  });
  const sameDayData = derive(
    group('Cash', 'asset', [account('cash', 250)]),
    [
      historyRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'morning',
        beforeAmount: 100,
        afterAmount: 150,
        time: '2026-05-10T09:00:00'
      }),
      historyRecord({
        id: 'evening',
        beforeAmount: 150,
        afterAmount: 250,
        time: '2026-05-10T18:00:00'
      })
    ]
  );
  const sameTimestamp = atNoon('2026-05-10');
  const sameTimestampData = derive(
    group('Cash', 'asset', [account('cash', 300)]),
    [
      historyRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'same-1',
        beforeAmount: 100,
        afterAmount: 200,
        time: sameTimestamp
      }),
      historyRecord({
        id: 'same-2',
        beforeAmount: 200,
        afterAmount: 300,
        time: sameTimestamp
      })
    ]
  );

  assert.deepEqual(
    derive(unorderedGroup, [lateRecord, earlyRecord]),
    derive(unorderedGroup, [earlyRecord, lateRecord])
  );
  assert.equal(getValue(sameDayData, 'cash', '2026-05-09'), 100);
  assert.equal(getValue(sameDayData, 'cash', '2026-05-10'), 250);
  assert.equal(getValue(sameTimestampData, 'cash', '2026-05-09'), 200);
});

test('rolls modify, delete, null amount, and invalid-time records back without invalid totals', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const modifyData = derive(
    group('Cash', 'asset', [account('cash', 280)]),
    [
      historyRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 200,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'modify',
        beforeAmount: 200,
        afterAmount: 280,
        time: atNoon('2026-05-12')
      })
    ]
  );
  const deleteData = derive(
    group('Cash', 'asset', []),
    [
      historyRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 80,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'delete',
        type: HISTORY_TYPE.delete,
        beforeAmount: 80,
        afterAmount: null,
        time: atNoon('2026-05-03')
      }),
      historyRecord({
        id: 'null-delete',
        type: HISTORY_TYPE.delete,
        beforeAmount: null,
        afterAmount: null,
        time: atNoon('2026-05-04')
      }),
      historyRecord({
        id: 'invalid-time',
        type: HISTORY_TYPE.delete,
        beforeAmount: null,
        afterAmount: null,
        time: ''
      })
    ]
  );

  assert.equal(getValue(modifyData, 'cash', '2026-05-11'), 200);
  assert.equal(getValue(modifyData, 'cash', '2026-05-12'), 280);
  assert.equal(getValue(deleteData, 'cash', '2026-05-02'), 80);
  assert.equal(getValue(deleteData, 'cash', '2026-05-03'), 0);
  assert.equal(deleteData.dates.includes(''), false);
  deleteData.totals.forEach((total) => {
    assert.equal(Number.isFinite(total), true);
  });
});

test('honors range boundaries, range-start baseline, in-range first change, and after-range rollback context', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const baselineData = derive(
    group('Cash', 'asset', [account('cash', 300)]),
    [
      historyRecord({
        id: 'before-range',
        beforeAmount: 50,
        afterAmount: 100,
        time: atNoon('2026-04-20')
      }),
      historyRecord({
        id: 'inside-range',
        beforeAmount: 100,
        afterAmount: 200,
        time: atNoon('2026-05-01')
      }),
      historyRecord({
        id: 'after-range',
        beforeAmount: 200,
        afterAmount: 300,
        time: atNoon('2026-06-01')
      })
    ]
  );
  const noBaselineData = derive(
    group('Cash', 'asset', [account('cash', 180)]),
    [
      historyRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 120,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'modify',
        beforeAmount: 120,
        afterAmount: 180,
        time: atNoon('2026-05-03')
      })
    ]
  );

  assert.equal(baselineData.dates[0], '2026-04-27');
  assert.equal(baselineData.pointKinds[0], 'carry-forward');
  assert.equal(getValue(baselineData, 'cash', '2026-04-27'), 100);
  assert.equal(getValue(baselineData, 'cash', '2026-05-01'), 200);
  assert.equal(baselineData.dates[baselineData.dates.length - 1], '2026-05-27');
  assert.equal(latestValue(baselineData, 'cash'), 200);
  assert.equal(baselineData.dates.includes('2026-06-01'), false);
  assert.equal(noBaselineData.dates[0], '2026-04-28');
  assert.equal(noBaselineData.dates.includes('2026-04-27'), false);
});

test('returns empty trend data for no history and fewer than two effective change dates', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });

  assert.deepEqual(derive(group('Cash', 'asset', [account('cash', 100)]), []), {
    dates: [],
    pointKinds: [],
    series: [],
    totals: [],
    nature: 'asset'
  });
  assert.deepEqual(
    derive(group('Cash', 'asset', [account('cash', 100)]), [
      historyRecord({
        id: 'single',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      })
    ]),
    { dates: [], pointKinds: [], series: [], totals: [], nature: 'asset' }
  );
});

test('keeps all-zero trend output finite without creating visible series', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const data = derive(
    group('Cash', 'asset', [account('zero', 0)]),
    [
      historyRecord({
        id: 'zero-create',
        accountId: 'zero',
        accountName: 'Zero',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 0,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'zero-modify',
        accountId: 'zero',
        accountName: 'Zero',
        beforeAmount: 0,
        afterAmount: 0,
        time: atNoon('2026-05-03')
      })
    ]
  );

  assert.ok(data.dates.length > 0);
  assert.deepEqual(data.series, []);
  assert.ok(data.totals.every((total) => total === 0));
});

test('collapses extra share-mode accounts into Other without exposing sourceIds', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const accounts = Array.from({ length: 13 }, (_, index) =>
    account(`account-${index}`, 100 - index, {
      name: `Account ${index}`,
      createdAt: `2026-04-${String(index + 1).padStart(2, '0')}T12:00:00`
    })
  );
  const data = derive(
    group('Cash', 'asset', accounts),
    [
      historyRecord({
        id: 'create',
        accountId: 'account-0',
        accountName: 'Account 0',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'modify',
        accountId: 'account-0',
        accountName: 'Account 0',
        beforeAmount: 100,
        afterAmount: 100,
        time: atNoon('2026-05-03')
      })
    ],
    'share'
  );
  const other = getSeries(data, 'Cash-trend-other');

  assert.equal(data.series.length, 12);
  assert.deepEqual(
    data.series.slice(0, 3).map((series) => series.id),
    ['account-0', 'account-1', 'account-2']
  );
  assert.equal(other.label, '\u5176\u4ed6');
  assert.equal(latestValue(data, 'Cash-trend-other'), 89 + 88);
  data.series.forEach((series) => {
    assert.equal('sourceIds' in series, false);
  });
});

test('uses createdAt registry colors without reusing deleted earlier account colors', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const data = derive(
    group('Cash', 'asset', [
      account('active-a', 10, { name: 'Active A', createdAt: atNoon('2026-01-02') }),
      account('active-b', 8, { name: 'Active B', createdAt: atNoon('2026-01-03') })
    ]),
    [
      historyRecord({
        id: 'deleted-first',
        accountId: 'deleted-first',
        accountName: 'Deleted first',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 5,
        time: atNoon('2020-01-01')
      }),
      historyRecord({
        id: 'active-a-create',
        accountId: 'active-a',
        accountName: 'Active A',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 10,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'active-b-modify',
        accountId: 'active-b',
        accountName: 'Active B',
        beforeAmount: 8,
        afterAmount: 8,
        time: atNoon('2026-05-02')
      })
    ],
    'createdAt'
  );

  assert.equal(getSeries(data, 'active-a').color, NETRAFLOW_CHART_PALETTE[1]);
  assert.equal(getSeries(data, 'active-b').color, NETRAFLOW_CHART_PALETTE[2]);
});

test('disables Other grouping when any current item is archived', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const activeAccounts = Array.from({ length: 13 }, (_, index) =>
    account(`account-${index}`, 100 - index, {
      name: `Account ${index}`,
      createdAt: `2026-04-${String(index + 1).padStart(2, '0')}T12:00:00`
    })
  );
  const data = derive(
    group('Cash', 'asset', [
      ...activeAccounts,
      account('archived-old', 5, { archived: true, archivedAt: atNoon('2026-05-05') })
    ]),
    [
      historyRecord({
        id: 'archived-create',
        accountId: 'archived-old',
        accountName: 'Archived old',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 5,
        time: atNoon('2026-04-28')
      }),
      historyRecord({
        id: 'archived-archive',
        accountId: 'archived-old',
        accountName: 'Archived old',
        type: HISTORY_TYPE.archive,
        beforeAmount: 5,
        afterAmount: 5,
        time: atNoon('2026-05-05')
      })
    ],
    'share'
  );

  assert.equal(data.series.some((series) => series.id === 'Cash-trend-other'), false);
  assert.equal(data.series.length, 14);
  assert.equal(getSeries(data, 'archived-old').archived, true);
});

test('keeps dates, pointKinds, totals, and series values aligned under a frozen current date', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const data = derive(
    group('Cash', 'asset', [account('cash', 200), account('wallet', 25)]),
    [
      historyRecord({
        id: 'before-range',
        beforeAmount: 50,
        afterAmount: 100,
        time: atNoon('2026-04-20')
      }),
      historyRecord({
        id: 'inside-range',
        beforeAmount: 100,
        afterAmount: 200,
        time: atNoon('2026-05-01')
      })
    ]
  );

  assertAligned(data);
  assert.equal(data.dates[0], '2026-04-27');
  assert.equal(data.dates[data.dates.length - 1], '2026-05-27');
  assert.deepEqual(
    data.dates,
    [...data.dates].sort()
  );
});
