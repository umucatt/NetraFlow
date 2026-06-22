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

import {
  createDefaultPersistenceDocument,
  isPersistenceDocument,
  normalizePersistenceDocument,
  type PersistenceDocument,
  type PersistenceDocumentKind
} from './persistenceContracts.js';
import {
  createPersistencePaths,
  getPersistenceDocumentPath,
  getPersistenceDocumentTmpPath,
  getPersistenceTmpPaths,
  type PersistencePaths
} from './persistencePaths.js';

export type PersistenceErrorCode =
  | 'PERSISTENCE_READ_FAILED'
  | 'PERSISTENCE_READ_INVALID'
  | 'PERSISTENCE_SCHEMA_INVALID'
  | 'PERSISTENCE_TEMP_CLEANUP_FAILED'
  | 'PERSISTENCE_TEMP_CREATE_FAILED'
  | 'PERSISTENCE_TEMP_WRITE_FAILED'
  | 'PERSISTENCE_TEMP_SYNC_FAILED'
  | 'PERSISTENCE_TEMP_VERIFY_FAILED'
  | 'PERSISTENCE_REPLACE_FAILED'
  | 'PERSISTENCE_FINAL_VERIFY_FAILED';

export type PersistenceReadResult<T extends PersistenceDocument = PersistenceDocument> =
  | { ok: true; exists: boolean; document: T; degraded?: boolean; code?: PersistenceErrorCode }
  | { ok: false; code: PersistenceErrorCode; message: string };

export type PersistenceWriteResult =
  | { ok: true }
  | { ok: false; code: PersistenceErrorCode; message: string };

export type PersistenceFileAdapter = {
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

export type PersistenceLogger = {
  warn?: (message: string, details?: Record<string, unknown>) => void;
  error?: (message: string, details?: Record<string, unknown>) => void;
};

export type PersistenceStore = {
  paths: PersistencePaths;
  readCoreDocument: () => PersistenceReadResult;
  writeCoreDocument: (document: unknown) => PersistenceWriteResult;
  readSettingsDocument: () => PersistenceReadResult;
  writeSettingsDocument: (document: unknown) => PersistenceWriteResult;
  readStateDocument: () => PersistenceReadResult;
  writeStateDocument: (document: unknown) => PersistenceWriteResult;
  readSecurityDocument: () => PersistenceReadResult;
  writeSecurityDocument: (document: unknown) => PersistenceWriteResult;
};

type WriteStage = 'create' | 'write' | 'sync' | 'verify';

export const defaultPersistenceFileAdapter: PersistenceFileAdapter = {
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

const logWarn = (
  logger: PersistenceLogger | undefined,
  message: string,
  details: Record<string, unknown>
) => {
  logger?.warn?.(`[NetraFlow persistence] ${message}`, details);
};

const logError = (
  logger: PersistenceLogger | undefined,
  message: string,
  details: Record<string, unknown>
) => {
  logger?.error?.(`[NetraFlow persistence] ${message}`, details);
};

const createReadError = (
  code: PersistenceErrorCode,
  message: string
): PersistenceReadResult => ({ ok: false, code, message });

const createWriteError = (
  code: PersistenceErrorCode,
  message: string
): PersistenceWriteResult => ({ ok: false, code, message });

const pathExists = (filePath: string, adapter: PersistenceFileAdapter) => {
  try {
    return { ok: true as const, exists: adapter.statSync(filePath).isFile() };
  } catch (error) {
    if (isNodeErrorWithCode(error, 'ENOENT')) {
      return { ok: true as const, exists: false };
    }

    return { ok: false as const, error };
  }
};

const cleanupFileIfExists = (filePath: string, adapter: PersistenceFileAdapter) => {
  const state = pathExists(filePath, adapter);

  if (!state.ok) {
    return { ok: false as const, error: state.error };
  }

  if (!state.exists) {
    return { ok: true as const };
  }

  try {
    adapter.unlinkSync(filePath);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error };
  }
};

const cleanupAllStaleTmp = (
  paths: PersistencePaths,
  adapter: PersistenceFileAdapter,
  logger?: PersistenceLogger
) => {
  let ok = true;

  for (const tmpPath of getPersistenceTmpPaths(paths)) {
    const cleanup = cleanupFileIfExists(tmpPath, adapter);

    if (!cleanup.ok) {
      ok = false;
      logWarn(logger, 'Failed to delete stale temporary document.', {
        role: 'tmp',
        stage: 'cleanup',
        ...getLogErrorDetails(cleanup.error)
      });
    }
  }

  return ok;
};

const serializeDocument = (document: PersistenceDocument) =>
  `${JSON.stringify(document, null, 2)}\n`;

const writeAllSync = (adapter: PersistenceFileAdapter, fd: number, content: string) => {
  const buffer = Buffer.from(content, 'utf8');
  let offset = 0;

  while (offset < buffer.length) {
    const written = adapter.writeSync(fd, buffer, offset, buffer.length - offset);

    if (!Number.isInteger(written) || written <= 0) {
      throw new Error('Persistence write did not make progress.');
    }

    offset += written;
  }
};

const readExistingDocument = (
  kind: PersistenceDocumentKind,
  filePath: string,
  adapter: PersistenceFileAdapter
) => {
  let raw: string;

  try {
    raw = adapter.readFileSync(filePath, 'utf8');
  } catch {
    return createReadError('PERSISTENCE_READ_FAILED', 'Failed to read persistence document.');
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isPersistenceDocument(kind, parsed)) {
      return createReadError(
        'PERSISTENCE_SCHEMA_INVALID',
        'Persistence document failed validation.'
      );
    }

    return { ok: true as const, document: parsed };
  } catch {
    return createReadError('PERSISTENCE_READ_INVALID', 'Persistence document is invalid JSON.');
  }
};

