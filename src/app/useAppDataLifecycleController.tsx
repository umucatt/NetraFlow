import { useRef, useState } from 'react';

import type { AppCallbackConfirmationDialogRequest } from './useAppDialogController';
import type {
  AppData,
  AutoBackupSettings,
  BackupRecord
} from './types';
import type { AssetChartSettings } from '../features/charts';
import type { GlobalSettings } from '../features/security/securitySettingsTypes';
import type { ExampleTemplateId } from '../exampleData';
import {
  cloneBackupRecords,
  createEmptyAppData,
  createExampleDataApplyResult,
  createExampleModeSnapshot,
  createResetConfirmation,
  createRestoredRealDataState,
  getResetActionLabel,
  isResetConfirmationInputValid,
  sanitizeResetConfirmationInput
} from './appDataLifecycleLogic';
import type {
  AppDataLifecycleSnapshot,
  AppDataResetAction,
  AppDataResetConfirmation,
  ExampleGeneratedData
} from './appDataLifecycleTypes';

type UseAppDataLifecycleControllerOptions = {
  appData: AppData;
  backupRecords: BackupRecord[];
  lastBackupAt: string;
  lastBackupHistoryCount: number;
  selectedExampleTemplateId: ExampleTemplateId;
  setSelectedExampleTemplateId: (templateId: ExampleTemplateId) => void;
  isExampleMode: boolean;
  setIsExampleMode: (enabled: boolean) => void;
  defaultGlobalSettings: GlobalSettings;
  defaultAssetChartSettings: AssetChartSettings;
  defaultAutoBackupSettings: AutoBackupSettings;
  setAppData: (data: AppData) => void;
  setGlobalSettings: (settings: GlobalSettings) => void;
  saveGlobalSettings: (settings: GlobalSettings) => void;
  setAssetChartSettings: (settings: AssetChartSettings) => void;
  saveAssetChartSettings: (settings: AssetChartSettings) => void;
  resetAutoBackupSettings: (settings: AutoBackupSettings) => void;
  resetSecurityState: () => void;
  resetDataViews: () => void;
  applyBackupState: (
    records: BackupRecord[],
    lastBackupAt: string,
    lastBackupHistoryCount: number,
    persist: boolean
  ) => void;
  createExampleData: (templateId: ExampleTemplateId) => ExampleGeneratedData;
  loadRealDataSnapshot: () => AppDataLifecycleSnapshot;
  persistAppData: (
    data: AppData,
    options?: { allowEmptyHistoryOverwrite?: boolean }
  ) => void;
  persistEmptyAssetData: () => void;
  showConfirmationDialog: (request: AppCallbackConfirmationDialogRequest) => void;
  completeFirstWelcome: () => void;
  markPendingFirstWelcomeAfterClearAll: () => void;
  cancelPendingFirstWelcomeForRealChange: () => void;
};

