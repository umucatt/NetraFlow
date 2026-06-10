import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
  StructureAssetDisplay,
  TrendAssetDisplay,
  TrendPointValueMode,
  TrendXAxisRange
} from '../charts';
import AboutNetraFlowPanel from './AboutNetraFlowPanel';
import AppearanceSettingsPanel from './AppearanceSettingsPanel';
import BackupSettingsPanel from './BackupSettingsPanel';
import SearchSettingsPanel from './SearchSettingsPanel';
import {
  CatIdleIcon,
  CatPettedNyaaIcon
} from '../../assets/icons';
import NfSvgIcon from '../../components/NfSvgIcon';
import {
  SettingsActionRow,
  SettingsControlRow,
  SettingsFieldGroup,
  SettingsSegmentedControl
} from './SettingsSectionFrame';
import {
  EASTER_CAT_FRAME_SIZE_PX,
  EASTER_CAT_INITIAL_REVEAL_OFFSET,
  resolveEasterCatRevealOffsetAfterResize,
  resolveEasterCatRevealOffsetAfterWheel,
  resetEasterCatRevealOffset
} from './easterCatRevealLogic';
import { GLOBAL_SETTINGS_NAV_ITEMS } from './settingsSectionLogic';
import type {
  SettingsNavigationPanelProps,
  SettingsPageProps
} from './settingsPageTypes';

type SettingsEasterCatStyle = CSSProperties & {
  '--settings-easter-cat-frame-size': string;
  '--settings-easter-cat-reveal-offset': string;
};

function SettingsSecurityPanel({
  globalSettings,
  autoLockMinutesInput,
  onPasswordProtectionChange,
  onOpenPasswordEditor,
  onAutoLockMinutesInputChange,
  onResetInvalidAutoLockMinutesInput,
  onSnapshotEncryptionChange,
  onOpenSnapshotPasswordEditor
}: Pick<
  SettingsPageProps,
  | 'globalSettings'
  | 'autoLockMinutesInput'
  | 'onPasswordProtectionChange'
  | 'onOpenPasswordEditor'
  | 'onAutoLockMinutesInputChange'
  | 'onResetInvalidAutoLockMinutesInput'
  | 'onSnapshotEncryptionChange'
  | 'onOpenSnapshotPasswordEditor'
>) {
  return (
    <>
      <SettingsFieldGroup title="登陆密码保护">
        <SettingsControlRow
          label="是否开启登陆密码保护"
          options={[
            { value: 'yes', label: '是' },
            { value: 'no', label: '否' }
          ]}
          currentValue={globalSettings.passwordProtectionEnabled ? 'yes' : 'no'}
          onChange={onPasswordProtectionChange}
        />
        <SettingsActionRow label="设置登录密码">
          <button
            type="button"
            className="global-settings-reserved-button"
            onClick={onOpenPasswordEditor}
          >
            {globalSettings.passwordHash ? '修改登录密码' : '设置登录密码'}
          </button>
        </SettingsActionRow>
        <SettingsActionRow label="自动锁定时间">
          <label className="global-settings-inline-input">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={autoLockMinutesInput}
              onChange={(event) => onAutoLockMinutesInputChange(event.target.value)}
              onBlur={onResetInvalidAutoLockMinutesInput}
            />
            <span>分钟</span>
          </label>
        </SettingsActionRow>
        {!globalSettings.passwordProtectionEnabled ? (
          <p className="global-settings-note">开启密码保护后生效</p>
        ) : null}
      </SettingsFieldGroup>

      <SettingsFieldGroup
        title="快照加密"
        note="仅加密手动导出和自动生成的快照文件，不加密本地当前数据。"
      >
        <SettingsControlRow
          label="是否启用快照加密"
          options={[
            { value: 'yes', label: '是' },
            { value: 'no', label: '否' }
          ]}
          currentValue={globalSettings.snapshotEncryptionEnabled ? 'yes' : 'no'}
          onChange={onSnapshotEncryptionChange}
        />
        <SettingsActionRow label="设置快照密码">
          <button
            type="button"
            className="global-settings-reserved-button"
            onClick={onOpenSnapshotPasswordEditor}
          >
            {globalSettings.snapshotPasswordHash ? '修改快照密码' : '设置快照密码'}
          </button>
        </SettingsActionRow>
      </SettingsFieldGroup>
    </>
  );
}

