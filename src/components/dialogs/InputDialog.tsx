import type { FormEvent, ReactNode } from 'react';
import DialogShell from './DialogShell';

type InputDialogProps = {
  title: ReactNode;
  message?: ReactNode;
  label?: ReactNode;
  value: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  inputType?: 'text' | 'password';
  autoComplete?: string;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

function InputDialog({
  title,
  message,
  label,
  value,
  placeholder,
  confirmLabel = '确定',
  cancelLabel = '取消',
  inputType = 'text',
  autoComplete,
  onValueChange,
  onConfirm,
  onCancel
}: InputDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <DialogShell
      as="form"
      title={title}
      titleId="input-dialog-title"
      onClose={onCancel}
      onSubmit={handleSubmit}
      actions={(
        <>
          <button
            type="button"
            onClick={onCancel}
            className="modal-button modal-button--secondary"
          >
            {cancelLabel}
          </button>
          <button type="submit" className="modal-button modal-button--primary">
            {confirmLabel}
          </button>
        </>
      )}
    >
      {message ? <div className="modal-message">{message}</div> : null}
      <label className="right-panel-label" style={{ marginTop: message ? 14 : 0 }}>
        {label}
        <input
          autoFocus
          type={inputType}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onValueChange(event.target.value)}
        />
      </label>
    </DialogShell>
  );
}

export default InputDialog;
