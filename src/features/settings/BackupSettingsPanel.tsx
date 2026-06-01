import type { ChangeEvent, RefObject } from 'react';
import { EXAMPLE_DATA_SETTINGS_BLOCK_ID } from '../../app/exampleModeNavigation';
import type { ExampleTemplateDefinition, ExampleTemplateId } from '../../exampleData';
import SettingsSectionFrame from './SettingsSectionFrame';

type ResetAction = 'settings' | 'history' | 'all';

export type BackupSettingsPanelProps = {
  userSettingsFileInputRef: RefObject<HTMLInputElement | null>;
  exampleTemplates: ExampleTemplateDefinition[];
  selectedExampleTemplateId: ExampleTemplateId;
  isExampleMode: boolean;
  onImportUserSettings: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportUserSettings: () => void;
  onOpenUserSettingsFile: () => void;
  onOpenBackupPanel: () => void;
  onSelectExampleTemplate: (templateId: ExampleTemplateId) => void;
  onEnterOrSwitchExampleMode: () => void;
  onExitExampleMode: () => void;
  onOpenResetConfirmation: (action: ResetAction) => void;
};

function BackupSettingsPanel({
  userSettingsFileInputRef,
  exampleTemplates,
  selectedExampleTemplateId,
  isExampleMode,
  onImportUserSettings,
  onExportUserSettings,
  onOpenUserSettingsFile,
  onOpenBackupPanel,
  onSelectExampleTemplate,
  onEnterOrSwitchExampleMode,
  onExitExampleMode,
  onOpenResetConfirmation
}: BackupSettingsPanelProps) {
  return (
    <>
      <SettingsSectionFrame title="用户配置文件">
        <input
          ref={userSettingsFileInputRef}
          type="file"
          accept="application/json,.json,.netraflow-settings.json"
          onChange={onImportUserSettings}
          style={{ display: 'none' }}
        />
        <div className="global-settings-button-row">
          <button type="button" onClick={onExportUserSettings}>
            导出用户配置文件
          </button>
          <button type="button" onClick={onOpenUserSettingsFile}>
            导入用户配置文件
          </button>
        </div>
        <p className="global-settings-note">
          用户配置无法对安全功能区的所有设置进行备份/恢复
        </p>
      </SettingsSectionFrame>

      <SettingsSectionFrame title="历史记录备份">
        <button
          type="button"
          className="global-settings-reserved-button"
          onClick={onOpenBackupPanel}
        >
          跳转至快照
        </button>
      </SettingsSectionFrame>

      <SettingsSectionFrame
        id={EXAMPLE_DATA_SETTINGS_BLOCK_ID}
        title="示例数据"
        description={isExampleMode ? '正处于示例模式中' : '未处于示例模式中'}
      >
        <div className="example-template-grid" role="radiogroup" aria-label="示例数据模板">
          {exampleTemplates.map((template) => {
            const isSelected = selectedExampleTemplateId === template.id;

            return (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`example-template-card${isSelected ? ' is-selected' : ''}`}
                onClick={() => onSelectExampleTemplate(template.id)}
              >
                <span className="example-template-card__check" aria-hidden="true" />
                <strong>{template.name}</strong>
                <p>{template.description}</p>
                <span>{template.meta}</span>
              </button>
            );
          })}
        </div>
        <div className="global-settings-button-row">
          <button type="button" onClick={onEnterOrSwitchExampleMode}>
            {isExampleMode ? '切换示例模板' : '进入示例模式'}
          </button>
          <button type="button" disabled={!isExampleMode} onClick={onExitExampleMode}>
            退出示例模式
          </button>
        </div>
      </SettingsSectionFrame>

      <SettingsSectionFrame
        title="重置功能"
        className={`global-settings-field--danger${
          isExampleMode ? ' example-mode-disabled-panel' : ''
        }`}
        ariaDisabled={isExampleMode}
        disabledOverlay={
          isExampleMode ? (
            <div className="example-mode-disabled-panel__banner">示例模式下不可用</div>
          ) : null
        }
      >
        <div className="global-settings-button-row global-settings-button-row--reset">
          <button
            type="button"
            className="global-settings-danger-button"
            onClick={() => onOpenResetConfirmation('settings')}
          >
            清除用户配置
          </button>
          <button
            type="button"
            className="global-settings-danger-button"
            onClick={() => onOpenResetConfirmation('history')}
          >
            清除历史记录
          </button>
          <button
            type="button"
            className="global-settings-danger-button"
            onClick={() => onOpenResetConfirmation('all')}
          >
            清除所有
          </button>
        </div>
      </SettingsSectionFrame>
    </>
  );
}

export default BackupSettingsPanel;
