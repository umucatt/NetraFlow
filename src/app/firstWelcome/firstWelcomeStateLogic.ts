import { nfStorage } from '../nfStorage';
import { isPlainObject } from '../objectUtils';
import { readStorageJson } from '../storageJson';
import {
  ACCOUNTS_STORAGE_KEY,
  AUTO_BACKUP_SETTINGS_STORAGE_KEY,
  BACKUP_RECORDS_STORAGE_KEY,
  CHART_SETTINGS_STORAGE_KEY,
  FIRST_WELCOME_STORAGE_KEY,
  GLOBAL_SETTINGS_STORAGE_KEY,
  GROUPS_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY,
  LAST_BACKUP_STORAGE_KEY,
  LEGACY_ACCOUNTS_STORAGE_KEY,
  LEGACY_ACCOUNT_TYPES_STORAGE_KEY,
  LEGACY_ARCHIVED_ACCOUNTS_STORAGE_KEY,
  LEGACY_DELETED_RECORDS_STORAGE_KEY,
  LEGACY_HISTORY_STORAGE_KEY
} from '../storageKeys';

export type FirstWelcomeState = {
  completed: boolean;
  pendingAfterClearAll: boolean;
};

export const DEFAULT_FIRST_WELCOME_STATE: FirstWelcomeState = {
  completed: false,
  pendingAfterClearAll: false
};

const FIRST_WELCOME_FOOTPRINT_STORAGE_KEYS = [
  GROUPS_STORAGE_KEY,
  ACCOUNTS_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  LAST_BACKUP_STORAGE_KEY,
  LAST_BACKUP_HISTORY_COUNT_STORAGE_KEY,
  BACKUP_RECORDS_STORAGE_KEY,
  AUTO_BACKUP_SETTINGS_STORAGE_KEY,
  CHART_SETTINGS_STORAGE_KEY,
  GLOBAL_SETTINGS_STORAGE_KEY,
  LEGACY_ACCOUNTS_STORAGE_KEY,
  LEGACY_ACCOUNT_TYPES_STORAGE_KEY,
  LEGACY_HISTORY_STORAGE_KEY,
  LEGACY_ARCHIVED_ACCOUNTS_STORAGE_KEY,
  LEGACY_DELETED_RECORDS_STORAGE_KEY
] as const;

export const normalizeFirstWelcomeState = (value: unknown): FirstWelcomeState => {
  if (!isPlainObject(value)) {
    return DEFAULT_FIRST_WELCOME_STATE;
  }

  return {
    completed: value.completed === true,
    pendingAfterClearAll: value.pendingAfterClearAll === true
  };
};

const hasExistingFirstWelcomeFootprint = () =>
  FIRST_WELCOME_FOOTPRINT_STORAGE_KEYS.some((key) => nfStorage.getItem(key) !== null);

export const loadFirstWelcomeState = (): FirstWelcomeState => {
  const storedState = readStorageJson(FIRST_WELCOME_STORAGE_KEY);

  if (storedState.parsed) {
    return normalizeFirstWelcomeState(storedState.value);
  }

  return hasExistingFirstWelcomeFootprint()
    ? { completed: true, pendingAfterClearAll: false }
    : DEFAULT_FIRST_WELCOME_STATE;
};

export const saveFirstWelcomeState = (state: FirstWelcomeState) => {
  nfStorage.setItem(
    FIRST_WELCOME_STORAGE_KEY,
    JSON.stringify(normalizeFirstWelcomeState(state))
  );
};

export const shouldShowFirstWelcome = (state: FirstWelcomeState) =>
  state.pendingAfterClearAll || !state.completed;