function SettingsChartsPanel({
  globalSettings,
  assetChartSettings,
  onChartColorAssignmentModeChange,
  onGlobalChartControlModeChange,
  onUpdateAssetChartSettings,
  onUpdateHomeThumbnailChartSettings,
  onUpdateGlobalCategoryDetailChartSettings
}: Pick<
  SettingsPageProps,
  | 'globalSettings'
  | 'assetChartSettings'
  | 'onChartColorAssignmentModeChange'
  | 'onGlobalChartControlModeChange'
  | 'onUpdateAssetChartSettings'
  | 'onUpdateHomeThumbnailChartSettings'
  | 'onUpdateGlobalCategoryDetailChartSettings'
>) {
  return (
    <>
      <SettingsSegmentedControl
        label="图表配色遵循"
        options={[
          { value: 'createdAt', label: '创建时间优先（固定）' },
          { value: 'share', label: '占比优先（动态）' }
        ]}
        currentValue={globalSettings.chartColorAssignmentMode}
        onChange={onChartColorAssignmentModeChange}
        statusLabel={null}
      />

      <SettingsFieldGroup title="首页缩略图表">
        <SettingsControlRow
          label="资产结构显示"
          options={[
            { value: 'on', label: '开' },
            { value: 'off', label: '关' }
          ]}
          currentValue={assetChartSettings.l0.showStructure ? 'on' : 'off'}
          onChange={(value) =>
            onUpdateHomeThumbnailChartSettings((currentSettings) => ({
              ...currentSettings,
              showStructure: value === 'on'
            }))
          }
        />
        <SettingsControlRow
          label="资产趋势显示"
          options={[
            { value: 'on', label: '开' },
            { value: 'off', label: '关' }
          ]}
          currentValue={assetChartSettings.l0.showTrend ? 'on' : 'off'}
          onChange={(value) =>
            onUpdateHomeThumbnailChartSettings((currentSettings) => ({
              ...currentSettings,
              showTrend: value === 'on'
            }))
          }
        />
        <SettingsControlRow
          label="横轴范围显示"
          options={[
            { value: '1m', label: '近 1 月' },
            { value: '3m', label: '近 3 月' },
            { value: '6m', label: '近 6 月' },
            { value: '1y', label: '近 1 年' }
          ]}
          currentValue={assetChartSettings.l0.xAxisRange}
          onChange={(value) =>
            onUpdateHomeThumbnailChartSettings((currentSettings) => ({
              ...currentSettings,
              xAxisRange: value as TrendXAxisRange
            }))
          }
        />
      </SettingsFieldGroup>

      <SettingsFieldGroup title="全局图表控制">
        <SettingsControlRow
          label="控制模式"
          options={[
            { value: 'peer', label: '平级设定' },
            { value: 'locked', label: '全局锁定' }
          ]}
          currentValue={assetChartSettings.globalChartControlMode}
          onChange={onGlobalChartControlModeChange}
        />
      </SettingsFieldGroup>

      <SettingsFieldGroup title="总资产图表设置">
        <SettingsControlRow
          label="资产结构显示"
          options={[
            { value: 'positive', label: '正资产' },
            { value: 'negative', label: '负资产' },
            { value: 'both', label: '正负资产' }
          ]}
          currentValue={assetChartSettings.structure.assetDisplay}
          onChange={(value) =>
            onUpdateAssetChartSettings((currentSettings) => ({
              ...currentSettings,
              structure: {
                ...currentSettings.structure,
                assetDisplay: value as StructureAssetDisplay
              }
            }))
          }
        />
        <SettingsControlRow
          label="多重叠加数字"
          options={[
            { value: 'yes', label: '是' },
            { value: 'no', label: '否' }
          ]}
          currentValue={assetChartSettings.structure.showDebtMultiple ? 'yes' : 'no'}
          onChange={(value) =>
            onUpdateAssetChartSettings((currentSettings) => ({
              ...currentSettings,
              structure: {
                ...currentSettings.structure,
                showDebtMultiple: value === 'yes'
              }
            }))
          }
        />
        <div className="global-settings-divider" aria-hidden="true" />
        <SettingsControlRow
          label="资产趋势显示"
          options={[
            { value: 'net', label: '净资产' },
            { value: 'positive', label: '正资产' },
            { value: 'positive-negative', label: '正负资产' }
          ]}
          currentValue={assetChartSettings.trend.assetDisplay}
          onChange={(value) =>
            onUpdateAssetChartSettings((currentSettings) => ({
              ...currentSettings,
              trend: {
                ...currentSettings.trend,
                assetDisplay: value as TrendAssetDisplay
              }
            }))
          }
        />
        <SettingsControlRow
          label="纵轴范围"
          options={[
            { value: 'dynamic', label: '动态范围' },
            { value: 'baseline', label: '基准范围' }
          ]}
          currentValue={assetChartSettings.trend.adaptiveYAxis ? 'dynamic' : 'baseline'}
          onChange={(value) =>
            onUpdateAssetChartSettings((currentSettings) => ({
              ...currentSettings,
              trend: {
                ...currentSettings.trend,
                adaptiveYAxis: value === 'dynamic'
              }
            }))
          }
        />
        <SettingsControlRow
          label="横轴范围显示"
          options={[
            { value: '1m', label: '近 1 月' },
            { value: '3m', label: '近 3 月' },
            { value: '6m', label: '近 6 月' },
            { value: '1y', label: '近 1 年' }
          ]}
          currentValue={assetChartSettings.trend.xAxisRange}
          onChange={(value) =>
            onUpdateAssetChartSettings((currentSettings) => ({
              ...currentSettings,
              trend: {
                ...currentSettings.trend,
                xAxisRange: value as TrendXAxisRange
              }
            }))
          }
        />
        <SettingsControlRow
          label="点值显示"
          options={[
            { value: 'adaptive', label: '自适应' },
            { value: 'minmax', label: '最高最低' },
            { value: 'none', label: '不显示' }
          ]}
          currentValue={assetChartSettings.trend.pointValueMode}
          onChange={(value) =>
            onUpdateAssetChartSettings((currentSettings) => ({
              ...currentSettings,
              trend: {
                ...currentSettings.trend,
                pointValueMode: value as TrendPointValueMode
              }
            }))
          }
        />
      </SettingsFieldGroup>

      <SettingsFieldGroup title="全局账户类型图表设置">
        <SettingsControlRow
          label="横轴范围显示"
          options={[
            { value: '1m', label: '近 1 月' },
            { value: '3m', label: '近 3 月' },
            { value: '6m', label: '近 6 月' },
            { value: '1y', label: '近 1 年' }
          ]}
          currentValue={assetChartSettings.globalCategoryDetail.xAxisRange}
          onChange={(value) =>
            onUpdateGlobalCategoryDetailChartSettings((currentSettings) => ({
              ...currentSettings,
              xAxisRange: value as TrendXAxisRange
            }))
          }
        />
        <SettingsControlRow
          label="点值显示"
          options={[
            { value: 'adaptive', label: '自适应' },
            { value: 'minmax', label: '最高最低' },
            { value: 'none', label: '不显示' }
          ]}
          currentValue={assetChartSettings.globalCategoryDetail.pointValueMode}
          onChange={(value) =>
            onUpdateGlobalCategoryDetailChartSettings((currentSettings) => ({
              ...currentSettings,
              pointValueMode: value as TrendPointValueMode
            }))
          }
        />
      </SettingsFieldGroup>
    </>
  );
}

