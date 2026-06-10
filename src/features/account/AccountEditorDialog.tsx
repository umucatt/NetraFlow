import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
  type WheelEvent
} from 'react';
import { NfActionAddIcon } from '../../assets/icons';
import DialogShell from '../../components/dialogs/DialogShell';
import NfSvgIcon from '../../components/NfSvgIcon';
import QuickEntryActions from '../quickEntry/QuickEntryActions';
import QuickEntryForm from '../quickEntry/QuickEntryForm';

type AccountEditMode = 'set' | 'adjust';
type AccountAdjustDirection = 'increase' | 'decrease';

type ArchivedAccount = {
  id: string;
  groupId: string;
  name: string;
  amount: number;
  createdAt: string;
  alias?: string;
  archived?: boolean;
  archivedAt?: string;
  groupName: string;
};

type AccountRestoreTargetGroup = {
  id: string;
  name: string;
};

const centeredBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: 'var(--modal-backdrop)'
};

const amountEditorCardStyle: CSSProperties = {
  width: 'min(520px, 100%)',
  maxHeight: '84vh',
  overflowY: 'auto',
  borderRadius: 'var(--radius-page)',
  padding: 24,
  background: 'var(--surface-strong)',
  boxShadow: 'var(--shadow-popover)'
};

const addRestoreCardStyle: CSSProperties = {
  width: 'min(640px, 100%)',
  maxHeight: '84vh',
  overflowY: 'auto',
  borderRadius: 'var(--radius-page)',
  padding: 'clamp(18px, 2vw, 24px)',
  border: '1px solid var(--border-soft)',
  background: 'var(--account-add-panel-bg)',
  boxShadow: 'var(--shadow-popover)'
};

const addAccountCardStyle: CSSProperties = {
  width: 'min(380px, 100%)',
  borderRadius: 'var(--radius-page)',
  padding: 24,
  border: '1px solid var(--border-soft)',
  background: 'var(--account-add-panel-bg)',
  boxShadow: 'var(--shadow-popover)'
};

type AccountAmountEditorDialogProps = {
  title: ReactNode;
  editMode: AccountEditMode;
  draftAmount: string;
  setAmountDatePicker: ReactNode;
  setAmountNote: string;
  adjustAmount: string;
  adjustDirection: AccountAdjustDirection;
  isAdjustAmountInvalid: boolean;
  currentAmountLabel: string;
  nextAdjustedAmountLabel: string;
  signedAdjustAmountLabel: string;
  signedAdjustAmountColor: string;
  adjustDatePicker: ReactNode;
  adjustAmountNote: string;
  isEditingArchivedAccount: boolean;
  isSubmitDisabled: boolean;
  onEditModeChange: (mode: AccountEditMode) => void;
  onDraftAmountInputChange: (value: string) => void;
  onSetAmountNoteChange: (value: string) => void;
  onAdjustAmountInputChange: (value: string) => void;
  onAdjustDirectionChange: (direction: AccountAdjustDirection) => void;
  onAdjustAmountNoteChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

function AccountAmountEditorDialog({
  title,
  editMode,
  draftAmount,
  setAmountDatePicker,
  setAmountNote,
  adjustAmount,
  adjustDirection,
  isAdjustAmountInvalid,
  currentAmountLabel,
  nextAdjustedAmountLabel,
  signedAdjustAmountLabel,
  signedAdjustAmountColor,
  adjustDatePicker,
  adjustAmountNote,
  isEditingArchivedAccount,
  isSubmitDisabled,
  onEditModeChange,
  onDraftAmountInputChange,
  onSetAmountNoteChange,
  onAdjustAmountInputChange,
  onAdjustDirectionChange,
  onAdjustAmountNoteChange,
  onSubmit,
  onCancel
}: AccountAmountEditorDialogProps) {
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
      backdropClassName="modal-backdrop"
      backdropStyle={centeredBackdropStyle}
      cardStyle={amountEditorCardStyle}
      onClose={onCancel}
      onSubmit={handleSubmit}
      actionsClassName="account-operation-actions"
      actions={(
        <QuickEntryActions canSubmit={!isSubmitDisabled} onClose={onCancel} />
      )}
    >
      <QuickEntryForm
        editMode={editMode}
        draftAmount={draftAmount}
        setAmountDatePicker={setAmountDatePicker}
        setAmountNote={setAmountNote}
        adjustAmount={adjustAmount}
        adjustDirection={adjustDirection}
        isAdjustAmountInvalid={isAdjustAmountInvalid}
        currentAmountLabel={currentAmountLabel}
        nextAdjustedAmountLabel={nextAdjustedAmountLabel}
        signedAdjustAmountLabel={signedAdjustAmountLabel}
        signedAdjustAmountColor={signedAdjustAmountColor}
        adjustDatePicker={adjustDatePicker}
        adjustAmountNote={adjustAmountNote}
        isEditingArchivedAccount={isEditingArchivedAccount}
        onEditModeChange={onEditModeChange}
        onDraftAmountInputChange={onDraftAmountInputChange}
        onSetAmountNoteChange={onSetAmountNoteChange}
        onAdjustAmountInputChange={onAdjustAmountInputChange}
        onAdjustDirectionChange={onAdjustDirectionChange}
        onAdjustAmountNoteChange={onAdjustAmountNoteChange}
      />
    </DialogShell>
  );
}

