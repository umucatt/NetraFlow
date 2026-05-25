import type { ReactNode } from 'react';

export type QuickEntryMode = 'set' | 'adjust';
export type QuickEntryAdjustDirection = 'increase' | 'decrease';

type QuickEntryFormProps = {
  editMode: QuickEntryMode;
  draftAmount: string;
  setAmountDatePicker: ReactNode;
  setAmountNote: string;
  adjustAmount: string;
  adjustDirection: QuickEntryAdjustDirection;
  isAdjustAmountInvalid: boolean;
  currentAmountLabel: string;
  nextAdjustedAmountLabel: string;
  signedAdjustAmountLabel: string;
  signedAdjustAmountColor: string;
  adjustDatePicker: ReactNode;
  adjustAmountNote: string;
  isEditingArchivedAccount: boolean;
  onEditModeChange: (mode: QuickEntryMode) => void;
  onDraftAmountInputChange: (value: string) => void;
  onSetAmountNoteChange: (value: string) => void;
  onAdjustAmountInputChange: (value: string) => void;
  onAdjustDirectionChange: (direction: QuickEntryAdjustDirection) => void;
  onAdjustAmountNoteChange: (value: string) => void;
};

function QuickEntryForm({
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
  onEditModeChange,
  onDraftAmountInputChange,
  onSetAmountNoteChange,
  onAdjustAmountInputChange,
  onAdjustDirectionChange,
  onAdjustAmountNoteChange
}: QuickEntryFormProps) {
  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { value: 'set', label: '修改余额' },
          { value: 'adjust', label: '增减金额' }
        ].map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onEditModeChange(mode.value as QuickEntryMode)}
            style={{
              flex: 1,
              boxSizing: 'border-box',
              height: 'var(--nf-control-height)',
              minHeight: 'var(--nf-control-height)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-control)',
              padding: '0 10px',
              background:
                editMode === mode.value ? 'var(--button-primary-bg)' : 'var(--surface-strong)',
              color:
                editMode === mode.value ? 'var(--button-primary-text)' : 'var(--text-secondary)',
              cursor: 'pointer',
              font: 'inherit'
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {editMode === 'set' ? (
        <div className="account-operation-form-grid">
          <label className="account-operation-field">
            <span>新余额</span>
            <input
              className="account-operation-input"
              autoFocus
              type="text"
              inputMode="decimal"
              value={draftAmount}
              onChange={(event) => onDraftAmountInputChange(event.target.value)}
            />
            {isEditingArchivedAccount ? (
              <span className="account-operation-field-hint">
                修改余额/增减金额会自动将该账户重新启用
              </span>
            ) : null}
          </label>
          {setAmountDatePicker}
          <label className="account-operation-field">
            <span>备注</span>
            <textarea
              className="account-operation-input account-operation-textarea"
              placeholder="可选"
              rows={2}
              value={setAmountNote}
              onChange={(event) => onSetAmountNoteChange(event.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="account-operation-form-grid">
          {isAdjustAmountInvalid ? (
            <div
              style={{
                borderRadius: 'var(--radius-card)',
                padding: '9px 10px',
                background: 'rgba(185, 28, 28, 0.12)',
                color: '#b91c1c',
                fontWeight: 700
              }}
            >
              净值将为负数
            </div>
          ) : null}
          <label className="account-operation-field">
            <span>变动金额</span>
            <input
              className="account-operation-input"
              autoFocus
              type="text"
              inputMode="decimal"
              value={adjustAmount}
              onChange={(event) => onAdjustAmountInputChange(event.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 'var(--input-height)',
                minHeight: 'var(--input-height)',
                border: isAdjustAmountInvalid
                  ? '1px solid rgba(185, 28, 28, 0.75)'
                  : '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-input)',
                padding: '0 var(--nf-control-padding-x)',
                color: isAdjustAmountInvalid ? '#b91c1c' : 'var(--text-main)',
                font: 'inherit'
              }}
            />
            {isEditingArchivedAccount ? (
              <span className="account-operation-field-hint">
                修改余额/增减金额会自动将该账户重新启用
              </span>
            ) : null}
          </label>
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
              { value: 'increase', label: '+' },
              { value: 'decrease', label: '-' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onAdjustDirectionChange(option.value as QuickEntryAdjustDirection)
                }
                style={{
                  boxSizing: 'border-box',
                  height: 'var(--segmented-control-option-height)',
                  minHeight: 'var(--segmented-control-option-height)',
                  border: 0,
                  borderRadius: 'var(--radius-control)',
                  padding: 0,
                  background:
                    adjustDirection === option.value ? 'var(--button-primary-bg)' : 'transparent',
                  color:
                    adjustDirection === option.value
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
          <div className="account-operation-change-preview">
            <span>变更：</span>
            <span className="change-preview-amount-line">
              {currentAmountLabel} 至 {nextAdjustedAmountLabel}
            </span>
            <strong style={{ color: signedAdjustAmountColor }}>
              {signedAdjustAmountLabel}
            </strong>
          </div>
          {adjustDatePicker}
          <label className="account-operation-field">
            <span>备注</span>
            <textarea
              className="account-operation-input account-operation-textarea"
              placeholder="可选"
              rows={2}
              value={adjustAmountNote}
              onChange={(event) => onAdjustAmountNoteChange(event.target.value)}
            />
          </label>
        </div>
      )}
    </>
  );
}

export default QuickEntryForm;
