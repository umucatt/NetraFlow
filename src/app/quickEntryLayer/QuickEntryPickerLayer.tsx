import { QuickEntryAccountPicker, QuickEntryPanel } from '../../features/quickEntry';
import { OverlayBackdrop } from '../overlay';

import type { QuickEntryPickerLayerProps } from './quickEntryLayerTypes';

export function QuickEntryPickerLayer({
  panel,
  accountPicker,
  callbacks
}: QuickEntryPickerLayerProps) {
  if (!panel.isOpen) {
    return null;
  }

  return (
    <OverlayBackdrop onBack={callbacks.onClose} className="modal-backdrop">
      <QuickEntryPanel
        accountPickerContent={(
          <QuickEntryAccountPicker
            groups={accountPicker.groups}
            selectedAccountId={accountPicker.selectedAccountId}
            onChooseAccount={callbacks.onChooseAccount}
          />
        )}
      />
    </OverlayBackdrop>
  );
}