type AccountRestoreDialogProps = {
  archivedAccounts: ArchivedAccount[];
  filteredAccounts: ArchivedAccount[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  getRestoreTitle: (account: ArchivedAccount) => string;
  getArchivedAtLabel: (archivedAt?: string) => string;
  formatMoney: (amount: number | null) => string;
  onRestore: (account: ArchivedAccount) => void;
  onCancel: () => void;
};

type AccountRestoreTargetDialogProps = {
  groups: AccountRestoreTargetGroup[];
  onChooseGroup: (groupId: string) => void;
  onCancel: () => void;
};

function AccountRestoreDialog({
  archivedAccounts,
  filteredAccounts,
  searchQuery,
  onSearchQueryChange,
  getRestoreTitle,
  getArchivedAtLabel,
  formatMoney,
  onRestore,
  onCancel
}: AccountRestoreDialogProps) {
  return (
    <DialogShell
      title="恢复已归档账户"
      headerClassName="account-add-restore-panel__header"
      titleClassName="account-add-restore-panel__title"
      titleStyle={{ margin: 0 }}
      className="account-add-restore-panel"
      backdropClassName="layout-layer layout-layer--left"
      backdropStyle={centeredBackdropStyle}
      cardStyle={addRestoreCardStyle}
      onClose={onCancel}
    >
      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>已归档账户列表</h3>
        {archivedAccounts.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>暂无可恢复账户</p>
        ) : (
          <>
            <label style={{ display: 'grid', gap: 8, color: 'var(--text-secondary)' }}>
              <input
                type="text"
                aria-label="搜索已归档账户"
                placeholder="搜索已归档账户名称"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-input)',
                  padding: '9px 10px',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  font: 'inherit'
                }}
              />
            </label>
            {filteredAccounts.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                未找到匹配的已归档账户
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {filteredAccounts.map((account) => (
                  <article key={account.id} className="account-restore-card">
                    <span className="account-restore-card__content">
                      <strong className="account-restore-card__title">
                        {getRestoreTitle(account)}
                      </strong>
                      <span className="account-restore-card__meta">
                        {getArchivedAtLabel(account.archivedAt)} · {formatMoney(account.amount)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRestore(account)}
                      className="account-operation-button account-restore-card__restore-button"
                    >
                      恢复
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </DialogShell>
  );
}

function AccountRestoreTargetDialog({
  groups,
  onChooseGroup,
  onCancel
}: AccountRestoreTargetDialogProps) {
  return (
    <DialogShell
      title="原账户类别已删除，请选择恢复到哪个账户类别"
      headerClassName="account-add-restore-panel__header"
      titleClassName="account-add-restore-panel__title"
      titleStyle={{ margin: 0 }}
      className="account-add-restore-panel account-restore-target-dialog"
      backdropClassName="modal-backdrop"
      cardStyle={addRestoreCardStyle}
      onClose={onCancel}
    >
      <section
        className="flash-note-account-picker quick-single-entry-account-picker account-restore-target-picker"
        aria-label="选择恢复账户类别"
      >
        {groups.length > 0 ? (
          <div className="flash-note-account-group quick-single-entry-account-group">
            <span>账户类别</span>
            <div>
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="flash-note-account-chip account-restore-target-chip"
                  onClick={() => onChooseGroup(group.id)}
                >
                  <span>{group.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </DialogShell>
  );
}

type AccountCreateDialogProps = {
  accountTypeInputRef: RefObject<HTMLInputElement | null>;
  accountTypeInput: string;
  accountTypeInputPlaceholder?: string;
  accountTypeGhostText: string;
  accountTypeCount: number;
  newAccountName: string;
  newAccountNamePlaceholder?: string;
  newAccountAmount: string;
  error: string;
  onAccountTypeInputChange: (value: string) => void;
  onConfirmAccountTypeInput: () => void;
  onAccountTypeWheel: (event: WheelEvent<HTMLElement>) => void;
  onSwitchAccountType: (direction: 1 | -1) => void;
  onOpenCreateAccountType: () => void;
  onNameChange: (value: string) => void;
  onAmountInputChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

function AccountCreateDialog({
  accountTypeInputRef,
  accountTypeInput,
  accountTypeInputPlaceholder,
  accountTypeGhostText,
  accountTypeCount,
  newAccountName,
  newAccountNamePlaceholder,
  newAccountAmount,
  error,
  onAccountTypeInputChange,
  onConfirmAccountTypeInput,
  onAccountTypeWheel,
  onSwitchAccountType,
  onOpenCreateAccountType,
  onNameChange,
  onAmountInputChange,
  onSubmit,
  onCancel
}: AccountCreateDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleInputWheel = (event: WheelEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.deltaY === 0) {
      return;
    }

    onSwitchAccountType(event.deltaY > 0 ? 1 : -1);
  };

  return (
    <DialogShell
      as="form"
      title="账户新增"
      headerClassName="account-add-restore-panel__header"
      titleClassName="account-add-restore-panel__title"
      titleStyle={{ margin: 0 }}
      className="account-add-restore-panel account-add-restore-panel--form"
      backdropClassName="layout-layer layout-layer--right"
      backdropStyle={centeredBackdropStyle}
      cardStyle={addAccountCardStyle}
      onClose={onCancel}
      onSubmit={handleSubmit}
      actionsClassName="account-add-form-actions"
      actions={(
        <>
          <button
            type="button"
            onClick={onCancel}
            className="account-add-form-button account-add-form-button--secondary"
          >
            取消
          </button>
          <button type="submit" className="account-add-form-button account-add-form-button--primary">
            确定
          </button>
        </>
      )}
    >
      <div className="account-type-select-row">
        <label>
          选择类型
          <div
            className="stepper-input"
            onWheel={onAccountTypeWheel}
            style={{
              position: 'relative',
              width: '100%'
            }}
          >
            <div className="stepper-input__ghost" aria-hidden="true">
              <span style={{ color: 'transparent' }}>{accountTypeInput}</span>
              <span>{accountTypeGhostText}</span>
            </div>
            <input
              ref={accountTypeInputRef}
              autoFocus
              type="text"
              value={accountTypeInput}
              placeholder={accountTypeInputPlaceholder}
              onChange={(event) => onAccountTypeInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onConfirmAccountTypeInput();
                }
              }}
              onWheel={handleInputWheel}
            />
            <div
              className="stepper-input__controls"
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                bottom: 6,
                display: 'grid',
                width: 24,
                overflow: 'hidden',
                border: 0,
                borderRadius: 'var(--radius-control)',
                background: 'transparent',
                boxShadow: 'none'
              }}
            >
              {[
                { label: '上一个账户类型', direction: -1 as const, path: 'M7 14l5-5 5 5' },
                { label: '下一个账户类型', direction: 1 as const, path: 'M7 10l5 5 5-5' }
              ].map((control) => (
                <button
                  key={control.label}
                  type="button"
                  aria-label={control.label}
                  disabled={accountTypeCount < 2}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSwitchAccountType(control.direction)}
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    border: 0,
                    borderTop:
                      control.direction === 1 ? '1px solid var(--border-soft)' : 0,
                    padding: 0,
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: accountTypeCount < 2 ? 'default' : 'pointer'
                  }}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ width: 12, height: 12 }}
                  >
                    <path
                      d={control.path}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </label>
        <button
          type="button"
          aria-label="新建账户类型"
          onClick={onOpenCreateAccountType}
          className="account-type-add-button"
        >
          <NfSvgIcon svg={NfActionAddIcon} className="account-type-add-icon" decorative />
        </button>
      </div>

      <label style={{ display: 'grid', gap: 8, color: 'var(--text-secondary)', marginTop: 14 }}>
        账户名称
        <input
          type="text"
          value={newAccountName}
          placeholder={newAccountNamePlaceholder}
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

      <label style={{ display: 'grid', gap: 8, color: 'var(--text-secondary)', marginTop: 14 }}>
        初始金额
        <input
          type="text"
          inputMode="decimal"
          value={newAccountAmount}
          onChange={(event) => onAmountInputChange(event.target.value)}
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

      {error ? (
        <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.92rem' }}>
          {error}
        </p>
      ) : null}
    </DialogShell>
  );
}

export {
  AccountAmountEditorDialog,
  AccountCreateDialog,
  AccountRestoreDialog,
  AccountRestoreTargetDialog
};
