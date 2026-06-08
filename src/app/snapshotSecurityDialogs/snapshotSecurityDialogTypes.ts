import type {
  ComponentProps,
  FormEvent
} from 'react';

import type {
  PasswordEditorDialog,
  SnapshotEncryptionDisableDialog,
  SnapshotPasswordEditorDialog
} from '../../features/settings';

export type PasswordEditorDialogGroup = ComponentProps<typeof PasswordEditorDialog>;

export type SnapshotPasswordEditorDialogGroup = ComponentProps<
  typeof SnapshotPasswordEditorDialog
>;

export type SnapshotEncryptionDisableDialogGroup = ComponentProps<
  typeof SnapshotEncryptionDisableDialog
>;

export type PasswordProtectionDisableDialogGroup = {
  password: string;
  error: string;
  isLoading: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export type SnapshotSecurityDialogLayerProps = {
  passwordEditor: PasswordEditorDialogGroup | null;
  snapshotPasswordEditor: SnapshotPasswordEditorDialogGroup | null;
  passwordProtectionDisable: PasswordProtectionDisableDialogGroup | null;
  snapshotEncryptionDisable: SnapshotEncryptionDisableDialogGroup | null;
};
