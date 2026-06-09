import { nfStorage } from './nfStorage';

export const readStorageJson = (key: string) => {
  const raw = nfStorage.getItem(key);

  if (raw === null) {
    return { exists: false, parsed: false, value: undefined, raw };
  }

  try {
    return { exists: true, parsed: true, value: JSON.parse(raw) as unknown, raw };
  } catch (error) {
    console.warn(`[NetraFlow storage] Failed to parse storage key "${key}".`, error);

    return { exists: true, parsed: false, value: undefined, raw };
  }
};
