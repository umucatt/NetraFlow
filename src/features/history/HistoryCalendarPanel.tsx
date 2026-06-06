import { NfNavBackIcon, NfNavChevronRightIcon } from '../../assets/icons';
import NfSvgIcon from '../../components/NfSvgIcon';

type HistoryCalendarDateState = {
  isCurrentMonth: boolean;
  isBoundary: boolean;
  isInsideRange: boolean;
  isFuture: boolean;
  recordCount: number;
  recordDensityLevel: 'none' | 'low' | 'medium-low' | 'medium-high' | 'full';
};

type HistoryCalendarPanelProps = {
  calendarMonth: Date;
  calendarSecondMonth: Date;
  isNextDisabled: boolean;
  getCalendarDays: (monthDate: Date) => Date[];
  getDateValue: (date: Date) => string;
  getDateState: (date: Date, monthDate: Date) => HistoryCalendarDateState;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDateClick: (date: Date, monthDate: Date) => void;
};

export default function HistoryCalendarPanel({
  calendarMonth,
  calendarSecondMonth,
  isNextDisabled,
  getCalendarDays,
  getDateValue,
  getDateState,
  onPreviousMonth,
  onNextMonth,
  onDateClick
}: HistoryCalendarPanelProps) {
  const renderCalendarMonth = (monthDate: Date, side: 'left' | 'right') => (
    <div className="history-calendar-month" key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}>
      <strong className="history-calendar-month__title">
        {monthDate.getFullYear()}年{monthDate.getMonth() + 1}月
      </strong>
      <div className="history-calendar-weekdays" aria-hidden="true">
        {['一', '二', '三', '四', '五', '六', '日'].map((dayName) => (
          <span key={dayName}>{dayName}</span>
        ))}
      </div>
      <div className="history-calendar-grid">
        {getCalendarDays(monthDate).map((date) => {
          const dateValue = getDateValue(date);
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const nextMonthStart = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
          const shouldShowDate = side === 'left' ? date < nextMonthStart : date >= monthStart;
          const state = getDateState(date, monthDate);

          if (!shouldShowDate) {
            return (
              <span
                key={`${monthDate.toISOString()}-${dateValue}`}
                className="history-calendar-day-placeholder"
                aria-hidden="true"
              />
            );
          }

          return (
            <button
              key={`${monthDate.toISOString()}-${dateValue}`}
              type="button"
              disabled={state.isFuture}
              className={[
                'history-calendar-day',
                state.isCurrentMonth ? '' : 'is-outside-month',
                state.isBoundary ? 'is-boundary' : '',
                state.isInsideRange ? 'is-inside-range' : '',
                state.isFuture ? 'is-future' : '',
                state.recordCount > 0 ? 'has-records' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onDateClick(date, monthDate)}
            >
              <span className="history-calendar-day__number">{date.getDate()}</span>
              {state.recordDensityLevel === 'none' ? null : (
                <span
                  className={`history-calendar-day__density history-calendar-day__density--${state.recordDensityLevel}`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="history-calendar-panel">
      <div className="history-calendar-header">
        <button
          type="button"
          aria-label="上个月"
          className="history-calendar-nav-button"
          onClick={onPreviousMonth}
        >
          <NfSvgIcon svg={NfNavBackIcon} className="history-calendar-nav-icon" decorative />
        </button>
        <strong className="history-calendar-range-label">
          {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月 -{' '}
          {calendarSecondMonth.getFullYear()}年{calendarSecondMonth.getMonth() + 1}月
        </strong>
        <button
          type="button"
          aria-label="下个月"
          className="history-calendar-nav-button"
          disabled={isNextDisabled}
          onClick={onNextMonth}
        >
          <NfSvgIcon
            svg={NfNavChevronRightIcon}
            className="history-calendar-nav-icon"
            decorative
          />
        </button>
      </div>
      <div className="history-calendar-months">
        {renderCalendarMonth(calendarMonth, 'left')}
        {renderCalendarMonth(calendarSecondMonth, 'right')}
      </div>
    </div>
  );
}
