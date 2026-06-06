import {
  getDateKeyFromValue,
  getDateRangeKeys,
  isFutureDateKey,
  toDateInputValue
} from '../../app/dateUtils';
import { formatMoneyInputValue } from '../../money';
import {
  getContinuousFlashDates,
  getFlashDirectionFromDates,
  getFlashWeeksForDates,
  parseFlashNumberInput,
  resolveFlashSelectionBounds,
  resolveFlashSelectionDates,
  sortFlashDatesByDirection
} from './flashNoteUtils';
import type {
  FlashCell,
  FlashDateRule,
  FlashDirection,
  FlashSelectionMode,
  FlashStep
} from './flashNoteTypes';

export type FlashDateSelectionBounds = {
  end?: string;
  keepBounds?: boolean;
  start: string;
};

export const createDefaultFlashCell = (
  dateValue: string,
  selectedDates: Set<string>
): FlashCell => {
  const isSelected = selectedDates.has(dateValue);

  return {
    date: dateValue,
    value: '',
    enabled: isSelected,
    original: isSelected,
    missing: false
  };
};

export const getFlashCellFromState = ({
  cells,
  dateValue,
  selectedDates
}: {
  cells: Record<string, FlashCell>;
  dateValue: string;
  selectedDates: Set<string>;
}) => cells[dateValue] ?? createDefaultFlashCell(dateValue, selectedDates);

export const createFlashCellFromState = ({
  cells,
  dateValue,
  overrides = {},
  selectedDates
}: {
  cells: Record<string, FlashCell>;
  dateValue: string;
  overrides?: Partial<FlashCell>;
  selectedDates: Set<string>;
}): FlashCell => ({
  ...getFlashCellFromState({ cells, dateValue, selectedDates }),
  ...overrides,
  date: dateValue
});

export const getFlashVisibleSelectableDates = (visibleMonth: Date) => {
  const visibleMonthEnd = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 2,
    0
  );

  return getDateRangeKeys(toDateInputValue(visibleMonth), toDateInputValue(visibleMonthEnd));
};

export const wouldFlashSelectionFillVisibleRange = ({
  dates,
  visibleSelectableDates
}: {
  dates: string[];
  visibleSelectableDates: string[];
}) =>
  visibleSelectableDates.length > 0 &&
  dates.length === visibleSelectableDates.length &&
  visibleSelectableDates.every((dateValue) => dates.includes(dateValue));

export const getFlashSelectionResult = ({
  candidateDates,
  isDateDisabled = isFutureDateKey,
  mode,
  selectedDates
}: {
  candidateDates: string[];
  isDateDisabled?: (dateValue: string) => boolean;
  mode: FlashSelectionMode;
  selectedDates: string[];
}) =>
  resolveFlashSelectionDates({
    candidateDates,
    isDateDisabled,
    mode,
    selectedDates
  });

export const resolveFlashDateSelection = ({
  bounds,
  candidateDates,
  currentEndDate,
  currentStartDate,
  isDateDisabled = isFutureDateKey,
  mode,
  selectedDates,
  visibleSelectableDates
}: {
  bounds?: FlashDateSelectionBounds;
  candidateDates: string[];
  currentEndDate: string;
  currentStartDate: string;
  isDateDisabled?: (dateValue: string) => boolean;
  mode: FlashSelectionMode;
  selectedDates: string[];
  visibleSelectableDates: string[];
}) => {
  const nextDates = getFlashSelectionResult({
    candidateDates,
    isDateDisabled,
    mode,
    selectedDates
  });

  if (wouldFlashSelectionFillVisibleRange({ dates: nextDates, visibleSelectableDates })) {
    return null;
  }

  const nextBounds = resolveFlashSelectionBounds({
    currentEndDate,
    currentStartDate,
    mode,
    nextDates,
    requestedEndDate: bounds?.end,
    requestedStartDate: bounds?.start,
    shouldPreserveBounds: Boolean(bounds?.keepBounds)
  });

  return {
    endDate: nextBounds.endDate,
    selectedDates: nextDates,
    startDate: nextBounds.startDate
  };
};

