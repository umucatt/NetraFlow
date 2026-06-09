import type {
  ChangeEvent,
  ComponentProps,
  RefObject
} from 'react';

import type BackupRecordList from '../../features/history/BackupRecordList';
import type HistoryCalendarPanel from '../../features/history/HistoryCalendarPanel';
import type HistoryFilterToolbar from '../../features/history/HistoryFilterToolbar';
import type HistoryPanel from '../../features/history/HistoryPanel';
import type {
  HistoryRecordListProps,
  HistoryRecordListRecord
} from '../../features/history/HistoryRecordList';
import type { SnapshotImportRecordListRecord } from '../../features/history/SnapshotImportRecordList';

type BackupRecordListProps = ComponentProps<typeof BackupRecordList>;
type HistoryCalendarPanelProps = ComponentProps<typeof HistoryCalendarPanel>;
type HistoryFilterToolbarProps = ComponentProps<typeof HistoryFilterToolbar>;
type HistoryPanelProps = ComponentProps<typeof HistoryPanel>;

export type HistoryBackupLayerState = {
  isOpen: boolean;
  view: HistoryPanelProps['view'];
};

export type HistoryLayerPropsGroup<TRecord extends HistoryRecordListRecord> = {
  filter: Pick<
    HistoryFilterToolbarProps,
    'rangeInput' | 'rangeInputPlaceholder' | 'isCalendarVisible'
  >;
  calendar: Pick<
    HistoryCalendarPanelProps,
    | 'calendarMonth'
    | 'calendarSecondMonth'
    | 'isNextDisabled'
    | 'getCalendarDays'
    | 'getDateValue'
    | 'getDateState'
  >;
  records: TRecord[];
  highlightedRecordId: string;
  emptyText?: string;
  recordListProps: Omit<
    HistoryRecordListProps<TRecord>,
    | 'records'
    | 'groups'
    | 'expandedDates'
    | 'highlightedRecordId'
    | 'emptyText'
    | 'onToggleDate'
  >;
};

export type BackupLayerPropsGroup = Pick<
  BackupRecordListProps,
  'records' | 'formatPreciseBackupTime' | 'getBackupMethodLabel'
> & {
  importRecords: SnapshotImportRecordListRecord[];
};

export type HistoryBackupLayerCallbacks = {
  onBack: () => void;
  onPanelScroll: (scrollTop: number) => void;
  history: {
    filter: Pick<
      HistoryFilterToolbarProps,
      | 'onRangeInputChange'
      | 'onRangeInputFocus'
      | 'onRangeInputClick'
      | 'onRangeInputConfirm'
      | 'onToggleCalendar'
      | 'onSelectPreviousWeek'
      | 'onSelectRecentSevenDays'
      | 'onClearRange'
    >;
    calendar: Pick<
      HistoryCalendarPanelProps,
      'onPreviousMonth' | 'onNextMonth' | 'onDateClick'
    >;
  };
  backup: {
    onImportBackup: (event: ChangeEvent<HTMLInputElement>) => void;
  };
};

export type HistoryBackupLayerRefs = {
  panelRef?: RefObject<HTMLElement | null>;
  backupFileInputRef?: RefObject<HTMLInputElement | null>;
};

export type HistoryBackupLayerProps<
  TRecord extends HistoryRecordListRecord = HistoryRecordListRecord
> = {
  state: HistoryBackupLayerState;
  history: HistoryLayerPropsGroup<TRecord>;
  backup: BackupLayerPropsGroup;
  callbacks: HistoryBackupLayerCallbacks;
  refs?: HistoryBackupLayerRefs;
};
