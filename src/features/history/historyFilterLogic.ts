import {
  addDays,
  formatDateRangeDisplay,
  getDateKeyFromValue,
  getHistoryDateKey,
  getHistoryRangeTokens,
  isWithinDateRange,
  parseDateToken,
  toDateInputValue
} from '../../app/dateUtils';

export type HistoryDateRange = {
  start: string;
  end: string;
};

export type HistoryFilterState = {
  startDate: string;
  endDate: string;
  rangeInput: string;
  calendarMonth: Date;
  calendarSecondMonth: Date | null;
  rangeInputNotice: HistoryRangeInputNotice;
};

export type HistoryFilterStatus = {
  hasDateFilter: boolean;
  effectiveStartDate: string;
  effectiveEndDate: string;
  rangeText: string;
};

type HistoryTimedRecord = {
  time: string;
};

export type HistoryRangeInputNotice = '' | 'future-date';

export const DEFAULT_HISTORY_RANGE_INPUT_PLACEHOLDER = '0325  0421    250325  260421';
export const FUTURE_HISTORY_RANGE_INPUT_PLACEHOLDER = '无法选择未来日';

const getTodayValue = (referenceDate = new Date()) => toDateInputValue(referenceDate);

const clampDateValue = (dateValue: string, referenceDate = new Date()) => {
  const todayValue = getTodayValue(referenceDate);
  return dateValue > todayValue ? todayValue : dateValue;
};

const isFutureDateValue = (dateValue: string, referenceDate = new Date()) =>
  dateValue > getTodayValue(referenceDate);

