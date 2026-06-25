import type { KeyboardEvent } from 'react';
import {
  PasswordEditorDialog,
  SnapshotEncryptionDisableDialog
} from '../../features/settings';
import InlineErrorSlot from '../../components/InlineErrorSlot';
import { OverlayBackdrop } from '../overlay';

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
    <OverlayBackdrop onBack={onCancel} className="modal-backdrop">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="disable-password-protection-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => cancelOnEscape(event, onCancel)}
        onSubmit={onSubmit}
        className="modal-card"
      >
        <p className="eyebrow" style={{ marginBottom: 8 }}>
          登录密码确认
        </p>
        <h2
          id="disable-password-protection-title"
          style={{ margin: '0 0 10px', fontSize: '1.26rem' }}
        >
          关闭密码保护
        </h2>
        <p style={{ margin: '0 0 14px', color: 'var(--text-muted)', fontSize: '0.94rem' }}>
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
            aria-describedby="disable-password-protection-error"
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>
        <InlineErrorSlot id="disable-password-protection-error" message={error} />
        <div className="modal-actions">
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
        </div>
      </form>
    </OverlayBackdrop>
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
