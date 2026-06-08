import { ConfirmDialog, InputDialog, NoticeDialog } from '../../components/dialogs';
import type { AppDialogLayerProps } from './appDialogLayerTypes';

export function AppDialogLayer({
  confirmationDialog,
  noticeDialog,
  inputDialog,
  inputDialogValue,
  closeConfirmationDialog,
  confirmAndClose,
  closeNoticeDialog,
  closeInputDialog,
  confirmInputDialog,
  setInputDialogValue
}: AppDialogLayerProps) {
  return (
    <>
      {noticeDialog ? (
        <NoticeDialog
          title={noticeDialog.title}
          message={noticeDialog.message}
          closeLabel={noticeDialog.confirmLabel}
          onClose={closeNoticeDialog}
        />
      ) : null}

      {inputDialog ? (
        <InputDialog
          title={inputDialog.title}
          message={inputDialog.message}
          label={inputDialog.label}
          value={inputDialogValue}
          placeholder={inputDialog.placeholder}
          confirmLabel={inputDialog.confirmLabel}
          cancelLabel={inputDialog.cancelLabel}
          inputType={inputDialog.inputType}
          autoComplete={inputDialog.autoComplete}
          onValueChange={setInputDialogValue}
          onConfirm={confirmInputDialog}
          onCancel={closeInputDialog}
        />
      ) : null}

      {confirmationDialog ? (
        <ConfirmDialog
          title={confirmationDialog.title}
          message={confirmationDialog.message}
          confirmLabel={confirmationDialog.confirmLabel}
          cancelLabel={confirmationDialog.cancelLabel}
          eyebrow={confirmationDialog.eyebrow}
          tone={confirmationDialog.tone}
          onConfirm={confirmAndClose}
          onCancel={closeConfirmationDialog}
        />
      ) : null}
    </>
  );
}
