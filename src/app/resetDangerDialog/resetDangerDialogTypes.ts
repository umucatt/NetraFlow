import type {
  AppDataResetAction,
  AppDataResetConfirmation
} from '../appDataLifecycleTypes';

export type ResetDangerDialogLayerProps = {
  confirmation: AppDataResetConfirmation;
  inputValue: string;
  getActionLabel: (action: AppDataResetAction) => string;
  onInputChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};
