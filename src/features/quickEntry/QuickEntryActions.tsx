type QuickEntryActionsProps = {
  canSubmit: boolean;
  onClose: () => void;
};

function QuickEntryActions({ canSubmit, onClose }: QuickEntryActionsProps) {
  return (
    <>
      <button type="button" onClick={onClose} className="account-operation-button">
        取消
      </button>
      <button
        type="submit"
        disabled={!canSubmit}
        className="account-operation-button account-operation-button--confirm"
      >
        确定
      </button>
    </>
  );
}

export default QuickEntryActions;