export function useAppDataLifecycleController({
  appData,
  backupRecords,
  lastBackupAt,
  lastBackupHistoryCount,
  selectedExampleTemplateId,
  setSelectedExampleTemplateId,
  isExampleMode,
  setIsExampleMode,
  defaultGlobalSettings,
  defaultAssetChartSettings,
  defaultAutoBackupSettings,
  setAppData,
  setGlobalSettings,
  saveGlobalSettings,
  setAssetChartSettings,
  saveAssetChartSettings,
  resetAutoBackupSettings,
  resetSecurityState,
  resetDataViews,
  applyBackupState,
  createExampleData,
  loadRealDataSnapshot,
  persistAppData,
  persistEmptyAssetData,
  showConfirmationDialog,
  completeFirstWelcome,
  markPendingFirstWelcomeAfterClearAll,
  cancelPendingFirstWelcomeForRealChange
}: UseAppDataLifecycleControllerOptions) {
  const realDataBeforeExampleRef = useRef<AppDataLifecycleSnapshot | null>(null);
  const [resetConfirmation, setResetConfirmation] =
    useState<AppDataResetConfirmation>(null);
  const [resetConfirmationInput, setResetConfirmationInputState] = useState('');

  const applyLifecycleSnapshot = (
    snapshot: AppDataLifecycleSnapshot,
    persistBackupState: boolean
  ) => {
    setAppData(snapshot.appData);
    applyBackupState(
      snapshot.backupRecords,
      snapshot.lastBackupAt,
      snapshot.lastBackupHistoryCount,
      persistBackupState
    );
  };

  const applyExampleGeneratedData = (generatedData: ExampleGeneratedData) => {
    resetDataViews();
    applyLifecycleSnapshot(createExampleDataApplyResult(generatedData), false);
  };

  const startExampleMode = (templateId: ExampleTemplateId) => {
    realDataBeforeExampleRef.current = createExampleModeSnapshot({
      appData,
      backupRecords,
      lastBackupAt,
      lastBackupHistoryCount
    });
    setSelectedExampleTemplateId(templateId);
    applyExampleGeneratedData(createExampleData(templateId));
    setIsExampleMode(true);
  };

  const enterExampleMode = () => {
    showConfirmationDialog({
      title: '进入示例模式',
      message: (
        <>
          <p>示例数据不会覆盖你的真实资产数据</p>
          <p>在示例模式中的修改不会保存到真实数据中</p>
          <p>退出示例模式后会恢复进入前的状态</p>
          <strong>是否继续？</strong>
        </>
      ),
      confirmLabel: '确认进入',
      onConfirm: () => startExampleMode(selectedExampleTemplateId)
    });
  };

  const chooseFirstWelcomeStoryRoute = (templateId: ExampleTemplateId) => {
    completeFirstWelcome();
    startExampleMode(templateId);
  };

  const switchExampleTemplate = () => {
    showConfirmationDialog({
      title: '切换示例模板',
      message: (
        <>
          <p>切换示例模板会丢弃当前示例模式中的修改</p>
          <p>系统将重新生成所选模板</p>
          <strong>是否继续？</strong>
        </>
      ),
      confirmLabel: '确认切换',
      onConfirm: () => applyExampleGeneratedData(createExampleData(selectedExampleTemplateId))
    });
  };

  const performExitExampleMode = () => {
    const restoredState = createRestoredRealDataState({
      savedSnapshot: realDataBeforeExampleRef.current,
      loadFallbackSnapshot: loadRealDataSnapshot
    });

    resetDataViews();
    setIsExampleMode(false);
    realDataBeforeExampleRef.current = null;
    applyLifecycleSnapshot(restoredState, false);
  };

  const exitExampleMode = () => {
    if (!isExampleMode) {
      return;
    }

    showConfirmationDialog({
      title: '退出示例模式',
      message: (
        <>
          <p>退出后将离开当前示例模式</p>
          <p>示例模式中的修改不会保留</p>
          <p>系统将恢复到进入示例模式前的真实数据状态</p>
          <strong>确定退出吗？</strong>
        </>
      ),
      confirmLabel: '确认退出',
      onConfirm: performExitExampleMode
    });
  };

  const writeExampleDataToRealData = () => {
    if (!isExampleMode) {
      return false;
    }

    const currentExampleData = createExampleDataApplyResult({
      appData,
      backupRecords,
      lastBackupAt,
      lastBackupHistoryCount
    });

    persistAppData(currentExampleData.appData, { allowEmptyHistoryOverwrite: true });
    applyLifecycleSnapshot(
      {
        ...currentExampleData,
        backupRecords: cloneBackupRecords(backupRecords)
      },
      true
    );
    setIsExampleMode(false);
    realDataBeforeExampleRef.current = null;
    cancelPendingFirstWelcomeForRealChange();

    return true;
  };

  const resetUserConfiguration = () => {
    setGlobalSettings(defaultGlobalSettings);
    saveGlobalSettings(defaultGlobalSettings);
    setAssetChartSettings(defaultAssetChartSettings);
    saveAssetChartSettings(defaultAssetChartSettings);
    resetAutoBackupSettings(defaultAutoBackupSettings);
    resetSecurityState();
  };

  const resetAssetHistory = (persist: boolean) => {
    const emptyData = createEmptyAppData();

    resetDataViews();
    setAppData(emptyData);
    applyBackupState([], '', 0, persist);

    if (persist) {
      persistEmptyAssetData();
    }
  };

  const resetAllData = () => {
    resetUserConfiguration();
    setIsExampleMode(false);
    realDataBeforeExampleRef.current = null;
    resetAssetHistory(true);
    markPendingFirstWelcomeAfterClearAll();
  };

  const openResetConfirmation = (action: AppDataResetAction) => {
    if (isExampleMode) {
      return;
    }

    setResetConfirmation(createResetConfirmation(action));
    setResetConfirmationInputState('');
  };

  const closeResetConfirmation = () => {
    setResetConfirmation(null);
    setResetConfirmationInputState('');
  };

  const setResetConfirmationInput = (value: string) => {
    setResetConfirmationInputState(sanitizeResetConfirmationInput(value));
  };

  const confirmResetAction = () => {
    if (!isResetConfirmationInputValid(resetConfirmation, resetConfirmationInput)) {
      return;
    }

    const action = resetConfirmation?.action;

    closeResetConfirmation();

    if (!action || isExampleMode) {
      return;
    }

    if (action === 'settings') {
      resetUserConfiguration();
      return;
    }

    if (action === 'history') {
      resetAssetHistory(true);
      return;
    }

    resetAllData();
  };

  return {
    selectedExampleTemplateId,
    setSelectedExampleTemplateId,
    isExampleMode,
    resetConfirmation,
    resetConfirmationInput,
    setResetConfirmationInput,
    enterExampleMode,
    switchExampleTemplate,
    exitExampleMode,
    chooseFirstWelcomeStoryRoute,
    writeExampleDataToRealData,
    openResetConfirmation,
    closeResetConfirmation,
    confirmResetAction,
    getResetActionLabel
  };
}
