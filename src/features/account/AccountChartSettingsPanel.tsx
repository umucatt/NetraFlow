import type { ReactNode } from 'react';
import RightPanelSection from '../../components/rightPanel/RightPanelSection';

export type AccountChartSettings = {
  adaptiveYAxis: boolean;
  xAxisRange: string;
  pointValueMode: string;
};

export type AccountChartSegmentedControlRenderer = (
  label: string,
  options: Array<{ value: string; label: string }>,
  currentValue: string,
  onSelect: (value: string) => void,
  disabled?: boolean,
  note?: ReactNode
) => ReactNode;

type AccountChartSettingsPanelProps = {
  isLockedByGlobal: boolean;
  settings: AccountChartSettings;
  onUpdateSettings: (updater: (current: AccountChartSettings) => AccountChartSettings) => void;
  onBackToAccountDetail: () => void;
  renderSegmentedControl: AccountChartSegmentedControlRenderer;
};

function AccountChartSettingsPanel({
  isLockedByGlobal,
  settings,
  onUpdateSettings,
  renderSegmentedControl
}: AccountChartSettingsPanelProps) {
  return (
    <section className="right-panel-page">
      <RightPanelSection
        title="图表参数设置"
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
          '纵轴范围',
          [
            { value: 'dynamic', label: '动态范围' },
            { value: 'baseline', label: '基准范围' }
          ],
          settings.adaptiveYAxis ? 'dynamic' : 'baseline',
          (value) =>
            onUpdateSettings((currentSettings) => ({
              ...currentSettings,
              adaptiveYAxis: value === 'dynamic'
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
          settings.xAxisRange,
          (value) =>
            onUpdateSettings((currentSettings) => ({
              ...currentSettings,
              xAxisRange: value
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
          settings.pointValueMode,
          (value) =>
            onUpdateSettings((currentSettings) => ({
              ...currentSettings,
              pointValueMode: value
            })),
          isLockedByGlobal
        )}
      </RightPanelSection>
    </section>
  );
}

export default AccountChartSettingsPanel;
