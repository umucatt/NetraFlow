import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXAMPLE_DATA_SETTINGS_BLOCK_ID,
  EXAMPLE_DATA_SETTINGS_ID,
  EXAMPLE_DATA_SETTINGS_SCROLL_BLOCK,
  EXAMPLE_DATA_SETTINGS_SECTION,
  EXAMPLE_MODE_BADGE_RETURN_TARGET,
  getExampleModeBadgeSettingsNavigation
} from './exampleModeNavigation';

test('example mode badge navigation targets example data settings without highlight', () => {
  assert.deepEqual(getExampleModeBadgeSettingsNavigation(true), {
    settingsId: EXAMPLE_DATA_SETTINGS_ID,
    settingsSection: EXAMPLE_DATA_SETTINGS_SECTION,
    blockId: EXAMPLE_DATA_SETTINGS_BLOCK_ID,
    scrollBlock: EXAMPLE_DATA_SETTINGS_SCROLL_BLOCK,
    shouldHighlight: false,
    returnTarget: EXAMPLE_MODE_BADGE_RETURN_TARGET
  });
});

test('example mode badge navigation is disabled outside example mode', () => {
  assert.equal(getExampleModeBadgeSettingsNavigation(false), null);
});
