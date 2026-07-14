export type SearchRevisionIdentity = {
  groups: unknown;
  historyRecords: unknown;
  backupRecords: unknown;
  config: unknown;
  settingsItems: unknown;
};

export const hasSearchRevisionIdentityChanged = (
  previous: SearchRevisionIdentity,
  next: SearchRevisionIdentity
) =>
  previous.groups !== next.groups ||
  previous.historyRecords !== next.historyRecords ||
  previous.backupRecords !== next.backupRecords ||
  previous.config !== next.config ||
  previous.settingsItems !== next.settingsItems;

export const shouldBuildSearchRevision = (
  requestedRevision: number,
  readyRevision: number,
  buildingRevision: number
) => requestedRevision !== readyRevision && requestedRevision !== buildingRevision;
