export type FlashNoteSelectionMode = 'replace' | 'intersect' | 'union' | 'subtract';

type ResolveFlashSelectionOptions = {
  isCandidateSelectable?: (dateValue: string) => boolean;
  compareDates?: (left: string, right: string) => number;
};

type ResolveFlashRightClickSelectionOptions = ResolveFlashSelectionOptions & {
  currentSelection: string[];
  targetDate: string;
  mode: FlashNoteSelectionMode;
  isTargetSelected: boolean;
  candidateDates?: string[];
};

const uniqueDates = (dates: string[]) => Array.from(new Set(dates));

const sortDates = (
  dates: string[],
  compareDates?: (left: string, right: string) => number
) => uniqueDates(dates).sort(compareDates ?? ((left, right) => left.localeCompare(right)));

export const resolveFlashSelection = (
  currentSelection: string[],
  candidateDates: string[],
  mode: FlashNoteSelectionMode,
  options: ResolveFlashSelectionOptions = {}
) => {
  const { compareDates, isCandidateSelectable = () => true } = options;
  const safeCandidateDates = uniqueDates(candidateDates.filter(isCandidateSelectable));
  const candidateSet = new Set(safeCandidateDates);
  const currentSet = new Set(currentSelection);
  let nextSelection: string[];

  if (mode === 'replace') {
    nextSelection = safeCandidateDates;
  } else if (mode === 'intersect') {
    nextSelection = currentSelection.filter((dateValue) => candidateSet.has(dateValue));
  } else if (mode === 'subtract') {
    nextSelection = currentSelection.filter((dateValue) => !candidateSet.has(dateValue));
  } else {
    safeCandidateDates.forEach((dateValue) => currentSet.add(dateValue));
    nextSelection = Array.from(currentSet);
  }

  return sortDates(nextSelection.filter(isCandidateSelectable), compareDates);
};

export const resolveFlashRightClickSelection = ({
  currentSelection,
  targetDate,
  mode,
  isTargetSelected,
  candidateDates,
  isCandidateSelectable,
  compareDates
}: ResolveFlashRightClickSelectionOptions) => {
  if (isTargetSelected) {
    return sortDates(currentSelection, compareDates);
  }

  return resolveFlashSelection(
    currentSelection,
    candidateDates ?? [targetDate],
    mode,
    { isCandidateSelectable, compareDates }
  );
};

export const getFlashSignedAmountParts = (
  amount: number | null,
  displayValue: string
) => {
  if (amount === null) {
    return null;
  }

  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  const trimmedValue = displayValue.trim();
  const numericValue =
    sign === '-' || amount === 0 ? trimmedValue.replace(/^-/, '') : trimmedValue;

  return {
    sign,
    value: numericValue || '0'
  };
};
