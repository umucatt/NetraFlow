import { createHash } from 'node:crypto';

import {
  deriveCoreCryptoSession,
  decryptJsonEnvelopeWithSession,
  encryptJsonEnvelopeWithSession,
  isEncryptedJsonEnvelope,
  type CoreCryptoSession,
  type CryptoEnvelopeErrorCode,
  type EncryptedJsonEnvelope
} from './cryptoEnvelope.js';
import {
  isCoreDocument,
  type CoreFileFingerprint,
  type CoreDocument
} from './persistenceContracts.js';

const JSON_INTEGRITY_ALGORITHM = 'SHA-256' as const;
const CORE_DECRYPTION_ERROR_MESSAGE = '无法解密该文件。';
export const CORE_PLAIN_INTEGRITY_WARNING =
  '检测到文件完整性校验不一致，文件可能已在 NF 外部发生更改。NF 将继续检查文件内容，请确认文件来源并注意数据风险。';
export const CORE_ENCRYPTED_INTEGRITY_WARNING =
  '检测到文件完整性校验不一致，文件可能已在 NF 外部发生更改，其中也可能包括加密参数。NF 将尝试继续解密和验证，请确认文件来源并注意数据风险。';

export type CoreFileIntegrity = {
  algorithm: typeof JSON_INTEGRITY_ALGORITHM;
  hash: string;
};

export type PlainCoreFile = {
  integrity: CoreFileIntegrity;
  payload: CoreDocument;
};

export type EncryptedCoreFile = {
  integrity: CoreFileIntegrity;
  encrypted: EncryptedJsonEnvelope;
};

export type CoreFile = PlainCoreFile | EncryptedCoreFile;

export type CoreReadStatus =
  | {
      status: 'plain';
      document: CoreDocument;
      warning?: typeof CORE_PLAIN_INTEGRITY_WARNING;
    }
  | {
    status: 'encrypted';
    document: CoreDocument;
    session?: CoreCryptoSession;
    warning?: typeof CORE_ENCRYPTED_INTEGRITY_WARNING;
  }
  | {
      status: 'locked';
      warning?: typeof CORE_ENCRYPTED_INTEGRITY_WARNING;
    };

export type CoreCodecErrorCode =
  | 'CORE_JSON_INVALID'
  | 'CORE_WRAPPER_INVALID'
  | 'CORE_SCHEMA_INVALID'
  | 'CORE_DECRYPTION_FAILED'
  | CryptoEnvelopeErrorCode;

export class CoreCodecError extends Error {
  code: CoreCodecErrorCode;

  constructor(code: CoreCodecErrorCode, message: string) {
    super(message);
    this.name = 'CoreCodecError';
    this.code = code;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const sha256Hex = (content: string | Uint8Array) =>
  createHash('sha256').update(content).digest('hex');

export const createCoreFileFingerprint = (
  content: string | Uint8Array
): CoreFileFingerprint => {
  const bytes = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;

  return {
    algorithm: JSON_INTEGRITY_ALGORITHM,
    value: sha256Hex(bytes),
    size: bytes.byteLength
  };
};

const createIntegrity = (content: unknown): CoreFileIntegrity => ({
  algorithm: JSON_INTEGRITY_ALGORITHM,
  hash: sha256Hex(JSON.stringify(content))
});

const verifyIntegrity = (wrapper: Record<string, unknown>, content: unknown) => {
  const integrity = wrapper.integrity;

  if (!isRecord(integrity)) {
    return false;
  }

  if (integrity.algorithm !== JSON_INTEGRITY_ALGORITHM) {
    return false;
  }

  if (typeof integrity.hash !== 'string' || integrity.hash.length === 0) {
    return false;
  }

  return sha256Hex(JSON.stringify(content)) === integrity.hash;
};

const getWrappedContent = (wrapper: unknown) => {
  if (!isRecord(wrapper)) {
    throw new CoreCodecError('CORE_WRAPPER_INVALID', 'Core wrapper is invalid.');
  }

  const hasPayload = hasOwn(wrapper, 'payload');
  const hasEncrypted = hasOwn(wrapper, 'encrypted');

  if (hasPayload === hasEncrypted) {
    throw new CoreCodecError('CORE_WRAPPER_INVALID', 'Core wrapper content is invalid.');
  }

  return hasPayload
    ? { kind: 'payload' as const, content: wrapper.payload, wrapper }
    : { kind: 'encrypted' as const, content: wrapper.encrypted, wrapper };
};

const parseCoreText = (text: string) => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new CoreCodecError('CORE_JSON_INVALID', 'Core file is invalid JSON.');
  }
};

