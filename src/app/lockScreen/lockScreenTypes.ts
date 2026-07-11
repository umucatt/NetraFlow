import type { FormEvent } from 'react';
import type { LockScreenState } from './lockScreenLogic';

export type LockScreenLayerProps = {
  state: LockScreenState;
  productIconPath: string;
  password: string;
  error: string;
  isUnlocking: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPanelExitComplete: () => void;
};
