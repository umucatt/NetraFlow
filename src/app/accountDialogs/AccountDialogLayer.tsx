import {
  AccountAmountEditorDialog,
  AccountCreateDialog,
  AccountInfoEditorDialog,
  AccountRestoreDialog,
  AccountRestoreTargetDialog
} from '../../features/account';
import { OverlayBackdrop } from '../overlay';
import type {
  AccountDialogLayerProps,
  AccountTypeDialogPropsGroup
} from './accountDialogTypes';

function AccountTypeEditorDialog({
  editor,
  nameDraft,
  namePlaceholder,
  natureDraft,
  statsDraft,
  error,
  natureOptions,
  onNameChange,
  onNatureChange,
  onStatsChange,
  onSubmit,
  onCancel
}: AccountTypeDialogPropsGroup) {
  return (
    <OverlayBackdrop
      onBack={onCancel}
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'var(--modal-backdrop)'
      }}
    >
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="account-type-editor-panel"
        style={{
          width: 'min(400px, 100%)',
          borderRadius: 'var(--radius-section)',
          padding: 24,
          background: 'var(--panel-bg)',
          boxShadow: 'var(--shadow-panel)'
        }}
      >
        <h2 className="account-add-restore-panel__title" style={{ margin: '0 0 18px' }}>
          {editor.mode === 'create' ? '新增账户类型' : '编辑账户类型'}
        </h2>

        <label style={{ display: 'grid', gap: 8, color: 'var(--text-secondary)' }}>
          账户类型名称
          <input
            autoFocus
            type="text"
            value={nameDraft}
            placeholder={namePlaceholder}
            onChange={(event) => onNameChange(event.target.value)}
            style={{
              width: '100%',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 12px',
              background: 'transparent',
              color: 'var(--text-main)',
              font: 'inherit'
            }}
          />
        </label>

        <div style={{ display: 'grid', gap: 8, color: 'var(--text-secondary)', marginTop: 14 }}>
          <span>类型性质</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 4,
              height: 'var(--segmented-control-height)',
              borderRadius: 'var(--radius-card)',
              padding: 4,
              background: 'var(--surface-muted)'
            }}
          >
            {natureOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onNatureChange(option.value)}
                style={{
                  border: 0,
                  borderRadius: 'var(--radius-control)',
                  padding: '8px 0',
                  background:
                    natureDraft === option.value
                      ? 'var(--button-primary-bg)'
                      : 'transparent',
                  color:
                    natureDraft === option.value
                      ? 'var(--button-primary-text)'
                      : 'var(--text-secondary)',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontWeight: 700
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, color: 'var(--text-secondary)', marginTop: 14 }}>
          <span>是否参与统计</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 4,
              height: 'var(--segmented-control-height)',
              borderRadius: 'var(--radius-card)',
              padding: 4,
              background: 'var(--surface-muted)'
            }}
          >
            {[
              { value: true, label: '是' },
              { value: false, label: '否' }
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => onStatsChange(option.value)}
                style={{
                  border: 0,
                  borderRadius: 'var(--radius-control)',
                  padding: '8px 0',
                  background:
                    statsDraft === option.value
                      ? 'var(--button-primary-bg)'
                      : 'transparent',
                  color:
                    statsDraft === option.value
                      ? 'var(--button-primary-text)'
                      : 'var(--text-secondary)',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontWeight: 700
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.92rem' }}>
            {error}
          </p>
        ) : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 22
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-control)',
              padding: '9px 14px',
              background: 'var(--surface-strong)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              font: 'inherit'
            }}
          >
            取消
          </button>
          <button
            type="submit"
            style={{
              border: 0,
              borderRadius: 'var(--radius-control)',
              padding: '9px 14px',
              background: 'var(--button-primary-bg)',
              color: 'var(--button-primary-text)',
              cursor: 'pointer',
              font: 'inherit'
            }}
          >
            确定
          </button>
        </div>
      </form>
    </OverlayBackdrop>
  );
}

export function AccountDialogLayer({
  amountEditor,
  infoEditor,
  restore,
  restoreTarget,
  create,
  accountType
}: AccountDialogLayerProps) {
  return (
    <>
      {amountEditor ? <AccountAmountEditorDialog {...amountEditor} /> : null}

      {infoEditor ? <AccountInfoEditorDialog {...infoEditor} /> : null}

      {restore ? <AccountRestoreDialog {...restore} /> : null}

      {restoreTarget ? <AccountRestoreTargetDialog {...restoreTarget} /> : null}

      {create ? <AccountCreateDialog {...create} /> : null}

      {accountType ? <AccountTypeEditorDialog {...accountType} /> : null}
    </>
  );
}
