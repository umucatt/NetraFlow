import { PASSWORD_HASH_ITERATIONS } from './passwordHash';

const ENCRYPTED_SNAPSHOT_TYPE = 'netraflow-encrypted-snapshot' as const;
const ENCRYPTED_SNAPSHOT_VERSION = 1;
const SNAPSHOT_ENCRYPTION_ALGORITHM = 'AES-256-GCM' as const;
const SNAPSHOT_KDF_ALGORITHM = 'PBKDF2-HMAC-SHA-256' as const;
const SNAPSHOT_KEY_BITS = 256;
const SNAPSHOT_SALT_BYTES = 16;
const SNAPSHOT_IV_BYTES = 12;

export const SNAPSHOT_DECRYPTION_ERROR_MESSAGE =
  '解密失败，请检查快照密码或文件是否完整';

export type EncryptedSnapshotFile = {
  type?: typeof ENCRYPTED_SNAPSHOT_TYPE;
  version?: typeof ENCRYPTED_SNAPSHOT_VERSION;
  createdAt: string;
  encryption: {
    algorithm: typeof SNAPSHOT_ENCRYPTION_ALGORITHM;
    kdf: typeof SNAPSHOT_KDF_ALGORITHM;
    iterations: typeof PASSWORD_HASH_ITERATIONS;
    salt: string;
    iv: string;
  };
  payload: string;
};

const toArrayBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

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

const deriveSnapshotKey = async (
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
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: SNAPSHOT_KEY_BITS
    },
    false,
    ['encrypt', 'decrypt']
  );
};

export const isEncryptedSnapshotFile = (value: unknown): value is EncryptedSnapshotFile => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const encryption = candidate.encryption;

  if (typeof encryption !== 'object' || encryption === null) {
    return false;
  }

  const encryptionCandidate = encryption as Record<string, unknown>;
  const hasSupportedLegacyMarker =
    (candidate.type === undefined && candidate.version === undefined) ||
    (candidate.type === ENCRYPTED_SNAPSHOT_TYPE &&
      candidate.version === ENCRYPTED_SNAPSHOT_VERSION);

  return (
    hasSupportedLegacyMarker &&
    typeof candidate.createdAt === 'string' &&
    candidate.createdAt.length > 0 &&
    encryptionCandidate.algorithm === SNAPSHOT_ENCRYPTION_ALGORITHM &&
    encryptionCandidate.kdf === SNAPSHOT_KDF_ALGORITHM &&
    encryptionCandidate.iterations === PASSWORD_HASH_ITERATIONS &&
    typeof encryptionCandidate.salt === 'string' &&
    encryptionCandidate.salt.length > 0 &&
    typeof encryptionCandidate.iv === 'string' &&
    encryptionCandidate.iv.length > 0 &&
    typeof candidate.payload === 'string' &&
    candidate.payload.length > 0
  );
};

export const encryptSnapshotPayload = async (
  snapshotData: unknown,
  password: string
): Promise<EncryptedSnapshotFile> => {
  const salt = new Uint8Array(SNAPSHOT_SALT_BYTES);
  const iv = new Uint8Array(SNAPSHOT_IV_BYTES);
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);

  const key = await deriveSnapshotKey(password, salt, PASSWORD_HASH_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(snapshotData));
  const encryptedPayload = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv)
    },
    key,
    toArrayBuffer(plaintext)
  );

  return {
    createdAt: new Date().toISOString(),
    encryption: {
      algorithm: SNAPSHOT_ENCRYPTION_ALGORITHM,
      kdf: SNAPSHOT_KDF_ALGORITHM,
      iterations: PASSWORD_HASH_ITERATIONS,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv)
    },
    payload: bytesToBase64(encryptedPayload)
  };
};

export const decryptSnapshotPayload = async (
  encryptedSnapshot: EncryptedSnapshotFile,
  password: string
) => {
  try {
    const salt = base64ToBytes(encryptedSnapshot.encryption.salt);
    const iv = base64ToBytes(encryptedSnapshot.encryption.iv);
    const payload = base64ToBytes(encryptedSnapshot.payload);
    const key = await deriveSnapshotKey(
      password,
      salt,
      encryptedSnapshot.encryption.iterations
    );
    const decryptedPayload = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv)
      },
      key,
      toArrayBuffer(payload)
    );
    const plaintext = new TextDecoder().decode(decryptedPayload);

    return JSON.parse(plaintext) as unknown;
  } catch (error) {
    console.warn('[NetraFlow snapshot] Failed to decrypt snapshot.', error);
    throw new Error(SNAPSHOT_DECRYPTION_ERROR_MESSAGE);
  }
};
