import {
  PasswordEditorDialog,
  SnapshotEncryptionDisableDialog,
  SnapshotPasswordEditorDialog
} from '../../features/settings';
import { OverlayBackdrop } from '../overlay';

import type {
  PasswordProtectionDisableDialogGroup,
  SnapshotSecurityDialogLayerProps
} from './snapshotSecurityDialogTypes';

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
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>
        {error ? (
          <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.92rem' }}>
            {error}
          </p>
        ) : null}
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
  snapshotPasswordEditor,
  passwordProtectionDisable,
  snapshotEncryptionDisable
}: SnapshotSecurityDialogLayerProps) {
  return (
    <>
      {passwordEditor ? <PasswordEditorDialog {...passwordEditor} /> : null}

      {snapshotPasswordEditor ? (
        <SnapshotPasswordEditorDialog {...snapshotPasswordEditor} />
      ) : null}

      {passwordProtectionDisable ? (
        <PasswordProtectionDisableDialog {...passwordProtectionDisable} />
      ) : null}

      {snapshotEncryptionDisable ? (
        <SnapshotEncryptionDisableDialog {...snapshotEncryptionDisable} />
      ) : null}
    </>
  );
}
