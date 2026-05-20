import type { FlashCell } from './flashNoteTypes';
import { FlashCalendarGrid } from './FlashCalendarGrid';

type FlashInputStepProps = {
  weeks: Date[][];
  cells: Record<string, FlashCell>;
  getCell: (dateValue: string) => FlashCell;
  trackDates: string[];
  currentDate: string;
  nextDate: string;
  currentInput: string;
};

export function FlashInputStep({
  weeks,
  cells,
  getCell,
  trackDates,
  currentDate,
  nextDate,
  currentInput
}: FlashInputStepProps) {
  return (
    <div className="flash-note-stage-body flash-note-stage-body--sequence-input">
      <FlashCalendarGrid
        mode="input"
        weeks={weeks}
        cells={cells}
        getCell={getCell}
        trackDates={trackDates}
        currentDate={currentDate}
        nextDate={nextDate}
        currentInput={currentInput}
      />
    </div>
  );
}
