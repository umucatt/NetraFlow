import type { MouseEvent, PointerEvent } from 'react';
import type { FlashCell } from './flashNoteTypes';
import {
  formatFlashWeekDateLabel,
  getFlashDate,
  isFutureFlashDate,
  parseFlashNumberInput
} from './flashNoteUtils';

type FlashDataCellMode = 'select' | 'input' | 'confirm';

type FlashDataCellProps = {
  dateValue: string;
  cell: FlashCell;
  mode: FlashDataCellMode;
  currentMonth?: boolean;
  isFirstVisibleDate?: boolean;
  isSelected?: boolean;
  isPreview?: boolean;
  isStart?: boolean;
  isEnd?: boolean;
  isRangeExcluded?: boolean;
  isCurrent?: boolean;
  isNext?: boolean;
  isDimmed?: boolean;
  isConfirmSelected?: boolean;
  displayValue?: string;
  onPointerDown?: (dateValue: string, event: PointerEvent<HTMLButtonElement>) => void;
  onPointerEnter?: (dateValue: string) => void;
  onPointerUp?: (dateValue: string, event: PointerEvent<HTMLButtonElement>) => void;
  onClick?: (dateValue: string, event: MouseEvent<HTMLButtonElement>) => void;
};

export function FlashDataCell({
  dateValue,
  cell,
  mode,
  currentMonth,
  isFirstVisibleDate = false,
  isSelected = false,
  isPreview = false,
  isStart = false,
  isEnd = false,
  isRangeExcluded = false,
  isCurrent = false,
  isNext = false,
  isDimmed = false,
  isConfirmSelected = false,
  displayValue,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
  onClick
}: FlashDataCellProps) {
  const isFuture = isFutureFlashDate(dateValue);
  const value = displayValue ?? cell.value;
  const hasValue = parseFlashNumberInput(value) !== null;
  const date = getFlashDate(dateValue);
  const dayLabel =
    mode === 'select'
      ? String(date.getDate())
      : mode === 'confirm'
        ? `${date.getMonth() + 1}/${date.getDate()}`
        : formatFlashWeekDateLabel(dateValue, isFirstVisibleDate);

  return (
    <button
      key={`${mode}-${dateValue}`}
      type="button"
      disabled={isFuture}
      className={[
        'flash-note-day',
        currentMonth === false ? 'is-outside-month' : '',
        isFuture ? 'is-future' : '',
        isSelected ? 'is-selected' : '',
        isPreview ? 'is-preview' : '',
        isStart ? 'is-start' : '',
        isEnd ? 'is-end' : '',
        isRangeExcluded ? 'is-range-excluded' : '',
        isCurrent ? 'is-current-input' : '',
        isNext ? 'is-next-input' : '',
        hasValue ? 'has-value' : '',
        cell.missing ? 'is-missing' : '',
        cell.enabled && !hasValue ? 'is-enabled-blank is-touched-empty' : '',
        isConfirmSelected ? 'is-confirm-selected' : '',
        isDimmed ? 'is-dimmed' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      onPointerDown={(event) => onPointerDown?.(dateValue, event)}
      onPointerEnter={() => onPointerEnter?.(dateValue)}
      onPointerUp={(event) => onPointerUp?.(dateValue, event)}
      onMouseDown={(event) => {
        if (mode === 'input' || mode === 'confirm') {
          event.preventDefault();
        }
      }}
      onClick={(event) => onClick?.(dateValue, event)}
    >
      <span className="flash-note-day__number">{dayLabel}</span>
      {isStart ? <span className="flash-note-day__marker">起</span> : null}
      {isEnd ? <span className="flash-note-day__marker">终</span> : null}
      <span className="flash-note-day__value">{value}</span>
    </button>
  );
}
