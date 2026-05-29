import { useEffect, useRef } from 'react';
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const scrollContainer = root?.closest<HTMLElement>('.flash-note-main');
    const currentWeek = root?.querySelector<HTMLElement>('.flash-note-week-row.is-current-week');

    if (!scrollContainer || !currentWeek || scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const weekRect = currentWeek.getBoundingClientRect();
    const centeredTop =
      scrollContainer.scrollTop +
      weekRect.top -
      containerRect.top -
      (scrollContainer.clientHeight - weekRect.height) / 2;

    scrollContainer.scrollTo({ top: Math.max(0, centeredTop), behavior: 'auto' });
  }, [currentDate]);

  return (
    <div ref={rootRef} className="flash-note-stage-body flash-note-stage-body--input">
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
