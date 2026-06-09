import type { ChangeEvent, FormEvent, RefObject } from 'react';

import type { ArchivedAccountsLayerProps } from '../archivedAccountsLayer';
import type { HistoryBackupLayerProps } from '../historyBackupLayer';
import type { LockScreenLayerProps } from '../lockScreen';
import type { QuickEntryPickerLayerProps } from '../quickEntryLayer';
import type { ResetDangerDialogLayerProps } from '../resetDangerDialog';
import type { SearchOverlayLayerProps } from '../searchOverlay';
import type { ArchivedAccountEntry, HistoryRecord, SnapshotImportRecord } from '../types';
import type { BackupRecord, BackupMethod } from '../types';
import type { QuickEntryAccountGroup } from '../../features/quickEntry';

type SearchFloatingNavigatorProps = NonNullable<
  SearchOverlayLayerProps['floatingNavigator']
>;

export type CreateArchivedAccountsLayerPropsOptions = {
  isOpen: boolean;
  archivedAccounts: ArchivedAccountEntry[];
  panelRef: RefObject<HTMLElement | null>;
  formatMoney: (amount: number | null) => string;
  formatArchivedTime: (time: string) => string;
  onBack: () => void;
  onClose: () => void;
  onSelect: (account: ArchivedAccountEntry) => void;
  onRestore: (account: ArchivedAccountEntry) => void;
  onPanelScroll: (scrollTop: number) => void;
};

export const createArchivedAccountsLayerProps = ({
  isOpen,
  archivedAccounts,
  panelRef,
  formatMoney,
  formatArchivedTime,
  onBack,
  onClose,
  onSelect,
  onRestore,
  onPanelScroll
}: CreateArchivedAccountsLayerPropsOptions): ArchivedAccountsLayerProps => ({
  state: {
    isOpen,
    archivedAccounts,
    panelRef
  },
  formatters: {
    formatMoney,
    formatArchivedTime
  },
  callbacks: {
    onBack,
    onClose,
    onSelect,
    onRestore,
    onPanelScroll
  }
});

export type CreateHistoryBackupLayerPropsOptions = {
  isOpen: boolean;
  view: HistoryBackupLayerProps<HistoryRecord>['state']['view'];
  rangeInput: string;
  rangeInputPlaceholder: string;
  isCalendarVisible: boolean;
  calendarMonth: Date;
  calendarSecondMonth: Date;
  isNextDisabled: boolean;
  getCalendarDays: HistoryBackupLayerProps<HistoryRecord>['history']['calendar']['getCalendarDays'];
  getDateValue: HistoryBackupLayerProps<HistoryRecord>['history']['calendar']['getDateValue'];
  getDateState: HistoryBackupLayerProps<HistoryRecord>['history']['calendar']['getDateState'];
  records: HistoryRecord[];
  highlightedRecordId: string;
  emptyText: string;
  recordListProps: HistoryBackupLayerProps<HistoryRecord>['history']['recordListProps'];
  backupRecords: BackupRecord[];
  snapshotImportRecords: SnapshotImportRecord[];
  formatPreciseBackupTime: (time: string) => string;
  getBackupMethodLabel: (method: BackupMethod) => string;
  onBack: () => void;
  onPanelScroll: (scrollTop: number) => void;
  onRangeInputFocus: () => void;
  onRangeInputClick: () => void;
  onRangeInputConfirm: () => void;
  onRangeInputChange: (value: string) => void;
  onToggleCalendar: () => void;
  onSelectPreviousWeek: () => void;
  onSelectRecentSevenDays: () => void;
  onClearRange: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDateClick: (date: Date) => void;
  onImportBackup: (event: ChangeEvent<HTMLInputElement>) => void;
  panelRef: RefObject<HTMLElement | null>;
  backupFileInputRef: RefObject<HTMLInputElement | null>;
};

