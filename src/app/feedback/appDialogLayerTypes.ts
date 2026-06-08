import type {
  AppDialogControllerModel,
  AppDialogControllerSnapshot
} from '../useAppDialogController';

export type AppDialogLayerProps = Pick<
  AppDialogControllerSnapshot,
  'confirmationDialog' | 'noticeDialog' | 'inputDialog' | 'inputDialogValue'
> &
  Pick<
    AppDialogControllerModel,
    | 'closeConfirmationDialog'
    | 'confirmAndClose'
    | 'closeNoticeDialog'
    | 'closeInputDialog'
    | 'confirmInputDialog'
    | 'setInputDialogValue'
  >;
