import type { PointerEvent } from 'react';
import type { FlashCell } from './flashNoteTypes';
import { FlashDataCell } from './FlashDataCell';
import { FLASH_WEEKDAYS, parseFlashNumberInput, toFlashDateValue } from './flashNoteUtils';

type FlashCalendarGridMode = 'input' | 'confirm';

type FlashCalendarGridProps = {
  mode: FlashCalendarGridMode;
  weeks: Date[][];
  cells: Record<string, FlashCell>;
  getCell: (dateValue: string) => FlashCell;
  trackDates: string[];
  currentDate?: string;
  nextDate?: string;
  confirmSelectedDate?: string;
  currentInput?: string;
  onConfirmCellClick?: (dateValue: string) => void;
};

export function FlashCalendarGrid({
  mode,
  weeks,
  getCell,
  trackDates,
  currentDate = '',
  nextDate = '',
  confirmSelectedDate = '',
  currentInput = '',
  onConfirmCellClick
}: FlashCalendarGridProps) {
  const firstVisibleDate = weeks[0]?.[0] ? toFlashDateValue(weeks[0][0]) : '';
  const activeDate = mode === 'confirm' ? confirmSelectedDate : currentDate;

  return (
    <div className={`flash-note-week-view flash-note-week-view--${mode}`}>
      {weeks.map((week) => {
        const weekKey = toFlashDateValue(week[0] ?? new Date());
        const isCurrentWeek =
          mode === 'input' && Boolean(activeDate) && week.some((date) => toFlashDateValue(date) === activeDate);
        const hasWeekValues = week.some((date) => {
          const dateValue = toFlashDateValue(date);
          return parseFlashNumberInput(getCell(dateValue).value) !== null;
        });

        return (
          <section
            key={`${mode}-${weekKey}`}
            className={[
              'flash-note-week-row',
              isCurrentWeek ? 'is-current-week' : '',
              !isCurrentWeek && hasWeekValues ? 'has-entered-values' : ''
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="flash-note-week-header">
              {FLASH_WEEKDAYS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="flash-note-week-grid">
              {week.map((date) => {
                const dateValue = toFlashDateValue(date);
                const cell = getCell(dateValue);
                const isCurrentCell = dateValue === activeDate;

                return (
                  <FlashDataCell
                    key={`${mode}-${dateValue}`}
                    dateValue={dateValue}
                    cell={cell}
                    mode={mode}
                    isFirstVisibleDate={dateValue === firstVisibleDate}
                    isCurrent={mode === 'input' && isCurrentCell}
                    isNext={mode === 'input' && dateValue === nextDate}
                    isConfirmSelected={mode === 'confirm' && dateValue === confirmSelectedDate}
                    displayValue={mode === 'input' && dateValue === currentDate ? currentInput : undefined}
                    onClick={
                      mode === 'confirm'
                        ? (targetDate) => onConfirmCellClick?.(targetDate)
                        : undefined
                    }
                    onPointerDown={
                      mode === 'input'
                        ? (_targetDate, event: PointerEvent<HTMLButtonElement>) => {
                            event.preventDefault();
                          }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
