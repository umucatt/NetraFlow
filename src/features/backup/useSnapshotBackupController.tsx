import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';

import { getValidTimestamp } from '../../app/dateUtils';
import { deriveGroupsWithAccounts } from '../../app/accountData';
import {
  decryptSnapshotDocumentWithCurrentSession,
  decryptSnapshotDocumentWithPassword,
  encryptSnapshotDocumentWithCurrentSession
} from '../../app/persistence/runtimePersistence';
import type {
  Account,
  AppData,
  AssetGroup,
  AssetGroupWithAccounts,
  AutoBackupSettings,
  BackupCycleUnit,
  BackupMethod,
  BackupRecord,
  HistoryRecord,
  SnapshotImportRecord
} from '../../app/types';
import {
  SNAPSHOT_DECRYPTION_ERROR_MESSAGE,
  isEncryptedSnapshotFile
} from '../../security/snapshotCrypto';
import type { GlobalSettings } from '../security/securitySettingsTypes';
import {
  areAutoBackupSettingsEqual,
  createEncryptedBackupFileContent,
  createBackupFileContent,
  createBackupPayload,
  createSnapshotRestoreData,
  DEFAULT_AUTO_BACKUP_SETTINGS,
  getBackupFileName,
  mergeBackupRecords,
  mergeSnapshotImportRecords,
  normalizeAutoBackupSettings,
  normalizeBackupRecords,
  normalizeSnapshotImportRecords,
  SNAPSHOT_INCOMPLETE_ERROR_MESSAGE,
  shouldRunStartupAutoBackupCycle
} from './snapshotBackupLogic';

type ConfirmationRequest = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  eyebrow?: string | null;
  tone?: 'default' | 'danger';
};

type InputRequest = {
  title: string;
  message: ReactNode;
  label: string;
  confirmLabel: string;
  cancelLabel?: string;
  inputType?: 'text' | 'password';
  autoComplete?: string;
};

type NoticeRequest = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
};

type BackupAccountData = {
  groups: AssetGroup[];
  accounts: Account[];
};

type ImportBackupDataResult = {
  snapshotCreatedAt: string | null;
  historyRecordCount: number;
  changedHistoryRecordCount: number;
};

type InitialBackupState = {
  lastBackupAt: string;
  lastBackupHistoryCount: number;
  backupRecords: BackupRecord[];
  snapshotImportRecords: SnapshotImportRecord[];
};

type PersistBackupStateInput = {
  records: BackupRecord[];
  lastBackupAt: string;
  lastBackupHistoryCount: number;
};

type SnapshotBackupControllerOptions = {
  productName: string;
  assetGroups: AssetGroup[];
  accounts: Account[];
  history: HistoryRecord[];
  isExampleMode: boolean;
  globalSettings: GlobalSettings;
  initialAutoBackupSettings: AutoBackupSettings;
  initialBackupState: InitialBackupState;
  updateAppData: (nextData: AppData, options?: { flush?: boolean }) => void;
  persistAutoBackupSettings: (settings: AutoBackupSettings) => void;
  persistBackupState: (state: PersistBackupStateInput) => void;
  persistSnapshotImportRecords: (records: SnapshotImportRecord[]) => void;
  consumeAutoBackupDueOnce: () => boolean;
  isPersistenceCurrent: () => boolean;
  clearSearchNavigation: () => void;
  getBackupFieldValue: (value: unknown, fieldNames: string[]) => unknown;
  getBackupAccountData: (value: unknown) => BackupAccountData;
  getBackupHistory: (value: unknown, groups: AssetGroupWithAccounts[]) => HistoryRecord[];
  requestConfirmationDialog: (request: ConfirmationRequest) => Promise<boolean>;
  requestInputDialog: (request: InputRequest) => Promise<string | null>;
  showNoticeDialog: (request: NoticeRequest) => Promise<void>;
  getImportContentAfterIntegrityCheck: (text: string) => Promise<unknown | null>;
  showToast: (message: string, tone?: 'info' | 'success' | 'error') => string;
  dismissToast: (toastId: string) => void;
};

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isErrorWithCode = (error: unknown, code: string) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === code;

const getStandardSnapshotFieldValue = (value: unknown, fieldName: string) =>
  isPlainObject(value) ? value[fieldName] : undefined;

let hasCheckedStartupAutoBackup = false;