export const isEncryptedCoreFileContent = (value: unknown) => {
  try {
    const { kind, content } = getWrappedContent(value);
    return kind === 'encrypted' && isEncryptedJsonEnvelope(content, 'netraflow-encrypted-core');
  } catch {
    return false;
  }
};

export const encodePlainCoreFile = (document: CoreDocument): CoreFile => {
  if (!isCoreDocument(document)) {
    throw new CoreCodecError('CORE_SCHEMA_INVALID', 'Core document failed validation.');
  }

  return {
    integrity: createIntegrity(document),
    payload: document
  };
};

export const encodeEncryptedCoreFile = (
  document: CoreDocument,
  session: CoreCryptoSession
): CoreFile => {
  if (!isCoreDocument(document)) {
    throw new CoreCodecError('CORE_SCHEMA_INVALID', 'Core document failed validation.');
  }

  const encrypted = encryptJsonEnvelopeWithSession(
    document,
    session,
    'netraflow-encrypted-core'
  );

  return {
    integrity: createIntegrity(encrypted),
    encrypted
  };
};

export const serializeCoreFile = (file: CoreFile) => `${JSON.stringify(file, null, 2)}\n`;

export const decodeCoreFileText = (
  text: string,
  credential: string | CoreCryptoSession | null
): CoreReadStatus => {
  const parsed = parseCoreText(text);
  const { kind, content, wrapper } = getWrappedContent(parsed);
  const integrityValid = verifyIntegrity(wrapper, content);

  if (kind === 'payload') {
    if (!isCoreDocument(content)) {
      throw new CoreCodecError('CORE_SCHEMA_INVALID', 'Core document failed validation.');
    }

    return {
      status: 'plain',
      document: content,
      ...(integrityValid ? {} : { warning: CORE_PLAIN_INTEGRITY_WARNING })
    };
  }

  if (!isEncryptedJsonEnvelope(content, 'netraflow-encrypted-core')) {
    throw new CoreCodecError('CORE_WRAPPER_INVALID', 'Encrypted core envelope is invalid.');
  }

  if (credential === null) {
    return {
      status: 'locked',
      ...(integrityValid ? {} : { warning: CORE_ENCRYPTED_INTEGRITY_WARNING })
    };
  }

  let decrypted: unknown;
  let session: CoreCryptoSession | undefined;

  try {
    if (typeof credential === 'string') {
      session = deriveCoreCryptoSession(credential, content.encryption.passwordKdf);
      decrypted = decryptJsonEnvelopeWithSession(
        content,
        session,
        'netraflow-encrypted-core'
      );
    } else {
      decrypted = decryptJsonEnvelopeWithSession(
        content,
        credential,
        'netraflow-encrypted-core'
      );
    }
  } catch (error) {
    const code =
      error instanceof Error && 'code' in error
        ? String((error as { code?: unknown }).code)
        : 'CORE_DECRYPTION_FAILED';

    throw new CoreCodecError(
      code as CoreCodecErrorCode,
      CORE_DECRYPTION_ERROR_MESSAGE
    );
  }

  if (!isCoreDocument(decrypted)) {
    throw new CoreCodecError('CORE_SCHEMA_INVALID', 'Core document failed validation.');
  }

  return {
    status: 'encrypted',
    document: decrypted,
    ...(session ? { session } : {}),
    ...(integrityValid ? {} : { warning: CORE_ENCRYPTED_INTEGRITY_WARNING })
  };
};

export const createCoreProtectionSnapshot = (text: string) => {
  const parsed = parseCoreText(text);
  const { kind, content, wrapper } = getWrappedContent(parsed);
  const integrityValid = verifyIntegrity(wrapper, content);

  return {
    encrypted: kind === 'encrypted',
    integrityValid
  };
};
