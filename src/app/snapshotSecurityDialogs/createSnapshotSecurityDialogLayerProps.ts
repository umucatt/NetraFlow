import type { FormEvent } from 'react';

import type {
  SnapshotSecurityDialogLayerProps,
  PasswordEditorDialogGroup
} from './snapshotSecurityDialogTypes';

type PasswordEditorMode = PasswordEditorDialogGroup['mode'] | null;

export type CreateSnapshotSecurityDialogLayerPropsOptions = {
  passwordEditor: {
    mode: PasswordEditorMode;
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
    error: string;
    isSaving: boolean;
    onOldPasswordChange: (value: string) => void;
    onNewPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onSubmit: PasswordEditorDialogGroup['onSubmit'];
    onCancel: () => void;
  };
  passwordProtectionDisable: {
    isOpen: boolean;
    password: string;
    error: string;
    isLoading: boolean;
    onPasswordChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
  };
  snapshotEncryptionDisable: {
    isOpen: boolean;
    password: string;
    error: string;
    isLoading: boolean;
    onPasswordChange: (value: string) => void;
    onSubmit: NonNullable<SnapshotSecurityDialogLayerProps['snapshotEncryptionDisable']>['onSubmit'];
    onCancel: () => void;
  };
};

export const createSnapshotSecurityDialogLayerProps = ({
  passwordEditor,
  passwordProtectionDisable,
  snapshotEncryptionDisable
}: CreateSnapshotSecurityDialogLayerPropsOptions): SnapshotSecurityDialogLayerProps => ({
  passwordEditor: passwordEditor.mode
    ? {
        mode: passwordEditor.mode,
        oldPassword: passwordEditor.oldPassword,
        newPassword: passwordEditor.newPassword,
        confirmPassword: passwordEditor.confirmPassword,
        error: passwordEditor.error,
        isSaving: passwordEditor.isSaving,
        onOldPasswordChange: passwordEditor.onOldPasswordChange,
        onNewPasswordChange: passwordEditor.onNewPasswordChange,
        onConfirmPasswordChange: passwordEditor.onConfirmPasswordChange,
        onSubmit: passwordEditor.onSubmit,
        onCancel: passwordEditor.onCancel
      }
    : null,
  passwordProtectionDisable: passwordProtectionDisable.isOpen
    ? {
        password: passwordProtectionDisable.password,
        error: passwordProtectionDisable.error,
        isLoading: passwordProtectionDisable.isLoading,
        onPasswordChange: passwordProtectionDisable.onPasswordChange,
        onSubmit: passwordProtectionDisable.onSubmit,
        onCancel: passwordProtectionDisable.onCancel
      }
    : null,
  snapshotEncryptionDisable: snapshotEncryptionDisable.isOpen
    ? {
        password: snapshotEncryptionDisable.password,
        error: snapshotEncryptionDisable.error,
        isLoading: snapshotEncryptionDisable.isLoading,
        onPasswordChange: snapshotEncryptionDisable.onPasswordChange,
        onSubmit: snapshotEncryptionDisable.onSubmit,
        onCancel: snapshotEncryptionDisable.onCancel
      }
    : null
});
