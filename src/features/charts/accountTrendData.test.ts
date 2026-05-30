/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Account, HistoryRecord } from '../../app/types';
import {
  deriveAccountTrendPoints,
  rollbackAccountRecordForTrend,
  type AccountTrendPoint
} from './accountTrendData';

const FIXED_NOW = new Date('2026-05-27T12:00:00');
const SETTINGS = { xAxisRange: '1m' as const };
const HISTORY_TYPE = {
  create: '\u65b0\u589e' as HistoryRecord['type'],
  delete: '\u5220\u9664' as HistoryRecord['type'],
  modify: '\u4fee\u6539' as HistoryRecord['type'],
  archive: '\u5f52\u6863' as HistoryRecord['type'],
  restore: '\u91cd\u65b0\u542f\u7528' as HistoryRecord['type']
};

const atNoon = (date: string) => `${date}T12:00:00`;

const createAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'account-1',
  name: 'Cash',
  amount: 300,
  createdAt: atNoon('2026-04-20'),
  ...overrides,
  groupId: overrides.groupId ?? 'group-assets'
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

const getPoint = (points: AccountTrendPoint[], date: string) => {
  const point = points.find((currentPoint) => currentPoint.date === date);

  if (!point) {
    assert.fail(`missing account trend point for ${date}`);
  }

  return point;
};