export const getHistoryCalendarMonthForDateValue = (
  dateValue = getTodayValue(),
  referenceDate = new Date()
) => {
  const date = getDateKeyFromValue(clampDateValue(dateValue, referenceDate));
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getHistoryCalendarNextMonth = (monthDate: Date) =>
  new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

export const getHistoryCalendarPreviousMonth = (monthDate: Date) =>
  new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

const isNextAdjacentMonth = (left: Date, right: Date) =>
  isSameMonth(getHistoryCalendarNextMonth(left), right);

export const getHistoryCalendarMonthsForRange = (
  startDate: string,
  endDate: string,
  referenceDate = new Date()
) => {
  const startMonth = getHistoryCalendarMonthForDateValue(startDate, referenceDate);
  const endMonth = getHistoryCalendarMonthForDateValue(endDate, referenceDate);

  return {
    calendarMonth: startMonth,
    calendarSecondMonth:
      isSameMonth(startMonth, endMonth) || isNextAdjacentMonth(startMonth, endMonth)
        ? null
        : endMonth
  };
};

const getParsedHistoryRangeInputDates = (value: string) =>
  getHistoryRangeTokens(value)
    .map((token) => parseDateToken(token))
    .filter((date): date is NonNullable<ReturnType<typeof parseDateToken>> => Boolean(date))
    .slice(0, 2);

export const getHistoryCalendarLeadMonthForDate = (
  dateValue = getTodayValue(),
  referenceDate = new Date()
) => {
  const date = getDateKeyFromValue(clampDateValue(dateValue, referenceDate));
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
};

export const createEmptyHistoryFilterState = (
  referenceDate = new Date()
): HistoryFilterState => ({
  startDate: '',
  endDate: '',
  rangeInput: '',
  calendarMonth: getHistoryCalendarLeadMonthForDate(getTodayValue(referenceDate), referenceDate),
  calendarSecondMonth: null,
  rangeInputNotice: ''
});

const createHistoryRangeFilterState = (
  range: HistoryDateRange,
  referenceDate = new Date()
): HistoryFilterState => {
  const safeStartDate = clampDateValue(range.start, referenceDate);
  const safeEndDate = clampDateValue(range.end, referenceDate);
  const startDate = safeStartDate <= safeEndDate ? safeStartDate : safeEndDate;
  const endDate = safeStartDate <= safeEndDate ? safeEndDate : safeStartDate;
  const calendarMonths = getHistoryCalendarMonthsForRange(startDate, endDate, referenceDate);

  return {
    startDate,
    endDate,
    rangeInput: formatDateRangeDisplay(startDate, endDate),
    ...calendarMonths,
    rangeInputNotice: ''
  };
};

const createFutureDateRejectedHistoryFilterState = (
  currentState: HistoryFilterState,
  referenceDate = new Date()
): HistoryFilterState => ({
  ...currentState,
  startDate: '',
  endDate: '',
  rangeInput: '',
  calendarMonth: getHistoryCalendarLeadMonthForDate(getTodayValue(referenceDate), referenceDate),
  calendarSecondMonth: null,
  rangeInputNotice: 'future-date'
});

export const getLastWeekHistoryRange = (referenceDate = new Date()): HistoryDateRange => {
  const daysSinceMonday = (referenceDate.getDay() + 6) % 7;
  const thisMonday = addDays(referenceDate, -daysSinceMonday);

  return {
    start: toDateInputValue(addDays(thisMonday, -7)),
    end: toDateInputValue(addDays(thisMonday, -1))
  };
};

export const getRecent7HistoryRange = (referenceDate = new Date()): HistoryDateRange => ({
  start: toDateInputValue(addDays(referenceDate, -6)),
  end: toDateInputValue(referenceDate)
});

export const createLastWeekHistoryFilterState = (
  referenceDate = new Date()
): HistoryFilterState =>
  createHistoryRangeFilterState(getLastWeekHistoryRange(referenceDate), referenceDate);

export const createRecent7HistoryFilterState = (
  referenceDate = new Date()
): HistoryFilterState =>
  createHistoryRangeFilterState(getRecent7HistoryRange(referenceDate), referenceDate);

export const applyHistoryRangeInput = (
  currentState: HistoryFilterState,
  value: string,
  referenceDate = new Date()
): HistoryFilterState => {
  const nextState: HistoryFilterState = {
    ...currentState,
    rangeInput: value,
    rangeInputNotice: ''
  };

  if (!value.trim()) {
    return {
      ...nextState,
      startDate: '',
      endDate: '',
      calendarSecondMonth: null
    };
  }

  const parsedDates = getParsedHistoryRangeInputDates(value);
  const firstDate = parsedDates[0] ?? null;

  if (firstDate) {
    if (isFutureDateValue(firstDate.value, referenceDate)) {
      return createFutureDateRejectedHistoryFilterState(currentState, referenceDate);
    }

    nextState.startDate = firstDate.value;
    nextState.endDate = '';
    nextState.calendarMonth = getHistoryCalendarMonthForDateValue(
      firstDate.value,
      referenceDate
    );
    nextState.calendarSecondMonth = null;
  }

  const secondDate = parsedDates[1] ?? null;

  if (!firstDate || !secondDate) {
    return nextState;
  }

  const safeSecondDate = isFutureDateValue(secondDate.value, referenceDate)
    ? getTodayValue(referenceDate)
    : secondDate.value;

  return createHistoryRangeFilterState(
    {
      start: firstDate.value,
      end: safeSecondDate
    },
    referenceDate
  );
};

export const confirmSingleHistoryDateInput = (
  currentState: HistoryFilterState,
  referenceDate = new Date()
): HistoryFilterState => {
  const parsedDates = getParsedHistoryRangeInputDates(currentState.rangeInput);
  const parsedDate = parsedDates[0] ?? null;

  if (parsedDates.length !== 1 || !parsedDate) {
    return currentState;
  }

  if (isFutureDateValue(parsedDate.value, referenceDate)) {
    return createFutureDateRejectedHistoryFilterState(currentState, referenceDate);
  }

  return createHistoryRangeFilterState(
    { start: parsedDate.value, end: parsedDate.value },
    referenceDate
  );
};

export const clearHistoryFilterState = (referenceDate = new Date()): HistoryFilterState =>
  createEmptyHistoryFilterState(referenceDate);

export const getHistoryFilterStatus = (
  state: Pick<HistoryFilterState, 'startDate' | 'endDate'>,
  referenceDate = new Date()
): HistoryFilterStatus => {
  const fallbackRange = getRecent7HistoryRange(referenceDate);
  const hasDateFilter = Boolean(state.startDate && state.endDate);
  const effectiveStartDate = hasDateFilter ? state.startDate : fallbackRange.start;
  const effectiveEndDate = hasDateFilter ? state.endDate : fallbackRange.end;

  return {
    hasDateFilter,
    effectiveStartDate,
    effectiveEndDate,
    rangeText: formatDateRangeDisplay(effectiveStartDate, effectiveEndDate)
  };
};

export const getHistoryDateCounts = <TRecord extends HistoryTimedRecord>(
  records: TRecord[]
) =>
  records.reduce<Record<string, number>>((counts, record) => {
    const recordDate = getHistoryDateKey(record.time);

    if (recordDate) {
      counts[recordDate] = (counts[recordDate] ?? 0) + 1;
    }

    return counts;
  }, {});

export const filterHistoryRecordsByDate = <TRecord extends HistoryTimedRecord>(
  records: TRecord[],
  range: HistoryDateRange
) => records.filter((record) => isWithinDateRange(record.time, range.start, range.end));