export const getFlashTrackDates = ({
  cells,
  endDate,
  inputCursor,
  selectedDates,
  startDate,
  direction = getFlashDirectionFromDates(startDate, endDate)
}: {
  cells: Record<string, FlashCell>;
  direction?: FlashDirection;
  endDate: string;
  inputCursor: number;
  selectedDates: string[];
  startDate: string;
}) => {
  const safeDates = selectedDates.filter((dateValue) => !isFutureDateKey(dateValue));

  if (
    startDate &&
    !endDate &&
    safeDates.length === 1 &&
    safeDates[0] === startDate &&
    !isFutureDateKey(startDate)
  ) {
    return getContinuousFlashDates({
      startDate,
      direction,
      minimumCount: Math.max(35, inputCursor + 14),
      includeDates: Object.keys(cells)
    });
  }

  return safeDates.length === 0 ? [] : sortFlashDatesByDirection(safeDates, direction);
};

export const getFlashDateRuleCandidateDates = ({
  endDate,
  rule,
  startDate
}: {
  endDate: string;
  rule: FlashDateRule;
  startDate: string;
}) => {
  if (!startDate || isFutureDateKey(startDate)) {
    return [];
  }

  const resolvedEndDate = endDate || startDate;

  return getDateRangeKeys(startDate, resolvedEndDate).filter((dateValue) => {
    const weekdayIndex = getDateKeyFromValue(dateValue).getDay();

    if (rule === 'weekday') {
      return weekdayIndex >= 1 && weekdayIndex <= 5;
    }

    if (rule === 'weekend') {
      return weekdayIndex === 0 || weekdayIndex === 6;
    }

    return true;
  });
};

export const isFlashDateRuleDisabled = ({
  candidateDates,
  selectedDates,
  visibleSelectableDates
}: {
  candidateDates: string[];
  selectedDates: string[];
  visibleSelectableDates: string[];
}) => {
  if (candidateDates.length === 0) {
    return true;
  }

  return wouldFlashSelectionFillVisibleRange({
    dates: getFlashSelectionResult({
      candidateDates,
      mode: 'replace',
      selectedDates
    }),
    visibleSelectableDates
  });
};

export const createFlashInitialInputCells = ({
  endDate,
  selectedDates,
  startDate,
  trackDates
}: {
  endDate: string;
  selectedDates: string[];
  startDate: string;
  trackDates: string[];
}) => {
  const isOpenSingleDateSelection =
    !endDate && selectedDates.length === 1 && selectedDates[0] === startDate;
  const initialTrackDates = isOpenSingleDateSelection ? trackDates.slice(0, 1) : trackDates;

  return initialTrackDates.reduce<Record<string, FlashCell>>(
    (cells, dateValue) => ({
      ...cells,
      [dateValue]: {
        date: dateValue,
        value: '',
        enabled: true,
        original: true,
        missing: false
      }
    }),
    {}
  );
};

export const hasFlashTemporaryContent = ({
  cells,
  selectedDates,
  startDate,
  step
}: {
  cells: Record<string, FlashCell>;
  selectedDates: string[];
  startDate: string;
  step: FlashStep;
}) =>
  Boolean(startDate) ||
  selectedDates.length > 0 ||
  step !== 'select' ||
  Object.values(cells).some((cell) => cell.value.trim() || cell.enabled || cell.missing);

export const hasFlashSequenceValidInput = ({
  cells,
  currentInput
}: {
  cells: Record<string, FlashCell>;
  currentInput: string;
}) =>
  parseFlashNumberInput(currentInput) !== null ||
  Object.values(cells).some((cell) => parseFlashNumberInput(cell.value) !== null);

