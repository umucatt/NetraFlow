import {
  BackupRecordList,
  HistoryCalendarPanel,
  HistoryFilterToolbar,
  HistoryPanel,
  HistoryRecordList
} from '../../features/history';
import type { HistoryRecordListRecord } from '../../features/history/HistoryRecordList';
import { OverlayBackdrop } from '../overlay';

import type { HistoryBackupLayerProps } from './historyBackupLayerTypes';

const historyBackupBackdropStyle = {
  position: 'fixed',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: 'var(--modal-backdrop)'
} as const;

export function HistoryBackupLayer<TRecord extends HistoryRecordListRecord>({
  state,
  history,
  backup,
  callbacks,
  refs
}: HistoryBackupLayerProps<TRecord>) {
  if (!state.isOpen) {
    return null;
  }

  const historyFilterCallbacks = callbacks.history.filter;
  const historyCalendarCallbacks = callbacks.history.calendar;

  return (
    <OverlayBackdrop
      onBack={callbacks.onBack}
      className="layout-layer layout-layer--left"
      style={historyBackupBackdropStyle}
    >
      <HistoryPanel
        ref={refs?.panelRef}
        view={state.view}
        onPanelClick={(event) => event.stopPropagation()}
        onPanelScroll={(event) => callbacks.onPanelScroll(event.currentTarget.scrollTop)}
        historyContent={(
          <>
            <HistoryFilterToolbar
              rangeInput={history.filter.rangeInput}
              rangeInputPlaceholder={history.filter.rangeInputPlaceholder}
              isCalendarVisible={history.filter.isCalendarVisible}
              onRangeInputFocus={historyFilterCallbacks.onRangeInputFocus}
              onRangeInputClick={historyFilterCallbacks.onRangeInputClick}
              onRangeInputConfirm={historyFilterCallbacks.onRangeInputConfirm}
              onRangeInputChange={historyFilterCallbacks.onRangeInputChange}
              onToggleCalendar={historyFilterCallbacks.onToggleCalendar}
              onSelectPreviousWeek={historyFilterCallbacks.onSelectPreviousWeek}
              onSelectRecentSevenDays={historyFilterCallbacks.onSelectRecentSevenDays}
              onClearRange={historyFilterCallbacks.onClearRange}
              calendarContent={(
                <HistoryCalendarPanel
                  calendarMonth={history.calendar.calendarMonth}
                  calendarSecondMonth={history.calendar.calendarSecondMonth}
                  isNextDisabled={history.calendar.isNextDisabled}
                  getCalendarDays={history.calendar.getCalendarDays}
                  getDateValue={history.calendar.getDateValue}
                  getDateState={history.calendar.getDateState}
                  onPreviousMonth={historyCalendarCallbacks.onPreviousMonth}
                  onNextMonth={historyCalendarCallbacks.onNextMonth}
                  onDateClick={historyCalendarCallbacks.onDateClick}
                />
              )}
            />

            <HistoryRecordList
              records={history.records}
              highlightedRecordId={history.highlightedRecordId}
              emptyText={history.emptyText ?? '暂无匹配记录'}
              {...history.recordListProps}
            />
          </>
        )}
        backupContent={(
          <div style={{ display: 'grid', gap: 16 }}>
            <input
              ref={refs?.backupFileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={callbacks.backup.onImportBackup}
              style={{ display: 'none' }}
            />

            <BackupRecordList
              records={backup.records}
              formatPreciseBackupTime={backup.formatPreciseBackupTime}
              getBackupMethodLabel={backup.getBackupMethodLabel}
            />
          </div>
        )}
      />
    </OverlayBackdrop>
  );
}
