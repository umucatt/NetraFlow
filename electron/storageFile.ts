import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync
} from 'node:fs';
import path from 'node:path';

export type NfStorageItems = Record<string, string>;

export const CURRENT_NF_STORAGE_SCHEMA_VERSION = 1 as const;

export interface NfStorageDocumentV1 {
  schemaVersion: typeof CURRENT_NF_STORAGE_SCHEMA_VERSION;
  items: NfStorageItems;
}

export type ParsedNfStorageDocument =
  | {
      format: 'schema-1';
      schemaVersion: typeof CURRENT_NF_STORAGE_SCHEMA_VERSION;
      items: NfStorageItems;
    }
  | {
      format: 'legacy-flat';
      items: NfStorageItems;
    };

export type StorageDocumentIssue = 'INVALID' | 'UNSUPPORTED' | 'FUTURE';

export type NfStorageErrorCode =
  | 'TEMP_CLEANUP_FAILED'
  | 'TEMP_CREATE_FAILED'
  | 'TEMP_WRITE_FAILED'
  | 'TEMP_SYNC_FAILED'
  | 'TEMP_VERIFY_FAILED'
  | 'PREVIOUS_PREPARE_FAILED'
  | 'FINAL_REPLACE_FAILED'
  | 'FINAL_VERIFY_FAILED'
  | 'FINAL_VERIFY_FAILED_RECOVERED'
  | 'FINAL_VERIFY_FAILED_RECOVERY_FAILED'
  | 'STORAGE_READ_FAILED'
  | 'STORAGE_READ_INVALID'
  | 'STORAGE_SCHEMA_INVALID'
  | 'STORAGE_SCHEMA_UNSUPPORTED'
  | 'STORAGE_SCHEMA_FUTURE'
  | 'STORAGE_RECOVERY_REQUIRED'
  | 'STORAGE_RECOVERY_FAILED'
  | 'STORAGE_UNRECOVERABLE';

type StorageReadErrorCode =
  | 'STORAGE_READ_FAILED'
  | 'STORAGE_READ_INVALID'
  | 'STORAGE_SCHEMA_INVALID'
  | 'STORAGE_SCHEMA_UNSUPPORTED'
  | 'STORAGE_SCHEMA_FUTURE'
  | 'STORAGE_RECOVERY_REQUIRED'
  | 'STORAGE_RECOVERY_FAILED'
  | 'STORAGE_UNRECOVERABLE';

export type StorageReadResult =
  | { ok: true; exists: false; items: {} }
  | {
      ok: true;
      exists: true;
      items: NfStorageItems;
      legacy?: boolean;
      recovered?: boolean;
    }
  | {
      ok: false;
      code: StorageReadErrorCode;
      message: string;
    };

export type StorageWriteResult =
  | { ok: true }
  | {
      ok: false;
      code: NfStorageErrorCode;
      message: string;
      recovered?: boolean;
    };

export type NfStorageFileAdapter = {
  mkdirSync: typeof mkdirSync;
  openSync: typeof openSync;
  writeSync: typeof writeSync;
  fsyncSync: typeof fsyncSync;
  closeSync: typeof closeSync;
  readFileSync: typeof readFileSync;
  renameSync: typeof renameSync;
  unlinkSync: typeof unlinkSync;
  statSync: typeof statSync;
};

export type NfStorageLogger = {
  warn?: (message: string, details?: Record<string, unknown>) => void;
  error?: (message: string, details?: Record<string, unknown>) => void;
};

type StoragePathState =
  | { ok: true; exists: true; isFile: boolean }
  | { ok: true; exists: false }
  | { ok: false; code: 'STORAGE_READ_FAILED'; message: string; error: unknown };

type StrictReadExistingResult =
  | { ok: true; document: ParsedNfStorageDocument; items: NfStorageItems }
  | {
      ok: false;
      code:
        | 'STORAGE_READ_FAILED'
        | 'STORAGE_READ_INVALID'
        | 'STORAGE_SCHEMA_INVALID'
        | 'STORAGE_SCHEMA_UNSUPPORTED'
        | 'STORAGE_SCHEMA_FUTURE';
      message: string;
      issue?: StorageDocumentIssue;
    };

type OptionalStrictReadResult =
  | { exists: false }
  | { exists: true; ok: true; document: ParsedNfStorageDocument; items: NfStorageItems }
  | {
      exists: true;
      ok: false;
      code:
        | 'STORAGE_READ_FAILED'
        | 'STORAGE_READ_INVALID'
        | 'STORAGE_SCHEMA_INVALID'
        | 'STORAGE_SCHEMA_UNSUPPORTED'
        | 'STORAGE_SCHEMA_FUTURE';
      message: string;
      issue?: StorageDocumentIssue;
    };

type WriteCandidateStage = 'create' | 'write' | 'sync' | 'verify';

