import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';

type HistoryFilterToolbarProps = {
  rangeInput: string;
  isCalendarVisible: boolean;
  calendarContent?: ReactNode;
  onRangeInputChange: (value: string) => void;
  onRangeInputFocus: () => void;
  onRangeInputClick: () => void;
  onRangeInputConfirm: () => void;
  onToggleCalendar: () => void;
  onSelectPreviousWeek: () => void;
  onSelectRecentSevenDays: () => void;
  onClearRange: () => void;
};

export default function HistoryFilterToolbar({
  rangeInput,
  isCalendarVisible,
  calendarContent,
  onRangeInputChange,
  onRangeInputFocus,
  onRangeInputClick,
  onRangeInputConfirm,
  onToggleCalendar,
  onSelectPreviousWeek,
  onSelectRecentSevenDays,
  onClearRange
}: HistoryFilterToolbarProps) {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onRangeInputChange(event.target.value);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    onRangeInputConfirm();
  };

  return (
    <div
      className="history-filter-panel"
      style={{
        display: 'grid',
        gap: 12,
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-section)',
        padding: 12,
        background: 'var(--surface-strong)',
        marginBottom: 16
      }}
    >
      <label style={{ display: 'grid', gap: 6, color: 'var(--text-secondary)' }}>
        时间范围
        <input
          type="text"
          inputMode="numeric"
          placeholder="0325  0421    250325  260421"
          value={rangeInput}
          onFocus={onRangeInputFocus}
          onClick={onRangeInputClick}
          onKeyDown={handleInputKeyDown}
          onChange={handleInputChange}
          style={{
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-input)',
            padding: '9px 10px',
            background: 'var(--panel-bg-strong)',
            color: 'var(--text-main)',
            font: 'inherit'
          }}
        />
      </label>

      <div className="history-calendar-toolbar">
        <button type="button" className="history-calendar-tool-button" onClick={onToggleCalendar}>
          {isCalendarVisible ? '隐藏日历' : '显示日历'}
        </button>
        {isCalendarVisible ? (
          <div className="history-calendar-quick-actions">
            <button
              type="button"
              className="history-calendar-tool-button"
              onClick={onSelectPreviousWeek}
            >
              上周
            </button>
            <button
              type="button"
              className="history-calendar-tool-button"
              onClick={onSelectRecentSevenDays}
            >
              最近7日
            </button>
            <button
              type="button"
              className="history-calendar-tool-button history-calendar-tool-button--muted"
              onClick={onClearRange}
            >
              清除筛选
            </button>
          </div>
        ) : null}
      </div>

      {isCalendarVisible ? calendarContent : null}
    </div>
  );
}
