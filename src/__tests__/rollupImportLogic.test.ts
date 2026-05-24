/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  areAllRollupGroupsAssigned,
  parseRollupImportJson
} from '../rollupImportLogic';

const parse = (value: unknown) =>
  parseRollupImportJson(JSON.stringify(value), { todayDateValue: '2026-05-06' });

test('accepts a strict netraflow_rollup JSON payload as low risk', () => {
  const result = parse({
    format: 'netraflow_rollup',
    records: [
      {
        date: '2026-05-04',
        mode: 'change',
        amount: -6.37,
        currency: 'CNY',
        accountKeyword: '支付宝'
      }
    ],
    unresolvedItems: []
  });

  assert.equal(result.ok, true);
  assert.equal(result.review.riskLevel, 'low');
  assert.equal(result.review.lowRiskKind, 'strict');
  assert.equal(result.review.records[0].amount, -6.37);
});

test('normalizes amount strings and mode casing as low-risk fixes', () => {
  const result = parse({
    format: 'netraflow_rollup',
    records: [
      {
        date: '2026-05-04',
        mode: 'CHANGE',
        amount: '12.5',
        currency: '',
        accountKeyword: ''
      }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.review.riskLevel, 'low');
  assert.equal(result.review.lowRiskKind, 'normalized');
  assert.equal(result.review.records[0].mode, 'change');
  assert.equal(result.review.records[0].amount, 12.5);
  assert.equal(result.review.records[0].currency, 'CNY');
});

test('merges duplicate change rows into a medium-risk review', () => {
  const result = parse({
    format: 'netraflow_rollup',
    records: [
      {
        date: '2026-05-04',
        mode: 'change',
        amount: -32,
        currency: 'CNY',
        accountKeyword: '微信支付'
      },
      {
        date: '2026-05-04',
        mode: 'change',
        amount: 10,
        currency: 'CNY',
        accountKeyword: '微信支付'
      }
    ],
    unresolvedItems: []
  });

  assert.equal(result.ok, true);
  assert.equal(result.review.riskLevel, 'medium');
  assert.equal(result.review.records.length, 1);
  assert.equal(result.review.records[0].amount, -22);
});

test('marks mixed change and balance batches as high risk without blocking', () => {
  const result = parse({
    format: 'netraflow_rollup',
    records: [
      {
        date: '2026-05-04',
        mode: 'change',
        amount: 100,
        currency: 'CNY',
        accountKeyword: '基金'
      },
      {
        date: '2026-05-05',
        mode: 'balance',
        amount: 2000,
        currency: 'CNY',
        accountKeyword: '银行卡'
      }
    ],
    unresolvedItems: []
  });

  assert.equal(result.ok, true);
  assert.equal(result.review.riskLevel, 'high');
  assert.equal(result.review.hasBlockingIssues, false);
  assert.equal(
    result.review.issues.some((issue) =>
      issue.message.includes('本次导入同时包含净变动和余额记录')
    ),
    true
  );
});

test('reports repeated rollup content as high risk without blocking', () => {
  const payload = {
    format: 'netraflow_rollup',
    records: [
      {
        date: '2026-05-04',
        mode: 'change',
        amount: 12,
        currency: 'CNY',
        accountKeyword: '支付宝'
      }
    ],
    unresolvedItems: []
  };

  const result = parseRollupImportJson(JSON.stringify(payload), {
    todayDateValue: '2026-05-06',
    contentHash: 'same-content',
    importedHashes: ['same-content']
  });

  assert.equal(result.ok, true);
  assert.equal(result.review.riskLevel, 'high');
  assert.equal(result.review.hasBlockingIssues, false);
  assert.equal(
    result.review.issues.some((issue) => issue.message.includes('高度疑似完全重复')),
    true
  );
});

test('blocks future dates and invalid amount values', () => {
  const futureDateResult = parse({
    format: 'netraflow_rollup',
    records: [
      {
        date: '2026-05-07',
        mode: 'change',
        amount: 1,
        currency: 'CNY',
        accountKeyword: '支付宝'
      }
    ],
    unresolvedItems: []
  });

  assert.equal(futureDateResult.ok, true);
  assert.equal(futureDateResult.review.riskLevel, 'high');
  assert.equal(futureDateResult.review.hasBlockingIssues, true);

  const invalidAmountResult = parse({
    format: 'netraflow_rollup',
    records: [
      {
        date: '2026-05-04',
        mode: 'change',
        amount: 'abc',
        currency: 'CNY',
        accountKeyword: '支付宝'
      }
    ],
    unresolvedItems: []
  });

  assert.equal(invalidAmountResult.ok, true);
  assert.equal(invalidAmountResult.review.hasBlockingIssues, true);
});

test('does not make empty accountKeyword or non-CNY currency high risk by itself', () => {
  const result = parse({
    format: 'netraflow_rollup',
    records: [
      {
        date: '2026-05-04',
        mode: 'balance',
        amount: 1200,
        currency: 'USD',
        accountKeyword: ''
      }
    ],
    unresolvedItems: []
  });

  assert.equal(result.ok, true);
  assert.equal(result.review.riskLevel, 'low');
  assert.equal(result.review.hasBlockingIssues, false);
});

test('requires every account keyword group to have an account assignment', () => {
  assert.equal(
    areAllRollupGroupsAssigned(['支付宝', '微信支付'], {
      支付宝: { groupName: '现金', accountId: 'a1' }
    }),
    false
  );
  assert.equal(
    areAllRollupGroupsAssigned(['支付宝', '微信支付'], {
      支付宝: { groupName: '现金', accountId: 'a1' },
      微信支付: { groupName: '现金', accountId: 'a2' }
    }),
    true
  );
});

test('rejects unparsable JSON and wrong format', () => {
  const jsonResult = parseRollupImportJson('{', { todayDateValue: '2026-05-06' });
  assert.equal(jsonResult.ok, false);
  assert.equal(jsonResult.issues[0].level, 'high');

  const formatResult = parse({ format: 'other', records: [] });
  assert.equal(formatResult.ok, false);
  assert.equal(formatResult.issues[0].message, 'format 必须是 netraflow_rollup');
});
