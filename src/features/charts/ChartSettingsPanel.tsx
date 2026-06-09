import type { ReactNode } from 'react';
import RightPanelSection from '../../components/rightPanel/RightPanelSection';

export type ChartSettingsSegmentedControlRenderer = (
  label: string,
  options: Array<{ value: string; label: string }>,
  currentValue: string,
  onSelect: (value: string) => void,
  disabled?: boolean,
  note?: ReactNode
) => ReactNode;

export type TotalAssetChartSettings = {
  structure: {
    assetDisplay: 'positive' | 'negative' | 'both';
    showDebtMultiple: boolean;
  };
  trend: {
    assetDisplay: 'net' | 'positive' | 'positive-negative';
    adaptiveYAxis: boolean;
    xAxisRange: string;
    pointValueMode: string;
  };
};

type ChartSettingsPanelProps = {
  isLockedByGlobal: boolean;
  settings: TotalAssetChartSettings;
  onUpdateSettings: (
    updater: (current: TotalAssetChartSettings) => TotalAssetChartSettings
  ) => void;
  onBackToOverview: () => void;
  renderSegmentedControl: ChartSettingsSegmentedControlRenderer;
};

function ChartSettingsPanel({
  isLockedByGlobal,
  settings,
  onUpdateSettings,
  renderSegmentedControl
}: ChartSettingsPanelProps) {
  return (
    <section className="right-panel-page">
      <RightPanelSection
        title="图表设置"
        eyebrow={null}
        contentClassName={isLockedByGlobal ? 'example-mode-disabled-panel chart-settings-locked-panel' : ''}
        contentOverlay={
          isLockedByGlobal ? (
            <div className="example-mode-disabled-panel__banner">由全局图表设置锁定</div>
          ) : null
        }
        ariaDisabled={isLockedByGlobal}
      >
        {renderSegmentedControl(
          '资产结构显示',
          [
            { value: 'positive', label: '正资产' },
            { value: 'negative', label: '负资产' },
            { value: 'both', label: '正负资产' }
          ],
          settings.structure.assetDisplay,
          (value) =>
            onUpdateSettings((currentSettings) => ({
              ...currentSettings,
              structure: {
                ...currentSettings.structure,
                assetDisplay: value as TotalAssetChartSettings['structure']['assetDisplay']
              }
            })),
          isLockedByGlobal
        )}
        {renderSegmentedControl(
          '多重叠加数字',
          [
            { value: 'yes', label: '是' },
            { value: 'no', label: '否' }
          ],
          settings.structure.showDebtMultiple ? 'yes' : 'no',
          (value) =>
            onUpdateSettings((currentSettings) => ({
              ...currentSettings,
              structure: {
                ...currentSettings.structure,
                showDebtMultiple: value === 'yes'
              }
            })),
          isLockedByGlobal
        )}

        <div className="right-panel-divider" />

        {renderSegmentedControl(
          '资产趋势显示',
          [
            { value: 'net', label: '净资产' },
            { value: 'positive', label: '正资产' },
            { value: 'positive-negative', label: '正负资产' }
          ],
          settings.trend.assetDisplay,
          (value) =>
            onUpdateSettings((currentSettings) => ({
              ...currentSettings,
              trend: {
                ...currentSettings.trend,
                assetDisplay: value as TotalAssetChartSettings['trend']['assetDisplay']
              }
            })),
          isLockedByGlobal
        )}
        {renderSegmentedControl(
          '纵轴范围',
          [
            { value: 'dynamic', label: '动态范围' },
            { value: 'baseline', label: '基准范围' }
          ],
          settings.trend.adaptiveYAxis ? 'dynamic' : 'baseline',
          (value) =>
            onUpdateSettings((currentSettings) => ({
              ...currentSettings,
              trend: {
                ...currentSettings.trend,
                adaptiveYAxis: value === 'dynamic'
              }
            })),
          isLockedByGlobal
        )}
        {renderSegmentedControl(
          '横轴范围显示',
          [
            { value: '1m', label: '近 1 月' },
            { value: '3m', label: '近 3 月' },
            { value: '6m', label: '近 6 月' },
            { value: '1y', label: '近 1 年' }
          ],
          settings.trend.xAxisRange,
          (value) =>
            onUpdateSettings((currentSettings) => ({
              ...currentSettings,
              trend: {
                ...currentSettings.trend,
                xAxisRange: value
              }
            })),
          isLockedByGlobal
        )}
        {renderSegmentedControl(
          '点值显示',
          [
            { value: 'adaptive', label: '自适应' },
            { value: 'minmax', label: '最高最低' },
            { value: 'none', label: '不显示' }
          ],
          settings.trend.pointValueMode,
          (value) =>
            onUpdateSettings((currentSettings) => ({
              ...currentSettings,
              trend: {
                ...currentSettings.trend,
                pointValueMode: value
              }
            })),
          isLockedByGlobal
        )}
      </RightPanelSection>
    </section>
  );
}

export default ChartSettingsPanel;
