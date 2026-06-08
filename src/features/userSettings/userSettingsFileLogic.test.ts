/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  USER_SETTINGS_FILE_TYPE,
  USER_SETTINGS_FILE_VERSION
} from '../../app/storageKeys';
import type { GlobalSettings } from '../security/securitySettingsTypes';
import {
  createUserSettingsExportPayload,
  getUserSettingsFileName,
  readImportedUserSettings
} from './userSettingsFileLogic';

const currentGlobalSettings: GlobalSettings = {
  positiveNegativeColorMode: 'red-positive',
  themeMode: 'system',
  themeStyle: 'default',
  nyaaThemeUnlocked: false,
  mainContentPosition: 'left',
  pagePositionMemoryMode: 'global',
  searchLogicMode: 'infer',
  chartColorAssignmentMode: 'createdAt',
  homeAssetStatMetric: 'netWorth',
  homeAssetStatLabelMode: 'full',
  homeAssetStatCompact: false,
  passwordProtectionEnabled: false,
  passwordHash: null,
  autoLockMinutes: 10,
  snapshotEncryptionEnabled: false,
  snapshotPasswordHash: null
};

test('user settings file names keep the netraflow-settings extension contract', () => {
  assert.equal(
    getUserSettingsFileName(new Date(2026, 5, 3, 4, 5, 6)),
    'netraflow-settings-20260603-040506.netraflow-settings.json'
  );
});

test('user settings export excludes security and sensitive fields', () => {
  const payload = createUserSettingsExportPayload({
    globalSettings: {
      ...currentGlobalSettings,
      passwordProtectionEnabled: true,
      autoLockMinutes: 1,
      snapshotEncryptionEnabled: true
    },
    effectiveThemeStyle: 'default',
    assetChartSettings: { trend: true },
    normalizeAssetChartSettings: (value) => value,
    exportedAt: new Date(2026, 5, 3, 4, 5, 6)
  });

  assert.equal('passwordProtectionEnabled' in payload.settings, false);
  assert.equal('passwordHash' in payload.settings, false);
  assert.equal('autoLockMinutes' in payload.settings, false);
  assert.equal('snapshotEncryptionEnabled' in payload.settings, false);
  assert.equal('snapshotPasswordHash' in payload.settings, false);
  assert.equal(payload.settings.mainContentPosition, 'left');
});

test('imported user settings do not overwrite security fields', () => {
  const imported = readImportedUserSettings({
    value: {
      type: USER_SETTINGS_FILE_TYPE,
      version: USER_SETTINGS_FILE_VERSION,
      settings: {
        themeMode: 'dark',
        mainContentPosition: 'right',
        passwordProtectionEnabled: true,
        passwordHash: { algorithm: 'fake' },
        autoLockMinutes: 1,
        snapshotEncryptionEnabled: true,
        snapshotPasswordHash: { algorithm: 'fake' },
        assetChartSettings: { imported: true }
      }
    },
    currentGlobalSettings,
    normalizeAssetChartSettings: (value) => ({ normalized: value })
  });

  assert.equal(imported.globalSettings.themeMode, 'dark');
  assert.equal(imported.globalSettings.mainContentPosition, 'right');
  assert.equal(imported.globalSettings.passwordProtectionEnabled, false);
  assert.equal(imported.globalSettings.passwordHash, null);
  assert.equal(imported.globalSettings.autoLockMinutes, 10);
  assert.equal(imported.globalSettings.snapshotEncryptionEnabled, false);
  assert.equal(imported.globalSettings.snapshotPasswordHash, null);
  assert.deepEqual(imported.assetChartSettings, {
    normalized: { imported: true }
  });
});

test('imported user settings keep current page focus side for invalid values', () => {
  const imported = readImportedUserSettings({
    value: {
      type: USER_SETTINGS_FILE_TYPE,
      version: USER_SETTINGS_FILE_VERSION,
      settings: {
        mainContentPosition: 'center'
      }
    },
    currentGlobalSettings: {
      ...currentGlobalSettings,
      mainContentPosition: 'right'
    },
    normalizeAssetChartSettings: (value) => value
  });

  assert.equal(imported.globalSettings.mainContentPosition, 'right');
});
