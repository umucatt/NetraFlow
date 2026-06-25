export const ENCRYPTED_FILE_VERSION = 1 as const;
export const ENCRYPTION_ALGORITHM = 'AES-256-GCM' as const;
export const PASSWORD_KDF_ALGORITHM = 'PBKDF2-HMAC-SHA-256' as const;
export const FILE_KEY_KDF_ALGORITHM = 'HKDF-SHA-256' as const;
export const ENCRYPTION_KEY_BYTES = 32;
export const ENCRYPTION_KEY_BITS = ENCRYPTION_KEY_BYTES * 8;
export const ENCRYPTION_SALT_BYTES = 16;
export const ENCRYPTION_IV_BYTES = 12;
export const ENCRYPTION_TAG_BYTES = 16;
export const ENCRYPTION_KDF_ITERATIONS = 600000;

export type EncryptedFileType =
  | 'netraflow-encrypted-core'
  | 'netraflow-encrypted-snapshot';

export type FileKeyPurpose =
  | 'netraflow-core-v1'
  | 'netraflow-snapshot-v1';

export type PasswordKdfDescriptor = {
  algorithm: typeof PASSWORD_KDF_ALGORITHM;
  iterations: number;
  salt: string;
};

export type FileKeyDescriptor = {
  algorithm: typeof FILE_KEY_KDF_ALGORITHM;
  salt: string;
  purpose: FileKeyPurpose;
};

export type EncryptedJsonEnvelope = {
  type: EncryptedFileType;
  version: typeof ENCRYPTED_FILE_VERSION;
  createdAt: string;
  encryption: {
    algorithm: typeof ENCRYPTION_ALGORITHM;
    passwordKdf: PasswordKdfDescriptor;
    fileKeyKdf: FileKeyDescriptor;
    iv: string;
  };
  payload: string;
};

export type CryptoEnvelopeErrorCode =
  | 'ENCRYPTED_ENVELOPE_INVALID'
  | 'ENCRYPTED_PARAMETERS_UNSUPPORTED'
  | 'ENCRYPTED_BASE64_INVALID'
  | 'ENCRYPTED_DECRYPT_FAILED'
  | 'ENCRYPTED_JSON_INVALID';

export class CryptoEnvelopeError extends Error {
  code: CryptoEnvelopeErrorCode;

  constructor(code: CryptoEnvelopeErrorCode, message: string) {
    super(message);
    this.name = 'CryptoEnvelopeError';
    this.code = code;
  }
}

export const getFileKeyPurpose = (type: EncryptedFileType): FileKeyPurpose =>
  type === 'netraflow-encrypted-core'
    ? 'netraflow-core-v1'
    : 'netraflow-snapshot-v1';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isPasswordKdfDescriptor = (
  value: unknown
): value is PasswordKdfDescriptor => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.algorithm === PASSWORD_KDF_ALGORITHM &&
    typeof value.iterations === 'number' &&
    Number.isInteger(value.iterations) &&
    value.iterations > 0 &&
    typeof value.salt === 'string' &&
    value.salt.length > 0
  );
};

export const arePasswordKdfDescriptorsEqual = (
  left: PasswordKdfDescriptor,
  right: PasswordKdfDescriptor
) =>
  left.algorithm === right.algorithm &&
  left.iterations === right.iterations &&
  left.salt === right.salt;

export const isFileKeyDescriptor = (
  value: unknown,
  expectedPurpose?: FileKeyPurpose
): value is FileKeyDescriptor => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.algorithm === FILE_KEY_KDF_ALGORITHM &&
    (expectedPurpose === undefined || value.purpose === expectedPurpose) &&
    (value.purpose === 'netraflow-core-v1' ||
      value.purpose === 'netraflow-snapshot-v1') &&
    typeof value.salt === 'string' &&
    value.salt.length > 0
  );
};

export const isEncryptedJsonEnvelope = (
  value: unknown,
  expectedType?: EncryptedFileType
): value is EncryptedJsonEnvelope => {
  if (!isRecord(value) || !isRecord(value.encryption)) {
    return false;
  }

  return (
    (expectedType === undefined || value.type === expectedType) &&
    (value.type === 'netraflow-encrypted-core' ||
      value.type === 'netraflow-encrypted-snapshot') &&
    value.version === ENCRYPTED_FILE_VERSION &&
    typeof value.createdAt === 'string' &&
    value.createdAt.length > 0 &&
    value.encryption.algorithm === ENCRYPTION_ALGORITHM &&
    isPasswordKdfDescriptor(value.encryption.passwordKdf) &&
    isFileKeyDescriptor(value.encryption.fileKeyKdf, getFileKeyPurpose(value.type)) &&
    typeof value.encryption.iv === 'string' &&
    typeof value.payload === 'string'
  );
};

export const validateSupportedEnvelope = (
  envelope: unknown,
  expectedType: EncryptedFileType
): EncryptedJsonEnvelope => {
  if (!isEncryptedJsonEnvelope(envelope, expectedType)) {
    throw new CryptoEnvelopeError(
      'ENCRYPTED_ENVELOPE_INVALID',
      'Encrypted envelope shape is invalid.'
    );
  }

  return envelope;
};
