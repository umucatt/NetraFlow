/// <reference types="node" />

import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import type { Account, AccountTypeNature, AssetGroupWithAccounts, HistoryRecord } from '../../app/types';
import { deriveAssetTrendPoints, type TrendChartPoint } from './assetTrendData';

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
  name: id,
  amount,
  createdAt: atNoon('2026-04-20'),
  ...overrides,
  groupId: overrides.groupId ?? 'group-test'
});

const group = (
  name: string,
  nature: AccountTypeNature,
  accounts: Account[],
  overrides: Partial<AssetGroupWithAccounts> = {}
): AssetGroupWithAccounts => ({
  id: `group-${name}`,
  name,
  nature,
  includeInStats: true,
  sortOrder: 0,
  accounts,
  ...overrides
});

const createRecord = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: overrides.id ?? `history-${overrides.time ?? 'unknown'}`,
  accountId: 'account-1',
  type: HISTORY_TYPE.modify,
  groupName: 'Assets',
  accountName: 'Cash',
  beforeAmount: 0,
  afterAmount: 0,
  time: atNoon('2026-05-01'),
  ...overrides
});

const getPoint = (points: TrendChartPoint[], date: string) => {
  const point = points.find((currentPoint) => currentPoint.date === date);

  if (!point) {
    assert.fail(`missing asset trend point for ${date}`);
  }

  return point;
};

test('derives ordinary asset accounts into positive totals', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 300)])],
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'modify',
        beforeAmount: 100,
        afterAmount: 300,
        time: atNoon('2026-05-10')
      })
    ],
    SETTINGS
  );

  assert.deepEqual(
    {
      positive: getPoint(points, '2026-04-28').positive,
      negative: getPoint(points, '2026-04-28').negative,
      net: getPoint(points, '2026-04-28').net
    },
    { positive: 100, negative: 0, net: 100 }
  );
  assert.equal(getPoint(points, '2026-05-10').positive, 300);
  assert.equal(points[points.length - 1]?.positive, 300);
});

test('derives receivable accounts into positive totals', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Receivable', 'receivable', [account('account-1', 80)])],
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        groupName: 'Receivable',
        beforeAmount: null,
        afterAmount: 40,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'modify',
        groupName: 'Receivable',
        beforeAmount: 40,
        afterAmount: 80,
        time: atNoon('2026-05-04')
      })
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-05-04').positive, 80);
  assert.equal(getPoint(points, '2026-05-04').negative, 0);
  assert.equal(getPoint(points, '2026-05-04').net, 80);
});

test('derives liability accounts into negative totals and net worth', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Debt', 'liability', [account('account-1', -300)])],
    [
      createRecord({
        id: 'modify-1',
        groupName: 'Debt',
        beforeAmount: -100,
        afterAmount: -200,
        time: atNoon('2026-04-29')
      }),
      createRecord({
        id: 'modify-2',
        groupName: 'Debt',
        beforeAmount: -200,
        afterAmount: -300,
        time: atNoon('2026-05-15')
      })
    ],
    SETTINGS
  );

  assert.deepEqual(
    {
      positive: getPoint(points, '2026-05-15').positive,
      negative: getPoint(points, '2026-05-15').negative,
      net: getPoint(points, '2026-05-15').net
    },
    { positive: 0, negative: 300, net: -300 }
  );
});

test('excludes archived accounts from current state but restores pre-archive dates by rollback', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [
      group('Assets', 'asset', [
        account('account-1', 90, { archived: true, archivedAt: atNoon('2026-05-05') })
      ])
    ],
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 90,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'archive',
        type: HISTORY_TYPE.archive,
        beforeAmount: 90,
        afterAmount: 90,
        time: atNoon('2026-05-05')
      })
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-05-04').positive, 90);
  assert.equal(getPoint(points, '2026-05-05').positive, 0);
  assert.equal(points[points.length - 1]?.positive, 0);
});

test('keeps restored accounts at zero during archived gaps and resumes on restore date', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 120)])],
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 120,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'archive',
        type: HISTORY_TYPE.archive,
        beforeAmount: 120,
        afterAmount: 120,
        time: atNoon('2026-05-01')
      }),
      createRecord({
        id: 'restore',
        type: HISTORY_TYPE.restore,
        beforeAmount: 120,
        afterAmount: 120,
        time: atNoon('2026-05-08')
      })
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-04-30').positive, 120);
  assert.equal(getPoint(points, '2026-05-07').positive, 0);
  assert.equal(getPoint(points, '2026-05-08').positive, 120);
});