type WriteCandidateResult =
  | { ok: true }
  | { ok: false; stage: WriteCandidateStage; message: string; error?: unknown };

type RestoreCurrentResult =
  | { ok: true; items: NfStorageItems }
  | { ok: false; stage: string; message: string; error?: unknown };

export const defaultNfStorageFileAdapter: NfStorageFileAdapter = {
  mkdirSync,
  openSync,
  writeSync,
  fsyncSync,
  closeSync,
  readFileSync,
  renameSync,
  unlinkSync,
  statSync
};

export const getNfStorageFilePath = (storageDirectoryPath: string) =>
  path.join(storageDirectoryPath, 'storage.json');

export const getNfStorageTempFilePath = (storageFilePath: string) => `${storageFilePath}.tmp`;

export const getNfStoragePreviousFilePath = (storageFilePath: string) =>
  `${storageFilePath}.previous`;

export const getNfStoragePreviousTempFilePath = (storageFilePath: string) =>
  `${getNfStoragePreviousFilePath(storageFilePath)}.tmp`;

const unsafeStorageKeys = new Set(['__proto__', 'prototype', 'constructor']);

const isPlainStorageObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

const getOwnStorageKeys = (
  value: Record<string, unknown>
): { ok: true; keys: string[] } | { ok: false } => {
  try {
    const ownKeys = Reflect.ownKeys(value);

    if (ownKeys.some((key) => typeof key !== 'string')) {
      return { ok: false };
    }

    return { ok: true, keys: ownKeys as string[] };
  } catch {
    return { ok: false };
  }
};

const hasOwnStorageKey = (
  value: Record<string, unknown>,
  key: string
): { ok: true; exists: boolean } | { ok: false } => {
  try {
    return { ok: true, exists: Object.hasOwn(value, key) };
  } catch {
    return { ok: false };
  }
};

const readOwnStorageValue = (
  value: Record<string, unknown>,
  key: string
): { ok: true; value: unknown } | { ok: false } => {
  try {
    return { ok: true, value: value[key] };
  } catch {
    return { ok: false };
  }
};

const isNodeErrorWithCode = (error: unknown, code: string) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === code;

const getLogErrorDetails = (error: unknown) => ({
  errorName: error instanceof Error ? error.name : typeof error,
  errorCode:
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''
});

const warnStorage = (
  logger: NfStorageLogger | undefined,
  message: string,
  details: Record<string, unknown>
) => {
  logger?.warn?.(`[NetraFlow storage] ${message}`, details);
};

const errorStorage = (
  logger: NfStorageLogger | undefined,
  message: string,
  details: Record<string, unknown>
) => {
  logger?.error?.(`[NetraFlow storage] ${message}`, details);
};

const getStoragePathState = (
  filePath: string,
  adapter: NfStorageFileAdapter
): StoragePathState => {
  try {
    const stats = adapter.statSync(filePath);

    return { ok: true, exists: true, isFile: stats.isFile() };
  } catch (error) {
    if (isNodeErrorWithCode(error, 'ENOENT')) {
      return { ok: true, exists: false };
    }

    return {
      ok: false,
      code: 'STORAGE_READ_FAILED',
      message: 'Failed to inspect storage file.',
      error
    };
  }
};

export const sanitizeNfStorageItems = (
  value: unknown,
  whitelistKeys: readonly string[]
): NfStorageItems => {
  if (!isPlainStorageObject(value)) {
    return {};
  }

  const allowedKeys = new Set(whitelistKeys);
  const input = value as Record<string, unknown>;

  return whitelistKeys.reduce<NfStorageItems>((items, key) => {
    const valueResult = readOwnStorageValue(input, key);

    if (allowedKeys.has(key) && valueResult.ok && typeof valueResult.value === 'string') {
      items[key] = valueResult.value;
    }

    return items;
  }, {});
};

type ParseNfStorageDocumentResult =
  | { ok: true; document: ParsedNfStorageDocument; items: NfStorageItems }
  | {
      ok: false;
      code:
        | 'STORAGE_READ_INVALID'
        | 'STORAGE_SCHEMA_INVALID'
        | 'STORAGE_SCHEMA_UNSUPPORTED'
        | 'STORAGE_SCHEMA_FUTURE';
      issue: StorageDocumentIssue;
      message: string;
    };

const createDocumentParseError = (
  code: Extract<
    ParseNfStorageDocumentResult,
    { ok: false }
  >['code'],
  issue: StorageDocumentIssue,
  message: string
): ParseNfStorageDocumentResult => ({ ok: false, code, issue, message });

