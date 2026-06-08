import type { RefObject } from 'react';

import type { ArchivedAccountEntry } from '../types';

export type ArchivedAccountsLayerState = {
  isOpen: boolean;
  archivedAccounts: ArchivedAccountEntry[];
  panelRef: RefObject<HTMLElement | null>;
};

export type ArchivedAccountsLayerFormatters = {
  formatMoney: (amount: number | null) => string;
  formatArchivedTime: (time: string) => string;
};

export type ArchivedAccountsLayerCallbacks = {
  onBack: () => void;
  onClose: () => void;
  onSelect: (account: ArchivedAccountEntry) => void;
  onRestore: (account: ArchivedAccountEntry) => void;
  onPanelScroll: (scrollTop: number) => void;
};

export type ArchivedAccountsLayerProps = {
  state: ArchivedAccountsLayerState;
  formatters: ArchivedAccountsLayerFormatters;
  callbacks: ArchivedAccountsLayerCallbacks;
};
