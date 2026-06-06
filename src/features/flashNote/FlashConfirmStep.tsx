import { useEffect, useRef } from 'react';
import type { FlashCell } from './flashNoteTypes';
import { FlashCalendarGrid } from './FlashCalendarGrid';

type FlashConfirmStepProps = {
  weeks: Date[][];
  getCell: (dateValue: string) => FlashCell;
  selectedDate: string;
  onSelectDate: (dateValue: string) => void;
};

export function FlashConfirmStep({
  weeks,
  getCell,
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
        getCell={getCell}
        confirmSelectedDate={selectedDate}
        onConfirmCellClick={onSelectDate}
      />
    </div>
  );
}
