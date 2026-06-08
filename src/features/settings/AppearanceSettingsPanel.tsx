import type {
  HomeAssetStatLabelMode,
  HomeAssetStatMetric
} from '../../homeAssetStats';
import {
  SettingsControlRow,
  SettingsFieldGroup,
  SettingsSegmentedControl
} from './SettingsSectionFrame';

type PositiveNegativeColorMode = 'red-positive' | 'green-positive';
type ThemeMode = 'light' | 'dark' | 'system';
type ThemeStyle = 'default' | 'nyaa';
type PagePositionMemoryMode = 'global' | 'covered-reset';
type MainContentPosition = 'left' | 'right';

export type AppearanceSettingsPanelProps = {
  positiveNegativeColorMode: PositiveNegativeColorMode;
  homeAssetStatMetric: HomeAssetStatMetric;
  homeAssetStatLabelMode: HomeAssetStatLabelMode;
  homeAssetStatCompact: boolean;
  themeMode: ThemeMode;
  themeStyle: ThemeStyle;
  nyaaThemeUnlocked: boolean;
  mainContentPosition: MainContentPosition;
  pagePositionMemoryMode: PagePositionMemoryMode;
  onPositiveNegativeColorModeChange: (value: PositiveNegativeColorMode) => void;
  onHomeAssetStatMetricChange: (value: HomeAssetStatMetric) => void;
  onHomeAssetStatLabelModeChange: (value: HomeAssetStatLabelMode) => void;
  onHomeAssetStatCompactChange: (value: 'yes' | 'no') => void;
  onThemeModeChange: (value: ThemeMode) => void;
  onThemeStyleChange: (value: ThemeStyle) => void;
  onMainContentPositionChange: (value: MainContentPosition) => void;
  onPagePositionMemoryModeChange: (value: PagePositionMemoryMode) => void;
};

function AppearanceSettingsPanel({
  positiveNegativeColorMode,
  homeAssetStatMetric,
  homeAssetStatLabelMode,
  homeAssetStatCompact,
  themeMode,
  themeStyle,
  nyaaThemeUnlocked,
  mainContentPosition,
  pagePositionMemoryMode,
  onPositiveNegativeColorModeChange,
  onHomeAssetStatMetricChange,
  onHomeAssetStatLabelModeChange,
  onHomeAssetStatCompactChange,
  onThemeModeChange,
  onThemeStyleChange,
  onMainContentPositionChange,
  onPagePositionMemoryModeChange
}: AppearanceSettingsPanelProps) {
  return (
    <>
      <SettingsSegmentedControl
        label="数字正负值显示"
        options={[
          { value: 'red-positive', label: '红正绿负' },
          { value: 'green-positive', label: '绿正红负' }
        ]}
        currentValue={positiveNegativeColorMode}
        onChange={(value) => onPositiveNegativeColorModeChange(value as PositiveNegativeColorMode)}
        statusLabel={null}
      />

      <SettingsFieldGroup title="首页资产统计">
        <SettingsControlRow
          label="资产统计数值类型"
          options={[
            { value: 'netWorth', label: '净值 NW' },
            { value: 'totalAssets', label: '总资产 TA' }
          ]}
          currentValue={homeAssetStatMetric}
          onChange={(value) => onHomeAssetStatMetricChange(value as HomeAssetStatMetric)}
        />
        <SettingsControlRow
          label="显示类型"
          options={[
            { value: 'full', label: '全称' },
            { value: 'short', label: '缩写' }
          ]}
          currentValue={homeAssetStatLabelMode}
          onChange={(value) => onHomeAssetStatLabelModeChange(value as HomeAssetStatLabelMode)}
        />
        <SettingsControlRow
          label="紧凑数字格式"
          options={[
            { value: 'yes', label: '是' },
            { value: 'no', label: '否' }
          ]}
          currentValue={homeAssetStatCompact ? 'yes' : 'no'}
          onChange={(value) => onHomeAssetStatCompactChange(value as 'yes' | 'no')}
        />
      </SettingsFieldGroup>

      <SettingsSegmentedControl
        label="页面主题"
        options={[
          { value: 'light', label: '浅色' },
          { value: 'dark', label: '深色' },
          { value: 'system', label: '跟随系统' }
        ]}
        currentValue={themeMode}
        onChange={(value) => onThemeModeChange(value as ThemeMode)}
        statusLabel={null}
      />

      {nyaaThemeUnlocked ? (
        <SettingsSegmentedControl
          label="主题风格"
          options={[
            { value: 'default', label: '默认' },
            { value: 'nyaa', label: 'nyaa~' }
          ]}
          currentValue={themeStyle}
          onChange={(value) => onThemeStyleChange(value as ThemeStyle)}
          statusLabel={null}
        />
      ) : null}

      <SettingsSegmentedControl
        id="global-settings-main-content-position"
        label="页面重心"
        options={[
          { value: 'left', label: '左侧' },
          { value: 'right', label: '右侧' }
        ]}
        currentValue={mainContentPosition}
        note="控制双栏页面中主要内容区域的显示侧"
        onChange={(value) => onMainContentPositionChange(value as MainContentPosition)}
        statusLabel={null}
      />

      <div id="global-settings-page-position-memory">
        <SettingsSegmentedControl
          label="页面位置记忆"
          options={[
            { value: 'global', label: '全局记忆' },
            { value: 'covered-reset', label: '覆盖后重置' }
          ]}
          currentValue={pagePositionMemoryMode}
          note={
            <>
              全局记忆：切换页面保留滚动位置和堆叠组状态
              <br />
              覆盖后重置：页面被覆盖将重置滚动位置和堆叠组状态
            </>
          }
          onChange={(value) => onPagePositionMemoryModeChange(value as PagePositionMemoryMode)}
          statusLabel={null}
        />
      </div>
    </>
  );
}

export default AppearanceSettingsPanel;