function renderSettingsContent(props: SettingsPageProps) {
  if (props.section === 'appearance') {
    return (
      <AppearanceSettingsPanel
        positiveNegativeColorMode={props.globalSettings.positiveNegativeColorMode}
        homeAssetStatMetric={props.globalSettings.homeAssetStatMetric}
        homeAssetStatLabelMode={props.globalSettings.homeAssetStatLabelMode}
        homeAssetStatCompact={props.globalSettings.homeAssetStatCompact}
        themeMode={props.globalSettings.themeMode}
        themeStyle={props.globalSettings.themeStyle}
        nyaaThemeUnlocked={props.globalSettings.nyaaThemeUnlocked}
        mainContentPosition={props.globalSettings.mainContentPosition}
        pagePositionMemoryMode={props.globalSettings.pagePositionMemoryMode}
        onPositiveNegativeColorModeChange={props.onPositiveNegativeColorModeChange}
        onHomeAssetStatMetricChange={props.onHomeAssetStatMetricChange}
        onHomeAssetStatLabelModeChange={props.onHomeAssetStatLabelModeChange}
        onHomeAssetStatCompactChange={props.onHomeAssetStatCompactChange}
        onThemeModeChange={props.onThemeModeChange}
        onThemeStyleChange={props.onThemeStyleChange}
        onMainContentPositionChange={props.onMainContentPositionChange}
        onPagePositionMemoryModeChange={props.onPagePositionMemoryModeChange}
      />
    );
  }

  if (props.section === 'charts') {
    return (
      <SettingsChartsPanel
        globalSettings={props.globalSettings}
        assetChartSettings={props.assetChartSettings}
        onChartColorAssignmentModeChange={props.onChartColorAssignmentModeChange}
        onGlobalChartControlModeChange={props.onGlobalChartControlModeChange}
        onUpdateAssetChartSettings={props.onUpdateAssetChartSettings}
        onUpdateHomeThumbnailChartSettings={props.onUpdateHomeThumbnailChartSettings}
        onUpdateGlobalCategoryDetailChartSettings={
          props.onUpdateGlobalCategoryDetailChartSettings
        }
      />
    );
  }

  if (props.section === 'search') {
    return (
      <SearchSettingsPanel
        searchLogicMode={props.globalSettings.searchLogicMode}
        onSearchLogicModeChange={props.onSearchLogicModeChange}
      />
    );
  }

  if (props.section === 'security') {
    return (
      <SettingsSecurityPanel
        globalSettings={props.globalSettings}
        autoLockMinutesInput={props.autoLockMinutesInput}
        onPasswordProtectionChange={props.onPasswordProtectionChange}
        onOpenPasswordEditor={props.onOpenPasswordEditor}
        onAutoLockMinutesInputChange={props.onAutoLockMinutesInputChange}
        onResetInvalidAutoLockMinutesInput={props.onResetInvalidAutoLockMinutesInput}
        onSnapshotEncryptionChange={props.onSnapshotEncryptionChange}
        onOpenSnapshotPasswordEditor={props.onOpenSnapshotPasswordEditor}
      />
    );
  }

  if (props.section === 'backup') {
    return (
      <BackupSettingsPanel
        userSettingsFileInputRef={props.userSettingsFileInputRef}
        exampleTemplates={props.exampleTemplates}
        selectedExampleTemplateId={props.selectedExampleTemplateId}
        isExampleMode={props.isExampleMode}
        onImportUserSettings={props.onImportUserSettings}
        onExportUserSettings={props.onExportUserSettings}
        onOpenUserSettingsFile={() => props.userSettingsFileInputRef.current?.click()}
        onOpenBackupPanel={props.onOpenBackupPanel}
        onSelectExampleTemplate={props.onSelectExampleTemplate}
        onEnterOrSwitchExampleMode={props.onEnterOrSwitchExampleMode}
        onExitExampleMode={props.onExitExampleMode}
        onOpenResetConfirmation={props.onOpenResetConfirmation}
      />
    );
  }

  return (
    <AboutNetraFlowPanel
      appVersion={props.appVersion}
      productIconPath={props.productIconPath}
      productNameZh={props.productNameZh}
      productNameEn={props.productNameEn}
      onOpenBilibili={props.onOpenBilibili}
      onOpenGithubReleases={props.onOpenGithubReleases}
      onStartVersionLongPress={props.onStartVersionLongPress}
      onClearVersionLongPress={props.onClearVersionLongPress}
    />
  );
}

