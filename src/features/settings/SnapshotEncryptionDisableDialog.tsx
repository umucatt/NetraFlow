import { type FormEvent, type KeyboardEvent } from 'react';
import DialogShell from '../../components/dialogs/DialogShell';
import InlineErrorSlot from '../../components/InlineErrorSlot';

type SnapshotEncryptionDisableDialogProps = {
  password: string;
  error: string;
  isLoading: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function SnapshotEncryptionDisableDialog({
  password,
  error,
  isLoading,
  onPasswordChange,
  onSubmit,
  onCancel
}: SnapshotEncryptionDisableDialogProps) {
  const handleDialogKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };

  return (
    <DialogShell
      as="form"
      title="关闭快照加密"
      titleId="disable-snapshot-encryption-title"
      onClose={onCancel}
      onKeyDown={handleDialogKeyDown}
      onSubmit={onSubmit}
      actions={(
        <>
          <button
            type="button"
            onClick={onCancel}
            className="modal-button modal-button--secondary"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="modal-button modal-button--primary"
          >
            {isLoading ? '验证中' : '确认关闭'}
          </button>
        </>
      )}
    >
      <p style={{ margin: '0 0 14px', color: 'var(--text-muted)', fontSize: '0.94rem' }}>
        关闭后之后导出的快照将不再加密，已加密的快照仍需要创建时使用的密码恢复
      </p>
      <label className="right-panel-label">
        登录密码
        <input
          autoFocus
          type="password"
          autoComplete="current-password"
          value={password}
          className={error ? 'input--error' : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby="disable-snapshot-encryption-error"
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </label>
      <InlineErrorSlot id="disable-snapshot-encryption-error" message={error} />
    </DialogShell>
  );
}

export default SnapshotEncryptionDisableDialog;
