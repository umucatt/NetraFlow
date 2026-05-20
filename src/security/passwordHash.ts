export const PASSWORD_HASH_ALGORITHM = 'PBKDF2-HMAC-SHA-256' as const;
export const PASSWORD_HASH_ITERATIONS = 600000;

const PASSWORD_HASH_BITS = 256;
const PASSWORD_SALT_BYTES = 16;

export type PasswordHash = {
  algorithm: typeof PASSWORD_HASH_ALGORITHM;
  iterations: number;
  salt: string;
  hash: string;
};

const bytesToBase64 = (bytes: ArrayBuffer | Uint8Array) => {
  const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';

  byteArray.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const toArrayBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
};

const derivePasswordHash = async (
  password: string,
  salt: Uint8Array,
  iterations: number
) => {
  const passwordBytes = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(passwordBytes),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations
    },
    keyMaterial,
    PASSWORD_HASH_BITS
  );

  return bytesToBase64(derivedBits);
};

export const isPasswordHash = (value: unknown): value is PasswordHash => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.algorithm === PASSWORD_HASH_ALGORITHM &&
    candidate.iterations === PASSWORD_HASH_ITERATIONS &&
    typeof candidate.salt === 'string' &&
    candidate.salt.length > 0 &&
    typeof candidate.hash === 'string' &&
    candidate.hash.length > 0
  );
};

export const createPasswordHash = async (password: string): Promise<PasswordHash> => {
  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  crypto.getRandomValues(salt);

  return {
    algorithm: PASSWORD_HASH_ALGORITHM,
    iterations: PASSWORD_HASH_ITERATIONS,
    salt: bytesToBase64(salt),
    hash: await derivePasswordHash(password, salt, PASSWORD_HASH_ITERATIONS)
  };
};

export const verifyPassword = async (password: string, savedHash: PasswordHash) => {
  try {
    const salt = base64ToBytes(savedHash.salt);
    const hash = await derivePasswordHash(password, salt, savedHash.iterations);

    return timingSafeEqual(hash, savedHash.hash);
  } catch (error) {
    console.warn('[NetraFlow security] Failed to verify password hash.', error);
    return false;
  }
};