const validateNfStorageItemsObject = (
  value: unknown,
  whitelistKeys: readonly string[],
  invalidCode: 'STORAGE_READ_INVALID' | 'STORAGE_SCHEMA_INVALID',
  invalidMessagePrefix: string
): ParseNfStorageDocumentResult => {
  if (!isPlainStorageObject(value)) {
    return createDocumentParseError(
      invalidCode,
      'INVALID',
      `${invalidMessagePrefix} must be a plain JSON object.`
    );
  }

  const keysResult = getOwnStorageKeys(value);

  if (!keysResult.ok) {
    return createDocumentParseError(
      invalidCode,
      'INVALID',
      `${invalidMessagePrefix} keys could not be read.`
    );
  }

  const allowedKeys = new Set(whitelistKeys);
  const items: NfStorageItems = {};

  for (const key of keysResult.keys) {
    if (unsafeStorageKeys.has(key)) {
      return createDocumentParseError(
        invalidCode,
        'INVALID',
        `${invalidMessagePrefix} contains an unsafe key.`
      );
    }

    if (!allowedKeys.has(key)) {
      return createDocumentParseError(
        invalidCode,
        'INVALID',
        `${invalidMessagePrefix} contains an unsupported key.`
      );
    }

    const valueResult = readOwnStorageValue(value, key);

    if (!valueResult.ok) {
      return createDocumentParseError(
        invalidCode,
        'INVALID',
        `${invalidMessagePrefix} value could not be read.`
      );
    }

    if (typeof valueResult.value !== 'string') {
      return createDocumentParseError(
        invalidCode,
        'INVALID',
        `${invalidMessagePrefix} contains a non-string value.`
      );
    }

    items[key] = valueResult.value;
  }

  return {
    ok: true,
    document: {
      format: 'legacy-flat',
      items
    },
    items
  };
};

const parseNfStorageSchemaDocument = (
  value: Record<string, unknown>,
  whitelistKeys: readonly string[]
): ParseNfStorageDocumentResult => {
  const schemaVersionValue = readOwnStorageValue(value, 'schemaVersion');

  if (!schemaVersionValue.ok) {
    return createDocumentParseError(
      'STORAGE_SCHEMA_INVALID',
      'INVALID',
      'Storage schemaVersion could not be read.'
    );
  }

  if (
    typeof schemaVersionValue.value === 'number' &&
    Number.isInteger(schemaVersionValue.value)
  ) {
    if (schemaVersionValue.value > CURRENT_NF_STORAGE_SCHEMA_VERSION) {
      return createDocumentParseError(
        'STORAGE_SCHEMA_FUTURE',
        'FUTURE',
        'Storage file uses a newer schema version.'
      );
    }

    if (schemaVersionValue.value < CURRENT_NF_STORAGE_SCHEMA_VERSION) {
      return createDocumentParseError(
        'STORAGE_SCHEMA_UNSUPPORTED',
        'UNSUPPORTED',
        'Storage file uses an unsupported schema version.'
      );
    }
  }

  const keysResult = getOwnStorageKeys(value);

  if (!keysResult.ok) {
    return createDocumentParseError(
      'STORAGE_SCHEMA_INVALID',
      'INVALID',
      'Storage document keys could not be read.'
    );
  }

  const allowedDocumentKeys = new Set(['schemaVersion', 'items']);

  for (const key of keysResult.keys) {
    if (unsafeStorageKeys.has(key) || !allowedDocumentKeys.has(key)) {
      return createDocumentParseError(
        'STORAGE_SCHEMA_INVALID',
        'INVALID',
        'Storage document contains an unsupported top-level key.'
      );
    }
  }

  const hasSchemaVersion = hasOwnStorageKey(value, 'schemaVersion');
  const hasItems = hasOwnStorageKey(value, 'items');

  if (!hasSchemaVersion.ok || !hasItems.ok) {
    return createDocumentParseError(
      'STORAGE_SCHEMA_INVALID',
      'INVALID',
      'Storage document fields could not be inspected.'
    );
  }

  if (!hasSchemaVersion.exists || !hasItems.exists) {
    return createDocumentParseError(
      'STORAGE_SCHEMA_INVALID',
      'INVALID',
      'Storage document must contain schemaVersion and items.'
    );
  }

  if (
    typeof schemaVersionValue.value !== 'number' ||
    !Number.isInteger(schemaVersionValue.value) ||
    schemaVersionValue.value !== CURRENT_NF_STORAGE_SCHEMA_VERSION
  ) {
    return createDocumentParseError(
      'STORAGE_SCHEMA_INVALID',
      'INVALID',
      'Storage schemaVersion must be numeric version 1.'
    );
  }

  const itemsValue = readOwnStorageValue(value, 'items');

  if (!itemsValue.ok) {
    return createDocumentParseError(
      'STORAGE_SCHEMA_INVALID',
      'INVALID',
      'Storage document items could not be read.'
    );
  }

  const itemsResult = validateNfStorageItemsObject(
    itemsValue.value,
    whitelistKeys,
    'STORAGE_SCHEMA_INVALID',
    'Storage document items'
  );

  if (!itemsResult.ok) {
    return itemsResult;
  }

  const document: ParsedNfStorageDocument = {
    format: 'schema-1',
    schemaVersion: CURRENT_NF_STORAGE_SCHEMA_VERSION,
    items: itemsResult.items
  };

  return { ok: true, document, items: itemsResult.items };
};

