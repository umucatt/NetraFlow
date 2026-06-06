import type { AppData, BackupRecord } from './types';

export type AppDataResetAction = 'settings' | 'history' | 'all';

export type AppDataResetConfirmation = {
  action: AppDataResetAction;
  code: string;
} | null;

export type AppDataLifecycleSnapshot = {
  appData: AppData;
  backupRecords: BackupRecord[];
  lastBackupAt: string;
  lastBackupHistoryCount: number;
};

export type ExampleGeneratedData = AppDataLifecycleSnapshot;