export function useSnapshotBackupController({
  productName,
  assetGroups,
  accounts,
  history,
  isExampleMode,
  globalSettings,
  initialAutoBackupSettings,
  initialBackupState,
  updateAppData,
  persistAutoBackupSettings,
  persistBackupState,
  persistSnapshotImportRecords,
  consumeAutoBackupDueOnce,
  isPersistenceCurrent,
  clearSearchNavigation,
  getBackupFieldValue,
  getBackupAccountData,
  getBackupHistory,
  requestConfirmationDialog,
  requestInputDialog,
  showNoticeDialog,
  getImportContentAfterIntegrityCheck,
  showToast,
  dismissToast
}: SnapshotBackupControllerOptions) {
  const [lastBackupAt, setLastBackupAt] = useState(initialBackupState.lastBackupAt);
  const [lastBackupHistoryCount, setLastBackupHistoryCount] = useState(
    initialBackupState.lastBackupHistoryCount
  );
  const [backupRecords, setBackupRecords] = useState(() =>
    normalizeBackupRecords(initialBackupState.backupRecords)
  );
  const [snapshotImportRecords, setSnapshotImportRecords] = useState(
    () => normalizeSnapshotImportRecords(initialBackupState.snapshotImportRecords)
  );
  const [autoBackupSettings, setAutoBackupSettings] = useState(() =>
    normalizeAutoBackupSettings(initialAutoBackupSettings)
  );
  const [autoBackupDraft, setAutoBackupDraft] =
    useState<AutoBackupSettings>(() => autoBackupSettings);
  const [autoBackupCycleValueInput, setAutoBackupCycleValueInput] = useState(() =>
    String(autoBackupSettings.cycle.value)
  );

  const backupHistoryDelta = history.length - lastBackupHistoryCount;
  const incrementalRecordValue =
    backupHistoryDelta < 0 ? '有记录删除' : `${backupHistoryDelta}`;
  const hasAutoBackupDraftChanges = !areAutoBackupSettingsEqual(
    autoBackupDraft,
    autoBackupSettings
  );
  const canSaveAutoBackupSettings =
    !isExampleMode &&
    hasAutoBackupDraftChanges &&
    (!autoBackupDraft.enabled ||
      (autoBackupCycleValueInput.trim() !== '' &&
        autoBackupDraft.cycle.value > 0 &&
        autoBackupDraft.directory.trim() !== ''));

  useEffect(() => {
    setAutoBackupCycleValueInput(String(autoBackupDraft.cycle.value));
  }, [autoBackupDraft.cycle.value]);

  const applyBackupState = (
    nextBackupRecords: BackupRecord[],
    nextLastBackupAt: string,
    nextLastBackupHistoryCount: number,
    persist: boolean
  ) => {
    const normalizedRecords = normalizeBackupRecords(nextBackupRecords);
    const normalizedHistoryCount = Math.max(0, Math.floor(nextLastBackupHistoryCount));

    setBackupRecords(normalizedRecords);
    setLastBackupAt(nextLastBackupAt);
    setLastBackupHistoryCount(normalizedHistoryCount);

    if (!persist) {
      return;
    }

    persistBackupState({
      records: normalizedRecords,
      lastBackupAt: nextLastBackupAt,
      lastBackupHistoryCount: normalizedHistoryCount
    });
  };

  const resetAutoBackupSettings = (
    nextSettings: AutoBackupSettings = DEFAULT_AUTO_BACKUP_SETTINGS
  ) => {
    const normalizedSettings = normalizeAutoBackupSettings(nextSettings);

    setAutoBackupSettings(normalizedSettings);
    setAutoBackupDraft(normalizedSettings);
    setAutoBackupCycleValueInput(String(normalizedSettings.cycle.value));
    persistAutoBackupSettings(normalizedSettings);
  };

  const resetSnapshotImportRecords = (persist: boolean) => {
    setSnapshotImportRecords([]);

    if (persist) {
      persistSnapshotImportRecords([]);
    }
  };

  const resetAutoBackupDraft = () => {
    setAutoBackupDraft(autoBackupSettings);
    setAutoBackupCycleValueInput(String(autoBackupSettings.cycle.value));
  };

  const updateAutoBackupEnabled = (enabled: boolean) => {
    if (isExampleMode) {
      return;
    }

    if (enabled && !autoBackupDraft.enabled && globalSettings.snapshotEncryptionEnabled) {
      void requestConfirmationDialog({
        title: '自动快照将使用登录密码加密',
        message: (
          <>
            <p>忘记创建快照时的登录密码将无法恢复自动生成的加密快照</p>
            <strong>是否继续？</strong>
          </>
        ),
        confirmLabel: '继续开启'
      }).then((shouldContinue) => {
        if (!shouldContinue || !isPersistenceCurrent()) {
          return;
        }

        setAutoBackupDraft((currentSettings) =>
          normalizeAutoBackupSettings({
            ...currentSettings,
            enabled: true
          })
        );
      });
      return;
    }

    setAutoBackupDraft((currentSettings) =>
      normalizeAutoBackupSettings({
        ...currentSettings,
        enabled
      })
    );
  };

  const updateAutoBackupCycleValue = (value: string) => {
    if (isExampleMode) {
      return;
    }

    const nextValue = value.replace(/[^\d]/g, '');
    setAutoBackupCycleValueInput(nextValue);

    if (!nextValue) {
      return;
    }

    setAutoBackupDraft((currentSettings) =>
      normalizeAutoBackupSettings({
        ...currentSettings,
        cycle: {
          ...currentSettings.cycle,
          value: Number(nextValue)
        }
      })
    );
  };

  const adjustAutoBackupCycleValue = (direction: 1 | -1) => {
    if (isExampleMode) {
      return;
    }

    setAutoBackupDraft((currentSettings) =>
      normalizeAutoBackupSettings({
        ...currentSettings,
        cycle: {
          ...currentSettings.cycle,
          value: Math.max(1, currentSettings.cycle.value + direction)
        }
      })
    );
  };

  const updateAutoBackupCycleUnit = (unit: BackupCycleUnit) => {
    if (isExampleMode) {
      return;
    }

    setAutoBackupDraft((currentSettings) =>
      normalizeAutoBackupSettings({
        ...currentSettings,
        cycle: {
          ...currentSettings.cycle,
          unit
        }
      })
    );
  };

  const selectAutoBackupDirectory = async () => {
    if (isExampleMode || !autoBackupDraft.enabled) {
      return;
    }

    const api = window.electronAPI ?? window.electronWindow;

    if (!api?.selectDirectory) {
      void showNoticeDialog({
        title: '选择自动快照目录失败',
        message: '当前环境不支持选择目录'
      });
      return;
    }

    try {
      const selectedDirectory = await api.selectDirectory();

      if (!selectedDirectory || !isPersistenceCurrent()) {
        return;
      }

      setAutoBackupDraft((currentSettings) =>
        normalizeAutoBackupSettings({
          ...currentSettings,
          directory: selectedDirectory
        })
      );
    } catch (error) {
      console.error('[NetraFlow snapshot] Failed to select auto snapshot directory.', error);
      void showNoticeDialog({
        title: '选择自动快照目录失败',
        message: '目录选择失败，请稍后再试'
      });
    }
  };

  const saveAutoBackupDraft = () => {
    if (isExampleMode || !canSaveAutoBackupSettings) {
      return;
    }

    const nextSettings = normalizeAutoBackupSettings(autoBackupDraft);

    clearSearchNavigation();
    setAutoBackupSettings(nextSettings);
    setAutoBackupDraft(nextSettings);
    setAutoBackupCycleValueInput(String(nextSettings.cycle.value));
    persistAutoBackupSettings(nextSettings);
  };

  const createBackupRecord = (backedUpAt: string, method: BackupMethod): BackupRecord => ({
    id: createId('backup-record'),
    backedUpAt,
    historyCount: history.length,
    incrementCount: Math.max(0, history.length - lastBackupHistoryCount),
    method
  });

  const ensureEncryptedSnapshotSession = async () => {
    if (!globalSettings.passwordProtectionEnabled) {
      await showNoticeDialog({
        title: '登录密码保护未启用',
        message: '请先启用登录密码保护'
      });

      return null;
    }

    return true;
  };

  const saveBackupSuccess = (backupRecord: BackupRecord, nextBackupRecords: BackupRecord[]) => {
    clearSearchNavigation();
    setBackupRecords(nextBackupRecords);
    setLastBackupAt(backupRecord.backedUpAt);
    setLastBackupHistoryCount(backupRecord.historyCount);

    if (isExampleMode) {
      return;
    }

    persistBackupState({
      records: nextBackupRecords,
      lastBackupAt: backupRecord.backedUpAt,
      lastBackupHistoryCount: backupRecord.historyCount
    });
  };

  const getSnapshotCreatedAt = (
    value: unknown,
    importedBackupRecords: BackupRecord[]
  ) => {
    const directSnapshotTime = getBackupFieldValue(value, [
      'exportedAt',
      'backupAt',
      'lastBackupAt',
      'backedUpAt',
      'createdAt'
    ]);

    if (
      typeof directSnapshotTime === 'string' &&
      getValidTimestamp(directSnapshotTime) !== null
    ) {
      return directSnapshotTime;
    }

    return importedBackupRecords[0]?.backedUpAt ?? null;
  };

  const saveSnapshotImportSuccess = (result: ImportBackupDataResult) => {
    if (isExampleMode) {
      return;
    }

    const importRecord = {
      id: createId('snapshot-import-record'),
      importedAt: new Date().toISOString(),
      snapshotCreatedAt: result.snapshotCreatedAt,
      historyRecordCount: result.historyRecordCount,
      changedHistoryRecordCount: result.changedHistoryRecordCount
    };
    const nextSnapshotImportRecords = mergeSnapshotImportRecords(
      snapshotImportRecords,
      importRecord
    );

    setSnapshotImportRecords(nextSnapshotImportRecords);
    persistSnapshotImportRecords(nextSnapshotImportRecords);
  };

  const exportBackup = async () => {
    if (isExampleMode) {
      void showNoticeDialog({
        title: '示例模式下不可导出快照',
        message: '示例模式不会读写真实外部快照文件'
      });
      return;
    }

    const api = window.electronAPI ?? window.electronWindow;
    const shouldEncryptSnapshot = globalSettings.snapshotEncryptionEnabled;

    if (!api?.selectDirectory || !api?.writeSnapshotFile) {
      void showNoticeDialog({
        title: '导出快照失败',
        message: '当前环境不支持导出快照'
      });
      return;
    }

    if (shouldEncryptSnapshot) {
      if ((await ensureEncryptedSnapshotSession()) !== true) {
        return;
      }

      if (!isPersistenceCurrent()) {
        return;
      }
    }

    let selectedDirectory = '';

    try {
      selectedDirectory = await api.selectDirectory();
    } catch (error) {
      console.error('[NetraFlow snapshot] Failed to select manual snapshot directory.', error);
      void showNoticeDialog({
        title: '导出快照失败',
        message: '目录选择失败，请稍后再试'
      });
      return;
    }

    if (!selectedDirectory || !isPersistenceCurrent()) {
      return;
    }

    const backupAt = new Date().toISOString();
    const backupRecord = createBackupRecord(backupAt, 'manual');
    const nextBackupRecords = mergeBackupRecords(backupRecords, [backupRecord]);
    const backupPayload = createBackupPayload({
      productName,
      backupAt,
      groups: assetGroups,
      accounts,
      history
    });
    let fileContent = '';

    try {
      if (shouldEncryptSnapshot) {
        const encryptedSnapshot = encryptSnapshotDocumentWithCurrentSession(backupPayload);
        fileContent = await createEncryptedBackupFileContent(encryptedSnapshot);
      } else {
        fileContent = await createBackupFileContent(backupPayload, null);
      }

      if (!isPersistenceCurrent()) {
        return;
      }
    } catch (error) {
      console.error('[NetraFlow snapshot] Failed to encrypt manual snapshot.', error);
      void showNoticeDialog({
        title: '导出快照失败',
        message: isErrorWithCode(error, 'PERSISTENCE_CRYPTO_SESSION_UNAVAILABLE')
          ? '加密会话不可用，请先解锁 NF'
          : '快照加密失败，请稍后再试'
      });
      return;
    }

    try {
      await api.writeSnapshotFile({
        directory: selectedDirectory,
        fileName: getBackupFileName(backupAt, shouldEncryptSnapshot),
        content: fileContent
      });

      if (!isPersistenceCurrent()) {
        return;
      }

      saveBackupSuccess(backupRecord, nextBackupRecords);
      void showNoticeDialog({
        title: '导出快照',
        message: shouldEncryptSnapshot ? '加密快照文件已导出' : '快照文件已导出'
      });
    } catch (error) {
      console.error('[NetraFlow snapshot] Manual snapshot failed.', error);
      void showNoticeDialog({
        title: '导出快照失败',
        message: '快照文件写入失败，请检查目录'
      });
    }
  };

  const runStartupAutoBackup = async () => {
    if (isExampleMode) {
      return;
    }

    const settings = autoBackupSettings;
    const currentGlobalSettings = globalSettings;
    const forceDueOnce = consumeAutoBackupDueOnce();

    if (!settings.enabled) {
      return;
    }

    const directory = settings.directory.trim();

    if (!directory) {
      console.warn('[NetraFlow snapshot] Auto snapshot directory is not configured.');
      showToast('自动快照目录未设置', 'error');
      return;
    }

    const shouldRun = shouldRunStartupAutoBackupCycle(
      lastBackupAt,
      settings.cycle,
      forceDueOnce
    );

    if (!shouldRun) {
      return;
    }

    const api = window.electronAPI ?? window.electronWindow;

    if (!api?.writeSnapshotFile) {
      console.error('[NetraFlow snapshot] Snapshot file writer is not available.');
      showToast('自动快照无法写入文件', 'error');
      return;
    }

    const shouldEncryptSnapshot = currentGlobalSettings.snapshotEncryptionEnabled;

    if (shouldEncryptSnapshot) {
      if ((await ensureEncryptedSnapshotSession()) !== true) {
        showToast('自动快照已跳过', 'info');
        return;
      }
    }

    if (!isPersistenceCurrent()) {
      return;
    }

    const progressToastId = showToast('自动备份进行中');
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 120);
    });

    if (!isPersistenceCurrent()) {
      dismissToast(progressToastId);
      return;
    }

    const backupAt = new Date().toISOString();
    const backupRecord = createBackupRecord(backupAt, 'auto');
    const latestBackupRecords = backupRecords;
    const nextBackupRecords = mergeBackupRecords(latestBackupRecords, [backupRecord]);
    const backupPayload = createBackupPayload({
      productName,
      backupAt,
      groups: assetGroups,
      accounts,
      history
    });
    let fileContent = '';

    try {
      if (shouldEncryptSnapshot) {
        const encryptedSnapshot = encryptSnapshotDocumentWithCurrentSession(backupPayload);
        fileContent = await createEncryptedBackupFileContent(encryptedSnapshot);
      } else {
        fileContent = await createBackupFileContent(backupPayload, null);
      }

      if (!isPersistenceCurrent()) {
        dismissToast(progressToastId);
        return;
      }

      await api.writeSnapshotFile({
        directory,
        fileName: getBackupFileName(backupAt, shouldEncryptSnapshot),
        content: fileContent
      });

      if (!isPersistenceCurrent()) {
        dismissToast(progressToastId);
        return;
      }

      dismissToast(progressToastId);
      saveBackupSuccess(backupRecord, nextBackupRecords);
      setAutoBackupSettings(settings);
      setAutoBackupDraft(settings);
      setAutoBackupCycleValueInput(String(settings.cycle.value));
      showToast('自动备份完成', 'success');
    } catch (error) {
      console.error('[NetraFlow snapshot] Auto snapshot failed.', error);
      dismissToast(progressToastId);
      if (isErrorWithCode(error, 'PERSISTENCE_CRYPTO_SESSION_UNAVAILABLE')) {
        showToast('自动快照已跳过：加密会话不可用，请先解锁 NF', 'info');
        return;
      }

      showToast('自动快照失败，请检查目录', 'error');
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      if (hasCheckedStartupAutoBackup) {
        return;
      }

      hasCheckedStartupAutoBackup = true;
      void runStartupAutoBackup();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const importBackupData = (value: unknown): ImportBackupDataResult => {
    const groupsValue = getStandardSnapshotFieldValue(value, 'groups');
    const accountsValue = getStandardSnapshotFieldValue(value, 'accounts');
    const historyValue = getStandardSnapshotFieldValue(value, 'history');
    const importedAccountData = getBackupAccountData(value);
    const groupsWithAccountsAfterImport = deriveGroupsWithAccounts(
      importedAccountData.groups,
      importedAccountData.accounts
    );
    const importedHistory = getBackupHistory(value, groupsWithAccountsAfterImport);
    const restoreResult = createSnapshotRestoreData({
      currentData: { groups: assetGroups, accounts, history },
      importedAccountData,
      importedHistory,
      snapshotFields: {
        groups: groupsValue,
        accounts: accountsValue,
        history: historyValue
      }
    });
    const snapshotCreatedAt = getSnapshotCreatedAt(value, []);
    const importResult: ImportBackupDataResult = {
      snapshotCreatedAt,
      historyRecordCount: restoreResult.historyRecordCount,
      changedHistoryRecordCount: restoreResult.changedHistoryRecordCount
    };

    if (isExampleMode) {
      updateAppData({
        groups: restoreResult.nextData.groups,
        accounts: restoreResult.nextData.accounts,
        history: restoreResult.nextData.history
      }, { flush: true });
      return importResult;
    }

    updateAppData(restoreResult.nextData, { flush: true });

    return importResult;
  };

  const readImportSnapshotData = async (value: unknown) => {
    if (isEncryptedSnapshotFile(value)) {
      try {
        return decryptSnapshotDocumentWithCurrentSession(value);
      } catch {
        // Historical snapshots may use an older login password.
      }

      const snapshotPassword = await requestInputDialog({
        title: '导入加密快照',
        message: '该快照可能使用创建时的旧登录密码加密',
        label: '创建时密码',
        confirmLabel: '确认导入',
        cancelLabel: '取消导入',
        inputType: 'password',
        autoComplete: 'current-password'
      });

      if (snapshotPassword === null) {
        return null;
      }

      if (snapshotPassword.trim() === '') {
        await showNoticeDialog({
          title: '创建时密码为空',
          message: '请输入创建该快照时的密码'
        });

        return null;
      }

      try {
        return decryptSnapshotDocumentWithPassword(value, snapshotPassword);
      } catch {
        throw new Error(SNAPSHOT_DECRYPTION_ERROR_MESSAGE);
      }
    }

    if (
      isPlainObject(value) &&
      (value.type === 'netraflow-encrypted-snapshot' || isPlainObject(value.encryption))
    ) {
      throw new Error(SNAPSHOT_DECRYPTION_ERROR_MESSAGE);
    }

    return value;
  };

  const importBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (isExampleMode) {
      void showNoticeDialog({
        title: '示例模式下不可导入快照',
        message: '示例模式不会读写真实外部快照文件'
      });
      return;
    }

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      void (async () => {
        try {
          const importContent = await getImportContentAfterIntegrityCheck(
            String(reader.result ?? '')
          );

          if (importContent === null) {
            return;
          }

          if (!isPersistenceCurrent()) {
            return;
          }

          const snapshotData = await readImportSnapshotData(importContent);

          if (snapshotData === null || !isPersistenceCurrent()) {
            return;
          }

          const importResult = importBackupData(snapshotData);
          saveSnapshotImportSuccess(importResult);
          void showNoticeDialog({
            title: '导入快照',
            message: '快照已导入，当前数据已按快照恢复'
          });
        } catch (error) {
          console.error('[NetraFlow snapshot] Failed to import snapshot.', error);
          void showNoticeDialog({
            title: '导入快照失败',
            message:
              error instanceof Error && error.message === SNAPSHOT_DECRYPTION_ERROR_MESSAGE
                ? SNAPSHOT_DECRYPTION_ERROR_MESSAGE
                : error instanceof Error && error.message === SNAPSHOT_INCOMPLETE_ERROR_MESSAGE
                  ? SNAPSHOT_INCOMPLETE_ERROR_MESSAGE
                : '快照文件无法导入，请确认文件内容'
          });
        }
      })();
    };

    reader.onerror = () => {
      void showNoticeDialog({
        title: '读取快照失败',
        message: '快照文件读取失败'
      });
    };
    reader.readAsText(file);
  };

  return {
    lastBackupAt,
    lastBackupHistoryCount,
    backupRecords,
    snapshotImportRecords,
    autoBackupSettings,
    autoBackupDraft,
    autoBackupCycleValueInput,
    setAutoBackupCycleValueInput,
    incrementalRecordValue,
    hasAutoBackupDraftChanges,
    canSaveAutoBackupSettings,
    applyBackupState,
    resetSnapshotImportRecords,
    resetAutoBackupSettings,
    resetAutoBackupDraft,
    updateAutoBackupEnabled,
    updateAutoBackupCycleValue,
    adjustAutoBackupCycleValue,
    updateAutoBackupCycleUnit,
    selectAutoBackupDirectory,
    saveAutoBackupDraft,
    exportBackup,
    importBackup
  };
}
