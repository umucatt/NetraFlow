import { isMoneyInput, normalizeMoneyInput, parseMoneyInput } from '../../money';
import type { FlashCell, FlashDateRule, FlashDirection } from './flashNoteTypes';

export const FLASH_WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export const addFlashDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export const toFlashDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getFlashDate = (dateValue: string) => new Date(`${dateValue}T00:00:00`);

export const getFlashTodayValue = () => toFlashDateValue(new Date());

export const isFutureFlashDate = (dateValue: string) => dateValue > getFlashTodayValue();

export const getFlashMonday = (date: Date) =>
  addFlashDays(date, -((date.getDay() + 6) % 7));

export const getFlashWeekKey = (dateValue: string) =>
  toFlashDateValue(getFlashMonday(getFlashDate(dateValue)));

export const getFlashMonthStart = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export const getFlashDefaultVisibleMonth = (date = new Date()) =>
  getFlashMonthStart(new Date(date.getFullYear(), date.getMonth() - 1, 1));

export const getFlashMonthLabel = (monthDate: Date) =>
  `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`;

export const getFlashWeekdayLabel = (dateValue: string) => {
  const date = getFlashDate(dateValue);
  return FLASH_WEEKDAYS[(date.getDay() + 6) % 7] ?? '';
};

export const formatFlashShortDate = (dateValue: string) => {
  if (!dateValue) {
    return '--';
  }

  const date = getFlashDate(dateValue);
  return `${date.getMonth() + 1}.${date.getDate()}`;
};

export const formatFlashWeekDateLabel = (dateValue: string, isFirstVisibleDate: boolean) => {
  const date = getFlashDate(dateValue);
  const day = date.getDate();

  if (isFirstVisibleDate || day === 1) {
    return `${date.getMonth() + 1}/${day}`;
  }

  return String(day);
};

export const formatFlashDateRange = (dates: string[]) => {
  if (dates.length === 0) {
    return '--';
  }

  const sortedDates = [...dates].sort();
  const firstDate = sortedDates[0] ?? '';
  const lastDate = sortedDates[sortedDates.length - 1] ?? firstDate;

  return firstDate === lastDate
    ? formatFlashShortDate(firstDate)
    : `${formatFlashShortDate(firstDate)}-${formatFlashShortDate(lastDate)}`;
};

export const getFlashDateRange = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) {
    return [];
  }

  const direction = startDate <= endDate ? 1 : -1;
  const result: string[] = [];
  let cursor = getFlashDate(startDate);
  const endTime = getFlashDate(endDate).getTime();

  while (direction === 1 ? cursor.getTime() <= endTime : cursor.getTime() >= endTime) {
    const dateValue = toFlashDateValue(cursor);
    if (!isFutureFlashDate(dateValue)) {
      result.push(dateValue);
    }
    cursor = addFlashDays(cursor, direction);
  }

  return result;
};

export const getFlashRangeExcludedDates = ({
  activeDateRule,
  endDate,
  selectedDates,
  startDate
}: {
  activeDateRule: FlashDateRule | null;
  endDate: string;
  selectedDates: Set<string>;
  startDate: string;
}) => {
  if (!startDate || !endDate || !activeDateRule || activeDateRule === 'all') {
    return [];
  }

  return getFlashDateRange(startDate, endDate).filter((dateValue) => !selectedDates.has(dateValue));
};

export const sortFlashDatesByDirection = (dates: string[], direction: FlashDirection) => {
  const sortedDates = Array.from(new Set(dates)).sort();
  return direction === 'backward' ? sortedDates.reverse() : sortedDates;
};

export const getFlashDirectionFromDates = (
  startDate: string,
  endDate: string
): FlashDirection => (startDate && endDate && endDate < startDate ? 'backward' : 'forward');

export const getContinuousFlashDates = ({
  startDate,
  direction,
  minimumCount,
  includeDates = []
}: {
  startDate: string;
  direction: FlashDirection;
  minimumCount: number;
  includeDates?: string[];
}) => {
  if (!startDate) {
    return [];
  }

  const start = getFlashDate(startDate);
  const includeOffsets = includeDates
    .filter((dateValue) => !isFutureFlashDate(dateValue))
    .map((dateValue) => {
      const offset = Math.round((getFlashDate(dateValue).getTime() - start.getTime()) / 86400000);
      return direction === 'backward' ? -offset : offset;
    })
    .filter((offset) => offset >= 0);
  const count = Math.max(minimumCount, ...includeOffsets.map((offset) => offset + 1), 1);
  const step = direction === 'forward' ? 1 : -1;

  return Array.from({ length: count }, (_, index) =>
    toFlashDateValue(addFlashDays(start, index * step))
  ).filter((dateValue) => !isFutureFlashDate(dateValue));
};

export const getFlashWeeksAround = (currentDate: string, direction: FlashDirection) => {
  if (!currentDate) {
    return [];
  }

  const currentMonday = getFlashMonday(getFlashDate(currentDate));
  const offsets = direction === 'forward' ? [-1, 0, 1, 2, 3] : [-3, -2, -1, 0, 1];

  return offsets.map((offset) =>
    Array.from({ length: 7 }, (_, index) => addFlashDays(currentMonday, offset * 7 + index))
  );
};

export const getFlashWeeksForDates = (dates: string[]) => {
  const naturalDates = [...dates].sort();
  const firstDate = naturalDates[0];
  const lastDate = naturalDates[naturalDates.length - 1];

  if (!firstDate || !lastDate) {
    return [];
  }

  const startMonday = getFlashMonday(getFlashDate(firstDate));
  const endMonday = getFlashMonday(getFlashDate(lastDate));
  const weekCount =
    Math.max(0, Math.round((endMonday.getTime() - startMonday.getTime()) / (86400000 * 7))) + 1;

  return Array.from({ length: weekCount }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => addFlashDays(startMonday, weekIndex * 7 + dayIndex))
  );
};

export const isValidFlashNumberInput = (value: string) =>
  isMoneyInput(value, { allowNegative: true });

export const parseFlashNumberInput = (value: string) =>
  parseMoneyInput(value, { allowNegative: true });

export const appendFlashInputCharacter = (value: string, key: string) => {
  if (!/^[\d.+-]$/.test(key)) {
    return value;
  }

  if (key === '+') {
    return value.startsWith('-') ? value.slice(1) : value;
  }

  if (key === '-') {
    return value.startsWith('-') ? value.slice(1) : `-${value}`;
  }

  const nextValue = normalizeMoneyInput(`${value}${key}`, { allowNegative: true });
  return isValidFlashNumberInput(nextValue) ? nextValue : value;
};

export const backspaceFlashInputValue = (value: string) => value.slice(0, -1);

export const resolveFlashUndoStep = ({
  cells,
  currentDate,
  currentIndex,
  currentInput,
  trackDates
}: {
  cells: Record<string, FlashCell>;
  currentDate: string;
  currentIndex: number;
  currentInput: string;
  trackDates: string[];
}) => {
  const currentCell = currentDate ? cells[currentDate] : undefined;
  const currentHasValue =
    parseFlashNumberInput(currentInput) !== null ||
    parseFlashNumberInput(currentCell?.value ?? '') !== null;
  const targetIndex = currentHasValue ? Math.max(0, currentIndex - 1) : Math.max(0, currentIndex - 1);
  const clearDate = currentHasValue ? currentDate : trackDates[targetIndex] ?? '';

  return {
    clearDate,
    nextIndex: targetIndex
  };
};
