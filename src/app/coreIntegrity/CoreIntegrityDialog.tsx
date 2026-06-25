import DialogShell from '../../components/dialogs/DialogShell';

type CoreIntegrityDialogProps = {
  hasPendingSave: boolean;
  onAcknowledge: () => void;
  onContinueSave?: () => void;
};

export function CoreIntegrityDialog({
  hasPendingSave,
  onAcknowledge,
  onContinueSave
}: CoreIntegrityDialogProps) {
  return (
    <DialogShell
      title="核心数据完整性验证失败"
      titleId="core-integrity-dialog-title"
      role="alertdialog"
      actions={(
        <>
          <button
            type="button"
            onClick={onAcknowledge}
            className="modal-button modal-button--secondary"
          >
            我知道了
          </button>
          {hasPendingSave ? (
            <button
              type="button"
              onClick={onContinueSave}
              className="modal-button modal-button--primary"
            >
              继续保存
            </button>
          ) : null}
        </>
      )}
    >
      <div className="modal-message">
        <p>核心数据已发生非 NetraFlow 写入的异常修改</p>
        <p>无法确认数据仍完整可信</p>
      </div>
    </DialogShell>
  );
}
