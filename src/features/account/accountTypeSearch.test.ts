import assert from 'node:assert/strict';
import test from 'node:test';
import type { AssetGroup } from '../../app/types';
import {
  findBestAccountTypeMatch,
  getAccountTypeGhostText,
  getAccountTypeMatchScore,
  normalizeTypeSearchText
} from './accountTypeSearch';

const createGroup = (name: string, sortOrder = 0): AssetGroup => ({
  name,
  nature: 'asset',
  includeInStats: true,
  sortOrder,
  accounts: []
});

test('account type search keeps exact and prefix matches ahead of weaker matches', () => {
  const groups = [createGroup('现金'), createGroup('现金等价物'), createGroup('薪资账户')];

  assert.equal(findBestAccountTypeMatch(groups, '现金')?.name, '现金');
  assert.equal(findBestAccountTypeMatch(groups, '现')?.name, '现金');
  assert.ok(getAccountTypeMatchScore('现金', '现金') > getAccountTypeMatchScore('现金等价物', '现金'));
});

test('account type search preserves previous fuzzy and ghost-text behavior', () => {
  const groups = [createGroup('生活储备'), createGroup('长期储蓄')];
  const match = findBestAccountTypeMatch(groups, '储');

  assert.equal(match?.name, '生活储备');
  assert.equal(getAccountTypeGhostText('储', match), ' → 生活储备');
  assert.equal(getAccountTypeGhostText('生', match), '活储备');
  assert.equal(getAccountTypeGhostText('生活储备', match), '');
});

test('account type search normalizes surrounding whitespace and Chinese locale casing', () => {
  assert.equal(normalizeTypeSearchText('  ABC  '), 'abc');
  assert.equal(findBestAccountTypeMatch([createGroup('备用金')], '   ')?.name, undefined);
});
