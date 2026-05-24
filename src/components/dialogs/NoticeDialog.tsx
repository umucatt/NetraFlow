import type { ReactNode } from 'react';
import DialogShell from './DialogShell';

type NoticeDialogProps = {
  title: ReactNode;
  message: ReactNode;
  closeLabel?: string;
  onClose: () => void;
};

function NoticeDialog({
  title,
  message,
  closeLabel = '确定',
  onClose
}: NoticeDialogProps) {
  return (
    <DialogShell
      title={title}
      titleId="notice-dialog-title"
      onClose={onClose}
      actions={(
        <button
          type="button"
          onClick={onClose}
          className="modal-button modal-button--secondary"
        >
          {closeLabel}
        </button>
      )}
    >
      <div className="modal-message">{message}</div>
    </DialogShell>
  );
}

export default NoticeDialog;
