const DATE_VALUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toDateValue = (year: number, month: number, day: number) => {
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  const normalizedYear = String(year).padStart(4, '0');
  const normalizedMonth = String(month).padStart(2, '0');
  const normalizedDay = String(day).padStart(2, '0');

  return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
};

export const toAccountOperationDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getAccountOperationTodayDateValue = () =>
  toAccountOperationDateValue(new Date());

export const getAccountOperationCalendarMonth = (dateValue: string) => {
  const parsedDate = isAccountOperationDateValue(dateValue)
    ? new Date(`${dateValue}T00:00:00`)
    : new Date();

  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
};

export const shiftAccountOperationCalendarMonth = (monthDate: Date, offset: number) =>
  new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);

export const isFutureAccountOperationDateValue = (
  dateValue: string,
  todayValue = getAccountOperationTodayDateValue()
) => dateValue > todayValue;

export const resolveAccountOperationDateInputState = (
  value: string,
  currentVisibleMonth: Date,
  currentYear = new Date().getFullYear()
) => {
  const parsedDate = parseAccountOperationDateInput(value, currentYear);

  if (!parsedDate) {
    return {
      parsedDate,
      selectedDate: null,
      visibleMonth: currentVisibleMonth
    };
  }

  return {
    parsedDate,
    selectedDate: parsedDate,
    visibleMonth: getAccountOperationCalendarMonth(parsedDate)
  };
};

export const resolveProtectedAccountOperationDateInputState = (
  value: string,
  currentVisibleMonth: Date,
  todayValue = getAccountOperationTodayDateValue(),
  currentYear = new Date().getFullYear()
) => {
  const nextState = resolveAccountOperationDateInputState(value, currentVisibleMonth, currentYear);

  if (!nextState.parsedDate || !isFutureAccountOperationDateValue(nextState.parsedDate, todayValue)) {
    return {
      ...nextState,
      isFutureDate: false
    };
  }

  return {
    parsedDate: todayValue,
    selectedDate: todayValue,
    visibleMonth: getAccountOperationCalendarMonth(todayValue),
    isFutureDate: true
  };
};

export const parseAccountOperationDateInput = (
  value: string,
  currentYear = new Date().getFullYear()
) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const numericValue = trimmedValue.replace(/\s+/g, '');

  if (/^\d{4}$/.test(numericValue)) {
    return toDateValue(currentYear, Number(numericValue.slice(0, 2)), Number(numericValue.slice(2, 4)));
  }

  if (/^\d{6}$/.test(numericValue)) {
    return toDateValue(
      2000 + Number(numericValue.slice(0, 2)),
      Number(numericValue.slice(2, 4)),
      Number(numericValue.slice(4, 6))
    );
  }

  if (/^\d{8}$/.test(numericValue)) {
    return toDateValue(
      Number(numericValue.slice(0, 4)),
      Number(numericValue.slice(4, 6)),
      Number(numericValue.slice(6, 8))
    );
  }

  const normalizedValue = trimmedValue.replace(/\//g, '-').replace(/\./g, '-');
  const fullDateMatch = normalizedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (fullDateMatch) {
    return toDateValue(
      Number(fullDateMatch[1]),
      Number(fullDateMatch[2]),
      Number(fullDateMatch[3])
    );
  }

  const shortYearMatch = normalizedValue.match(/^(\d{2})-(\d{1,2})-(\d{1,2})$/);

  if (shortYearMatch) {
    return toDateValue(
      2000 + Number(shortYearMatch[1]),
      Number(shortYearMatch[2]),
      Number(shortYearMatch[3])
    );
  }

  const monthDayMatch = normalizedValue.match(/^(\d{1,2})-(\d{1,2})$/);

  if (monthDayMatch) {
    return toDateValue(currentYear, Number(monthDayMatch[1]), Number(monthDayMatch[2]));
  }

  return null;
};

export const isAccountOperationDateValue = (value: string) =>
  DATE_VALUE_PATTERN.test(value) && parseAccountOperationDateInput(value) === value;

export const toAccountOperationIsoTime = (dateValue: string) => {
  if (!isAccountOperationDateValue(dateValue)) {
    return new Date().toISOString();
  }

  return new Date(`${dateValue}T12:00:00`).toISOString();
};
