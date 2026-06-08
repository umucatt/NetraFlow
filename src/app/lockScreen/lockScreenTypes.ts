import type { FormEvent } from 'react';

export type LockScreenLayerProps = {
  isLocked: boolean;
  productIconPath: string;
  password: string;
  error: string;
  isUnlocking: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};
