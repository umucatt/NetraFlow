/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAccountDisplayMark,
  getAccountMarkDisplay,
  getAccountMarkLayout,
  getAccountMarkRows,
  getAutomaticAccountMark,
  limitAccountAliasInput
} from '../accountMark';

test('limits custom account abbreviations to four characters', () => {
  assert.equal(limitAccountAliasInput('储蓄卡工资'), '储蓄卡工');
  assert.equal(getAccountDisplayMark({ name: '储蓄卡', alias: '储蓄卡工资' }), '储蓄卡工');
});

test('uses the first two account name characters when custom abbreviation is empty', () => {
  assert.equal(getAutomaticAccountMark('储蓄卡'), '储蓄');
  assert.equal(getAutomaticAccountMark('现金'), '现金');
  assert.equal(getAutomaticAccountMark('QQ 钱包'), 'QQ');
  assert.equal(getAutomaticAccountMark('  网贷  '), '网贷');
  assert.equal(getAccountDisplayMark({ name: '微信零钱', alias: '' }), '微信');
});

test('resolves account abbreviation rows for one to four characters', () => {
  assert.deepEqual(getAccountMarkRows('储'), ['储']);
  assert.deepEqual(getAccountMarkRows('储蓄'), ['储蓄']);
  assert.deepEqual(getAccountMarkRows('储蓄卡'), ['储蓄', '卡']);
  assert.deepEqual(getAccountMarkRows('储蓄工资'), ['储蓄', '工资']);

  assert.equal(getAccountMarkLayout('储'), 'single');
  assert.equal(getAccountMarkLayout('储蓄'), 'inline');
  assert.equal(getAccountMarkLayout('储蓄卡'), 'stack-2-1');
  assert.equal(getAccountMarkLayout('储蓄工资'), 'stack-2-2');
});

test('reports whether the displayed account abbreviation is custom or automatic', () => {
  assert.deepEqual(getAccountMarkDisplay({ name: '银行卡' }), {
    text: '银行',
    rows: ['银行'],
    layout: 'inline',
    source: 'auto'
  });

  assert.deepEqual(getAccountMarkDisplay({ name: '银行卡', alias: '工资卡' }), {
    text: '工资卡',
    rows: ['工资', '卡'],
    layout: 'stack-2-1',
    source: 'custom'
  });
});
