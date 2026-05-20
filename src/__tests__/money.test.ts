/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCompactMoneyValue,
  formatCurrencyMoneyValue,
  formatHomeMoney,
  formatMoneyInputValue,
  formatMoneyValue,
  normalizeMoneyInput,
  parseMoneyInput,
  roundToMoneyPrecision
} from '../money';

test('rounds money values to at most two decimal places', () => {
  assert.equal(roundToMoneyPrecision(100), 100);
  assert.equal(roundToMoneyPrecision(100.1), 100.1);
  assert.equal(roundToMoneyPrecision(100.126), 100.13);
  assert.equal(roundToMoneyPrecision(-25.555), -25.56);
});

test('formats regular money values without forcing trailing zeroes', () => {
  assert.equal(formatMoneyValue(100), '100');
  assert.equal(formatMoneyValue(100.1), '100.1');
  assert.equal(formatMoneyValue(100.126), '100.13');
});

test('formats compact money values with two decimal places', () => {
  assert.equal(formatCompactMoneyValue(2_308_460), '2.31M');
  assert.equal(formatCompactMoneyValue(2_304_460), '2.30M');
  assert.equal(formatCompactMoneyValue(-2_304_460), '-2.30M');
  assert.equal(formatCurrencyMoneyValue(2_304_460, { compact: true }), '¥2.30M');
});

test('formats home money as rounded integers while preserving compact precision', () => {
  assert.equal(formatHomeMoney(2_308_460), '¥2,308,460');
  assert.equal(formatHomeMoney(-97_070), '-¥97,070');
  assert.equal(formatHomeMoney(122_410.49), '¥122,410');
  assert.equal(formatHomeMoney(122_410.5), '¥122,411');
  assert.equal(formatHomeMoney(-122_410.5), '-¥122,411');
  assert.equal(formatHomeMoney(2_308_460, { compact: true }), '¥2.31M');
  assert.equal(formatHomeMoney(2_308_460, { compact: true, currency: false }), '2.31M');
});

test('normalizes and parses money input to two decimal places', () => {
  assert.equal(normalizeMoneyInput('12.3456'), '12.34');
  assert.equal(normalizeMoneyInput('-12.3456'), '12.34');
  assert.equal(normalizeMoneyInput('-12.3456', { allowNegative: true }), '-12.34');
  assert.equal(parseMoneyInput('12.349'), 12.34);
  assert.equal(parseMoneyInput('-25.555', { allowNegative: true }), -25.55);
  assert.equal(formatMoneyInputValue(100.126), '100.13');
});