function SettingsPage(props: SettingsPageProps) {
  const selectedSection =
    GLOBAL_SETTINGS_NAV_ITEMS.find((item) => item.id === props.section) ??
    GLOBAL_SETTINGS_NAV_ITEMS[0];

  return (
    <div className="global-settings-page">
      <header className="global-settings-header">
        <h1>{selectedSection.label}</h1>
      </header>
      <div className="global-settings-content">{renderSettingsContent(props)}</div>
    </div>
  );
}

export function SettingsNavigationPanel({
  selectedSection,
  navigationSide,
  isCatPetted,
  onSelectSection,
  onTriggerEasterEgg
}: SettingsNavigationPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const [catRevealOffset, setCatRevealOffset] = useState(
    EASTER_CAT_INITIAL_REVEAL_OFFSET
  );
  const isAboutSection = selectedSection === 'about';
  const isCatRevealed = catRevealOffset > EASTER_CAT_INITIAL_REVEAL_OFFSET;
  const catStyle: SettingsEasterCatStyle = {
    '--settings-easter-cat-frame-size': `${EASTER_CAT_FRAME_SIZE_PX}px`,
    '--settings-easter-cat-reveal-offset': `${catRevealOffset}px`
  };
  const panelClassName = [
    'right-panel-page',
    'settings-navigation-panel',
    `settings-navigation-panel--nav-${navigationSide}`,
    isAboutSection ? 'settings-navigation-panel--about' : ''
  ]
    .filter(Boolean)
    .join(' ');
  const catClassName = [
    'settings-easter-cat',
    `settings-easter-cat--nav-${navigationSide}`,
    isCatRevealed ? 'is-revealed' : ''
  ]
    .filter(Boolean)
    .join(' ');
  const getCatRevealContainerHeight = useCallback(
    () => panelRef.current?.getBoundingClientRect().height ?? 0,
    []
  );
  const updateCatRevealFromWheel = useCallback((event: WheelEvent) => {
    setCatRevealOffset((currentOffset) =>
      resolveEasterCatRevealOffsetAfterWheel({
        currentOffset,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        frameHeight: EASTER_CAT_FRAME_SIZE_PX,
        containerHeight: getCatRevealContainerHeight()
      })
    );
  }, [getCatRevealContainerHeight]);

  useEffect(() => {
    if (isAboutSection) {
      return;
    }

    setCatRevealOffset(resetEasterCatRevealOffset());
  }, [isAboutSection]);

  useEffect(() => {
    if (!isAboutSection) {
      return undefined;
    }

    const panelElement = panelRef.current;
    const wheelTarget =
      panelElement?.closest<HTMLElement>('.app-shell') ?? panelElement;

    if (!wheelTarget) {
      return undefined;
    }

    wheelTarget.addEventListener('wheel', updateCatRevealFromWheel, { passive: true });

    return () => {
      wheelTarget.removeEventListener('wheel', updateCatRevealFromWheel);
    };
  }, [isAboutSection, updateCatRevealFromWheel]);

  useEffect(() => {
    if (!isAboutSection || typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setCatRevealOffset((currentOffset) =>
        resolveEasterCatRevealOffsetAfterResize({
          currentOffset,
          frameHeight: EASTER_CAT_FRAME_SIZE_PX,
          containerHeight: getCatRevealContainerHeight()
        })
      );
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [getCatRevealContainerHeight, isAboutSection]);

  return (
    <section ref={panelRef} className={panelClassName}>
      <div className="right-panel-title-row">
        <h2 className="right-panel-title">全局设置</h2>
      </div>
      <div className="right-panel-stack settings-navigation-panel__stack">
        <nav className="global-settings-nav" aria-label="全局设置功能导航">
          {GLOBAL_SETTINGS_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`right-panel-action global-settings-nav__item${
                selectedSection === item.id ? ' is-selected' : ''
              }`}
              aria-current={selectedSection === item.id ? 'page' : undefined}
              onClick={() => onSelectSection(item.id)}
            >
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>
      </div>
      {isAboutSection ? (
        <button
          type="button"
          className={catClassName}
          style={catStyle}
          tabIndex={isCatRevealed ? 0 : -1}
          aria-hidden={isCatRevealed ? undefined : true}
          onClick={onTriggerEasterEgg}
          onTouchEnd={(event) => {
            event.preventDefault();
            onTriggerEasterEgg();
          }}
          aria-label="净流小猫"
        >
          <span className="settings-easter-cat__frame" aria-hidden="true">
            <NfSvgIcon
              className="settings-easter-cat__image"
              svg={isCatPetted ? CatPettedNyaaIcon : CatIdleIcon}
              decorative
            />
          </span>
        </button>
      ) : null}
    </section>
  );
}

export default SettingsPage;
