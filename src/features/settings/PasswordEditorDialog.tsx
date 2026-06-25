import { type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import DialogShell from '../../components/dialogs/DialogShell';
import InlineErrorSlot from '../../components/InlineErrorSlot';

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

const PASSWORD_TRY_LEVELS = [
  '密码强度：很弱',
  '密码强度：较弱',
  '密码强度：一般',
  '密码强度：较强',
  '密码强度：强',
  '密码强度：很强'
] as const;

const estimatePasswordTryLevel = (password: string) => {
  const length = password.length;
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;
  const repeated = /^(.{1,4})\1+$/.test(password);
  const sequential = 'abcdefghijklmnopqrstuvwxyz0123456789'.includes(password.toLowerCase());
  const score = length + classes * 4 - (repeated ? 8 : 0) - (sequential ? 6 : 0);

  if (score < 10) {
    return PASSWORD_TRY_LEVELS[0];
  }

  if (score < 16) {
    return PASSWORD_TRY_LEVELS[1];
  }

  if (score < 22) {
    return PASSWORD_TRY_LEVELS[2];
  }

  if (score < 30) {
    return PASSWORD_TRY_LEVELS[3];
  }

  if (score < 38) {
    return PASSWORD_TRY_LEVELS[4];
  }

  return PASSWORD_TRY_LEVELS[5];
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
  const handleDialogKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };
  const oldPasswordError = isEditingExistingPassword && error === '登录密码错误' ? error : '';
  const confirmPasswordError = error === '两次输入的新密码不一致' ? error : '';
  const newPasswordError = error === '请输入新密码' ? error : '';
  const formError =
    error && !oldPasswordError && !confirmPasswordError && !newPasswordError ? error : '';

  return (
    <DialogShell
      as="form"
      title={isEditingExistingPassword ? '修改登录密码' : '设置登录密码'}
      titleStyle={{ margin: '0 0 18px', fontSize: '1.35rem', lineHeight: 1.2 }}
      backdropClassName="modal-backdrop"
      backdropStyle={backdropStyle}
      cardStyle={cardStyle}
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
            className={oldPasswordError ? 'input--error' : undefined}
            aria-invalid={oldPasswordError ? true : undefined}
            aria-describedby="password-editor-old-error"
            onChange={(event) => onOldPasswordChange(event.target.value)}
          />
          <InlineErrorSlot id="password-editor-old-error" message={oldPasswordError} />
        </label>
      ) : null}

      <label className="right-panel-label" style={{ marginTop: 14 }}>
        新密码
        <input
          autoFocus={!isEditingExistingPassword}
          type="password"
          autoComplete="new-password"
          value={newPassword}
          className={newPasswordError ? 'input--error' : undefined}
          aria-invalid={newPasswordError ? true : undefined}
          aria-describedby="password-editor-new-error"
          onChange={(event) => onNewPasswordChange(event.target.value)}
        />
        <InlineErrorSlot id="password-editor-new-error" message={newPasswordError} />
      </label>
      {newPassword ? (
        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {estimatePasswordTryLevel(newPassword)}
        </p>
      ) : null}

      <label className="right-panel-label" style={{ marginTop: 14 }}>
        确认新密码
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          className={confirmPasswordError ? 'input--error' : undefined}
          aria-invalid={confirmPasswordError ? true : undefined}
          aria-describedby="password-editor-confirm-error"
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
        />
        <InlineErrorSlot id="password-editor-confirm-error" message={confirmPasswordError} />
      </label>

      <InlineErrorSlot id="password-editor-form-error" message={formError} />
    </DialogShell>
  );
}

export default PasswordEditorDialog;