export const createHistoryBackupLayerProps = ({
  isOpen,
  view,
  rangeInput,
  rangeInputPlaceholder,
  isCalendarVisible,
  calendarMonth,
  calendarSecondMonth,
  isNextDisabled,
  getCalendarDays,
  getDateValue,
  getDateState,
  records,
  highlightedRecordId,
  emptyText,
  recordListProps,
  backupRecords,
  snapshotImportRecords,
  formatPreciseBackupTime,
  getBackupMethodLabel,
  onBack,
  onPanelScroll,
  onRangeInputFocus,
  onRangeInputClick,
  onRangeInputConfirm,
  onRangeInputChange,
  onToggleCalendar,
  onSelectPreviousWeek,
  onSelectRecentSevenDays,
  onClearRange,
  onPreviousMonth,
  onNextMonth,
  onDateClick,
  onImportBackup,
  panelRef,
  backupFileInputRef
}: CreateHistoryBackupLayerPropsOptions): HistoryBackupLayerProps<HistoryRecord> => ({
  state: {
    isOpen,
    view
  },
  history: {
    filter: {
      rangeInput,
      rangeInputPlaceholder,
      isCalendarVisible
    },
    calendar: {
      calendarMonth,
      calendarSecondMonth,
      isNextDisabled,
      getCalendarDays,
      getDateValue,
      getDateState
    },
    records,
    highlightedRecordId,
    emptyText,
    recordListProps
  },
  backup: {
    records: backupRecords,
    importRecords: snapshotImportRecords,
    formatPreciseBackupTime,
    getBackupMethodLabel
  },
  callbacks: {
    onBack,
    onPanelScroll,
    history: {
      filter: {
        onRangeInputFocus,
        onRangeInputClick,
        onRangeInputConfirm,
        onRangeInputChange,
        onToggleCalendar,
        onSelectPreviousWeek,
        onSelectRecentSevenDays,
        onClearRange
      },
      calendar: {
        onPreviousMonth,
        onNextMonth,
        onDateClick
      }
    },
    backup: {
      onImportBackup
    }
  },
  refs: {
    panelRef,
    backupFileInputRef
  }
});

export type CreateSearchOverlayLayerPropsOptions = {
  isOpen: boolean;
  panelProps: SearchOverlayLayerProps['panelProps'];
  currentNavigationTarget: SearchFloatingNavigatorProps['currentTarget'] | null;
  canMoveNavigation: boolean;
  onPreviousNavigationTarget: () => void;
  onNextNavigationTarget: () => void;
  onReturnFromNavigation: () => void;
  onExitNavigation: () => void;
  onClose: () => void;
};

export const createSearchOverlayLayerProps = ({
  isOpen,
  panelProps,
  currentNavigationTarget,
  canMoveNavigation,
  onPreviousNavigationTarget,
  onNextNavigationTarget,
  onReturnFromNavigation,
  onExitNavigation,
  onClose
}: CreateSearchOverlayLayerPropsOptions): SearchOverlayLayerProps => ({
  isOpen,
  panelProps,
  floatingNavigator: currentNavigationTarget
    ? {
        currentTarget: currentNavigationTarget,
        canMove: canMoveNavigation,
        onPrevious: onPreviousNavigationTarget,
        onNext: onNextNavigationTarget,
        onReturn: onReturnFromNavigation,
        onExit: onExitNavigation
      }
    : null,
  onClose
});

export type CreateQuickEntryPickerLayerPropsOptions = {
  isOpen: boolean;
  groups: QuickEntryAccountGroup[];
  onClose: () => void;
  onChooseAccount: (groupId: string, accountId: string) => void;
};

export const createQuickEntryPickerLayerProps = ({
  isOpen,
  groups,
  onClose,
  onChooseAccount
}: CreateQuickEntryPickerLayerPropsOptions): QuickEntryPickerLayerProps => ({
  panel: {
    isOpen
  },
  accountPicker: {
    groups
  },
  callbacks: {
    onClose,
    onChooseAccount
  }
});

export type CreateResetDangerDialogLayerPropsOptions = ResetDangerDialogLayerProps;

export const createResetDangerDialogLayerProps = (
  props: CreateResetDangerDialogLayerPropsOptions
): ResetDangerDialogLayerProps => props;

export type CreateLockScreenLayerPropsOptions = {
  isLocked: boolean;
  productIconPath: string;
  password: string;
  error: string;
  isUnlocking: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export const createLockScreenLayerProps = (
  props: CreateLockScreenLayerPropsOptions
): LockScreenLayerProps => props;
