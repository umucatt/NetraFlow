import { type FormEvent } from 'react';
import DialogShell from '../../components/dialogs/DialogShell';

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
  return (
    <DialogShell
      as="form"
      title="关闭快照加密"
      titleId="disable-snapshot-encryption-title"
      eyebrow="快照密码确认"
      onClose={onCancel}
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
        关闭后，之后导出的快照将不再加密，已经加密的快照仍需要对应快照密码才能恢复
      </p>
      <label className="right-panel-label">
        快照密码
        <input
          autoFocus
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </label>
      {error ? (
        <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.92rem' }}>
          {error}
        </p>
      ) : null}
    </DialogShell>
  );
}

export default SnapshotEncryptionDisableDialog;
