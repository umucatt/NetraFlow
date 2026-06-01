export const EXAMPLE_DATA_SETTINGS_ID = 'backup-example-data';
export const EXAMPLE_DATA_SETTINGS_SECTION = 'backup';
export const EXAMPLE_DATA_SETTINGS_BLOCK_ID = 'global-settings-backup-example-data';
export const EXAMPLE_DATA_SETTINGS_SCROLL_BLOCK: ScrollLogicalPosition = 'center';
export const EXAMPLE_MODE_BADGE_RETURN_TARGET = 'home';

export type ExampleModeBadgeSettingsNavigation = {
  settingsId: typeof EXAMPLE_DATA_SETTINGS_ID;
  settingsSection: typeof EXAMPLE_DATA_SETTINGS_SECTION;
  blockId: typeof EXAMPLE_DATA_SETTINGS_BLOCK_ID;
  scrollBlock: typeof EXAMPLE_DATA_SETTINGS_SCROLL_BLOCK;
  shouldHighlight: false;
  returnTarget: typeof EXAMPLE_MODE_BADGE_RETURN_TARGET;
};

export const getExampleModeBadgeSettingsNavigation = (
  isExampleMode: boolean
): ExampleModeBadgeSettingsNavigation | null =>
  isExampleMode
    ? {
        settingsId: EXAMPLE_DATA_SETTINGS_ID,
        settingsSection: EXAMPLE_DATA_SETTINGS_SECTION,
        blockId: EXAMPLE_DATA_SETTINGS_BLOCK_ID,
        scrollBlock: EXAMPLE_DATA_SETTINGS_SCROLL_BLOCK,
        shouldHighlight: false,
        returnTarget: EXAMPLE_MODE_BADGE_RETURN_TARGET
      }
    : null;
