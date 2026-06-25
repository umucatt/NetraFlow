import { cloneAppData } from './accountData';
import type { AppData, BackupRecord } from './types';
import type {
  AppDataLifecycleSnapshot,
  AppDataResetAction,
  AppDataResetConfirmation,
  ExampleGeneratedData
} from './appDataLifecycleTypes';
import type { ExampleTemplateId } from '../exampleData';

export const TEST_DATA_TEMPLATE_ID: ExampleTemplateId = 'advanced';

export const createEmptyAppData = (): AppData => ({
  groups: [],
  accounts: [],
  history: []
});

export const cloneBackupRecords = (records: BackupRecord[]): BackupRecord[] =>
  records.map((record) => ({ ...record }));

export const cloneLifecycleSnapshot = (
  snapshot: AppDataLifecycleSnapshot
): AppDataLifecycleSnapshot => ({
  appData: cloneAppData(snapshot.appData),
  backupRecords: cloneBackupRecords(snapshot.backupRecords),
  lastBackupAt: snapshot.lastBackupAt,
  lastBackupHistoryCount: snapshot.lastBackupHistoryCount
});

export const createExampleModeSnapshot = (
  snapshot: AppDataLifecycleSnapshot
): AppDataLifecycleSnapshot => cloneLifecycleSnapshot(snapshot);

export const createExampleDataApplyResult = (
  generatedData: ExampleGeneratedData
): AppDataLifecycleSnapshot => cloneLifecycleSnapshot(generatedData);

export const createTestDataInRealAppData = (
  createExampleData: (templateId: ExampleTemplateId) => ExampleGeneratedData
): AppData => createExampleDataApplyResult(
  createExampleData(TEST_DATA_TEMPLATE_ID)
).appData;

export const createExtremeTestDataInRealAppData = (
  createExtremeExampleData: () => ExampleGeneratedData
): AppData => createExampleDataApplyResult(createExtremeExampleData()).appData;

export const createRestoredRealDataState = ({
  savedSnapshot,
  loadFallbackSnapshot
}: {
  savedSnapshot: AppDataLifecycleSnapshot | null;
  loadFallbackSnapshot: () => AppDataLifecycleSnapshot;
}) =>
  savedSnapshot
    ? cloneLifecycleSnapshot(savedSnapshot)
    : cloneLifecycleSnapshot(loadFallbackSnapshot());

export const createResetConfirmationCode = (
  randomValue = Math.random()
) => String(Math.floor(randomValue * 10000)).padStart(4, '0').slice(0, 4);

export const createResetConfirmation = (
  action: AppDataResetAction,
  randomValue?: number
): AppDataResetConfirmation => ({
  action,
  code: createResetConfirmationCode(randomValue)
});

export const sanitizeResetConfirmationInput = (value: string) =>
  value.replace(/[^\d]/g, '').slice(0, 4);

export const isResetConfirmationInputValid = (
  confirmation: AppDataResetConfirmation,
  input: string
) => Boolean(confirmation && input === confirmation.code);

export const getResetActionLabel = (action: AppDataResetAction) => {
  if (action === 'settings') {
    return '清除用户配置';
  }

  if (action === 'history') {
    return '清除历史记录';
  }

  return '清除所有';
};
