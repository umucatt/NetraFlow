import type { PointerEvent } from 'react';
import {
  NfNavBackIcon,
  NfNavChevronRightIcon,
  NfSelectionIntersectIcon,
  NfSelectionSingleIcon,
  NfSelectionSubtractIcon,
  NfSelectionUnionIcon
} from '../../assets/icons';
import NfSvgIcon from '../../components/NfSvgIcon';
import type {
  FlashAccountGroupOption,
  FlashInputMode,
  FlashCell,
  FlashSelectionMode,
  FlashDateRule
} from './flashNoteTypes';
import { FlashDataCell } from './FlashDataCell';
import {
  FLASH_WEEKDAYS,
  getFlashRangeExcludedDates,
  getFlashMonthLabel,
  isFutureFlashDate,
  toFlashDateValue
} from './flashNoteUtils';

type FlashSelectStepProps = {
  accountGroups: FlashAccountGroupOption[];
  selectedAccountId?: string;
  inputMode: FlashInputMode;
  selectionMode: FlashSelectionMode;
  activeDateRule: FlashDateRule | null;
  disabledDateRules: Record<FlashDateRule, boolean>;
  visibleMonth: Date;
  selectedDates: Set<string>;
  previewDates: Set<string>;
  startDate: string;
  endDate: string;
  getCell: (dateValue: string) => FlashCell;
  getCalendarDays: (monthDate: Date) => Date[];
  onChooseAccount: (groupName: string, accountId: string) => void;
  onModeChange: (mode: FlashInputMode) => void;
  onSelectionModeChange: (mode: FlashSelectionMode) => void;
  onDateRuleApply: (rule: FlashDateRule) => void;
  onVisibleMonthChange: (monthDate: Date) => void;
  onDatePointerDown: (dateValue: string) => void;
  onDatePointerEnter: (dateValue: string) => void;
  onDatePointerUp: (dateValue: string) => void;
};

const modeOptions: Array<{ mode: FlashInputMode; title: string; description: string }> = [
  {
    mode: 'change',
    title: '净值变动（change）',
    description: '输入值作为每日净值变动'
  },
  {
    mode: 'balance',
    title: '账户余额（balance）',
    description: '输入值作为该日账户余额'
  }
];

const selectionTools: Array<{
  mode: FlashSelectionMode;
  icon: string;
  title: string;
  ariaLabel: string;
}> = [
  { mode: 'replace', icon: NfSelectionSingleIcon, title: '单选/拖选', ariaLabel: '单选' },
  { mode: 'intersect', icon: NfSelectionIntersectIcon, title: '交集', ariaLabel: '交集选区' },
  { mode: 'union', icon: NfSelectionUnionIcon, title: '合集/合并', ariaLabel: '合并选区' },
  { mode: 'subtract', icon: NfSelectionSubtractIcon, title: '删除/相减', ariaLabel: '相减选区' }
];

const dateRuleTools: Array<{ rule: FlashDateRule; label: string; title: string; ariaLabel: string }> = [
  { rule: 'all', label: '全', title: '每日', ariaLabel: '每日' },
  { rule: 'weekday', label: '工', title: '工作日', ariaLabel: '工作日' },
  { rule: 'weekend', label: '末', title: '周末', ariaLabel: '周末' }
];

