import { type CSSProperties, type FormEvent, type ReactNode } from 'react';
import DialogShell from '../../components/dialogs/DialogShell';

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: 'var(--modal-backdrop)'
};

const cardStyle: CSSProperties = {
  width: 'min(380px, 100%)',
  borderRadius: 'var(--radius-page)',
  padding: 24,
  background: 'var(--surface-strong)',
  boxShadow: 'var(--shadow-popover)'
};

type AccountInfoEditorDialogProps = {
  title: ReactNode;
  accountName: string;
  accountAlias: string;
  aliasPreview: ReactNode;
  error: string;
  onAccountNameChange: (value: string) => void;
  onAccountAliasChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

function AccountInfoEditorDialog({
  title,
  accountName,
  accountAlias,
  aliasPreview,
  error,
  onAccountNameChange,
  onAccountAliasChange,
  onSubmit,
  onCancel
}: AccountInfoEditorDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <DialogShell
      as="form"
      title={title}
      titleStyle={{ margin: '0 0 18px', fontSize: '1.45rem' }}
      className="account-operation-panel"
      backdropClassName="layout-layer layout-layer--right"
      backdropStyle={backdropStyle}
      cardStyle={cardStyle}
      onClose={onCancel}
      onSubmit={handleSubmit}
      actionsClassName="account-operation-actions"
      actions={(
        <>
          <button type="button" onClick={onCancel} className="account-operation-button">
            取消
          </button>
          <button type="submit" className="account-operation-button account-operation-button--confirm">
            确定
          </button>
        </>
      )}
    >
      <label className="account-operation-field">
        <span>账户名称</span>
        <input
          className="account-operation-input"
          autoFocus
          type="text"
          value={accountName}
          onChange={(event) => onAccountNameChange(event.target.value)}
        />
      </label>

      <label className="account-operation-field" style={{ marginTop: 14 }}>
        <span>自定义缩写</span>
        <input
          className="account-operation-input"
          type="text"
          placeholder="留空时自动生成"
          value={accountAlias}
          onChange={(event) => onAccountAliasChange(event.target.value)}
        />
      </label>

      <div className="account-alias-preview">{aliasPreview}</div>

      {error ? (
        <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.92rem' }}>
          {error}
        </p>
      ) : null}
    </DialogShell>
  );
}

export default AccountInfoEditorDialog;
