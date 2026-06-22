import type { CSSProperties, ReactNode } from 'react';

import { NfRollupSourceWideIcon } from '../../assets/icons';
import NfSvgIcon from '../../components/NfSvgIcon';
import {
  RightPanelActionButton,
  RightPanelSection,
  type RightPanelActionButtonProps
} from '../../components/rightPanel';
import SearchPreviewPanel from '../../components/search/SearchPreviewPanel';
import NfTooltip from '../../components/tooltip/NfTooltip';
import { getAutoSnapshotProgressState } from '../../features/backup/snapshotBackupLogic';
import {
  AccountActionsPanel,
  AccountChartSettingsPanel,
  AccountDangerActionsPanel
} from '../../features/account';
import { ChartSettingsPanel } from '../../features/charts';
import type { TrendPointValueMode, TrendXAxisRange } from '../../features/charts';
import { RollupImportActionsPanel } from '../../features/rollupImport';
import { SettingsNavigationPanel } from '../../features/settings';
import type { BackupCycleUnit } from '../types';
import type {
  GroupDetailRightPanelProps,
  RightPanelRendererProps,
  SnapshotRightPanelProps
} from './rightPanelTypes';

const getSegmentedControlStyle = (optionCount: number): CSSProperties =>
  ({ '--segmented-option-count': optionCount } as CSSProperties);

const getAutoSnapshotProgressStyle = (progressPercent: number): CSSProperties =>
  ({
    '--auto-snapshot-progress': `${Math.min(100, Math.max(0, progressPercent))}%`
  } as CSSProperties);

const renderRightPanelSection = (
  title: string | null,
  children: ReactNode,
  eyebrow: string | null = '操作区',
  className = '',
  titleAccessory: ReactNode = null
) => (
  <RightPanelSection
    title={title}
    eyebrow={eyebrow}
    className={className}
    titleAccessory={titleAccessory}
  >
    {children}
  </RightPanelSection>
);

const renderRightPanelPage = (
  title: string | null,
  children: ReactNode,
  eyebrow: string | null = null,
  className = '',
  titleAccessory: ReactNode = null
) => (
  <section className={`right-panel-page${className ? ` ${className}` : ''}`}>
    {eyebrow ? <p className="eyebrow right-panel-eyebrow">{eyebrow}</p> : null}
    {title || titleAccessory ? (
      <div className="right-panel-title-row">
        {title ? <h2 className="right-panel-title">{title}</h2> : <span />}
        {titleAccessory}
      </div>
    ) : null}
    <div className="right-panel-stack">{children}</div>
  </section>
);

const renderRightPanelActionButton = (props: RightPanelActionButtonProps) => (
  <RightPanelActionButton {...props} />
);

const renderChartSegmentedControl = (
  label: string,
  options: Array<{ value: string; label: string }>,
  currentValue: string,
  onSelect: (value: string) => void,
  disabled = false,
  note?: ReactNode
) => (
  <div className={`right-panel-form-grid${disabled ? ' is-chart-control-locked' : ''}`}>
    <span className="right-panel-label-text">{label}</span>
    <div
      className="segmented-control right-panel-segmented"
      style={getSegmentedControlStyle(options.length)}
      aria-disabled={disabled ? 'true' : undefined}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              onSelect(option.value);
            }
          }}
          className={currentValue === option.value ? 'is-selected' : undefined}
        >
          {option.label}
        </button>
      ))}
    </div>
    {note ? <p className="right-panel-note">{note}</p> : null}
  </div>
);

