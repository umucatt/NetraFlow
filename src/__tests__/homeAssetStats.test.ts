/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_HOME_ASSET_STAT_SETTINGS,
  resolveHomeAssetStatLabel,
  resolveHomeAssetStatValue
} from '../homeAssetStats';

test('keeps home asset stat defaults close to the previous home display', () => {
  assert.deepEqual(DEFAULT_HOME_ASSET_STAT_SETTINGS, {
    homeAssetStatMetric: 'netWorth',
    homeAssetStatLabelMode: 'full',
    homeAssetStatCompact: false
  });
});

test('resolves home stat labels by metric and label mode', () => {
  assert.equal(resolveHomeAssetStatLabel('netWorth', 'full'), '净值');
  assert.equal(resolveHomeAssetStatLabel('netWorth', 'short'), 'NW');
  assert.equal(resolveHomeAssetStatLabel('totalAssets', 'full'), '总资产');
  assert.equal(resolveHomeAssetStatLabel('totalAssets', 'short'), 'TA');
});

test('resolves home stat value source without recalculating amounts', () => {
  const values = {
    netWorth: 122_170,
    totalAssets: 2_308_460
  };

  assert.equal(resolveHomeAssetStatValue('netWorth', values), 122_170);
  assert.equal(resolveHomeAssetStatValue('totalAssets', values), 2_308_460);
});
