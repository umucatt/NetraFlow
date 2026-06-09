import type { ComponentProps } from 'react';

import type {
  AccountAmountEditorDialog,
  AccountCreateDialog,
  AccountInfoEditorDialog,
  AccountRestoreDialog,
  AccountRestoreTargetDialog
} from '../../features/account';
import type { AccountTypeEditorState } from '../../features/account/accountTypeLogic';
import type { AccountTypeNature } from '../types';

export type AccountAmountEditorDialogPropsGroup = ComponentProps<
  typeof AccountAmountEditorDialog
>;

export type AccountInfoEditorDialogPropsGroup = ComponentProps<
  typeof AccountInfoEditorDialog
>;

export type AccountRestoreDialogPropsGroup = ComponentProps<
  typeof AccountRestoreDialog
>;

export type AccountRestoreTargetDialogPropsGroup = ComponentProps<
  typeof AccountRestoreTargetDialog
>;

export type AccountCreateDialogPropsGroup = ComponentProps<
  typeof AccountCreateDialog
>;

export type AccountTypeDialogPropsGroup = {
  editor: NonNullable<AccountTypeEditorState>;
  nameDraft: string;
  namePlaceholder?: string;
  natureDraft: AccountTypeNature;
  statsDraft: boolean;
  error: string;
  natureOptions: Array<{ value: AccountTypeNature; label: string }>;
  onNameChange: (value: string) => void;
  onNatureChange: (value: AccountTypeNature) => void;
  onStatsChange: (value: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export type AccountDialogLayerProps = {
  amountEditor: AccountAmountEditorDialogPropsGroup | null;
  infoEditor: AccountInfoEditorDialogPropsGroup | null;
  restore: AccountRestoreDialogPropsGroup | null;
  restoreTarget: AccountRestoreTargetDialogPropsGroup | null;
  create: AccountCreateDialogPropsGroup | null;
  accountType: AccountTypeDialogPropsGroup | null;
};