export const resolveFlashSequenceCommit = ({
  cells,
  currentInput,
  inputCursor,
  selectedDates,
  trackDates
}: {
  cells: Record<string, FlashCell>;
  currentInput: string;
  inputCursor: number;
  selectedDates: Set<string>;
  trackDates: string[];
}) => {
  const currentDate = trackDates[inputCursor];

  if (!currentDate) {
    return null;
  }

  const trimmedValue = currentInput.trim();
  const parsedValue = parseFlashNumberInput(trimmedValue);
  const normalizedValue = parsedValue === null ? '' : formatMoneyInputValue(parsedValue);
  const nextCells = {
    ...cells,
    [currentDate]: createFlashCellFromState({
      cells,
      dateValue: currentDate,
      overrides: {
        value: normalizedValue,
        enabled: true,
        original: true,
        missing: parsedValue === null
      },
      selectedDates
    })
  };

  if (inputCursor >= trackDates.length - 1) {
    return {
      cells: nextCells,
      currentInput: nextCells[currentDate]?.value ?? '',
      inputCursor,
      isTailLocked: parsedValue !== null
    };
  }

  const nextCursor = inputCursor + 1;
  const nextDate = trackDates[nextCursor] ?? '';

  return {
    cells: nextCells,
    currentInput: nextDate ? nextCells[nextDate]?.value ?? '' : '',
    inputCursor: nextCursor,
    isTailLocked: false
  };
};

export const resolveFlashSequenceUndo = ({
  cells,
  currentInput,
  inputCursor,
  selectedDates,
  trackDates
}: {
  cells: Record<string, FlashCell>;
  currentInput: string;
  inputCursor: number;
  selectedDates: Set<string>;
  trackDates: string[];
}) => {
  const currentDate = trackDates[inputCursor];
  const currentCell = currentDate
    ? getFlashCellFromState({ cells, dateValue: currentDate, selectedDates })
    : null;
  const currentDraftValue = currentInput.trim();
  const currentHasValue =
    Boolean(currentDate) &&
    (parseFlashNumberInput(currentDraftValue) !== null ||
      (currentCell && parseFlashNumberInput(currentCell.value) !== null));

  if (currentHasValue && currentDate) {
    const nextCells = {
      ...cells,
      [currentDate]: createFlashCellFromState({
        cells,
        dateValue: currentDate,
        overrides: {
          value: '',
          enabled: true,
          missing: true
        },
        selectedDates
      })
    };
    const previousCursor = Math.max(0, inputCursor - 1);
    const previousDate = trackDates[previousCursor] ?? '';

    return {
      cells: nextCells,
      currentInput: previousDate ? nextCells[previousDate]?.value ?? '' : '',
      inputCursor: previousCursor
    };
  }

  if (inputCursor <= 0) {
    return null;
  }

  const previousCursor = inputCursor - 1;
  const previousDate = trackDates[previousCursor];

  if (!previousDate) {
    return null;
  }

  return {
    cells: {
      ...cells,
      [previousDate]: createFlashCellFromState({
        cells,
        dateValue: previousDate,
        overrides: {
          value: '',
          enabled: true,
          missing: true
        },
        selectedDates
      })
    },
    currentInput: '',
    inputCursor: previousCursor
  };
};

export const isFlashConfirmSelectableDate = ({
  cells,
  dateValue,
  selectedDates,
  trackDates
}: {
  cells: Record<string, FlashCell>;
  dateValue: string;
  selectedDates: Set<string>;
  trackDates: string[];
}) => {
  if (isFutureDateKey(dateValue) || !trackDates.includes(dateValue)) {
    return false;
  }

  const cell = getFlashCellFromState({ cells, dateValue, selectedDates });
  return cell.enabled || parseFlashNumberInput(cell.value) !== null;
};

export const getFlashConfirmDates = ({
  cells,
  selectedDates,
  trackDates
}: {
  cells: Record<string, FlashCell>;
  selectedDates: Set<string>;
  trackDates: string[];
}) =>
  trackDates.filter((dateValue) =>
    isFlashConfirmSelectableDate({ cells, dateValue, selectedDates, trackDates })
  );

export const getFlashConfirmWeeks = ({
  cells,
  selectedDates,
  trackDates
}: {
  cells: Record<string, FlashCell>;
  selectedDates: Set<string>;
  trackDates: string[];
}) => {
  const confirmDates = getFlashConfirmDates({ cells, selectedDates, trackDates });

  return getFlashWeeksForDates(
    confirmDates.length > 0 ? confirmDates : trackDates.slice(0, 7)
  );
};
