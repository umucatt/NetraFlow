/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { formatChartNumber, formatChartPercent } from './chartFormatters';

test('formats chart numbers with the same Chinese number formatting and money precision', () => {
  assert.equal(formatChartNumber(null), '-');
  assert.equal(formatChartNumber(Number.NaN), '-');
  assert.equal(formatChartNumber(1234567.891), '1,234,567.89');
  assert.equal(formatChartNumber(1234.567, 1), '1,234.6');
  assert.equal(formatChartNumber(-0.004), '0');
});

test('formats chart percentages from absolute values and preserves zero denominator behavior', () => {
  assert.equal(formatChartPercent(25, 100), '25.0%');
  assert.equal(formatChartPercent(-25, 100), '25.0%');
  assert.equal(formatChartPercent(25, 0), '0%');
  assert.equal(formatChartPercent(25, -100), '0%');
});
