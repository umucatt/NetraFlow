export type FlashStep = 'select' | 'input' | 'confirm' | 'completed';

export type FlashInputMode = 'change' | 'balance';

export type FlashDirection = 'forward' | 'backward';

export type FlashSelectionMode = 'replace' | 'intersect' | 'union' | 'subtract';

export type FlashDateRule = 'all' | 'weekday' | 'weekend';

export type FlashCell = {
  date: string;
  value: string;
  enabled: boolean;
  original: boolean;
  missing: boolean;
};

export type FlashWriteRow = {
  date: string;
  value: string;
  inputAmount: number;
  beforeAmount: number | null;
  afterAmount: number;
  delta: number | null;
  weekKey: string;
};

export type FlashAccountOption = {
  id: string;
  name: string;
};

export type FlashAccountGroupOption = {
  name: string;
  accounts: FlashAccountOption[];
};
