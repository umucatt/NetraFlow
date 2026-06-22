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