test('excludes includeInStats false groups from state and history', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [
      group('Assets', 'asset', [account('account-1', 100)]),
      group('Hidden', 'asset', [account('hidden-1', 999)], { includeInStats: false })
    ],
    [
      createRecord({
        id: 'asset-create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'asset-modify',
        beforeAmount: 100,
        afterAmount: 100,
        time: atNoon('2026-05-03')
      }),
      createRecord({
        id: 'hidden-create',
        accountId: 'hidden-1',
        groupName: 'Hidden',
        beforeAmount: null,
        afterAmount: 999,
        time: atNoon('2026-04-28')
      })
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-05-03').positive, 100);
  assert.equal(getPoint(points, '2026-05-03').net, 100);
});

test('aggregates multiple accounts across positive and negative groups', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [
      group('Assets', 'asset', [account('asset-1', 200), account('asset-2', 100)]),
      group('Receivable', 'receivable', [account('receivable-1', 80)]),
      group('Debt', 'liability', [account('debt-1', -50)])
    ],
    [
      createRecord({
        id: 'create-assets',
        accountId: 'asset-1',
        beforeAmount: null,
        afterAmount: 200,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'modify-debt',
        accountId: 'debt-1',
        groupName: 'Debt',
        beforeAmount: -20,
        afterAmount: -50,
        time: atNoon('2026-05-03')
      })
    ],
    SETTINGS
  );

  assert.deepEqual(
    {
      positive: getPoint(points, '2026-05-03').positive,
      negative: getPoint(points, '2026-05-03').negative,
      net: getPoint(points, '2026-05-03').net
    },
    { positive: 380, negative: 50, net: 330 }
  );
});

test('ignores missing account history while keeping existing account trend values', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 200)])],
    [
      createRecord({
        id: 'create-existing',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'modify-existing',
        beforeAmount: 100,
        afterAmount: 200,
        time: atNoon('2026-05-03')
      }),
      createRecord({
        id: 'missing-old',
        accountId: 'missing-old',
        accountName: '已删除旧账户',
        beforeAmount: null,
        afterAmount: 999,
        time: atNoon('2026-05-03')
      })
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-05-03').positive, 200);
  assert.equal(getPoint(points, '2026-05-03').net, 200);
});

test('keeps asset trend output stable when history input is unordered', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const groups = [group('Assets', 'asset', [account('account-1', 240)])];
  const earlyRecord = createRecord({
    id: 'early',
    beforeAmount: 100,
    afterAmount: 160,
    time: atNoon('2026-04-29')
  });
  const lateRecord = createRecord({
    id: 'late',
    beforeAmount: 160,
    afterAmount: 240,
    time: atNoon('2026-05-16')
  });

  assert.deepEqual(
    deriveAssetTrendPoints(groups, [lateRecord, earlyRecord], SETTINGS),
    deriveAssetTrendPoints(groups, [earlyRecord, lateRecord], SETTINGS)
  );
});

test('combines multiple records from the same date into the day-end state', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 250)])],
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'morning',
        beforeAmount: 100,
        afterAmount: 150,
        time: '2026-05-10T09:00:00'
      }),
      createRecord({
        id: 'evening',
        beforeAmount: 150,
        afterAmount: 250,
        time: '2026-05-10T18:00:00'
      })
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-05-09').positive, 100);
  assert.equal(getPoint(points, '2026-05-10').positive, 250);
});

test('uses input order as the tie breaker for same-timestamp rollback', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const sameTime = atNoon('2026-05-10');
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 300)])],
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'same-1',
        beforeAmount: 100,
        afterAmount: 200,
        time: sameTime
      }),
      createRecord({
        id: 'same-2',
        beforeAmount: 200,
        afterAmount: 300,
        time: sameTime
      })
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-05-09').positive, 200);
});

test('uses beforeAmount when rolling modify records backward', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 280)])],
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 200,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'modify',
        beforeAmount: 200,
        afterAmount: 280,
        time: atNoon('2026-05-12')
      })
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-05-11').positive, 200);
  assert.equal(getPoint(points, '2026-05-12').positive, 280);
});

test('skips missing deleted account records instead of deriving trend points', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [])],
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 80,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'delete',
        type: HISTORY_TYPE.delete,
        beforeAmount: 80,
        afterAmount: null,
        time: atNoon('2026-05-03')
      }),
      createRecord({
        id: 'empty-invalid',
        type: HISTORY_TYPE.delete,
        beforeAmount: null,
        afterAmount: null,
        time: ''
      })
    ],
    SETTINGS
  );

  assert.deepEqual(points, []);
});

