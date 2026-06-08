import type { FormEvent } from 'react';

import { OverlayBackdrop } from '../overlay';

import type { ResetDangerDialogLayerProps } from './resetDangerDialogTypes';

export function ResetDangerDialogLayer({
  confirmation,
  inputValue,
  getActionLabel,
  onInputChange,
  onCancel,
  onConfirm
}: ResetDangerDialogLayerProps) {
  if (!confirmation) {
    return null;
  }

  const actionLabel = getActionLabel(confirmation.action);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <OverlayBackdrop onBack={onCancel} className="modal-backdrop">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-confirmation-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        className="modal-card"
      >
        <p className="eyebrow" style={{ marginBottom: 8 }}>
          重置功能
        </p>
        <h2
          id="reset-confirmation-title"
          style={{ margin: '0 0 10px', fontSize: '1.26rem' }}
        >
          {actionLabel}
        </h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.94rem' }}>
          您正在进行{actionLabel}操作，请注意该操作无法恢复
        </p>
        <div className="reset-confirmation-code" aria-label="确认数字">
          {confirmation.code}
        </div>
        <label className="right-panel-label" style={{ marginTop: 14 }}>
          输入上方 4 位数字
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
          />
        </label>
        {inputValue && inputValue !== confirmation.code ? (
          <p className="global-settings-note">数字不匹配</p>
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
            disabled={inputValue !== confirmation.code}
            className="modal-button modal-button--danger"
          >
            确认执行
          </button>
        </div>
      </form>
    </OverlayBackdrop>
  );
}
