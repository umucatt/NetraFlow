import { useEffect, useRef } from 'react';
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.closest<HTMLElement>('.flash-note-main')?.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div ref={rootRef} className="flash-note-stage-body flash-note-stage-body--confirm">
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
