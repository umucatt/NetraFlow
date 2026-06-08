import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  Account,
  AccountPointer,
  AppData,
  AssetGroup,
  AssetGroupWithAccounts,
  HistoryRecord
} from '../../app/types';
import {
  getCalendarDays,
  getDateRangeKeys,
  isFutureDateKey
} from '../../app/dateUtils';
import {
  appendFlashInputCharacter,
  backspaceFlashInputValue,
  getFlashDefaultVisibleMonth,
  getFlashDirectionFromDates,
  getFlashWeeksAround,
  resolveFlashCellValueUpdate,
  resolveFlashConfirmNavigationDate
} from './flashNoteUtils';
import type { FlashConfirmNavigationKey } from './flashNoteUtils';
import { useFlashKeyboardInput } from './useFlashKeyboardInput';
import type {
  FlashAccountGroupOption,
  FlashCell,
  FlashDateRule,
  FlashInputMode,
  FlashSelectionMode,
  FlashStep
} from './flashNoteTypes';
import type { FlashNotePageProps } from './FlashNotePage';
import {
  createFlashInitialInputCells,
  getFlashCellFromState,
  getFlashConfirmDates,
  getFlashConfirmWeeks,
  getFlashDateRuleCandidateDates,
  getFlashTrackDates,
  getFlashVisibleSelectableDates,
  hasFlashSequenceValidInput,
  hasFlashTemporaryContent,
  isFlashConfirmSelectableDate as getIsFlashConfirmSelectableDate,
  isFlashDateRuleDisabled,
  resolveFlashDateSelection,
  resolveFlashSequenceCommit,
  resolveFlashSequenceUndo
} from './flashNoteFlowLogic';
import {
  createFlashNoteWritePlan,
  createFlashWriteRows,
  type FlashHistoryRecordInput
} from './flashNoteWriteLogic';

type FlashControllerAccountGroup = {
  activeAccounts: Account[];
  id: string;
  name: string;
};

type UseFlashNoteControllerOptions = {
  accountGroups: FlashControllerAccountGroup[];
  accounts: Account[];
  assetGroups: AssetGroup[];
  groups: AssetGroupWithAccounts[];
  history: HistoryRecord[];
  sortedHistory: HistoryRecord[];
  createHistoryRecord: (input: FlashHistoryRecordInput) => HistoryRecord;
  onWriteComplete: (targetAccount: NonNullable<AccountPointer>) => void;
  updateAppData: (nextData: AppData) => void;
};

const createSelectedDateSet = (selectedDates: string[]) => new Set(selectedDates);

