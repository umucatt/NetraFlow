import {
  formatDateRangeDisplay,
  toDateInputValue
} from '../../app/dateUtils';
import {
  type HistoryFilterState,
  getHistoryCalendarLeadMonthForDate,
  getHistoryCalendarMonthsForRange,
  getHistoryCalendarMonthForDateValue,
  getHistoryCalendarNextMonth,
  getHistoryCalendarPreviousMonth
} from './historyFilterLogic';

export type HistoryRecordDensityLevel = 'none' | 'low' | 'medium-low' | 'medium-high' | 'full';

export type HistoryCalendarDateState = {
  isCurrentMonth: boolean;
  isBoundary: boolean;
  isInsideRange: boolean;
  isFuture: boolean;
  recordCount: number;
  recordDensityLevel: HistoryRecordDensityLevel;
};

type HistoryCalendarDateStateOptions = {
  date: Date;
  monthDate: Date;
  startDate: string;
  endDate: string;
  dateCounts: Record<string, number>;
  referenceDate?: Date;
};

export const isFutureHistoryCalendarDate = (
  dateValue: string,
  referenceDate = new Date()
) => dateValue > toDateInputValue(referenceDate);

export const isHistoryCalendarNextDisabled = (
  calendarMonth: Date,
  referenceDate = new Date()
) => {
  const latestLeadMonth = getHistoryCalendarLeadMonthForDate(
    toDateInputValue(referenceDate),
    referenceDate
  );

  return (
    calendarMonth.getFullYear() > latestLeadMonth.getFullYear() ||
    (calendarMonth.getFullYear() === latestLeadMonth.getFullYear() &&
      calendarMonth.getMonth() >= latestLeadMonth.getMonth())
  );
};

export const getHistoryRecordDensityLevel = (
  recordCount: number
): HistoryRecordDensityLevel => {
  if (recordCount <= 0) {
    return 'none';
  }

  if (recordCount === 1) {
    return 'low';
  }

  if (recordCount <= 3) {
    return 'medium-low';
  }

  if (recordCount <= 7) {
    return 'medium-high';
  }

  return 'full';
};

export const getHistoryCalendarDateState = ({
  date,
  monthDate,
  startDate,
  endDate,
  dateCounts,
  referenceDate = new Date()
}: HistoryCalendarDateStateOptions): HistoryCalendarDateState => {
  const dateValue = toDateInputValue(date);
  const recordCount = dateCounts[dateValue] ?? 0;

  return {
    isCurrentMonth:
      date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth(),
    isBoundary: dateValue === startDate || dateValue === endDate,
    isInsideRange:
      Boolean(startDate && endDate) && dateValue > startDate && dateValue < endDate,
    isFuture: isFutureHistoryCalendarDate(dateValue, referenceDate),
    recordCount,
    recordDensityLevel: getHistoryRecordDensityLevel(recordCount)
  };
};

export const getPreviousHistoryCalendarMonth = (calendarMonth: Date) =>
  getHistoryCalendarPreviousMonth(calendarMonth);

export const getNextHistoryCalendarMonth = (calendarMonth: Date) =>
  getHistoryCalendarNextMonth(calendarMonth);

export const getVisibleHistoryCalendarSecondMonth = (state: HistoryFilterState) =>
  state.calendarSecondMonth ?? getNextHistoryCalendarMonth(state.calendarMonth);

export const shiftHistoryCalendarVisibleMonths = (
  currentState: HistoryFilterState,
  direction: -1 | 1
): HistoryFilterState => ({
  ...currentState,
  calendarMonth:
    direction < 0
      ? getPreviousHistoryCalendarMonth(currentState.calendarMonth)
      : getNextHistoryCalendarMonth(currentState.calendarMonth),
  calendarSecondMonth: null
});

const getCalendarMonthAfterCompletedRangeReset = (
  currentState: HistoryFilterState,
  clickedMonthDate?: Date
) => {
  if (!currentState.startDate || !currentState.endDate || !clickedMonthDate) {
    return currentState.calendarMonth;
  }

  const clickedMonth = new Date(clickedMonthDate.getFullYear(), clickedMonthDate.getMonth(), 1);
  const visibleSecondMonth = getVisibleHistoryCalendarSecondMonth(currentState);

  if (
    clickedMonth.getFullYear() === visibleSecondMonth.getFullYear() &&
    clickedMonth.getMonth() === visibleSecondMonth.getMonth()
  ) {
    return getPreviousHistoryCalendarMonth(clickedMonth);
  }

  return clickedMonth;
};

export const selectHistoryCalendarDate = (
  currentState: HistoryFilterState,
  date: Date,
  referenceDate = new Date(),
  clickedMonthDate?: Date
): HistoryFilterState => {
  const selectedDate = toDateInputValue(date);

  if (isFutureHistoryCalendarDate(selectedDate, referenceDate)) {
    return currentState;
  }

  if (!currentState.startDate || currentState.endDate) {
    return {
      ...currentState,
      startDate: selectedDate,
      endDate: '',
      rangeInput: selectedDate,
      calendarMonth: getCalendarMonthAfterCompletedRangeReset(currentState, clickedMonthDate),
      calendarSecondMonth: null,
      rangeInputNotice: ''
    };
  }

  const nextStartDate =
    currentState.startDate <= selectedDate ? currentState.startDate : selectedDate;
  const nextEndDate =
    currentState.startDate <= selectedDate ? selectedDate : currentState.startDate;
  const calendarMonths = getHistoryCalendarMonthsForRange(
    nextStartDate,
    nextEndDate,
    referenceDate
  );

  return {
    ...currentState,
    startDate: nextStartDate,
    endDate: nextEndDate,
    rangeInput: formatDateRangeDisplay(nextStartDate, nextEndDate),
    ...calendarMonths,
    rangeInputNotice: ''
  };
};
