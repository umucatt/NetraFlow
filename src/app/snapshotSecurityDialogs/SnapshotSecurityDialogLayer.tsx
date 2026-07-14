import type { KeyboardEvent } from 'react';
import {
  PasswordEditorDialog,
  SnapshotEncryptionDisableDialog
} from '../../features/settings';
import DialogShell from '../../components/dialogs/DialogShell';
import InlineErrorSlot from '../../components/InlineErrorSlot';

import type {
  PasswordProtectionDisableDialogGroup,
  SnapshotSecurityDialogLayerProps
} from './snapshotSecurityDialogTypes';

const cancelOnEscape = (
  event: KeyboardEvent<HTMLElement>,
  onCancel: () => void
) => {
  if (event.key !== 'Escape') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  onCancel();
};

function PasswordProtectionDisableDialog({
  password,
  error,
  isLoading,
  onPasswordChange,
  onSubmit,
  onCancel
}: PasswordProtectionDisableDialogGroup) {
  return (
    <DialogShell
      as="form"
      title="关闭密码保护"
      titleId="disable-password-protection-title"
      className="modal-card password-protection-disable-dialog"
      onClose={onCancel}
      onKeyDown={(event) => cancelOnEscape(event, onCancel)}
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
      <p className="password-protection-disable-dialog__description">
        请输入当前登录密码
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
          aria-describedby={error ? 'disable-password-protection-error' : undefined}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </label>
      {error ? (
        <InlineErrorSlot id="disable-password-protection-error" message={error} />
      ) : null}
    </DialogShell>
  );
}

export function SnapshotSecurityDialogLayer({
  passwordEditor,
  passwordProtectionDisable,
  snapshotEncryptionDisable
}: SnapshotSecurityDialogLayerProps) {
  return (
    <>
      {passwordEditor ? <PasswordEditorDialog {...passwordEditor} /> : null}

      {passwordProtectionDisable ? (
        <PasswordProtectionDisableDialog {...passwordProtectionDisable} />
      ) : null}

      {snapshotEncryptionDisable ? (
        <SnapshotEncryptionDisableDialog {...snapshotEncryptionDisable} />
      ) : null}
    </>
  );
}
