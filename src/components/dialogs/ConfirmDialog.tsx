import type { ReactNode } from 'react';
import DialogShell from './DialogShell';

type ConfirmDialogProps = {
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  eyebrow?: ReactNode;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDialog({
  title,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  eyebrow,
  tone = 'default',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const resolvedMessage =
    typeof message === 'string'
      ? message.split('\n').map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
      : message;

  return (
    <DialogShell
      title={title}
      titleId="confirmation-dialog-title"
      eyebrow={eyebrow}
      onClose={onCancel}
      actions={(
        <>
          <button
            type="button"
            onClick={onCancel}
            className="modal-button modal-button--secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`modal-button modal-button--secondary${
              tone === 'danger' ? ' modal-button--danger' : ''
            }`}
          >
            {confirmLabel}
          </button>
        </>
      )}
    >
      <div className="modal-message">{resolvedMessage}</div>
    </DialogShell>
  );
}

export default ConfirmDialog;
