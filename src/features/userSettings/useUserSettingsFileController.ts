import type { ChangeEvent, ReactNode } from 'react';

import { createJsonPayloadExportText } from '../../app/jsonIntegrity';
import type {
  GlobalSettings,
  ThemeStyle
} from '../security/securitySettingsTypes';
import {
  createUserSettingsExportPayload,
  getUserSettingsFileName,
  readImportedUserSettings
} from './userSettingsFileLogic';

type NoticeRequest = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
};

type UserSettingsFileControllerOptions<TAssetChartSettings> = {
  globalSettings: GlobalSettings;
  effectiveThemeStyle: ThemeStyle;
  assetChartSettings: TAssetChartSettings;
  normalizeAssetChartSettings: (value: unknown) => TAssetChartSettings;
  updateGlobalSettings: (
    createNextSettings: (currentSettings: GlobalSettings) => GlobalSettings
  ) => void;
  setAssetChartSettings: (settings: TAssetChartSettings) => void;
  saveAssetChartSettings: (settings: TAssetChartSettings) => void;
  getImportContentAfterIntegrityCheck: (text: string) => Promise<unknown | null>;
  showNoticeDialog: (request: NoticeRequest) => Promise<void>;
};

export function useUserSettingsFileController<TAssetChartSettings>({
  globalSettings,
  effectiveThemeStyle,
  assetChartSettings,
  normalizeAssetChartSettings,
  updateGlobalSettings,
  setAssetChartSettings,
  saveAssetChartSettings,
  getImportContentAfterIntegrityCheck,
  showNoticeDialog
}: UserSettingsFileControllerOptions<TAssetChartSettings>) {
  const exportUserSettings = async () => {
    const api = window.electronAPI ?? window.electronWindow;
    const exportedAt = new Date();
    let selectedDirectory = '';
    let fileContent = '';

    if (!api?.selectDirectory || !api?.writeJsonFile) {
      void showNoticeDialog({
        title: '导出用户配置失败',
        message: '当前环境不支持写入用户配置文件'
      });
      return;
    }

    try {
      selectedDirectory = await api.selectDirectory();
    } catch (error) {
      console.error('[NetraFlow settings] Failed to select user settings directory.', error);
      void showNoticeDialog({
        title: '导出用户配置失败',
        message: '目录选择失败，请稍后再试'
      });
      return;
    }

    if (!selectedDirectory) {
      return;
    }

    try {
      fileContent = await createJsonPayloadExportText(
        createUserSettingsExportPayload({
          globalSettings,
          effectiveThemeStyle,
          assetChartSettings,
          normalizeAssetChartSettings,
          exportedAt
        })
      );
    } catch (error) {
      console.error('[NetraFlow settings] Failed to prepare user settings export.', error);
      void showNoticeDialog({
        title: '导出用户配置失败',
        message: '用户配置文件无法生成，请稍后再试'
      });
      return;
    }

    try {
      await api.writeJsonFile({
        directory: selectedDirectory,
        fileName: getUserSettingsFileName(exportedAt),
        content: fileContent
      });
      void showNoticeDialog({
        title: '导出用户配置',
        message: '用户配置文件已导出'
      });
    } catch (error) {
      console.error('[NetraFlow settings] Failed to export user settings.', error);
      void showNoticeDialog({
        title: '导出用户配置失败',
        message: '用户配置文件写入失败，请检查目录'
      });
    }
  };

  const importUserSettings = (event: ChangeEvent<HTMLInputElement>) => {
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

          const importedSettings = readImportedUserSettings({
            value: importContent,
            currentGlobalSettings: globalSettings,
            normalizeAssetChartSettings
          });

          updateGlobalSettings(() => importedSettings.globalSettings);

          if (importedSettings.assetChartSettings !== undefined) {
            setAssetChartSettings(importedSettings.assetChartSettings);
            saveAssetChartSettings(importedSettings.assetChartSettings);
          }

          void showNoticeDialog({
            title: '导入用户配置',
            message: '用户配置文件已导入'
          });
        } catch (error) {
          console.error('[NetraFlow settings] Failed to import user settings.', error);
          void showNoticeDialog({
            title: '导入用户配置失败',
            message: '用户配置文件无法导入，请确认文件内容'
          });
        }
      })();
    };

    reader.onerror = () => {
      void showNoticeDialog({
        title: '读取用户配置失败',
        message: '用户配置文件读取失败'
      });
    };
    reader.readAsText(file);
  };

  return {
    exportUserSettings,
    importUserSettings
  };
}
