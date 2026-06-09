import { type CSSProperties, type FormEvent } from 'react';
import DialogShell from '../../components/dialogs/DialogShell';

type PasswordEditorMode = 'setup' | 'edit';

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: 'var(--modal-backdrop)'
};

const cardStyle: CSSProperties = {
  width: 'min(420px, 100%)',
  maxHeight: '84vh',
  overflowY: 'auto',
  borderRadius: 'var(--radius-page)',
  padding: 24,
  background: 'var(--panel-bg-strong)',
  color: 'var(--text-main)',
  boxShadow: 'var(--shadow-popover)'
};

type PasswordEditorDialogProps = {
  mode: PasswordEditorMode;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  error: string;
  isSaving: boolean;
  onOldPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function PasswordEditorDialog({
  mode,
  oldPassword,
  newPassword,
  confirmPassword,
  error,
  isSaving,
  onOldPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onCancel
}: PasswordEditorDialogProps) {
  const isEditingExistingPassword = mode === 'edit';

  return (
    <DialogShell
      as="form"
      title={isEditingExistingPassword ? '修改登录密码' : '设置登录密码'}
      titleStyle={{ margin: '0 0 18px', fontSize: '1.35rem', lineHeight: 1.2 }}
      backdropClassName="modal-backdrop"
      backdropStyle={backdropStyle}
      cardStyle={cardStyle}
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
            disabled={isSaving}
            className="modal-button modal-button--primary"
          >
            {isSaving ? '保存中' : '保存'}
          </button>
        </>
      )}
    >
      {isEditingExistingPassword ? (
        <label className="right-panel-label" style={{ marginTop: 14 }}>
          旧密码
          <input
            autoFocus
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(event) => onOldPasswordChange(event.target.value)}
          />
        </label>
      ) : null}

      <label className="right-panel-label" style={{ marginTop: 14 }}>
        新密码
        <input
          autoFocus={!isEditingExistingPassword}
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => onNewPasswordChange(event.target.value)}
        />
      </label>

      <label className="right-panel-label" style={{ marginTop: 14 }}>
        确认新密码
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
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

export default PasswordEditorDialog;
