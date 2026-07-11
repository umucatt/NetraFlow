import { useState } from 'react';

import type { AppCallbackConfirmationDialogRequest } from './useAppDialogController';
import type { AppData, AutoBackupSettings, BackupRecord } from './types';
import type { AssetChartSettings } from '../features/charts';
import type { GlobalSettings } from '../features/security/securitySettingsTypes';
import type { ExampleTemplateId } from '../exampleData';
import {
  createEmptyAppData,
  createResetConfirmation,
  getResetActionLabel,
  isResetConfirmationInputValid,
  sanitizeResetConfirmationInput
} from './appDataLifecycleLogic';
import type { AppDataResetAction, AppDataResetConfirmation } from './appDataLifecycleTypes';

type UseAppDataLifecycleControllerOptions = {
  selectedExampleTemplateId: ExampleTemplateId;
  setSelectedExampleTemplateId: (templateId: ExampleTemplateId) => void;
  isExampleMode: boolean;
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
  resetSnapshotImportRecords: (persist: boolean) => void;
  persistEmptyAssetData: () => void;
  startExampleModeSession: (templateId: ExampleTemplateId) => boolean;
  switchExampleModeSession: (templateId: ExampleTemplateId) => boolean;
  exitExampleModeSession: () => boolean;
  writeTestDataToRealData: () => boolean;
  showConfirmationDialog: (request: AppCallbackConfirmationDialogRequest) => void;
  clearAllLocalDataAndQuit: () => void;
};

export function useAppDataLifecycleController({
  selectedExampleTemplateId,
  setSelectedExampleTemplateId,
  isExampleMode,
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
  resetSnapshotImportRecords,
  persistEmptyAssetData,
  startExampleModeSession,
  switchExampleModeSession,
  exitExampleModeSession,
  writeTestDataToRealData,
  showConfirmationDialog,
  clearAllLocalDataAndQuit
}: UseAppDataLifecycleControllerOptions) {
  const [resetConfirmation, setResetConfirmation] =
    useState<AppDataResetConfirmation>(null);
  const [resetConfirmationInput, setResetConfirmationInputState] = useState('');

  const enterExampleMode = () => {
    showConfirmationDialog({
      title: '进入示例模式',
      message: (
        <>
          <p>示例数据不会覆盖你的真实资产数据</p>
          <p>示例模式中的修改只保存在本次示例环境中</p>
          <p>退出示例模式后会重新读取真实数据</p>
          <strong>是否继续？</strong>
        </>
      ),
      confirmLabel: '确认进入',
      onConfirm: () => {
        resetDataViews();
        startExampleModeSession(selectedExampleTemplateId);
      }
    });
  };

  const chooseFirstWelcomeStoryRoute = (templateId: ExampleTemplateId) => {
    resetDataViews();
    startExampleModeSession(templateId);
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
      onConfirm: () => {
        resetDataViews();
        switchExampleModeSession(selectedExampleTemplateId);
      }
    });
  };

  const performExitExampleMode = () => {
    resetDataViews();
    exitExampleModeSession();
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
          <p>系统将重新读取真实数据</p>
          <strong>确定退出吗？</strong>
        </>
      ),
      confirmLabel: '确认退出',
      onConfirm: performExitExampleMode
    });
  };

  const writeExampleDataToRealData = () => {
    resetDataViews();
    return writeTestDataToRealData();
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
    resetSnapshotImportRecords(persist);

    if (persist) {
      persistEmptyAssetData();
    }
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

    clearAllLocalDataAndQuit();
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