export const parseNfStorageDocument = (
  value: unknown,
  whitelistKeys: readonly string[]
): ParseNfStorageDocumentResult => {
  if (!isPlainStorageObject(value)) {
    return createDocumentParseError(
      'STORAGE_READ_INVALID',
      'INVALID',
      'Storage file must contain a plain JSON object.'
    );
  }

  const hasSchemaVersion = hasOwnStorageKey(value, 'schemaVersion');
  const hasItems = hasOwnStorageKey(value, 'items');

  if (!hasSchemaVersion.ok || !hasItems.ok) {
    return createDocumentParseError(
      'STORAGE_SCHEMA_INVALID',
      'INVALID',
      'Storage document fields could not be inspected.'
    );
  }

  if (hasSchemaVersion.exists || hasItems.exists) {
    return parseNfStorageSchemaDocument(value, whitelistKeys);
  }

  return validateNfStorageItemsObject(
    value,
    whitelistKeys,
    'STORAGE_READ_INVALID',
    'Storage legacy items'
  );
};

const readExistingNfStorageFile = (
  storageFilePath: string,
  whitelistKeys: readonly string[],
  adapter: NfStorageFileAdapter
): StrictReadExistingResult => {
  let content: string;

  try {
    content = adapter.readFileSync(storageFilePath, 'utf8');
  } catch {
    return {
      ok: false,
      code: 'STORAGE_READ_FAILED',
      message: 'Failed to read storage file.'
    };
  }

  try {
    const parsed = parseNfStorageDocument(JSON.parse(content) as unknown, whitelistKeys);

    if (!parsed.ok) {
      return parsed;
    }

    return parsed;
  } catch {
    return {
      ok: false,
      code: 'STORAGE_READ_INVALID',
      message: 'Storage file contains invalid JSON.'
    };
  }
};

const readStorageFileByState = (
  storageFilePath: string,
  state: StoragePathState,
  whitelistKeys: readonly string[],
  adapter: NfStorageFileAdapter
): OptionalStrictReadResult => {
  if (!state.ok) {
    return {
      exists: true,
      ok: false,
      code: state.code,
      message: state.message
    };
  }

  if (!state.exists) {
    return { exists: false };
  }

  if (!state.isFile) {
    return {
      exists: true,
      ok: false,
      code: 'STORAGE_READ_INVALID',
      message: 'Storage path is not a regular file.'
    };
  }

  return {
    exists: true,
    ...readExistingNfStorageFile(storageFilePath, whitelistKeys, adapter)
  };
};

const createReadError = (
  code: StorageReadErrorCode,
  message: string
): StorageReadResult => ({ ok: false, code, message });

const createWriteError = (
  code: NfStorageErrorCode,
  message: string,
  recovered?: boolean
): StorageWriteResult => {
  const result: Extract<StorageWriteResult, { ok: false }> = { ok: false, code, message };

  if (recovered !== undefined) {
    result.recovered = recovered;
  }

  return result;
};

const writeAllSync = (adapter: NfStorageFileAdapter, fd: number, content: string) => {
  const buffer = Buffer.from(content, 'utf8');
  let offset = 0;

  while (offset < buffer.length) {
    const written = adapter.writeSync(fd, buffer, offset, buffer.length - offset);

    if (!Number.isInteger(written) || written <= 0) {
      throw new Error('Storage write did not make progress.');
    }

    offset += written;
  }
};

const areNfStorageItemsEqual = (left: NfStorageItems, right: NfStorageItems) => {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
};

export const serializeNfStorageDocument = (items: NfStorageItems) => {
  const document: NfStorageDocumentV1 = {
    schemaVersion: CURRENT_NF_STORAGE_SCHEMA_VERSION,
    items
  };

  return `${JSON.stringify(document, null, 2)}\n`;
};

const verifyStorageFileContent = (
  storageFilePath: string,
  expectedItems: NfStorageItems,
  whitelistKeys: readonly string[],
  adapter: NfStorageFileAdapter,
  options: { requireSchemaVersion?: typeof CURRENT_NF_STORAGE_SCHEMA_VERSION } = {}
) => {
  const readResult = readExistingNfStorageFile(storageFilePath, whitelistKeys, adapter);

  if (!readResult.ok) {
    return false;
  }

  if (
    options.requireSchemaVersion === CURRENT_NF_STORAGE_SCHEMA_VERSION &&
    readResult.document.format !== 'schema-1'
  ) {
    return false;
  }

  return areNfStorageItemsEqual(readResult.items, expectedItems);
};

