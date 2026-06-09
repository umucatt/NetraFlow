import type {
  AppDialogControllerModel,
  AppDialogControllerSnapshot
} from '../useAppDialogController';

import type { AppDialogLayerProps } from './appDialogLayerTypes';

export type CreateAppDialogLayerPropsOptions = Pick<
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

export const createAppDialogLayerProps = ({
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
}: CreateAppDialogLayerPropsOptions): AppDialogLayerProps => ({
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
});
