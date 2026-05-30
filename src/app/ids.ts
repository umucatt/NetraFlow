export type StableEntityIdPrefix = 'g_' | 'a_';

const ID_RANDOM_BYTE_LENGTH = 12;

const createRandomHex = () => {
  const bytes = new Uint8Array(ID_RANDOM_BYTE_LENGTH);
  const cryptoSource = globalThis.crypto;

  if (!cryptoSource?.getRandomValues) {
    throw new Error('Secure random id generation is unavailable.');
  }

  cryptoSource.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const createStableEntityId = (
  prefix: StableEntityIdPrefix,
  existingIds: Iterable<string> = []
) => {
  const usedIds = new Set(existingIds);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = `${prefix}${createRandomHex()}`;

    if (!usedIds.has(id)) {
      return id;
    }
  }

  throw new Error(`Unable to create a unique ${prefix} id.`);
};

export const createStableGroupId = (existingIds: Iterable<string> = []) =>
  createStableEntityId('g_', existingIds);

export const createStableAccountId = (existingIds: Iterable<string> = []) =>
  createStableEntityId('a_', existingIds);
