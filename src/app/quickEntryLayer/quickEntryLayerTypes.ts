import type { QuickEntryAccountGroup } from '../../features/quickEntry';

export type QuickEntryPickerPanelGroup = {
  isOpen: boolean;
};

export type QuickEntryAccountPickerPropsGroup = {
  groups: QuickEntryAccountGroup[];
  selectedAccountId?: string;
};

export type QuickEntryPickerLayerCallbacks = {
  onClose: () => void;
  onChooseAccount: (groupId: string, accountId: string) => void;
};

export type QuickEntryPickerLayerProps = {
  panel: QuickEntryPickerPanelGroup;
  accountPicker: QuickEntryAccountPickerPropsGroup;
  callbacks: QuickEntryPickerLayerCallbacks;
};
