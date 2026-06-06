import {
  JSON_INTEGRITY_ALGORITHM,
  sha256Hex
} from '../security/jsonHash';

export type JsonIntegrity = {
  algorithm: typeof JSON_INTEGRITY_ALGORITHM;
  hash: string;
};

export type JsonPayloadWrapper<T = unknown> = {
  integrity: JsonIntegrity;
  payload: T;
};

export type JsonEncryptedWrapper<T = unknown> = {
  integrity: JsonIntegrity;
  encrypted: T;
};

export type JsonIntegrityWarningReason =
  | 'missing'
  | 'mismatch'
  | 'unsupported'
  | 'malformed';

export type JsonIntegrityStatus =
  | {
      status: 'valid';
      contentKind: 'payload' | 'encrypted';
      content: unknown;
    }
  | {
      status: 'warning';
      reason: JsonIntegrityWarningReason;
      contentKind: 'payload' | 'encrypted' | 'legacy';
      content: unknown;
    }
  | {
      status: 'invalid';
      reason: 'parse-error' | 'missing-content' | 'invalid-shape';
      message: string;
    };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const getContentKey = (value: Record<string, unknown>) => {
  const hasPayload = hasOwn(value, 'payload');
  const hasEncrypted = hasOwn(value, 'encrypted');

  if (hasPayload && hasEncrypted) {
    return null;
  }

  if (hasPayload) {
    return 'payload';
  }

  if (hasEncrypted) {
    return 'encrypted';
  }

  return undefined;
};

const createIntegrity = async (content: unknown): Promise<JsonIntegrity> => ({
  algorithm: JSON_INTEGRITY_ALGORITHM,
  hash: await sha256Hex(JSON.stringify(content))
});

export const wrapJsonPayload = async <T>(payload: T): Promise<JsonPayloadWrapper<T>> => ({
  integrity: await createIntegrity(payload),
  payload
});

export const wrapEncryptedJson = async <T>(
  encrypted: T
): Promise<JsonEncryptedWrapper<T>> => ({
  integrity: await createIntegrity(encrypted),
  encrypted
});

export const createJsonPayloadExportText = async (payload: unknown) =>
  JSON.stringify(await wrapJsonPayload(payload));

export const createEncryptedJsonExportText = async (encrypted: unknown) =>
  JSON.stringify(await wrapEncryptedJson(encrypted));

export const verifyParsedJsonIntegrity = async (
  value: unknown
): Promise<JsonIntegrityStatus> => {
  if (!isPlainObject(value)) {
    return {
      status: 'warning',
      reason: 'missing',
      contentKind: 'legacy',
      content: value
    };
  }

  if (!hasOwn(value, 'integrity')) {
    return {
      status: 'warning',
      reason: 'missing',
      contentKind: 'legacy',
      content: value
    };
  }

  const contentKey = getContentKey(value);

  if (contentKey === null) {
    return {
      status: 'invalid',
      reason: 'invalid-shape',
      message: 'JSON wrapper cannot contain both payload and encrypted content.'
    };
  }

  if (contentKey === undefined) {
    return {
      status: 'invalid',
      reason: 'missing-content',
      message: 'JSON wrapper is missing payload or encrypted content.'
    };
  }

  const content = value[contentKey];
  const integrity = value.integrity;

  if (!isPlainObject(integrity)) {
    return {
      status: 'warning',
      reason: 'malformed',
      contentKind: contentKey,
      content
    };
  }

  if (integrity.algorithm !== JSON_INTEGRITY_ALGORITHM) {
    return {
      status: 'warning',
      reason: 'unsupported',
      contentKind: contentKey,
      content
    };
  }

  if (typeof integrity.hash !== 'string' || integrity.hash.length === 0) {
    return {
      status: 'warning',
      reason: 'malformed',
      contentKind: contentKey,
      content
    };
  }

  const actualHash = await sha256Hex(JSON.stringify(content));

  if (actualHash !== integrity.hash) {
    return {
      status: 'warning',
      reason: 'mismatch',
      contentKind: contentKey,
      content
    };
  }

  return {
    status: 'valid',
    contentKind: contentKey,
    content
  };
};

export const parseNetraFlowJsonFile = async (
  text: string
): Promise<JsonIntegrityStatus> => {
  try {
    return verifyParsedJsonIntegrity(JSON.parse(text));
  } catch (error) {
    return {
      status: 'invalid',
      reason: 'parse-error',
      message: error instanceof Error ? error.message : 'JSON parse failed.'
    };
  }
};