const verifyDocumentFile = (
  kind: PersistenceDocumentKind,
  filePath: string,
  expectedDocument: PersistenceDocument,
  adapter: PersistenceFileAdapter
) => {
  const readResult = readExistingDocument(kind, filePath, adapter);

  return (
    readResult.ok &&
    JSON.stringify(readResult.document) === JSON.stringify(expectedDocument)
  );
};

const writeCandidate = ({
  kind,
  tmpPath,
  document,
  adapter,
  fsync
}: {
  kind: PersistenceDocumentKind;
  tmpPath: string;
  document: PersistenceDocument;
  adapter: PersistenceFileAdapter;
  fsync: boolean;
}): { ok: true } | { ok: false; stage: WriteStage; error?: unknown } => {
  let fd: number | null = null;
  let failure: { ok: false; stage: WriteStage; error?: unknown } | null = null;

  try {
    fd = adapter.openSync(tmpPath, 'wx');
  } catch (error) {
    return { ok: false, stage: 'create', error };
  }

  try {
    writeAllSync(adapter, fd, serializeDocument(document));
  } catch (error) {
    failure = { ok: false, stage: 'write', error };
  }

  if (failure === null && fsync) {
    try {
      adapter.fsyncSync(fd);
    } catch (error) {
      failure = { ok: false, stage: 'sync', error };
    }
  }

  try {
    adapter.closeSync(fd);
  } catch (error) {
    if (failure === null) {
      failure = { ok: false, stage: 'write', error };
    }
  } finally {
    fd = null;
  }

  if (failure !== null) {
    return failure;
  }

  if (!verifyDocumentFile(kind, tmpPath, document, adapter)) {
    return { ok: false, stage: 'verify' };
  }

  return { ok: true };
};

const getTempErrorCode = (stage: WriteStage): PersistenceErrorCode => {
  if (stage === 'create') {
    return 'PERSISTENCE_TEMP_CREATE_FAILED';
  }

  if (stage === 'sync') {
    return 'PERSISTENCE_TEMP_SYNC_FAILED';
  }

  if (stage === 'verify') {
    return 'PERSISTENCE_TEMP_VERIFY_FAILED';
  }

  return 'PERSISTENCE_TEMP_WRITE_FAILED';
};

const readDocument = (
  kind: PersistenceDocumentKind,
  paths: PersistencePaths,
  adapter: PersistenceFileAdapter,
  logger?: PersistenceLogger
): PersistenceReadResult => {
  cleanupAllStaleTmp(paths, adapter, logger);

  const filePath = getPersistenceDocumentPath(paths, kind);
  const state = pathExists(filePath, adapter);

  if (!state.ok) {
    return createReadError('PERSISTENCE_READ_FAILED', 'Failed to inspect persistence document.');
  }

  if (!state.exists) {
    return {
      ok: true,
      exists: false,
      document: createDefaultPersistenceDocument(kind)
    };
  }

  const result = readExistingDocument(kind, filePath, adapter);

  if (result.ok) {
    return { ok: true, exists: true, document: result.document };
  }

  if (kind === 'core') {
    return result;
  }

  logWarn(logger, 'Falling back to default non-core persistence document.', {
    kind,
    code: result.code
  });

  return {
    ok: true,
    exists: true,
    document: createDefaultPersistenceDocument(kind),
    degraded: true,
    code: result.code
  };
};