function SnapshotSummary({ items }: { items: SnapshotRightPanelProps['summaryItems'] }) {
  return (
    <div className="right-panel-facts">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function AutoSnapshotProgress({ snapshot }: { snapshot: SnapshotRightPanelProps }) {
  const progressState = getAutoSnapshotProgressState(
    snapshot.latestAutoBackupAt,
    snapshot.autoBackupDraft.cycle
  );
  const isDisabled = !snapshot.autoBackupDraft.enabled;

  return (
    <div
      className={`auto-snapshot-progress${isDisabled ? ' is-disabled' : ''}`}
      aria-disabled={isDisabled ? 'true' : undefined}
      aria-label={`自动快照进度：${progressState.previousLabel}，${progressState.nextLabel}`}
    >
      <div
        className="auto-snapshot-progress__track"
        style={getAutoSnapshotProgressStyle(progressState.progressPercent)}
      >
        <span className="auto-snapshot-progress__fill" aria-hidden="true" />
      </div>
      <div className="auto-snapshot-progress__labels">
        <span>{progressState.previousLabel}</span>
        <span>{progressState.nextLabel}</span>
      </div>
    </div>
  );
}

function AutoBackupControls({ snapshot }: { snapshot: SnapshotRightPanelProps }) {
  const {
    autoBackupDraft,
    autoBackupCycleValueInput,
    autoSnapshotCycleInputRef,
    hasAutoBackupDraftChanges,
    canSaveAutoBackupSettings,
    onAutoBackupEnabledChange,
    onAutoBackupCycleValueChange,
    onAutoBackupCycleValueInputReset,
    onAdjustAutoBackupCycleValue,
    onAutoBackupCycleUnitChange,
    onSelectAutoBackupDirectory,
    onSaveAutoBackupDraft
  } = snapshot;

  return (
    <div className="right-panel-form-grid">
      <div
        className="segmented-control right-panel-segmented"
        aria-label="自动快照开关"
        style={getSegmentedControlStyle(2)}
      >
        {[
          { value: true, label: '开启' },
          { value: false, label: '关闭' }
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onAutoBackupEnabledChange(option.value)}
            className={autoBackupDraft.enabled === option.value ? 'is-selected' : undefined}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div
        aria-disabled={!autoBackupDraft.enabled}
        className="right-panel-form-grid"
        style={{
          opacity: autoBackupDraft.enabled ? 1 : 0.45,
          pointerEvents: autoBackupDraft.enabled ? 'auto' : 'none'
        }}
      >
        <label className="right-panel-label">
          自动快照周期
          <div
            className="stepper-input"
            onWheel={(event) => {
              event.preventDefault();
              event.stopPropagation();

              if (event.deltaY === 0) {
                return;
              }

              onAdjustAutoBackupCycleValue(event.deltaY > 0 ? -1 : 1);
            }}
          >
            <input
              ref={autoSnapshotCycleInputRef}
              type="text"
              inputMode="numeric"
              disabled={!autoBackupDraft.enabled}
              value={autoBackupCycleValueInput}
              onChange={(event) => onAutoBackupCycleValueChange(event.target.value)}
              onBlur={() => {
                if (!autoBackupCycleValueInput) {
                  onAutoBackupCycleValueInputReset(String(autoBackupDraft.cycle.value));
                }
              }}
              onWheel={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (event.deltaY === 0) {
                  return;
                }

                onAdjustAutoBackupCycleValue(event.deltaY > 0 ? -1 : 1);
              }}
            />
            <div className="stepper-input__controls">
              {[
                { label: '增加自动快照周期', direction: 1 as const, path: 'M7 14l5-5 5 5' },
                { label: '减少自动快照周期', direction: -1 as const, path: 'M7 10l5 5 5-5' }
              ].map((control) => (
                <button
                  key={control.label}
                  type="button"
                  aria-label={control.label}
                  disabled={!autoBackupDraft.enabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onAdjustAutoBackupCycleValue(control.direction)}
                  style={{
                    borderTop:
                      control.direction === -1 ? '1px solid var(--border-soft)' : 0
                  }}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ width: 12, height: 12 }}
                  >
                    <path
                      d={control.path}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </label>

        <div className="right-panel-form-grid">
          <span className="right-panel-label-text">单位</span>
          <div
            className="segmented-control right-panel-segmented"
            style={getSegmentedControlStyle(3)}
          >
            {[
              { value: 'day', label: '日' },
              { value: 'week', label: '周' },
              { value: 'month', label: '月' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={!autoBackupDraft.enabled}
                onClick={() => onAutoBackupCycleUnitChange(option.value as BackupCycleUnit)}
                className={autoBackupDraft.cycle.unit === option.value ? 'is-selected' : undefined}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <AutoSnapshotProgress snapshot={snapshot} />

        <div className="right-panel-form-grid">
          <span className="right-panel-label-text">导出目录</span>
          <div className="right-panel-path-row">
            <NfTooltip
              content={autoBackupDraft.directory || '未选择目录'}
              placement="bottom"
              className="right-panel-path-tooltip"
              wrap
            >
              <div aria-label={autoBackupDraft.directory || '未选择目录'}>
                {autoBackupDraft.directory || '未选择目录'}
              </div>
            </NfTooltip>

            <button
              type="button"
              disabled={!autoBackupDraft.enabled}
              onClick={onSelectAutoBackupDirectory}
            >
              选择
            </button>
          </div>
        </div>
      </div>

      {hasAutoBackupDraftChanges ? (
        <button
          type="button"
          className="right-panel-primary-button"
          disabled={!canSaveAutoBackupSettings}
          onClick={onSaveAutoBackupDraft}
        >
          保存自动快照设置
        </button>
      ) : null}
    </div>
  );
}

function SnapshotActions({ snapshot }: { snapshot: SnapshotRightPanelProps }) {
  return (
    <section className="right-panel-page right-panel-page--snapshot">
      <div className="right-panel-stack right-panel-stack--snapshot">
        <section className="right-panel-subsection">
          <h2>手动快照</h2>
          <SnapshotSummary items={snapshot.summaryItems} />
          {renderRightPanelActionButton({
            label: '导出快照',
            tone: 'primary',
            onClick: snapshot.onExportBackup
          })}
          {renderRightPanelActionButton({
            label: '导入快照',
            onClick: snapshot.onImportBackup
          })}
        </section>

        <section
          className={`right-panel-subsection${
            snapshot.isExampleMode
              ? ' example-mode-disabled-panel right-panel-subsection--auto-snapshot-disabled'
              : ''
          }`}
          aria-disabled={snapshot.isExampleMode ? 'true' : undefined}
        >
          <h2>自动快照</h2>
          <AutoBackupControls snapshot={snapshot} />
          {snapshot.isExampleMode ? (
            <div className="example-mode-disabled-panel__banner">示例模式下不可用</div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function GroupDetailActions({ groupDetail }: { groupDetail: GroupDetailRightPanelProps }) {
  return (
    <>
      {renderRightPanelSection(
        '账户类型信息',
        <>
          <label className="right-panel-label">
            账户类型
            <input
              type="text"
              value={groupDetail.nameDraft}
              placeholder={groupDetail.namePlaceholder}
              onChange={(event) => groupDetail.onNameDraftChange(event.target.value)}
            />
          </label>
          {renderChartSegmentedControl(
            '参与统计',
            [
              { value: 'yes', label: '是' },
              { value: 'no', label: '否' }
            ],
            groupDetail.statsDraft ? 'yes' : 'no',
            (value) => groupDetail.onStatsDraftChange(value === 'yes')
          )}
          {groupDetail.error ? (
            <p className="right-panel-note" style={{ color: 'var(--danger-text)' }}>
              {groupDetail.error}
            </p>
          ) : null}
          {renderRightPanelActionButton({
            label: '保存信息',
            className: 'right-panel-action--save',
            onClick: groupDetail.onSaveInfo
          })}
        </>,
        null
      )}

      <RightPanelSection
        title="图表参数设置"
        eyebrow={null}
        contentClassName={
          groupDetail.isLockedByGlobal
            ? 'example-mode-disabled-panel chart-settings-locked-panel'
            : ''
        }
        contentOverlay={
          groupDetail.isLockedByGlobal ? (
            <div className="example-mode-disabled-panel__banner">由全局图表设置锁定</div>
          ) : null
        }
        ariaDisabled={groupDetail.isLockedByGlobal}
      >
        {renderChartSegmentedControl(
          '横轴范围显示',
          [
            { value: '1m', label: '近 1 月' },
            { value: '3m', label: '近 3 月' },
            { value: '6m', label: '近 6 月' },
            { value: '1y', label: '近 1 年' }
          ],
          groupDetail.chartSettings.xAxisRange,
          (value) =>
            groupDetail.onUpdateChartSettings((currentSettings) => ({
              ...currentSettings,
              xAxisRange: value as TrendXAxisRange
            })),
          groupDetail.isLockedByGlobal
        )}
        {renderChartSegmentedControl(
          '点值显示',
          [
            { value: 'adaptive', label: '自适应' },
            { value: 'minmax', label: '最高最低' },
            { value: 'none', label: '不显示' }
          ],
          groupDetail.chartSettings.pointValueMode,
          (value) =>
            groupDetail.onUpdateChartSettings((currentSettings) => ({
              ...currentSettings,
              pointValueMode: value as TrendPointValueMode
            })),
          groupDetail.isLockedByGlobal
        )}
      </RightPanelSection>
    </>
  );
}

export function RightPanelRenderer({
  mode,
  search,
  account,
  history,
  archived,
  totalChart,
  groupDetail,
  settings,
  rollupImport,
  home
}: RightPanelRendererProps) {
  switch (mode) {
    case 'search':
      return <SearchPreviewPanel {...search} />;

    case 'rollup-import':
      return renderRightPanelPage(
        rollupImport.title,
        <RollupImportActionsPanel {...rollupImport.actionsPanelProps} />,
        null,
        rollupImport.actionsClassName
      );

    case 'account-danger':
      return account.dangerActions ? (
        <AccountDangerActionsPanel {...account.dangerActions} />
      ) : null;

    case 'account-chart-settings':
      return account.chartSettings ? (
        <AccountChartSettingsPanel
          {...account.chartSettings}
          renderSegmentedControl={renderChartSegmentedControl}
        />
      ) : null;

    case 'account-actions':
      return account.actions ? <AccountActionsPanel {...account.actions} /> : null;

    case 'snapshot':
      return <SnapshotActions snapshot={history.snapshot} />;

    case 'history':
      return renderRightPanelPage(
        '历史',
        <>
          {renderRightPanelActionButton({
            label: '快照',
            tone: 'primary',
            onClick: history.actions.onOpenBackupPanel
          })}
        </>,
        null
      );

    case 'archived':
      return renderRightPanelPage(
        '已归档账户',
        <>
          <article className="right-panel-preview">
            <span>归档列表</span>
            <strong>{archived.accountCount} 个账户</strong>
            <p>在左侧选择账户后，右侧会切换到账户恢复或删除操作。</p>
          </article>
        </>,
        '归档'
      );

    case 'chart-settings':
      return (
        <ChartSettingsPanel
          {...totalChart}
          renderSegmentedControl={renderChartSegmentedControl}
        />
      );

    case 'group-detail':
      return groupDetail ? <GroupDetailActions groupDetail={groupDetail} /> : null;

    case 'settings':
      return <SettingsNavigationPanel {...settings} />;

    case 'home':
      return renderRightPanelPage(
        '下一步',
        <>
          {renderRightPanelActionButton({
            label: '记一笔',
            onClick: home.onOpenQuickSingleEntry
          })}
          <button
            type="button"
            className="right-panel-action flash-note-entry-action"
            onClick={home.onOpenFlashNote}
          >
            <strong>闪记</strong>
            <span className="home-action-entry__icon">{home.renderFlashIcon()}</span>
          </button>
          <button
            type="button"
            className="right-panel-action rollup-import-entry-action"
            onClick={home.onOpenRollupImport}
          >
            <strong>汇总导入</strong>
            <span className="home-action-entry__icon">
              <NfSvgIcon
                svg={NfRollupSourceWideIcon}
                className="rollup-import-source-icon"
                decorative
              />
            </span>
          </button>
          {renderRightPanelActionButton({
            label: '全局搜索',
            onClick: home.onOpenSearch
          })}
          {renderRightPanelActionButton({
            label: '账户创建 / 恢复',
            onClick: home.onOpenAddAccount
          })}
          {renderRightPanelActionButton({
            label: '历史记录',
            onClick: home.onOpenHistoryPanel
          })}
          {renderRightPanelActionButton({
            label: '全局设置',
            onClick: home.onOpenGlobalSettings
          })}
        </>,
        null,
        '',
        home.isExampleMode ? (
          <button
            type="button"
            className="home-example-mode-badge"
            aria-label="打开示例数据设置"
            onClick={home.onOpenExampleDataSettings}
          >
            示例模式
          </button>
        ) : null
      );

    default:
      return null;
  }
}

export default RightPanelRenderer;