const cleanupFileIfExists = (
  filePath: string,
  adapter: NfStorageFileAdapter
): { ok: true } | { ok: false; error: unknown } => {
  const state = getStoragePathState(filePath, adapter);

  if (!state.ok) {
    return { ok: false, error: state.error };
  }

  if (!state.exists) {
    return { ok: true };
  }

  try {
    adapter.unlinkSync(filePath);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

const warnCleanupFailure = (
  logger: NfStorageLogger | undefined,
  role: string,
  stage: string,
  error: unknown
) => {
  warnStorage(logger, 'Failed to clean stale storage file.', {
    role,
    stage,
    ...getLogErrorDetails(error)
  });
};

const cleanupTempAfterFailure = (
  tempStorageFilePath: string,
  role: string,
  adapter: NfStorageFileAdapter,
  logger: NfStorageLogger | undefined
) => {
  const cleanupResult = cleanupFileIfExists(tempStorageFilePath, adapter);

  if (!cleanupResult.ok) {
    warnCleanupFailure(logger, role, 'cleanup-after-failure', cleanupResult.error);
  }
};

const writeVerifiedStorageCandidate = ({
  filePath,
  items,
  whitelistKeys,
  adapter
}: {
  filePath: string;
  items: NfStorageItems;
  whitelistKeys: readonly string[];
  adapter: NfStorageFileAdapter;
}): WriteCandidateResult => {
  const serializedItems = serializeNfStorageDocument(items);
  let fd: number | null = null;
  let writeFailure: WriteCandidateResult | null = null;

  try {
    fd = adapter.openSync(filePath, 'wx');
  } catch (error) {
    return {
      ok: false,
      stage: 'create',
      message: 'Failed to create storage candidate file.',
      error
    };
  }

  try {
    writeAllSync(adapter, fd, serializedItems);
  } catch (error) {
    writeFailure = {
      ok: false,
      stage: 'write',
      message: 'Failed to write storage candidate file.',
      error
    };
  }

  if (writeFailure === null) {
    try {
      adapter.fsyncSync(fd);
    } catch (error) {
      writeFailure = {
        ok: false,
        stage: 'sync',
        message: 'Failed to sync storage candidate file.',
        error
      };
    }
  }

  try {
    adapter.closeSync(fd);
  } catch (error) {
    if (writeFailure === null) {
      writeFailure = {
        ok: false,
        stage: 'write',
        message: 'Failed to close storage candidate file.',
        error
      };
    }
  } finally {
    fd = null;
  }

  if (writeFailure !== null) {
    return writeFailure;
  }

  if (
    !verifyStorageFileContent(filePath, items, whitelistKeys, adapter, {
      requireSchemaVersion: CURRENT_NF_STORAGE_SCHEMA_VERSION
    })
  ) {
    return {
      ok: false,
      stage: 'verify',
      message: 'Storage candidate file verification failed.'
    };
  }

  return { ok: true };
};

const getTempWriteErrorCode = (stage: WriteCandidateStage): NfStorageErrorCode => {
  if (stage === 'create') {
    return 'TEMP_CREATE_FAILED';
  }

  if (stage === 'sync') {
    return 'TEMP_SYNC_FAILED';
  }

  if (stage === 'verify') {
    return 'TEMP_VERIFY_FAILED';
  }

  return 'TEMP_WRITE_FAILED';
};

const getTempWriteErrorMessage = (stage: WriteCandidateStage) => {
  if (stage === 'create') {
    return 'Failed to create temporary storage file.';
  }

  if (stage === 'sync') {
    return 'Failed to sync temporary storage file.';
  }

  if (stage === 'verify') {
    return 'Temporary storage file verification failed.';
  }

  return 'Failed to write temporary storage file.';
};

const preparePreviousStorageFile = ({
  previousStorageFilePath,
  previousTempStorageFilePath,
  previousItems,
  whitelistKeys,
  adapter,
  logger
}: {
  previousStorageFilePath: string;
  previousTempStorageFilePath: string;
  previousItems: NfStorageItems;
  whitelistKeys: readonly string[];
  adapter: NfStorageFileAdapter;
  logger?: NfStorageLogger;
}): StorageWriteResult => {
  const previousTempCleanup = cleanupFileIfExists(previousTempStorageFilePath, adapter);

  if (!previousTempCleanup.ok) {
    errorStorage(logger, 'Failed to prepare previous storage file.', {
      role: 'previous.tmp',
      stage: 'cleanup',
      code: 'PREVIOUS_PREPARE_FAILED',
      ...getLogErrorDetails(previousTempCleanup.error)
    });

    return createWriteError(
      'PREVIOUS_PREPARE_FAILED',
      'Failed to prepare previous storage file.'
    );
  }

  const writeResult = writeVerifiedStorageCandidate({
    filePath: previousTempStorageFilePath,
    items: previousItems,
    whitelistKeys,
    adapter
  });

  if (!writeResult.ok) {
    cleanupTempAfterFailure(previousTempStorageFilePath, 'previous.tmp', adapter, logger);
    errorStorage(logger, 'Failed to prepare previous storage file.', {
      role: 'previous.tmp',
      stage: writeResult.stage,
      code: 'PREVIOUS_PREPARE_FAILED',
      ...(writeResult.error ? getLogErrorDetails(writeResult.error) : {})
    });

    return createWriteError(
      'PREVIOUS_PREPARE_FAILED',
      'Failed to prepare previous storage file.'
    );
  }

  try {
    adapter.renameSync(previousTempStorageFilePath, previousStorageFilePath);
  } catch (error) {
    cleanupTempAfterFailure(previousTempStorageFilePath, 'previous.tmp', adapter, logger);
    errorStorage(logger, 'Failed to replace previous storage file.', {
      role: 'previous',
      stage: 'replace',
      code: 'PREVIOUS_PREPARE_FAILED',
      ...getLogErrorDetails(error)
    });

    return createWriteError(
      'PREVIOUS_PREPARE_FAILED',
      'Failed to replace previous storage file.'
    );
  }

  return { ok: true };
};

const restoreCurrentFromPrevious = ({
  storageFilePath,
  tempStorageFilePath,
  previousStorageFilePath,
  whitelistKeys,
  adapter,
  logger
}: {
  storageFilePath: string;
  tempStorageFilePath: string;
  previousStorageFilePath: string;
  whitelistKeys: readonly string[];
  adapter: NfStorageFileAdapter;
  logger?: NfStorageLogger;
}): RestoreCurrentResult => {
  const previousRead = readExistingNfStorageFile(previousStorageFilePath, whitelistKeys, adapter);

  if (!previousRead.ok) {
    return {
      ok: false,
      stage: 'read-previous',
      message: 'Failed to read previous storage file.'
    };
  }

  const tempCleanup = cleanupFileIfExists(tempStorageFilePath, adapter);

  if (!tempCleanup.ok) {
    return {
      ok: false,
      stage: 'cleanup-tmp',
      message: 'Failed to clean temporary storage file before recovery.',
      error: tempCleanup.error
    };
  }

  const writeResult = writeVerifiedStorageCandidate({
    filePath: tempStorageFilePath,
    items: previousRead.items,
    whitelistKeys,
    adapter
  });

  if (!writeResult.ok) {
    cleanupTempAfterFailure(tempStorageFilePath, 'tmp', adapter, logger);

    return {
      ok: false,
      stage: `write-tmp-${writeResult.stage}`,
      message: 'Failed to write recovery temporary storage file.',
      error: writeResult.error
    };
  }

  try {
    adapter.renameSync(tempStorageFilePath, storageFilePath);
  } catch (error) {
    cleanupTempAfterFailure(tempStorageFilePath, 'tmp', adapter, logger);

    return {
      ok: false,
      stage: 'replace-current',
      message: 'Failed to replace current storage file during recovery.',
      error
    };
  }

  if (
    !verifyStorageFileContent(storageFilePath, previousRead.items, whitelistKeys, adapter, {
      requireSchemaVersion: CURRENT_NF_STORAGE_SCHEMA_VERSION
    })
  ) {
    return {
      ok: false,
      stage: 'verify-current',
      message: 'Recovered current storage file verification failed.'
    };
  }

  return { ok: true, items: previousRead.items };
};

const cleanupReadSideStaleFiles = ({
  tempStorageFilePath,
  previousTempStorageFilePath,
  adapter,
  logger
}: {
  tempStorageFilePath: string;
  previousTempStorageFilePath: string;
  adapter: NfStorageFileAdapter;
  logger?: NfStorageLogger;
}) => {
  const tempCleanup = cleanupFileIfExists(tempStorageFilePath, adapter);

  if (!tempCleanup.ok) {
    warnCleanupFailure(logger, 'tmp', 'read-cleanup', tempCleanup.error);
  }

  const previousTempCleanup = cleanupFileIfExists(previousTempStorageFilePath, adapter);

  if (!previousTempCleanup.ok) {
    warnCleanupFailure(logger, 'previous.tmp', 'read-cleanup', previousTempCleanup.error);
  }
};

const getTmpCandidateReadResult = (
  tempStorageFilePath: string,
  tempState: StoragePathState,
  whitelistKeys: readonly string[],
  adapter: NfStorageFileAdapter
): OptionalStrictReadResult =>
  readStorageFileByState(tempStorageFilePath, tempState, whitelistKeys, adapter);

export const readNfStorageFile = ({
  storageFilePath,
  whitelistKeys,
  adapter = defaultNfStorageFileAdapter,
  logger
}: {
  storageFilePath: string;
  whitelistKeys: readonly string[];
  adapter?: NfStorageFileAdapter;
  logger?: NfStorageLogger;
}): StorageReadResult => {
  const tempStorageFilePath = getNfStorageTempFilePath(storageFilePath);
  const previousStorageFilePath = getNfStoragePreviousFilePath(storageFilePath);
  const previousTempStorageFilePath = getNfStoragePreviousTempFilePath(storageFilePath);

  const currentState = getStoragePathState(storageFilePath, adapter);
  const currentRead = readStorageFileByState(
    storageFilePath,
    currentState,
    whitelistKeys,
    adapter
  );

  if (currentRead.exists && currentRead.ok) {
    cleanupReadSideStaleFiles({
      tempStorageFilePath,
      previousTempStorageFilePath,
      adapter,
      logger
    });

    const result: Extract<StorageReadResult, { ok: true; exists: true }> = {
      ok: true,
      exists: true,
      items: currentRead.items
    };

    if (currentRead.document.format === 'legacy-flat') {
      result.legacy = true;
    }

    return result;
  }

  if (currentRead.exists && !currentRead.ok) {
    if (
      currentRead.code === 'STORAGE_READ_FAILED' ||
      currentRead.code === 'STORAGE_SCHEMA_FUTURE'
    ) {
      return createReadError(currentRead.code, currentRead.message);
    }
  }

  const previousState = getStoragePathState(previousStorageFilePath, adapter);

  if (!previousState.ok) {
    return createReadError(previousState.code, previousState.message);
  }

  const previousRead = readStorageFileByState(
    previousStorageFilePath,
    previousState,
    whitelistKeys,
    adapter
  );

  if (previousRead.exists && !previousRead.ok && previousRead.code === 'STORAGE_READ_FAILED') {
    return createReadError(previousRead.code, previousRead.message);
  }

  if (previousRead.exists && previousRead.ok) {
    const restoreResult = restoreCurrentFromPrevious({
      storageFilePath,
      tempStorageFilePath,
      previousStorageFilePath,
      whitelistKeys,
      adapter,
      logger
    });

    if (!restoreResult.ok) {
      errorStorage(logger, 'Failed to recover storage file from previous backup.', {
        role: 'current',
        sourceRole: 'previous',
        stage: restoreResult.stage,
        code: 'STORAGE_RECOVERY_FAILED',
        recovered: false,
        ...(restoreResult.error ? getLogErrorDetails(restoreResult.error) : {})
      });

      return createReadError('STORAGE_RECOVERY_FAILED', restoreResult.message);
    }

    cleanupReadSideStaleFiles({
      tempStorageFilePath,
      previousTempStorageFilePath,
      adapter,
      logger
    });
    warnStorage(logger, 'Recovered storage file from previous backup.', {
      role: 'current',
      sourceRole: 'previous',
      stage: 'restore',
      code: 'STORAGE_RECOVERY_FAILED',
      recovered: true
    });

    return { ok: true, exists: true, items: restoreResult.items, recovered: true };
  }

  if (previousRead.exists && !previousRead.ok && previousRead.code === 'STORAGE_SCHEMA_FUTURE') {
    warnStorage(logger, 'Previous storage file uses a newer schema version and cannot be used.', {
      role: 'previous',
      stage: 'read-previous',
      code: previousRead.code
    });
  }

  const tempState = getStoragePathState(tempStorageFilePath, adapter);

  if (!tempState.ok) {
    return createReadError(tempState.code, tempState.message);
  }

  const tempRead = getTmpCandidateReadResult(
    tempStorageFilePath,
    tempState,
    whitelistKeys,
    adapter
  );

  if (!currentRead.exists && !previousRead.exists && !tempRead.exists) {
    const previousTempCleanup = cleanupFileIfExists(previousTempStorageFilePath, adapter);

    if (!previousTempCleanup.ok) {
      warnCleanupFailure(logger, 'previous.tmp', 'read-cleanup', previousTempCleanup.error);
    }

    return { ok: true, exists: false, items: {} };
  }

  if (tempRead.exists && tempRead.ok) {
    return createReadError(
      'STORAGE_RECOVERY_REQUIRED',
      'Storage recovery is required because only a temporary candidate is valid.'
    );
  }

  return createReadError(
    'STORAGE_UNRECOVERABLE',
    'Storage files are missing or invalid and cannot be recovered automatically.'
  );
};

export const writeNfStorageFile = ({
  storageFilePath,
  whitelistKeys,
  items,
  adapter = defaultNfStorageFileAdapter,
  logger
}: {
  storageFilePath: string;
  whitelistKeys: readonly string[];
  items: Record<string, unknown>;
  adapter?: NfStorageFileAdapter;
  logger?: NfStorageLogger;
}): StorageWriteResult => {
  const storageDirectoryPath = path.dirname(storageFilePath);
  const tempStorageFilePath = getNfStorageTempFilePath(storageFilePath);
  const previousStorageFilePath = getNfStoragePreviousFilePath(storageFilePath);
  const previousTempStorageFilePath = getNfStoragePreviousTempFilePath(storageFilePath);
  const expectedItems = sanitizeNfStorageItems(items, whitelistKeys);
  const currentState = getStoragePathState(storageFilePath, adapter);
  let currentItems: NfStorageItems | null = null;

  if (!currentState.ok) {
    return createWriteError(currentState.code, currentState.message);
  }

  if (currentState.exists) {
    if (!currentState.isFile) {
      return createWriteError('STORAGE_READ_INVALID', 'Storage path is not a regular file.');
    }

    const currentRead = readExistingNfStorageFile(storageFilePath, whitelistKeys, adapter);

    if (!currentRead.ok) {
      return createWriteError(currentRead.code, currentRead.message);
    }

    currentItems = currentRead.items;
  }

  try {
    adapter.mkdirSync(storageDirectoryPath, { recursive: true });
  } catch {
    return createWriteError('TEMP_CREATE_FAILED', 'Failed to create storage directory.');
  }

  const tempCleanup = cleanupFileIfExists(tempStorageFilePath, adapter);

  if (!tempCleanup.ok) {
    return createWriteError('TEMP_CLEANUP_FAILED', 'Failed to delete stale temporary file.');
  }

  const previousTempCleanup = cleanupFileIfExists(previousTempStorageFilePath, adapter);

  if (!previousTempCleanup.ok) {
    errorStorage(logger, 'Failed to prepare previous storage file.', {
      role: 'previous.tmp',
      stage: 'cleanup',
      code: 'PREVIOUS_PREPARE_FAILED',
      ...getLogErrorDetails(previousTempCleanup.error)
    });

    return createWriteError(
      'PREVIOUS_PREPARE_FAILED',
      'Failed to prepare previous storage file.'
    );
  }

  const tempWriteResult = writeVerifiedStorageCandidate({
    filePath: tempStorageFilePath,
    items: expectedItems,
    whitelistKeys,
    adapter
  });

  if (!tempWriteResult.ok) {
    cleanupTempAfterFailure(tempStorageFilePath, 'tmp', adapter, logger);

    return createWriteError(
      getTempWriteErrorCode(tempWriteResult.stage),
      getTempWriteErrorMessage(tempWriteResult.stage)
    );
  }

  if (currentItems !== null) {
    const previousPrepareResult = preparePreviousStorageFile({
      previousStorageFilePath,
      previousTempStorageFilePath,
      previousItems: currentItems,
      whitelistKeys,
      adapter,
      logger
    });

    if (!previousPrepareResult.ok) {
      cleanupTempAfterFailure(tempStorageFilePath, 'tmp', adapter, logger);
      return previousPrepareResult;
    }
  }

  try {
    adapter.renameSync(tempStorageFilePath, storageFilePath);
  } catch {
    cleanupTempAfterFailure(tempStorageFilePath, 'tmp', adapter, logger);
    return createWriteError('FINAL_REPLACE_FAILED', 'Failed to replace storage file.');
  }

  if (
    !verifyStorageFileContent(storageFilePath, expectedItems, whitelistKeys, adapter, {
      requireSchemaVersion: CURRENT_NF_STORAGE_SCHEMA_VERSION
    })
  ) {
    const restoreResult = restoreCurrentFromPrevious({
      storageFilePath,
      tempStorageFilePath,
      previousStorageFilePath,
      whitelistKeys,
      adapter,
      logger
    });

    if (restoreResult.ok) {
      errorStorage(logger, 'Storage file verification failed after replacement and was recovered.', {
        role: 'current',
        sourceRole: 'previous',
        stage: 'final-verify',
        code: 'FINAL_VERIFY_FAILED_RECOVERED',
        recovered: true
      });

      return createWriteError(
        'FINAL_VERIFY_FAILED_RECOVERED',
        'Final storage file verification failed; previous storage was restored.',
        true
      );
    }

    errorStorage(logger, 'Storage file verification failed after replacement and recovery failed.', {
      role: 'current',
      sourceRole: 'previous',
      stage: restoreResult.stage,
      code: 'FINAL_VERIFY_FAILED_RECOVERY_FAILED',
      recovered: false,
      ...(restoreResult.error ? getLogErrorDetails(restoreResult.error) : {})
    });

    return createWriteError(
      'FINAL_VERIFY_FAILED_RECOVERY_FAILED',
      'Final storage file verification failed and previous storage could not be restored.',
      false
    );
  }

  return { ok: true };
};
