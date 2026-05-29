import type { HistoryRecord } from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const getValidTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getRecent7DayRange = () => {
  const today = new Date();

  return {
    start: toDateInputValue(addDays(today, -6)),
    end: toDateInputValue(today)
  };
};

export const getRangeTime = (dateValue: string, edge: 'start' | 'end') => {
  if (!dateValue) {
    return edge === 'start' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }

  const time = new Date(`${dateValue}T${edge === 'start' ? '00:00:00' : '23:59:59.999'}`).getTime();

  return Number.isFinite(time)
    ? time
    : edge === 'start'
      ? Number.NEGATIVE_INFINITY
      : Number.POSITIVE_INFINITY;
};

export const getSelectedDayCount = (startDate: string, endDate: string) => {
  if (!startDate) {
    return 0;
  }

  const startTime = getRangeTime(startDate, 'start');
  const endTime = getRangeTime(endDate || startDate, 'start');

  return Math.abs(Math.round((endTime - startTime) / DAY_MS)) + 1;
};

export const getDateKeyFromValue = (dateValue: string) => new Date(`${dateValue}T00:00:00`);

export const getTodayDateKey = () => toDateInputValue(new Date());

export const isFutureDateKey = (dateValue: string) => dateValue > getTodayDateKey();

export const clampHistoryDateValue = (dateValue: string) =>
  isFutureDateKey(dateValue) ? getTodayDateKey() : dateValue;

export const getHistoryCalendarLeadMonth = (dateValue = getTodayDateKey()) => {
  const date = getDateKeyFromValue(clampHistoryDateValue(dateValue));
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
};

export const getMondayDate = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));

export const getDateWeekKey = (dateValue: string) =>
  toDateInputValue(getMondayDate(getDateKeyFromValue(dateValue)));

export const getDateRangeKeys = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) {
    return [];
  }

  const direction = startDate <= endDate ? 1 : -1;
  const result: string[] = [];
  let cursor = getDateKeyFromValue(startDate);
  const endTime = getDateKeyFromValue(endDate).getTime();

  while (direction === 1 ? cursor.getTime() <= endTime : cursor.getTime() >= endTime) {
    const dateValue = toDateInputValue(cursor);
    if (!isFutureDateKey(dateValue)) {
      result.push(dateValue);
    }
    cursor = addDays(cursor, direction);
  }

  return result;
};

export const formatDateRangeDisplay = (startDate: string, endDate: string) => {
  if (!startDate) {
    return '';
  }

  const safeEndDate = endDate || startDate;
  const dateText = startDate === safeEndDate ? startDate : `${startDate} 至 ${safeEndDate}`;

  return `${dateText}，共选取 ${getSelectedDayCount(startDate, safeEndDate)} 天`;
};

export const parseDateToken = (token: string) => {
  const trimmedToken = token.trim();

  if (!/^\d{4}$|^\d{6}$/.test(trimmedToken)) {
    return null;
  }

  const year =
    trimmedToken.length === 6
      ? 2000 + Number(trimmedToken.slice(0, 2))
      : new Date().getFullYear();
  const month =
    trimmedToken.length === 6
      ? Number(trimmedToken.slice(2, 4))
      : Number(trimmedToken.slice(0, 2));
  const day =
    trimmedToken.length === 6
      ? Number(trimmedToken.slice(4, 6))
      : Number(trimmedToken.slice(2, 4));
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return {
    value: toDateInputValue(parsedDate),
    year,
    hasExplicitYear: trimmedToken.length === 6
  };
};

export const getHistoryRangeTokens = (value: string) => {
  const normalizedValue = value.replace(/至/g, ' ');
  const explicitDateTokens = normalizedValue.match(/\d{4}-\d{2}-\d{2}/g) ?? [];

  if (explicitDateTokens.length > 0) {
    return explicitDateTokens.map((dateValue) => dateValue.replace(/\D/g, '').slice(2));
  }

  return normalizedValue.match(/\d{4,6}/g) ?? [];
};

export const parseHistoryRangeInput = (value: string) => {
  const tokens = getHistoryRangeTokens(value);

  if (tokens.length < 2) {
    return null;
  }

  const firstToken = tokens[0] ?? '';
  const secondToken = tokens[1] ?? '';
  const firstDate = parseDateToken(firstToken);
  const secondDate = parseDateToken(secondToken);

  if (!firstDate || !secondDate) {
    return null;
  }

  return firstDate.value <= secondDate.value
    ? { start: firstDate.value, end: secondDate.value }
    : { start: secondDate.value, end: firstDate.value };
};

export const getLastWeekRange = () => {
  const today = new Date();
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const thisMonday = addDays(today, -daysSinceMonday);

  return {
    start: toDateInputValue(addDays(thisMonday, -7)),
    end: toDateInputValue(addDays(thisMonday, -1))
  };
};

export const isWithinDateRange = (time: string, startDate: string, endDate: string) => {
  const timestamp = new Date(time).getTime();

  return timestamp >= getRangeTime(startDate, 'start') && timestamp <= getRangeTime(endDate, 'end');
};

export const getHistoryTimestamp = (record: HistoryRecord) => {
  const timestamp = Date.parse(record.time);

  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const compareHistoryByTimeDesc = (left: HistoryRecord, right: HistoryRecord) =>
  getHistoryTimestamp(right) - getHistoryTimestamp(left);

export const formatHistoryRecordDate = (time: string) => getHistoryDateKey(time);

export const createHistoryTimestampForBusinessDate = (
  dateValue: string,
  writeTime = new Date(),
  sequenceOffsetMs = 0
) => {
  const fallbackTime = new Date(writeTime.getTime() + sequenceOffsetMs);
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return fallbackTime.toISOString();
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = new Date(
    year,
    month - 1,
    day,
    writeTime.getHours(),
    writeTime.getMinutes(),
    writeTime.getSeconds(),
    writeTime.getMilliseconds() + sequenceOffsetMs
  );

  if (
    timestamp.getFullYear() !== year ||
    timestamp.getMonth() !== month - 1 ||
    timestamp.getDate() !== day
  ) {
    return fallbackTime.toISOString();
  }

  return timestamp.toISOString();
};

export const getDateTimestamp = (dateValue: string) => {
  const timestamp = new Date(`${dateValue}T00:00:00`).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getDateEndTimestamp = (dateValue: string) => {
  const timestamp = new Date(`${dateValue}T23:59:59.999`).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getHistoryDateKey = (time: string) => {
  const timestamp = getValidTimestamp(time);

  return timestamp === null ? '' : toDateInputValue(new Date(timestamp));
};

export const getRelativeDateLabel = (dateValue: string) => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetStart = getDateTimestamp(dateValue);
  const dayDistance =
    targetStart === 0 ? 0 : Math.max(0, Math.floor((todayStart - targetStart) / DAY_MS));

  if (dayDistance === 0) {
    return '今天';
  }

  if (dayDistance === 1) {
    return '昨天';
  }

  return `${dayDistance} 天前`;
};

export const getHistoryOrder = (time: string, fallback: number) => {
  const timestamp = getValidTimestamp(time);
  return timestamp ?? fallback;
};

export const getCalendarDays = (monthDate: Date) => {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const leadingDays = (monthStart.getDay() + 6) % 7;
  const calendarStart = addDays(monthStart, -leadingDays);

  return Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));
};
