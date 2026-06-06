import { useEffect, useMemo, useState } from 'react';
import {
  getCalendarDays,
  toDateInputValue
} from '../../app/dateUtils';
import type { HistoryRecord } from '../../app/types';
import {
  getHistoryCalendarDateState as getCalendarDateState,
  getVisibleHistoryCalendarSecondMonth,
  isHistoryCalendarNextDisabled,
  selectHistoryCalendarDate,
  shiftHistoryCalendarVisibleMonths
} from './historyCalendarLogic';
import {
  DEFAULT_HISTORY_RANGE_INPUT_PLACEHOLDER,
  FUTURE_HISTORY_RANGE_INPUT_PLACEHOLDER,
  applyHistoryRangeInput,
  clearHistoryFilterState,
  confirmSingleHistoryDateInput,
  createEmptyHistoryFilterState,
  createLastWeekHistoryFilterState,
  createRecent7HistoryFilterState,
  filterHistoryRecordsByDate,
  getHistoryDateCounts,
  getHistoryFilterStatus,
  type HistoryFilterState
} from './historyFilterLogic';
import {
  prepareAccountHistoryGroups,
  sortHistoryRecordsByTimeDesc
} from './historyGroupLogic';

type UseHistoryControllerOptions = {
  history: HistoryRecord[];
  selectedAccountId?: string;
  onHistoryInteraction?: () => void;
};

type HistoryFilterSnapshot = Pick<
  HistoryFilterState,
  'startDate' | 'endDate' | 'rangeInput' | 'calendarMonth'
> & {
  calendarSecondMonth?: Date | null;
};

export const useHistoryController = ({
  history,
  selectedAccountId = '',
  onHistoryInteraction
}: UseHistoryControllerOptions) => {
  const [historyFilterState, setHistoryFilterState] = useState(createEmptyHistoryFilterState);
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);

  const filterStatus = useMemo(
    () => getHistoryFilterStatus(historyFilterState),
    [historyFilterState]
  );

  useEffect(() => {
    if (!historyFilterState.rangeInputNotice) {
      return undefined;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setHistoryFilterState((currentState) =>
        currentState.rangeInputNotice
          ? { ...currentState, rangeInputNotice: '' }
          : currentState
      );
    }, 1600);

    return () => globalThis.clearTimeout(timeoutId);
  }, [historyFilterState.rangeInputNotice]);

  const sortedHistory = useMemo(() => sortHistoryRecordsByTimeDesc(history), [history]);

  const historyDateCounts = useMemo(() => getHistoryDateCounts(history), [history]);

  const filteredHistory = useMemo(
    () =>
      filterHistoryRecordsByDate(sortedHistory, {
        start: filterStatus.effectiveStartDate,
        end: filterStatus.effectiveEndDate
      }),
    [filterStatus.effectiveEndDate, filterStatus.effectiveStartDate, sortedHistory]
  );

  const selectedAccountHistory = useMemo(
    () =>
      selectedAccountId
        ? sortedHistory.filter((record) => record.accountId === selectedAccountId)
        : [],
    [selectedAccountId, sortedHistory]
  );

  const selectedAccountHistoryByDate = useMemo(
    () => prepareAccountHistoryGroups(selectedAccountHistory),
    [selectedAccountHistory]
  );

  const updateHistoryFilter = (
    resolveNextState: (currentState: HistoryFilterState) => HistoryFilterState
  ) => {
    onHistoryInteraction?.();
    setHistoryFilterState((currentState) => resolveNextState(currentState));
  };

  const setLastWeekHistoryRange = () => {
    updateHistoryFilter(() => createLastWeekHistoryFilterState());
  };

  const setRecent7HistoryRange = () => {
    updateHistoryFilter(() => createRecent7HistoryFilterState());
  };

  const handleHistoryRangeInput = (value: string) => {
    updateHistoryFilter((currentState) => applyHistoryRangeInput(currentState, value));
  };

  const confirmSingleHistoryDate = () => {
    updateHistoryFilter((currentState) => confirmSingleHistoryDateInput(currentState));
  };

  const clearHistoryRange = () => {
    updateHistoryFilter(() => clearHistoryFilterState());
  };

  const selectCalendarDate = (date: Date, monthDate?: Date) => {
    updateHistoryFilter((currentState) =>
      selectHistoryCalendarDate(currentState, date, new Date(), monthDate)
    );
  };

  const restoreHistoryFilterSnapshot = (snapshot: HistoryFilterSnapshot) => {
    setHistoryFilterState({
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      rangeInput: snapshot.rangeInput,
      calendarMonth: new Date(snapshot.calendarMonth),
      calendarSecondMonth: snapshot.calendarSecondMonth
        ? new Date(snapshot.calendarSecondMonth)
        : null,
      rangeInputNotice: ''
    });
  };

  const showPreviousCalendarMonth = () => {
    setHistoryFilterState((currentState) =>
      shiftHistoryCalendarVisibleMonths(currentState, -1)
    );
  };

  const showNextCalendarMonth = () => {
    setHistoryFilterState((currentState) =>
      shiftHistoryCalendarVisibleMonths(currentState, 1)
    );
  };

  const toggleCalendarVisibility = () => {
    setIsCalendarVisible((visible) => !visible);
  };

  const getHistoryCalendarDateState = (date: Date, monthDate: Date) =>
    getCalendarDateState({
      date,
      monthDate,
      startDate: historyFilterState.startDate,
      endDate: historyFilterState.endDate,
      dateCounts: historyDateCounts
    });

  return {
    historyStartDate: historyFilterState.startDate,
    historyEndDate: historyFilterState.endDate,
    historyRangeInput: historyFilterState.rangeInput,
    historyRangeInputPlaceholder:
      historyFilterState.rangeInputNotice === 'future-date'
        ? FUTURE_HISTORY_RANGE_INPUT_PLACEHOLDER
        : DEFAULT_HISTORY_RANGE_INPUT_PLACEHOLDER,
    calendarMonth: historyFilterState.calendarMonth,
    calendarSecondMonth: getVisibleHistoryCalendarSecondMonth(historyFilterState),
    hasHistoryDateFilter: filterStatus.hasDateFilter,
    effectiveHistoryStartDate: filterStatus.effectiveStartDate,
    effectiveHistoryEndDate: filterStatus.effectiveEndDate,
    historyRangeText: filterStatus.rangeText,
    isCalendarVisible,
    isHistoryCalendarNextDisabled: isHistoryCalendarNextDisabled(
      historyFilterState.calendarMonth
    ),
    sortedHistory,
    filteredHistory,
    historyDateCounts,
    selectedAccountHistory,
    selectedAccountHistoryByDate,
    getCalendarDays,
    getDateValue: toDateInputValue,
    getHistoryCalendarDateState,
    setLastWeekHistoryRange,
    setRecent7HistoryRange,
    handleHistoryRangeInput,
    confirmSingleHistoryDate,
    clearHistoryRange,
    selectCalendarDate,
    restoreHistoryFilterSnapshot,
    showPreviousCalendarMonth,
    showNextCalendarMonth,
    toggleCalendarVisibility
  };
};
