import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';

import {
  arePasswordKdfDescriptorsEqual,
  CryptoEnvelopeError,
  ENCRYPTED_FILE_VERSION,
  ENCRYPTION_ALGORITHM,
  ENCRYPTION_IV_BYTES,
  ENCRYPTION_KDF_ITERATIONS,
  ENCRYPTION_KEY_BYTES,
  ENCRYPTION_SALT_BYTES,
  ENCRYPTION_TAG_BYTES,
  FILE_KEY_KDF_ALGORITHM,
  getFileKeyPurpose,
  isEncryptedJsonEnvelope,
  PASSWORD_KDF_ALGORITHM,
  validateSupportedEnvelope,
  type CryptoEnvelopeErrorCode,
  type EncryptedFileType,
  type EncryptedJsonEnvelope,
  type FileKeyDescriptor,
  type PasswordKdfDescriptor
} from './cryptoEnvelopeShared.js';

export {
  arePasswordKdfDescriptorsEqual,
  CryptoEnvelopeError,
  ENCRYPTED_FILE_VERSION,
  ENCRYPTION_ALGORITHM,
  ENCRYPTION_IV_BYTES,
  ENCRYPTION_KDF_ITERATIONS,
  ENCRYPTION_KEY_BYTES,
  ENCRYPTION_SALT_BYTES,
  ENCRYPTION_TAG_BYTES,
  FILE_KEY_KDF_ALGORITHM,
  getFileKeyPurpose,
  isEncryptedJsonEnvelope,
  PASSWORD_KDF_ALGORITHM,
  type CryptoEnvelopeErrorCode,
  type EncryptedFileType,
  type EncryptedJsonEnvelope,
  type FileKeyDescriptor,
  type PasswordKdfDescriptor
};

export type CoreCryptoSession = {
  rootKey: Buffer;
  passwordKdf: PasswordKdfDescriptor;
};

const isBase64Text = (value: string) =>
  value.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0;

const decodeBase64 = (value: string) => {
  if (!isBase64Text(value)) {
    throw new CryptoEnvelopeError('ENCRYPTED_BASE64_INVALID', 'Invalid base64 field.');
  }

  return Buffer.from(value, 'base64');
};

const createPasswordKdfDescriptor = (): PasswordKdfDescriptor => ({
  algorithm: PASSWORD_KDF_ALGORITHM,
  iterations: ENCRYPTION_KDF_ITERATIONS,
  salt: randomBytes(ENCRYPTION_SALT_BYTES).toString('base64')
});

const createFileKeyDescriptor = (type: EncryptedFileType): FileKeyDescriptor => ({
  algorithm: FILE_KEY_KDF_ALGORITHM,
  salt: randomBytes(ENCRYPTION_SALT_BYTES).toString('base64'),
  purpose: getFileKeyPurpose(type)
});

const deriveRootKey = (password: string, passwordKdf: PasswordKdfDescriptor) =>
  pbkdf2Sync(
    password,
    decodeBase64(passwordKdf.salt),
    passwordKdf.iterations,
    ENCRYPTION_KEY_BYTES,
    'sha256'
  );

const deriveFileKey = (rootKey: Buffer, fileKeyKdf: FileKeyDescriptor) =>
  Buffer.from(
    hkdfSync(
      'sha256',
      rootKey,
      decodeBase64(fileKeyKdf.salt),
      fileKeyKdf.purpose,
      ENCRYPTION_KEY_BYTES
    )
  );

export const createCoreCryptoSession = (password: string): CoreCryptoSession => {
  const passwordKdf = createPasswordKdfDescriptor();

  return {
    rootKey: deriveRootKey(password, passwordKdf),
    passwordKdf
  };
};

export const deriveCoreCryptoSession = (
  password: string,
  passwordKdf: PasswordKdfDescriptor
): CoreCryptoSession => ({
  rootKey: deriveRootKey(password, passwordKdf),
  passwordKdf
});

export const canSessionDecryptEnvelope = (
  session: CoreCryptoSession,
  envelope: EncryptedJsonEnvelope
) => arePasswordKdfDescriptorsEqual(session.passwordKdf, envelope.encryption.passwordKdf);

