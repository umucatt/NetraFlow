import { type FormEvent, type KeyboardEvent } from 'react';
import DialogShell from '../../components/dialogs/DialogShell';
import InlineErrorSlot from '../../components/InlineErrorSlot';

type PasswordEditorMode = 'setup' | 'edit';

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
      className="modal-card password-editor-dialog"
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
      <div className="password-editor-dialog__fields">
        {isEditingExistingPassword ? (
          <label className="right-panel-label">
            旧密码
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              className={oldPasswordError ? 'input--error' : undefined}
              aria-invalid={oldPasswordError ? true : undefined}
              aria-describedby={oldPasswordError ? 'password-editor-old-error' : undefined}
              onChange={(event) => onOldPasswordChange(event.target.value)}
            />
            {oldPasswordError ? (
              <InlineErrorSlot id="password-editor-old-error" message={oldPasswordError} />
            ) : null}
          </label>
        ) : null}

        <div className="password-editor-dialog__new-password">
          <label className="right-panel-label">
            新密码
            <input
              autoFocus={!isEditingExistingPassword}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              className={newPasswordError ? 'input--error' : undefined}
              aria-invalid={newPasswordError ? true : undefined}
              aria-describedby={newPasswordError ? 'password-editor-new-error' : undefined}
              onChange={(event) => onNewPasswordChange(event.target.value)}
            />
            {newPasswordError ? (
              <InlineErrorSlot id="password-editor-new-error" message={newPasswordError} />
            ) : null}
          </label>
          {newPassword ? (
            <p className="password-editor-dialog__strength">
              {estimatePasswordTryLevel(newPassword)}
            </p>
          ) : null}
        </div>

        <label className="right-panel-label">
          确认新密码
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            className={confirmPasswordError ? 'input--error' : undefined}
            aria-invalid={confirmPasswordError ? true : undefined}
            aria-describedby={confirmPasswordError ? 'password-editor-confirm-error' : undefined}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
          />
          {confirmPasswordError ? (
            <InlineErrorSlot
              id="password-editor-confirm-error"
              message={confirmPasswordError}
            />
          ) : null}
        </label>

        {formError ? (
          <InlineErrorSlot id="password-editor-form-error" message={formError} />
        ) : null}
      </div>
    </DialogShell>
  );
}

export default PasswordEditorDialog;
