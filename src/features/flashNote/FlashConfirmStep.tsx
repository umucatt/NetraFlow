import type { FlashCell } from './flashNoteTypes';
import { FlashCalendarGrid } from './FlashCalendarGrid';

type FlashConfirmStepProps = {
  weeks: Date[][];
  cells: Record<string, FlashCell>;
  getCell: (dateValue: string) => FlashCell;
  trackDates: string[];
  selectedDate: string;
  onSelectDate: (dateValue: string) => void;
};

export function FlashConfirmStep({
  weeks,
  cells,
  getCell,
  trackDates,
  selectedDate,
  onSelectDate
}: FlashConfirmStepProps) {
  return (
    <div className="flash-note-stage-body flash-note-stage-body--confirm">
      <FlashCalendarGrid
        mode="confirm"
        weeks={weeks}
        cells={cells}
        getCell={getCell}
        trackDates={trackDates}
        confirmSelectedDate={selectedDate}
        onConfirmCellClick={onSelectDate}
      />
    </div>
  );
}