const validateEncodedBytes = (
  salt: Buffer,
  iv: Buffer,
  payload: Buffer
) => {
  if (
    salt.length !== ENCRYPTION_SALT_BYTES ||
    iv.length !== ENCRYPTION_IV_BYTES ||
    payload.length <= ENCRYPTION_TAG_BYTES
  ) {
    throw new CryptoEnvelopeError('ENCRYPTED_BASE64_INVALID', 'Invalid encrypted bytes.');
  }
};

export const encryptJsonEnvelopeWithSession = (
  payload: unknown,
  session: CoreCryptoSession,
  type: EncryptedFileType
): EncryptedJsonEnvelope => {
  const fileKeyKdf = createFileKeyDescriptor(type);
  const iv = randomBytes(ENCRYPTION_IV_BYTES);
  const key = deriveFileKey(session.rootKey, fileKeyKdf);
  const cipher = createCipheriv('aes-256-gcm', key, iv, {
    authTagLength: ENCRYPTION_TAG_BYTES
  });
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    type,
    version: ENCRYPTED_FILE_VERSION,
    createdAt: new Date().toISOString(),
    encryption: {
      algorithm: ENCRYPTION_ALGORITHM,
      passwordKdf: session.passwordKdf,
      fileKeyKdf,
      iv: iv.toString('base64')
    },
    payload: Buffer.concat([ciphertext, tag]).toString('base64')
  };
};

export const encryptJsonEnvelope = (
  payload: unknown,
  password: string,
  type: EncryptedFileType
): EncryptedJsonEnvelope =>
  encryptJsonEnvelopeWithSession(payload, createCoreCryptoSession(password), type);

export const decryptJsonEnvelopeWithSession = (
  envelope: unknown,
  session: CoreCryptoSession,
  expectedType: EncryptedFileType
) => {
  const supportedEnvelope = validateSupportedEnvelope(envelope, expectedType);

  if (!canSessionDecryptEnvelope(session, supportedEnvelope)) {
    throw new CryptoEnvelopeError(
      'ENCRYPTED_DECRYPT_FAILED',
      'Session does not match encrypted file password KDF.'
    );
  }

  let salt: Buffer;
  let iv: Buffer;
  let payload: Buffer;

  try {
    salt = decodeBase64(supportedEnvelope.encryption.fileKeyKdf.salt);
    iv = decodeBase64(supportedEnvelope.encryption.iv);
    payload = decodeBase64(supportedEnvelope.payload);
    validateEncodedBytes(salt, iv, payload);
  } catch (error) {
    if (error instanceof CryptoEnvelopeError) {
      throw error;
    }

    throw new CryptoEnvelopeError('ENCRYPTED_BASE64_INVALID', 'Invalid base64 field.');
  }

  try {
    const key = deriveFileKey(session.rootKey, supportedEnvelope.encryption.fileKeyKdf);
    const tag = payload.subarray(payload.length - ENCRYPTION_TAG_BYTES);
    const ciphertext = payload.subarray(0, payload.length - ENCRYPTION_TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', key, iv, {
      authTagLength: ENCRYPTION_TAG_BYTES
    });

    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      'utf8'
    );

    return JSON.parse(plaintext) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CryptoEnvelopeError(
        'ENCRYPTED_JSON_INVALID',
        'Decrypted payload is invalid JSON.'
      );
    }

    throw new CryptoEnvelopeError('ENCRYPTED_DECRYPT_FAILED', 'Unable to decrypt file.');
  }
};

export const decryptJsonEnvelope = (
  envelope: unknown,
  password: string,
  expectedType: EncryptedFileType
) => {
  const supportedEnvelope = validateSupportedEnvelope(envelope, expectedType);
  const session = deriveCoreCryptoSession(password, supportedEnvelope.encryption.passwordKdf);

  return decryptJsonEnvelopeWithSession(supportedEnvelope, session, expectedType);
};

export const verifySessionRootKeyChanged = (
  left: CoreCryptoSession,
  right: CoreCryptoSession
) =>
  left.rootKey.length !== right.rootKey.length || !timingSafeEqual(left.rootKey, right.rootKey);