const writeDocument = (
  kind: PersistenceDocumentKind,
  inputDocument: unknown,
  paths: PersistencePaths,
  adapter: PersistenceFileAdapter,
  logger?: PersistenceLogger
): PersistenceWriteResult => {
  const fsync = kind === 'core' || kind === 'settings' || kind === 'security';
  const filePath = getPersistenceDocumentPath(paths, kind);
  const tmpPath = getPersistenceDocumentTmpPath(paths, kind);
  const document =
    kind === 'core'
      ? inputDocument
      : normalizePersistenceDocument(kind, inputDocument);

  if (!isPersistenceDocument(kind, document)) {
    return createWriteError('PERSISTENCE_SCHEMA_INVALID', 'Persistence document failed validation.');
  }

  const currentState = pathExists(filePath, adapter);

  if (!currentState.ok) {
    return createWriteError(
      'PERSISTENCE_READ_FAILED',
      'Failed to inspect current persistence document.'
    );
  }

  if (kind === 'core' && currentState.exists) {
    const currentRead = readExistingDocument(kind, filePath, adapter);

    if (!currentRead.ok) {
      return createWriteError(currentRead.code, currentRead.message);
    }
  }

  try {
    adapter.mkdirSync(paths.root, { recursive: true });
  } catch {
    return createWriteError(
      'PERSISTENCE_TEMP_CREATE_FAILED',
      'Failed to create persistence directory.'
    );
  }

  if (!cleanupAllStaleTmp(paths, adapter, logger)) {
    return createWriteError(
      'PERSISTENCE_TEMP_CLEANUP_FAILED',
      'Failed to delete stale temporary persistence document.'
    );
  }

  const candidateResult = writeCandidate({
    kind,
    tmpPath,
    document,
    adapter,
    fsync
  });

  if (!candidateResult.ok) {
    cleanupFileIfExists(tmpPath, adapter);
    logError(logger, 'Failed to write temporary persistence document.', {
      kind,
      stage: candidateResult.stage,
      code: getTempErrorCode(candidateResult.stage),
      ...(candidateResult.error ? getLogErrorDetails(candidateResult.error) : {})
    });

    return createWriteError(
      getTempErrorCode(candidateResult.stage),
      'Failed to write temporary persistence document.'
    );
  }

  try {
    adapter.renameSync(tmpPath, filePath);
  } catch (error) {
    cleanupFileIfExists(tmpPath, adapter);
    logError(logger, 'Failed to replace persistence document.', {
      kind,
      stage: 'replace',
      code: 'PERSISTENCE_REPLACE_FAILED',
      ...getLogErrorDetails(error)
    });

    return createWriteError(
      'PERSISTENCE_REPLACE_FAILED',
      'Failed to replace persistence document.'
    );
  }

  if (!verifyDocumentFile(kind, filePath, document, adapter)) {
    cleanupFileIfExists(tmpPath, adapter);
    logError(logger, 'Final persistence document verification failed.', {
      kind,
      stage: 'final-verify',
      code: 'PERSISTENCE_FINAL_VERIFY_FAILED'
    });

    return createWriteError(
      'PERSISTENCE_FINAL_VERIFY_FAILED',
      'Final persistence document verification failed.'
    );
  }

  cleanupFileIfExists(tmpPath, adapter);
  return { ok: true };
};

export const createPersistenceStore = ({
  root,
  paths = createPersistencePaths(root),
  adapter = defaultPersistenceFileAdapter,
  logger
}: {
  root?: string;
  paths?: PersistencePaths;
  adapter?: PersistenceFileAdapter;
  logger?: PersistenceLogger;
}): PersistenceStore => ({
  paths,
  readCoreDocument: () => readDocument('core', paths, adapter, logger),
  writeCoreDocument: (document) => writeDocument('core', document, paths, adapter, logger),
  readSettingsDocument: () => readDocument('settings', paths, adapter, logger),
  writeSettingsDocument: (document) => writeDocument('settings', document, paths, adapter, logger),
  readStateDocument: () => readDocument('state', paths, adapter, logger),
  writeStateDocument: (document) => writeDocument('state', document, paths, adapter, logger),
  readSecurityDocument: () => readDocument('security', paths, adapter, logger),
  writeSecurityDocument: (document) => writeDocument('security', document, paths, adapter, logger)
});