export const useFlashNoteController = ({
  accountGroups,
  accounts,
  assetGroups,
  groups,
  history,
  sortedHistory,
  createHistoryRecord,
  onWriteComplete,
  updateAppData
}: UseFlashNoteControllerOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<FlashStep>('select');
  const [selectedAccount, setSelectedAccount] = useState<AccountPointer>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => getFlashDefaultVisibleMonth());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<FlashSelectionMode>('replace');
  const [activeDateRule, setActiveDateRule] = useState<FlashDateRule | null>(null);
  const [dragStartDate, setDragStartDate] = useState('');
  const [dragPreviewDates, setDragPreviewDates] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<FlashInputMode>('change');
  const [cells, setCells] = useState<Record<string, FlashCell>>({});
  const [inputCursor, setInputCursor] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [isInputTailLocked, setIsInputTailLocked] = useState(false);
  const [editingDate, setEditingDate] = useState('');
  const [shortcutHintHidden, setShortcutHintHidden] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isReturnDateConfirmOpen, setIsReturnDateConfirmOpen] = useState(false);
  const dragStartDateRef = useRef('');
  const dragHandledPointerUpRef = useRef(false);
  const dragSelectionModeRef = useRef<FlashSelectionMode>('replace');

  const direction = getFlashDirectionFromDates(startDate, endDate);
  const selectedDateSet = useMemo(() => createSelectedDateSet(selectedDates), [selectedDates]);
  const previewDateSet = useMemo(() => new Set(dragPreviewDates), [dragPreviewDates]);
  const visibleSelectableDates = useMemo(
    () => getFlashVisibleSelectableDates(visibleMonth),
    [visibleMonth]
  );
  const trackDates = useMemo(
    () =>
      getFlashTrackDates({
        cells,
        direction,
        endDate,
        inputCursor,
        selectedDates,
        startDate
      }),
    [cells, direction, endDate, inputCursor, selectedDates, startDate]
  );
  const currentDate = trackDates[inputCursor] ?? '';

  const selectedGroup = selectedAccount
    ? groups.find((group) => group.id === selectedAccount.groupId)
    : undefined;
  const selectedAccountEntry = selectedGroup?.accounts.find(
    (account) => account.id === selectedAccount?.accountId
  );
  const selectedGroupName = selectedGroup?.name ?? selectedAccount?.groupName ?? '';

  const getCell = useCallback(
    (dateValue: string) =>
      getFlashCellFromState({
        cells,
        dateValue,
        selectedDates: selectedDateSet
      }),
    [cells, selectedDateSet]
  );

  const isConfirmSelectableDate = useCallback(
    (dateValue: string) =>
      getIsFlashConfirmSelectableDate({
        cells,
        dateValue,
        selectedDates: selectedDateSet,
        trackDates
      }),
    [cells, selectedDateSet, trackDates]
  );

  const writeRows = useMemo(() => {
    if (!selectedAccountEntry || !selectedAccount) {
      return [];
    }

    return createFlashWriteRows({
      account: selectedAccountEntry,
      cells,
      groupId: selectedAccount.groupId,
      groups: assetGroups,
      inputMode,
      sortedHistory,
      trackDates
    });
  }, [
    assetGroups,
    cells,
    inputMode,
    selectedAccount,
    selectedAccountEntry,
    sortedHistory,
    trackDates
  ]);

  const accountGroupOptions: FlashAccountGroupOption[] = useMemo(
    () =>
      accountGroups.map((group) => ({
        id: group.id,
        name: group.name,
        accounts: group.activeAccounts.map((account) => ({
          id: account.id,
          name: account.name
        }))
      })),
    [accountGroups]
  );

  const disabledDateRules: Record<FlashDateRule, boolean> = useMemo(() => {
    const getRuleDisabled = (rule: FlashDateRule) =>
      isFlashDateRuleDisabled({
        candidateDates: getFlashDateRuleCandidateDates({
          endDate,
          rule,
          startDate
        }),
        selectedDates,
        visibleSelectableDates
      });

    return {
      all: getRuleDisabled('all'),
      weekday: getRuleDisabled('weekday'),
      weekend: getRuleDisabled('weekend')
    };
  }, [endDate, selectedDates, startDate, visibleSelectableDates]);

  const inputWeeks = useMemo(
    () => getFlashWeeksAround(currentDate || trackDates[0] || startDate, direction),
    [currentDate, direction, startDate, trackDates]
  );
  const confirmWeeks = useMemo(
    () =>
      getFlashConfirmWeeks({
        cells,
        selectedDates: selectedDateSet,
        trackDates
      }),
    [cells, selectedDateSet, trackDates]
  );

  const hasTemporaryContent = hasFlashTemporaryContent({
    cells,
    selectedDates,
    startDate,
    step
  });

  const resetDraft = useCallback((keepOpen = true) => {
    dragStartDateRef.current = '';
    dragHandledPointerUpRef.current = false;
    dragSelectionModeRef.current = 'replace';
    setIsOpen(keepOpen);
    setStep('select');
    setSelectedAccount(null);
    setVisibleMonth(getFlashDefaultVisibleMonth());
    setStartDate('');
    setEndDate('');
    setSelectedDates([]);
    setSelectionMode('replace');
    setActiveDateRule(null);
    setDragStartDate('');
    setDragPreviewDates([]);
    setInputMode('change');
    setCells({});
    setInputCursor(0);
    setCurrentInput('');
    setIsInputTailLocked(false);
    setEditingDate('');
    setShortcutHintHidden(false);
    setIsExitConfirmOpen(false);
    setIsReturnDateConfirmOpen(false);
  }, []);

  const open = useCallback(() => {
    resetDraft(true);
  }, [resetDraft]);

  const close = useCallback(() => {
    resetDraft(false);
  }, [resetDraft]);

  const requestClose = useCallback(() => {
    if (!hasTemporaryContent) {
      close();
      return;
    }

    setIsExitConfirmOpen(true);
  }, [close, hasTemporaryContent]);

  const clearSequenceDraft = useCallback(() => {
    setCells({});
    setInputCursor(0);
    setCurrentInput('');
    setIsInputTailLocked(false);
    setEditingDate('');
  }, []);

  const returnDateSelection = useCallback(() => {
    clearSequenceDraft();
    setIsReturnDateConfirmOpen(false);
    setStep('select');
  }, [clearSequenceDraft]);

  const requestReturnDateSelection = useCallback(() => {
    if (step !== 'input') {
      return;
    }

    if (!hasFlashSequenceValidInput({ cells, currentInput })) {
      returnDateSelection();
      return;
    }

    setIsReturnDateConfirmOpen(true);
  }, [cells, currentInput, returnDateSelection, step]);

  const chooseAccount = useCallback(
    (groupId: string, accountId: string) => {
      const group = groups.find((currentGroup) => currentGroup.id === groupId);
      const account = group?.accounts.find((currentAccount) => currentAccount.id === accountId);

      if (!account) {
        return;
      }

      setSelectedAccount({ groupId, groupName: group?.name, accountId: account.id });
    },
    [groups]
  );

  const applyDateSelection = useCallback(
    (
      candidateDates: string[],
      mode = selectionMode,
      bounds?: { end?: string; keepBounds?: boolean; start: string }
    ) => {
      const result = resolveFlashDateSelection({
        bounds,
        candidateDates,
        currentEndDate: endDate,
        currentStartDate: startDate,
        mode,
        selectedDates,
        visibleSelectableDates
      });

      if (!result) {
        return false;
      }

      setSelectedDates(result.selectedDates);
      setDragPreviewDates([]);
      setActiveDateRule(null);
      setStartDate(result.startDate);
      setEndDate(result.endDate);

      return true;
    },
    [endDate, selectedDates, selectionMode, startDate, visibleSelectableDates]
  );

  useEffect(() => {
    dragSelectionModeRef.current = selectionMode;
  }, [selectionMode]);

  const finishInvalidDateDrag = useCallback(() => {
    const currentDragStartDate = dragStartDateRef.current;

    if (!currentDragStartDate) {
      return;
    }

    if (
      dragSelectionModeRef.current === 'replace' &&
      !isFutureDateKey(currentDragStartDate)
    ) {
      setStartDate(currentDragStartDate);
      setEndDate('');
      setSelectedDates([currentDragStartDate]);
      setActiveDateRule(null);
    }

    dragStartDateRef.current = '';
    setDragStartDate('');
    setDragPreviewDates([]);
  }, []);

  const handleDatePointerDown = useCallback(
    (dateValue: string) => {
      if (isFutureDateKey(dateValue)) {
        return;
      }

      dragStartDateRef.current = dateValue;
      dragHandledPointerUpRef.current = false;
      dragSelectionModeRef.current = selectionMode;
      setDragStartDate(dateValue);
      setDragPreviewDates([dateValue]);

      if (selectionMode === 'replace') {
        setStartDate(dateValue);
        setEndDate('');
        setSelectedDates([dateValue]);
        setActiveDateRule(null);
      }
    },
    [selectionMode]
  );

  const handleDatePointerEnter = useCallback(
    (dateValue: string) => {
      const currentDragStartDate = dragStartDateRef.current || dragStartDate;

      if (!currentDragStartDate || isFutureDateKey(dateValue)) {
        return;
      }

      setDragPreviewDates(getDateRangeKeys(currentDragStartDate, dateValue));
    },
    [dragStartDate]
  );

  const handleDatePointerUp = useCallback(
    (dateValue: string) => {
      const currentDragStartDate = dragStartDateRef.current || dragStartDate;
      const currentSelectionMode = dragSelectionModeRef.current;

      if (!currentDragStartDate) {
        return;
      }

      dragHandledPointerUpRef.current = true;

      if (isFutureDateKey(dateValue)) {
        finishInvalidDateDrag();
        return;
      }

      const didApplySelection = applyDateSelection(
        getDateRangeKeys(currentDragStartDate, dateValue),
        currentSelectionMode,
        {
          start: currentDragStartDate,
          end: dateValue
        }
      );

      if (!didApplySelection) {
        setDragPreviewDates([]);
      }

      dragStartDateRef.current = '';
      setDragStartDate('');
    },
    [
      applyDateSelection,
      dragStartDate,
      finishInvalidDateDrag
    ]
  );

  useEffect(() => {
    if (!isOpen || step !== 'select') {
      return;
    }

    const handlePointerEnd = () => {
      if (dragHandledPointerUpRef.current) {
        dragHandledPointerUpRef.current = false;
        return;
      }

      finishInvalidDateDrag();
    };

    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [finishInvalidDateDrag, isOpen, step]);

  const applyDateRule = useCallback(
    (rule: FlashDateRule) => {
      if (!startDate || isFutureDateKey(startDate)) {
        return;
      }

      const candidateDates = getFlashDateRuleCandidateDates({
        endDate,
        rule,
        startDate
      });

      applyDateSelection(candidateDates, 'replace', {
        start: startDate,
        end: endDate,
        keepBounds: true
      });
      setActiveDateRule(rule);
    },
    [applyDateSelection, endDate, startDate, visibleSelectableDates]
  );

  const startSequenceInput = useCallback(() => {
    if (!selectedAccountEntry || trackDates.length === 0) {
      return;
    }

    setCells(
      createFlashInitialInputCells({
        endDate,
        selectedDates,
        startDate,
        trackDates
      })
    );
    setInputCursor(0);
    setCurrentInput('');
    setIsInputTailLocked(false);
    setStep('input');
  }, [endDate, selectedAccountEntry, selectedDates, startDate, trackDates]);

  const advanceDateSelection = useCallback(() => {
    if (!selectedAccountEntry || trackDates.length === 0 || !startDate) {
      return;
    }

    startSequenceInput();
  }, [selectedAccountEntry, startDate, startSequenceInput, trackDates.length]);

  const commitSequenceInput = useCallback(() => {
    if (isInputTailLocked) {
      return;
    }

    const result = resolveFlashSequenceCommit({
      cells,
      currentInput,
      inputCursor,
      selectedDates: selectedDateSet,
      trackDates
    });

    if (!result) {
      return;
    }

    setCells(result.cells);
    setInputCursor(result.inputCursor);
    setCurrentInput(result.currentInput);
    setIsInputTailLocked(result.isTailLocked);
  }, [cells, currentInput, inputCursor, isInputTailLocked, selectedDateSet, trackDates]);

  const undoSequenceInput = useCallback(() => {
    setIsInputTailLocked(false);

    const result = resolveFlashSequenceUndo({
      cells,
      currentInput,
      inputCursor,
      selectedDates: selectedDateSet,
      trackDates
    });

    if (!result) {
      return;
    }

    setCells(result.cells);
    setInputCursor(result.inputCursor);
    setCurrentInput(result.currentInput);
  }, [cells, currentInput, inputCursor, selectedDateSet, trackDates]);

  const appendSequenceInputCharacter = useCallback(
    (key: string) => {
      if (isInputTailLocked) {
        return;
      }

      setCurrentInput((currentValue) => appendFlashInputCharacter(currentValue, key));
    },
    [isInputTailLocked]
  );

  const backspaceSequenceInput = useCallback(() => {
    setIsInputTailLocked(false);
    setCurrentInput((currentValue) => backspaceFlashInputValue(currentValue));
  }, []);

  const enterConfirmStage = useCallback(() => {
    const currentCellValue = currentDate ? getCell(currentDate).value : '';
    let nextCells = cells;

    if (
      !isInputTailLocked &&
      currentDate &&
      (currentInput.trim() || currentInput !== currentCellValue)
    ) {
      const result = resolveFlashSequenceCommit({
        cells,
        currentInput,
        inputCursor,
        selectedDates: selectedDateSet,
        trackDates
      });

      if (result) {
        nextCells = result.cells;
        setCells(result.cells);
        setInputCursor(result.inputCursor);
        setCurrentInput(result.currentInput);
      }
    }

    setIsInputTailLocked(false);
    setEditingDate(
      trackDates.find((dateValue) =>
        getIsFlashConfirmSelectableDate({
          cells: nextCells,
          dateValue,
          selectedDates: selectedDateSet,
          trackDates
        })
      ) ?? ''
    );
    setStep('confirm');
  }, [
    cells,
    currentDate,
    currentInput,
    getCell,
    inputCursor,
    isInputTailLocked,
    selectedDateSet,
    trackDates
  ]);

  const cancelCellEdit = useCallback(() => {
    setEditingDate('');
  }, []);

  const selectConfirmDate = useCallback(
    (dateValue: string) => {
      if (!isConfirmSelectableDate(dateValue)) {
        return;
      }

      setEditingDate(dateValue);
    },
    [isConfirmSelectableDate]
  );

  const updateConfirmCellValue = useCallback(
    (dateValue: string, nextValue: string) => {
      if (!dateValue || !isConfirmSelectableDate(dateValue)) {
        return;
      }

      setCells((currentCells) => {
        const nextCell = resolveFlashCellValueUpdate({
          cell: getFlashCellFromState({
            cells: currentCells,
            dateValue,
            selectedDates: selectedDateSet
          }),
          dateValue,
          nextValue
        });

        return nextCell
          ? {
              ...currentCells,
              [dateValue]: nextCell
            }
          : currentCells;
      });
    },
    [isConfirmSelectableDate, selectedDateSet]
  );

  const appendConfirmInputCharacter = useCallback(
    (key: string) => {
      if (!editingDate) {
        return;
      }

      updateConfirmCellValue(editingDate, appendFlashInputCharacter(getCell(editingDate).value, key));
    },
    [editingDate, getCell, updateConfirmCellValue]
  );

  const backspaceConfirmInput = useCallback(() => {
    if (!editingDate) {
      return;
    }

    updateConfirmCellValue(editingDate, backspaceFlashInputValue(getCell(editingDate).value));
  }, [editingDate, getCell, updateConfirmCellValue]);

  const clearConfirmCell = useCallback(() => {
    if (!editingDate || !isConfirmSelectableDate(editingDate)) {
      return;
    }

    updateConfirmCellValue(editingDate, '');
  }, [editingDate, isConfirmSelectableDate, updateConfirmCellValue]);

  const selectNextConfirmCell = useCallback(() => {
    const selectableDates = trackDates.filter(isConfirmSelectableDate);

    if (selectableDates.length === 0) {
      return;
    }

    const currentIndex = editingDate ? selectableDates.indexOf(editingDate) : -1;
    selectConfirmDate(selectableDates[(currentIndex + 1) % selectableDates.length] ?? selectableDates[0]!);
  }, [editingDate, isConfirmSelectableDate, selectConfirmDate, trackDates]);

  const moveConfirmSelection = useCallback(
    (key: FlashConfirmNavigationKey) => {
      const selectableDates = trackDates.filter(isConfirmSelectableDate);

      if (!editingDate || selectableDates.length === 0) {
        return;
      }

      const nextDate = resolveFlashConfirmNavigationDate({
        currentDate: editingDate,
        key,
        selectableDates
      });

      if (nextDate !== editingDate) {
        selectConfirmDate(nextDate);
      }
    },
    [editingDate, isConfirmSelectableDate, selectConfirmDate, trackDates]
  );

  const backToInput = useCallback(() => {
    setIsInputTailLocked(false);
    setStep('input');
  }, []);

  const confirmWrite = useCallback(() => {
    const plan = createFlashNoteWritePlan({
      account: selectedAccountEntry,
      accounts,
      cells,
      createHistoryRecord,
      groupName: selectedGroupName,
      groups: assetGroups,
      history,
      inputMode,
      selectedAccount,
      sortedHistory,
      trackDates
    });

    if (!plan) {
      return;
    }

    updateAppData({ groups: assetGroups, accounts: plan.nextAccounts, history: plan.nextHistory });
    onWriteComplete(plan.targetAccount);
    setStep('completed');
    resetDraft(false);
  }, [
    accounts,
    assetGroups,
    cells,
    createHistoryRecord,
    history,
    inputMode,
    onWriteComplete,
    resetDraft,
    selectedAccount,
    selectedAccountEntry,
    selectedGroupName,
    sortedHistory,
    trackDates,
    updateAppData
  ]);

  useFlashKeyboardInput({
    enabled: isOpen && step === 'input',
    step: 'input',
    onInputCharacter: appendSequenceInputCharacter,
    onEnter: commitSequenceInput,
    onBackspace: backspaceSequenceInput,
    onCtrlZ: undoSequenceInput,
    onDelete: () => undefined,
    onEscape: requestReturnDateSelection
  });

  useFlashKeyboardInput({
    enabled: isOpen && step === 'confirm',
    step: 'confirm',
    hasConfirmSelection: Boolean(editingDate),
    onInputCharacter: appendConfirmInputCharacter,
    onEnter: selectNextConfirmCell,
    onBackspace: backspaceConfirmInput,
    onCtrlZ: clearConfirmCell,
    onDelete: clearConfirmCell,
    onEscape: backToInput,
    onMoveSelection: moveConfirmSelection
  });

  useEffect(() => {
    if (!isOpen || step !== 'select' || !activeDateRule || !startDate || endDate) {
      return;
    }

    applyDateRule(activeDateRule);
  }, [visibleMonth]);

  const confirmDates = useMemo(
    () =>
      getFlashConfirmDates({
        cells,
        selectedDates: selectedDateSet,
        trackDates
      }),
    [cells, selectedDateSet, trackDates]
  );

  const pageProps: FlashNotePageProps = {
    step,
    accountName: selectedAccountEntry?.name ?? '',
    selectedAccountId: selectedAccount?.accountId,
    inputMode,
    direction,
    visibleMonth,
    activeDateRule,
    disabledDateRules,
    accountGroups: accountGroupOptions,
    selectedDates: selectedDateSet,
    previewDates: previewDateSet,
    startDate,
    endDate,
    inputWeeks,
    confirmWeeks,
    currentDate,
    nextDate: trackDates[inputCursor + 1] ?? '',
    currentInput,
    confirmSelectedDate: editingDate,
    writeRows,
    showShortcutHint: !shortcutHintHidden,
    canStartInput: Boolean(selectedAccountEntry && startDate && trackDates.length > 0),
    canWrite: writeRows.length > 0,
    getCell,
    getCalendarDays,
    onChooseAccount: chooseAccount,
    onModeChange: setInputMode,
    selectionMode,
    onSelectionModeChange: setSelectionMode,
    onDateRuleApply: applyDateRule,
    onVisibleMonthChange: setVisibleMonth,
    onDatePointerDown: handleDatePointerDown,
    onDatePointerEnter: handleDatePointerEnter,
    onDatePointerUp: handleDatePointerUp,
    onClose: requestClose,
    onBackToSelect: requestReturnDateSelection,
    onStartInput: advanceDateSelection,
    onGoToConfirm: enterConfirmStage,
    onBackToInput: backToInput,
    onConfirmWrite: confirmWrite,
    onSelectConfirmDate: selectConfirmDate,
    onCloseShortcutHint: () => setShortcutHintHidden(true)
  };

  return {
    cancelCellEdit,
    close,
    confirmDates,
    confirmExit: close,
    confirmReturnDateSelection: returnDateSelection,
    dismissExitConfirm: () => setIsExitConfirmOpen(false),
    dismissReturnDateConfirm: () => setIsReturnDateConfirmOpen(false),
    editingDate,
    isExitConfirmOpen,
    isOpen,
    isReturnDateConfirmOpen,
    open,
    pageProps,
    requestClose,
    selectedAccount,
    step
  };
};
