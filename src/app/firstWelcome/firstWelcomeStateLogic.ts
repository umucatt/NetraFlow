import { isPlainObject } from '../objectUtils';

export type FirstWelcomeState = {
  completed: boolean;
  pendingAfterClearAll: boolean;
};

export const DEFAULT_FIRST_WELCOME_STATE: FirstWelcomeState = {
  completed: false,
  pendingAfterClearAll: false
};

export const normalizeFirstWelcomeState = (value: unknown): FirstWelcomeState => {
  if (!isPlainObject(value)) {
    return DEFAULT_FIRST_WELCOME_STATE;
  }

  return {
    completed: value.completed === true,
    pendingAfterClearAll: value.pendingAfterClearAll === true
  };
};

export const shouldShowFirstWelcome = (state: FirstWelcomeState) =>
  state.pendingAfterClearAll || !state.completed;

export type StartupDataState = 'empty' | 'valid' | 'invalid';

export const classifyStartupDataState = (status: {
  core: 'missing' | 'valid' | 'invalid';
  settings: 'missing' | 'valid' | 'invalid';
  state: 'missing' | 'valid' | 'invalid';
  security: 'missing' | 'valid' | 'invalid';
}): StartupDataState => {
  const values = Object.values(status);
  if (values.every((value) => value === 'missing')) return 'empty';
  if (values.some((value) => value === 'invalid')) return 'invalid';
  return status.core === 'valid' && status.state === 'valid' ? 'valid' : 'invalid';
};

export const resolveStartupDestination = ({
  coreExists,
  stateExists,
  firstWelcome,
  locked,
  dataState
}: {
  coreExists: boolean;
  stateExists: boolean;
  firstWelcome: FirstWelcomeState;
  locked: boolean;
  dataState?: StartupDataState;
}) => {
  if (dataState === 'invalid') return 'invalid' as const;
  if (dataState === 'empty') return 'onboarding' as const;
  if (dataState === 'valid' && shouldShowFirstWelcome(firstWelcome)) return 'invalid' as const;
  if (!coreExists || !stateExists || shouldShowFirstWelcome(firstWelcome)) return 'onboarding' as const;
  if (locked) return 'locked' as const;
  return 'application' as const;
};