test('honors date range boundaries while using after-range records as rollback context', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 300)])],
    [
      createRecord({
        id: 'before-range',
        beforeAmount: 50,
        afterAmount: 100,
        time: atNoon('2026-04-20')
      }),
      createRecord({
        id: 'inside-range',
        beforeAmount: 100,
        afterAmount: 200,
        time: atNoon('2026-05-01')
      }),
      createRecord({
        id: 'after-range',
        beforeAmount: 200,
        afterAmount: 300,
        time: atNoon('2026-06-01')
      })
    ],
    SETTINGS
  );

  assert.equal(points[0]?.date, '2026-04-27');
  assert.equal(points[0]?.kind, 'carry-forward');
  assert.equal(getPoint(points, '2026-04-27').positive, 100);
  assert.equal(points[points.length - 1]?.date, '2026-05-27');
  assert.equal(points[points.length - 1]?.positive, 200);
  assert.equal(points.some((point) => point.date === '2026-06-01'), false);
});

test('returns no asset trend points when there is no history', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });

  assert.deepEqual(
    deriveAssetTrendPoints([group('Assets', 'asset', [account('account-1', 100)])], [], SETTINGS),
    []
  );
});

test('returns no asset trend points with fewer than two effective change dates', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });

  assert.deepEqual(
    deriveAssetTrendPoints(
      [group('Assets', 'asset', [account('account-1', 100)])],
      [
        createRecord({
          id: 'single',
          type: HISTORY_TYPE.create,
          beforeAmount: null,
          afterAmount: 100,
          time: atNoon('2026-04-28')
        })
      ],
      SETTINGS
    ),
    []
  );
});

test('keeps all-zero asset trend output finite', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 0)])],
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 0,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'modify',
        beforeAmount: 0,
        afterAmount: 0,
        time: atNoon('2026-05-03')
      })
    ],
    SETTINGS
  );

  assert.ok(points.length > 0);
  points.forEach((point) => {
    assert.deepEqual(
      { positive: point.positive, negative: point.negative, net: point.net },
      { positive: 0, negative: 0, net: 0 }
    );
  });
});

test('allows net worth to go negative when debt exceeds assets', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [
      group('Assets', 'asset', [account('asset-1', 100)]),
      group('Debt', 'liability', [account('debt-1', -250)])
    ],
    [
      createRecord({
        id: 'asset-create',
        accountId: 'asset-1',
        beforeAmount: null,
        afterAmount: 100,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'debt-create',
        accountId: 'debt-1',
        groupName: 'Debt',
        beforeAmount: null,
        afterAmount: -250,
        time: atNoon('2026-04-29')
      })
    ],
    SETTINGS
  );

  assert.deepEqual(
    {
      positive: getPoint(points, '2026-04-29').positive,
      negative: getPoint(points, '2026-04-29').negative,
      net: getPoint(points, '2026-04-29').net
    },
    { positive: 100, negative: 250, net: -150 }
  );
});

test('starts at first in-range change when there is no earlier baseline', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 180)])],
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 120,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'modify',
        beforeAmount: 120,
        afterAmount: 180,
        time: atNoon('2026-05-03')
      })
    ],
    SETTINGS
  );

  assert.equal(points[0]?.date, '2026-04-28');
  assert.equal(points.some((point) => point.date === '2026-04-27'), false);
});

test('keeps output points in ascending date order', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 240)])],
    [
      createRecord({
        id: 'late',
        beforeAmount: 160,
        afterAmount: 240,
        time: atNoon('2026-05-16')
      }),
      createRecord({
        id: 'early',
        beforeAmount: 100,
        afterAmount: 160,
        time: atNoon('2026-04-29')
      })
    ],
    SETTINGS
  );

  assert.deepEqual(
    points.map((point) => point.date),
    [...points.map((point) => point.date)].sort()
  );
});

test('uses the frozen current date for stable xAxisRange output', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const points = deriveAssetTrendPoints(
    [group('Assets', 'asset', [account('account-1', 200)])],
    [
      createRecord({
        id: 'before-range',
        beforeAmount: 50,
        afterAmount: 100,
        time: atNoon('2026-04-20')
      }),
      createRecord({
        id: 'inside-range',
        beforeAmount: 100,
        afterAmount: 200,
        time: atNoon('2026-05-01')
      })
    ],
    SETTINGS
  );

  assert.equal(points[0]?.date, '2026-04-27');
  assert.equal(points[points.length - 1]?.date, '2026-05-27');
});
