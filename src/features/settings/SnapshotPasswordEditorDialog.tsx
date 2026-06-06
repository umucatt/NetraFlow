import { type CSSProperties, type FormEvent } from 'react';
import DialogShell from '../../components/dialogs/DialogShell';

type SnapshotPasswordEditorMode = 'setup' | 'edit';
type SnapshotPasswordField = 'new' | 'confirm';

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

type SnapshotPasswordEditorDialogProps = {
  mode: SnapshotPasswordEditorMode;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  visibleField: SnapshotPasswordField | null;
  error: string;
  isSaving: boolean;
  onOldPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleVisibility: (field: SnapshotPasswordField) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function SnapshotPasswordEditorDialog({
  mode,
  oldPassword,
  newPassword,
  confirmPassword,
  visibleField,
  error,
  isSaving,
  onOldPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleVisibility,
  onSubmit,
  onCancel
}: SnapshotPasswordEditorDialogProps) {
  const isEditingExistingPassword = mode === 'edit';

  const renderPasswordInput = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    field: SnapshotPasswordField,
    autoFocus = false
  ) => (
    <label className="right-panel-label" style={{ marginTop: 14 }}>
      {label}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 8,
          alignItems: 'center'
        }}
      >
        <input
          autoFocus={autoFocus}
          type={visibleField === field ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          onClick={() => onToggleVisibility(field)}
          className="modal-button modal-button--secondary"
          style={{ minHeight: 40 }}
        >
          {visibleField === field ? '隐藏' : '显示'}
        </button>
      </div>
    </label>
  );

  return (
    <DialogShell
      as="form"
      title={isEditingExistingPassword ? '修改快照密码' : '设置快照密码'}
      titleStyle={{ margin: '0 0 12px', fontSize: '1.35rem', lineHeight: 1.2 }}
      backdropClassName="layout-layer layout-layer--right"
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
      {!isEditingExistingPassword ? (
        <p style={{ margin: '0 0 4px', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
          忘记快照密码，将无法恢复已加密的快照，请妥善保存
        </p>
      ) : null}

      {isEditingExistingPassword ? (
        <label className="right-panel-label" style={{ marginTop: 14 }}>
          旧快照密码
          <input
            autoFocus
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(event) => onOldPasswordChange(event.target.value)}
          />
        </label>
      ) : null}

      {renderPasswordInput(
        '新快照密码',
        newPassword,
        onNewPasswordChange,
        'new',
        !isEditingExistingPassword
      )}
      {renderPasswordInput('确认新快照密码', confirmPassword, onConfirmPasswordChange, 'confirm')}

      {error ? (
        <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.92rem' }}>
          {error}
        </p>
      ) : null}
    </DialogShell>
  );
}

export default SnapshotPasswordEditorDialog;