export function FlashSelectStep({
  accountGroups,
  selectedAccountId,
  inputMode,
  selectionMode,
  activeDateRule,
  disabledDateRules,
  visibleMonth,
  selectedDates,
  previewDates,
  startDate,
  endDate,
  getCell,
  getCalendarDays,
  onChooseAccount,
  onModeChange,
  onSelectionModeChange,
  onDateRuleApply,
  onVisibleMonthChange,
  onDatePointerDown,
  onDatePointerEnter,
  onDatePointerUp
}: FlashSelectStepProps) {
  const rangeExcludedDateSet = new Set(
    getFlashRangeExcludedDates({
      activeDateRule,
      endDate,
      selectedDates,
      startDate
    })
  );

  const renderMonth = (monthDate: Date, side: 'left' | 'right') => (
    <section key={`${side}-${monthDate.toISOString()}`} className="flash-note-month">
      <header>
        <strong>{getFlashMonthLabel(monthDate)}</strong>
      </header>
      <div className="flash-note-week-header">
        {FLASH_WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="flash-note-month-grid">
        {getCalendarDays(monthDate).map((date) => {
          const dateValue = toFlashDateValue(date);
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const nextMonthStart = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
          const shouldShowDate = side === 'left' ? date < nextMonthStart : date >= monthStart;

          if (!shouldShowDate) {
            return <span key={`${side}-${dateValue}`} aria-hidden="true" />;
          }

          return (
            <FlashDataCell
              key={`${side}-${dateValue}`}
              dateValue={dateValue}
              cell={getCell(dateValue)}
              mode="select"
              currentMonth={date.getMonth() === monthDate.getMonth()}
              isSelected={selectedDates.has(dateValue)}
              isPreview={previewDates.has(dateValue)}
              isStart={dateValue === startDate}
              isEnd={Boolean(endDate && dateValue === endDate)}
              isRangeExcluded={rangeExcludedDateSet.has(dateValue)}
              onPointerDown={(targetDate, event: PointerEvent<HTMLButtonElement>) => {
                if (event.button !== 0 || isFutureFlashDate(targetDate)) {
                  return;
                }
                onDatePointerDown(targetDate);
              }}
              onPointerEnter={onDatePointerEnter}
              onPointerUp={(targetDate, event) => {
                if (event.button !== 0) {
                  return;
                }
                onDatePointerUp(targetDate);
              }}
            />
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="flash-note-stage-body flash-note-stage-body--date-select">
      <section className="flash-note-setup-panel" aria-label="本轮闪记输入条件设置区">
        <div className="flash-note-setup-panel__section">
          <span className="flash-note-setup-panel__label">账户选择</span>
          <div className="flash-note-account-picker" aria-label="选择闪记账户">
            {accountGroups.map((group) => (
              <div key={group.name} className="flash-note-account-group">
                <span>{group.name}</span>
                <div>
                  {group.accounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      className={`flash-note-account-chip${selectedAccountId === account.id ? ' is-selected' : ''}`}
                      onClick={() => onChooseAccount(group.name, account.id)}
                    >
                      <span>{account.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flash-note-setup-panel__section">
          <span className="flash-note-setup-panel__label">输入模式</span>
          <div className="flash-note-mode-select flash-note-mode-select--inline">
            <div className="flash-note-mode-options">
              {modeOptions.map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  className={inputMode === item.mode ? 'is-selected' : ''}
                  onClick={() => onModeChange(item.mode)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flash-note-calendar-panel">
        <div className="flash-note-calendar-header">
          <button
            type="button"
            aria-label="上两个月"
            onClick={() =>
              onVisibleMonthChange(
                new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 2, 1)
              )
            }
          >
            <NfSvgIcon svg={NfNavBackIcon} className="flash-note-nav-icon" decorative />
          </button>
          <div className="flash-note-tool-row">
            <div className="flash-note-icon-tools" aria-label="选区工具">
              {selectionTools.map((tool) => (
                <button
                  key={tool.mode}
                  type="button"
                  title={tool.title}
                  aria-label={tool.ariaLabel}
                  className={`flash-note-icon-tool${selectionMode === tool.mode ? ' is-active' : ''}`}
                  onClick={() => onSelectionModeChange(tool.mode)}
                >
                  <NfSvgIcon svg={tool.icon} className="flash-note-selection-icon" decorative />
                </button>
              ))}
            </div>
            <div className="flash-note-rule-tools" aria-label="快速日期工具">
              {dateRuleTools.map((item) => (
                <button
                  key={item.rule}
                  type="button"
                  title={item.title}
                  aria-label={item.ariaLabel}
                  className={activeDateRule === item.rule ? 'is-active' : undefined}
                  disabled={!startDate || disabledDateRules[item.rule]}
                  onClick={() => onDateRuleApply(item.rule)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            aria-label="下两个月"
            onClick={() =>
              onVisibleMonthChange(
                new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 2, 1)
              )
            }
          >
            <NfSvgIcon svg={NfNavChevronRightIcon} className="flash-note-nav-icon" decorative />
          </button>
        </div>
        <div className="flash-note-double-month">
          {renderMonth(visibleMonth, 'left')}
          {renderMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1), 'right')}
        </div>
      </section>
    </div>
  );
}
