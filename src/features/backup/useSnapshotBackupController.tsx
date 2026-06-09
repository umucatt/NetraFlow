import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';

import { getValidTimestamp } from '../../app/dateUtils';
import { deriveGroupsWithAccounts } from '../../app/accountData';
import type {
  Account,
  AppData,
  AssetGroup,
  AssetGroupWithAccounts,
  AutoBackupSettings,
  BackupCycleUnit,
  BackupMethod,
  BackupRecord,
  HistoryRecord
} from '../../app/types';
import { verifyPassword } from '../../security/passwordHash';
import {
  SNAPSHOT_DECRYPTION_ERROR_MESSAGE,
  decryptSnapshotPayload,
  isEncryptedSnapshotFile
} from '../../security/snapshotCrypto';
import type { GlobalSettings } from '../security/securitySettingsTypes';
import {
  areAutoBackupSettingsEqual,
  clearLastBackupAt,
  consumeAutoBackupDueOnce,
  createBackupFileContent,
  createBackupPayload,
  createSnapshotRestoreData,
  DEFAULT_AUTO_BACKUP_SETTINGS,
  getBackupFileName,
  hasBackupRecordMissingIncrementCount,
  loadAutoBackupSettings,
  loadBackupRecords,
  loadSnapshotImportRecords,
  loadLastBackupAt,
  loadLastBackupHistoryCount,
  mergeBackupRecords,
  mergeSnapshotImportRecords,
  normalizeAutoBackupSettings,
  normalizeBackupRecords,
  SNAPSHOT_INCOMPLETE_ERROR_MESSAGE,
  saveSnapshotImportRecords,
  saveAutoBackupSettings,
  saveBackupRecords,
  saveLastBackupAt,
  saveLastBackupHistoryCount,
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

type SnapshotBackupControllerOptions = {
  productName: string;
  assetGroups: AssetGroup[];
  accounts: Account[];
  history: HistoryRecord[];
  isExampleMode: boolean;
  globalSettings: GlobalSettings;
  updateAppData: (nextData: AppData) => void;
  cancelPendingFirstWelcomeForRealChange: () => void;
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
  updateAppData,
  cancelPendingFirstWelcomeForRealChange,
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
  const [lastBackupAt, setLastBackupAt] = useState(loadLastBackupAt);
  const [lastBackupHistoryCount, setLastBackupHistoryCount] = useState(() =>
    loadLastBackupHistoryCount(history.length)
  );
  const [backupRecords, setBackupRecords] = useState(loadBackupRecords);
  const [snapshotImportRecords, setSnapshotImportRecords] = useState(
    loadSnapshotImportRecords
  );
  const [autoBackupSettings, setAutoBackupSettings] = useState(loadAutoBackupSettings);
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

  useEffect(() => {
    if (hasBackupRecordMissingIncrementCount()) {
      saveBackupRecords(backupRecords);
    }
  }, []);

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

    saveBackupRecords(normalizedRecords);

    if (nextLastBackupAt) {
      saveLastBackupAt(nextLastBackupAt);
    } else {
      clearLastBackupAt();
    }

    saveLastBackupHistoryCount(normalizedHistoryCount);
  };

  const resetAutoBackupSettings = (
    nextSettings: AutoBackupSettings = DEFAULT_AUTO_BACKUP_SETTINGS
  ) => {
    const normalizedSettings = normalizeAutoBackupSettings(nextSettings);

    setAutoBackupSettings(normalizedSettings);
    setAutoBackupDraft(normalizedSettings);
    setAutoBackupCycleValueInput(String(normalizedSettings.cycle.value));
    saveAutoBackupSettings(normalizedSettings);
  };

  const resetSnapshotImportRecords = (persist: boolean) => {
    setSnapshotImportRecords([]);

    if (persist) {
      saveSnapshotImportRecords([]);
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
        title: '自动快照将使用快照密码加密',
        message: (
          <>
            <p>忘记快照密码将无法恢复自动生成的加密快照</p>
            <strong>是否继续？</strong>
          </>
        ),
        confirmLabel: '继续开启'
      }).then((shouldContinue) => {
        if (!shouldContinue) {
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

      if (!selectedDirectory) {
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
    saveAutoBackupSettings(nextSettings);
    cancelPendingFirstWelcomeForRealChange();
  };

  const createBackupRecord = (backedUpAt: string, method: BackupMethod): BackupRecord => ({
    id: createId('backup-record'),
    backedUpAt,
    historyCount: history.length,
    incrementCount: Math.max(0, history.length - lastBackupHistoryCount),
    method
  });

  const requestVerifiedSnapshotPassword = async (
    promptMessage: string,
    invalidMessage = '快照密码不正确',
    snapshotPasswordHash = globalSettings.snapshotPasswordHash
  ) => {
    if (!snapshotPasswordHash) {
      await showNoticeDialog({
        title: '快照密码未设置',
        message: '请先设置快照密码'
      });

      return null;
    }

    const snapshotPassword = await requestInputDialog({
      title: '输入快照密码',
      message: promptMessage,
      label: '快照密码',
      confirmLabel: '确认',
      cancelLabel: '取消',
      inputType: 'password',
      autoComplete: 'current-password'
    });

    if (snapshotPassword === null) {
      return null;
    }

    if (snapshotPassword.trim() === '') {
      await showNoticeDialog({
        title: '快照密码为空',
        message: '请输入快照密码'
      });

      return null;
    }

    const isPasswordValid = await verifyPassword(snapshotPassword, snapshotPasswordHash);

    if (!isPasswordValid) {
      await showNoticeDialog({
        title: '快照密码错误',
        message: invalidMessage
      });

      return null;
    }

    return snapshotPassword;
  };

  const saveBackupSuccess = (backupRecord: BackupRecord, nextBackupRecords: BackupRecord[]) => {
    clearSearchNavigation();
    setBackupRecords(nextBackupRecords);
    setLastBackupAt(backupRecord.backedUpAt);
    setLastBackupHistoryCount(backupRecord.historyCount);

    if (isExampleMode) {
      return;
    }

    saveBackupRecords(nextBackupRecords);
    saveLastBackupAt(backupRecord.backedUpAt);
    saveLastBackupHistoryCount(backupRecord.historyCount);
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
    saveSnapshotImportRecords(nextSnapshotImportRecords);
  };

  const exportBackup = async () => {
    const api = window.electronAPI ?? window.electronWindow;
    let snapshotPassword: string | null = null;

    if (!api?.selectDirectory || !api?.writeSnapshotFile) {
      void showNoticeDialog({
        title: '导出快照失败',
        message: '当前环境不支持导出快照'
      });
      return;
    }

    if (globalSettings.snapshotEncryptionEnabled) {
      snapshotPassword = await requestVerifiedSnapshotPassword(
        '已启用快照加密，导出的快照文件将使用快照密码加密。请输入快照密码，用于加密本次导出的快照'
      );

      if (!snapshotPassword) {
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

    if (!selectedDirectory) {
      return;
    }

    const backupAt = new Date().toISOString();
    const backupRecord = createBackupRecord(backupAt, 'manual');
    const nextBackupRecords = mergeBackupRecords(backupRecords, [backupRecord]);
    const backupPayload = createBackupPayload({
      productName,
      backupAt,
      backupRecord,
      nextBackupRecords,
      autoBackupSettings,
      groups: assetGroups,
      accounts,
      history
    });
    let fileContent = '';

    try {
      fileContent = await createBackupFileContent(backupPayload, snapshotPassword);
    } catch (error) {
      console.error('[NetraFlow snapshot] Failed to encrypt manual snapshot.', error);
      void showNoticeDialog({
        title: '导出快照失败',
        message: '快照加密失败，请稍后再试'
      });
      return;
    }

    try {
      await api.writeSnapshotFile({
        directory: selectedDirectory,
        fileName: getBackupFileName(backupAt, snapshotPassword !== null),
        content: fileContent
      });
      saveBackupSuccess(backupRecord, nextBackupRecords);
      void showNoticeDialog({
        title: '导出快照',
        message: snapshotPassword !== null ? '加密快照文件已导出' : '快照文件已导出'
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
    const settings = loadAutoBackupSettings();
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
      loadLastBackupAt(),
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

    let snapshotPassword: string | null = null;

    if (currentGlobalSettings.snapshotEncryptionEnabled) {
      snapshotPassword = await requestVerifiedSnapshotPassword(
        '自动快照文件将使用快照密码加密，请输入快照密码',
        '自动快照已跳过：快照密码不正确',
        currentGlobalSettings.snapshotPasswordHash
      );

      if (!snapshotPassword) {
        showToast('自动快照已跳过', 'info');
        return;
      }
    }

    const progressToastId = showToast('自动备份进行中');
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 120);
    });

    const backupAt = new Date().toISOString();
    const backupRecord = createBackupRecord(backupAt, 'auto');
    const latestBackupRecords = loadBackupRecords();
    const nextBackupRecords = mergeBackupRecords(latestBackupRecords, [backupRecord]);
    const backupPayload = createBackupPayload({
      productName,
      backupAt,
      backupRecord,
      nextBackupRecords,
      autoBackupSettings: settings,
      groups: assetGroups,
      accounts,
      history
    });
    let fileContent = '';

    try {
      fileContent = await createBackupFileContent(backupPayload, snapshotPassword);
      await api.writeSnapshotFile({
        directory,
        fileName: getBackupFileName(backupAt, snapshotPassword !== null),
        content: fileContent
      });
      dismissToast(progressToastId);
      saveBackupSuccess(backupRecord, nextBackupRecords);
      setAutoBackupSettings(settings);
      setAutoBackupDraft(settings);
      setAutoBackupCycleValueInput(String(settings.cycle.value));
      showToast('自动备份完成', 'success');
    } catch (error) {
      console.error('[NetraFlow snapshot] Auto snapshot failed.', error);
      dismissToast(progressToastId);
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
    const backupRecordsValue = getBackupFieldValue(value, ['backupRecords']);
    const hasImportedBackupRecords = backupRecordsValue !== undefined;
    const importedBackupRecords = normalizeBackupRecords(
      backupRecordsValue
    );
    const snapshotCreatedAt = getSnapshotCreatedAt(value, importedBackupRecords);
    const importResult: ImportBackupDataResult = {
      snapshotCreatedAt,
      historyRecordCount: restoreResult.historyRecordCount,
      changedHistoryRecordCount: restoreResult.changedHistoryRecordCount
    };

    if (isExampleMode) {
      const importedLastBackupAt = getBackupFieldValue(value, ['lastBackupAt']);
      const importedLastBackupHistoryCount = getBackupFieldValue(value, [
        'lastBackupHistoryCount'
      ]);
      const importedHistoryCountNumber =
        typeof importedLastBackupHistoryCount === 'number'
          ? importedLastBackupHistoryCount
          : typeof importedLastBackupHistoryCount === 'string'
            ? Number(importedLastBackupHistoryCount)
            : NaN;

      updateAppData({
        groups: restoreResult.nextData.groups,
        accounts: restoreResult.nextData.accounts,
        history: restoreResult.nextData.history
      });
      applyBackupState(
        hasImportedBackupRecords ? importedBackupRecords : backupRecords,
        typeof importedLastBackupAt === 'string' &&
          getValidTimestamp(importedLastBackupAt) !== null
          ? importedLastBackupAt
          : lastBackupAt,
        Number.isFinite(importedHistoryCountNumber)
          ? Math.max(0, Math.floor(importedHistoryCountNumber))
          : restoreResult.nextData.history.length,
        false
      );
      return importResult;
    }

    updateAppData(restoreResult.nextData);

    const importedLastBackupAt = getBackupFieldValue(value, ['lastBackupAt']);

    if (
      typeof importedLastBackupAt === 'string' &&
      getValidTimestamp(importedLastBackupAt) !== null
    ) {
      setLastBackupAt(importedLastBackupAt);
      saveLastBackupAt(importedLastBackupAt);
    }

    const importedLastBackupHistoryCount = getBackupFieldValue(value, [
      'lastBackupHistoryCount'
    ]);
    const importedHistoryCountNumber =
      typeof importedLastBackupHistoryCount === 'number'
        ? importedLastBackupHistoryCount
        : typeof importedLastBackupHistoryCount === 'string'
          ? Number(importedLastBackupHistoryCount)
          : NaN;

    const nextHistoryCount = Number.isFinite(importedHistoryCountNumber)
      ? Math.max(0, Math.floor(importedHistoryCountNumber))
      : restoreResult.nextData.history.length;

    setLastBackupHistoryCount(nextHistoryCount);
    saveLastBackupHistoryCount(nextHistoryCount);

    if (hasImportedBackupRecords) {
      setBackupRecords(importedBackupRecords);
      saveBackupRecords(importedBackupRecords);
    }

    const importedAutoBackupSettings = getBackupFieldValue(value, ['autoBackupSettings']);

    if (importedAutoBackupSettings !== undefined) {
      const nextAutoBackupSettings = normalizeAutoBackupSettings(importedAutoBackupSettings);

      setAutoBackupSettings(nextAutoBackupSettings);
      setAutoBackupDraft(nextAutoBackupSettings);
      setAutoBackupCycleValueInput(String(nextAutoBackupSettings.cycle.value));
      saveAutoBackupSettings(nextAutoBackupSettings);
    }

    return importResult;
  };

  const readImportSnapshotData = async (value: unknown) => {
    if (isEncryptedSnapshotFile(value)) {
      const snapshotPassword = await requestInputDialog({
        title: '导入加密快照',
        message: '该快照已加密，请输入快照密码',
        label: '快照密码',
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
          title: '快照密码为空',
          message: '请输入快照密码'
        });

        return null;
      }

      return decryptSnapshotPayload(value, snapshotPassword);
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

          const snapshotData = await readImportSnapshotData(importContent);

          if (snapshotData === null) {
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