test('derives ordinary account trend points from the selected account history only', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const account = createAccount({ amount: 300 });
  const points = deriveAccountTrendPoints(
    account,
    [
      createRecord({
        id: 'modify-1',
        beforeAmount: 100,
        afterAmount: 150,
        time: atNoon('2026-04-28')
      }),
      createRecord({
        id: 'unrelated',
        accountId: 'account-2',
        beforeAmount: 1,
        afterAmount: 999,
        time: atNoon('2026-05-05')
      }),
      createRecord({
        id: 'modify-2',
        beforeAmount: 150,
        afterAmount: 300,
        time: atNoon('2026-05-10')
      })
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-04-28').net, 150);
  assert.equal(getPoint(points, '2026-05-05').net, 150);
  assert.equal(getPoint(points, '2026-05-10').kind, 'change-date');
  assert.equal(getPoint(points, '2026-05-10').net, 300);
  assert.equal(points[points.length - 1]?.net, 300);
});

test('starts a single account trend at its add record when there is no earlier baseline', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const account = createAccount({ amount: 180, createdAt: atNoon('2026-04-30') });
  const points = deriveAccountTrendPoints(
    account,
    [
      createRecord({
        id: 'create',
        type: HISTORY_TYPE.create,
        beforeAmount: null,
        afterAmount: 120,
        time: atNoon('2026-04-30')
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

  assert.equal(points[0]?.date, '2026-04-30');
  assert.equal(getPoint(points, '2026-04-30').net, 120);
  assert.equal(getPoint(points, '2026-05-03').net, 180);
  assert.equal(points.some((point) => point.date === '2026-04-29'), false);
});

test('uses modify records to change later account trend values', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const account = createAccount({ amount: 280 });
  const points = deriveAccountTrendPoints(
    account,
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

  assert.equal(getPoint(points, '2026-05-11').net, 200);
  assert.equal(getPoint(points, '2026-05-12').net, 280);
  assert.equal(getPoint(points, '2026-05-12').positive, 280);
  assert.equal(getPoint(points, '2026-05-12').negative, 280);
});

test('keeps delete and empty records from producing invalid account trend points', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const account = createAccount({ amount: 0 });
  const points = deriveAccountTrendPoints(
    account,
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

  assert.equal(getPoint(points, '2026-04-28').net, 80);
  assert.equal(getPoint(points, '2026-05-03').net, 0);
  assert.equal(points[points.length - 1]?.net, 0);
  assert.equal(points.some((point) => point.date === ''), false);
  points.forEach((point) => {
    assert.equal(Number.isFinite(point.net), true);
    assert.equal(Number.isFinite(point.positive), true);
    assert.equal(Number.isFinite(point.negative), true);
  });
});

test('keeps archived account trend values derived from archive history', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const account = createAccount({
    amount: 90,
    archived: true,
    archivedAt: atNoon('2026-05-05')
  });
  const points = deriveAccountTrendPoints(
    account,
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

  assert.equal(getPoint(points, '2026-05-04').net, 90);
  assert.equal(getPoint(points, '2026-05-05').kind, 'change-date');
  assert.equal(getPoint(points, '2026-05-05').net, 90);
  assert.equal(points[points.length - 1]?.net, 90);
});

test('restored accounts show zero during the archived gap and resume on restore date', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const account = createAccount({ amount: 120 });
  const restoreRecord = createRecord({
    id: 'restore',
    type: HISTORY_TYPE.restore,
    beforeAmount: 120,
    afterAmount: 120,
    time: atNoon('2026-05-08')
  });
  const points = deriveAccountTrendPoints(
    account,
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
      restoreRecord
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-04-30').net, 120);
  assert.equal(getPoint(points, '2026-05-07').net, 0);
  assert.equal(getPoint(points, '2026-05-08').kind, 'change-date');
  assert.equal(getPoint(points, '2026-05-08').net, 120);
  assert.equal(rollbackAccountRecordForTrend(120, restoreRecord), null);
});

test('preserves negative trend values for liability accounts', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const account = createAccount({ amount: -300 });
  const points = deriveAccountTrendPoints(
    account,
    [
      createRecord({
        id: 'modify-1',
        beforeAmount: -100,
        afterAmount: -200,
        time: atNoon('2026-04-29')
      }),
      createRecord({
        id: 'modify-2',
        beforeAmount: -200,
        afterAmount: -300,
        time: atNoon('2026-05-15')
      })
    ],
    SETTINGS
  );

  assert.equal(getPoint(points, '2026-04-29').net, -200);
  assert.equal(getPoint(points, '2026-05-14').net, -200);
  assert.deepEqual(
    {
      net: getPoint(points, '2026-05-15').net,
      positive: getPoint(points, '2026-05-15').positive,
      negative: getPoint(points, '2026-05-15').negative
    },
    { net: -300, positive: -300, negative: -300 }
  );
});

test('honors date range boundaries while using earlier and later records as rollback context', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const account = createAccount({ amount: 120 });
  const points = deriveAccountTrendPoints(
    account,
    [
      createRecord({
        id: 'before-range',
        beforeAmount: 50,
        afterAmount: 70,
        time: atNoon('2026-04-20')
      }),
      createRecord({
        id: 'inside-range',
        beforeAmount: 70,
        afterAmount: 90,
        time: atNoon('2026-05-01')
      }),
      createRecord({
        id: 'after-range',
        beforeAmount: 90,
        afterAmount: 120,
        time: atNoon('2026-06-01')
      })
    ],
    SETTINGS
  );

  assert.equal(points[0]?.date, '2026-04-27');
  assert.equal(getPoint(points, '2026-04-27').kind, 'carry-forward');
  assert.equal(getPoint(points, '2026-04-27').net, 70);
  assert.equal(getPoint(points, '2026-05-01').kind, 'change-date');
  assert.equal(getPoint(points, '2026-05-01').net, 90);
  assert.equal(points[points.length - 1]?.date, '2026-05-27');
  assert.equal(points[points.length - 1]?.net, 90);
  assert.equal(points.some((point) => point.date === '2026-06-01'), false);
});

test('returns no account trend points when the account has no history records', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  assert.deepEqual(deriveAccountTrendPoints(createAccount(), [], SETTINGS), []);
});

test('keeps account trend output stable when history input is unordered', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const account = createAccount({ amount: 240 });
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
    deriveAccountTrendPoints(account, [lateRecord, earlyRecord], SETTINGS),
    deriveAccountTrendPoints(account, [earlyRecord, lateRecord], SETTINGS)
  );
});
