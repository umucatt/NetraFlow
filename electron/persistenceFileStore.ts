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
  type CoreFileFingerprint,
  type CoreProtectionState,
  type CoreDocument,
  type PersistenceDocument,
  type PersistenceDocumentKind,
  type StateDocument
} from './persistenceContracts.js';
import {
  createCoreFileFingerprint,
  decodeCoreFileText,
  encodeEncryptedCoreFile,
  encodePlainCoreFile,
  serializeCoreFile
} from './corePersistenceCodec.js';
import {
  createCoreCryptoSession,
  decryptJsonEnvelope,
  decryptJsonEnvelopeWithSession,
  encryptJsonEnvelopeWithSession,
  type CoreCryptoSession,
  type EncryptedJsonEnvelope
} from './cryptoEnvelope.js';
import {
  createPersistencePaths,
  getPersistenceDocumentPath,
  getPersistenceDocumentTmpPath,
  getPersistenceTmpPaths,
  type PersistencePaths
} from './persistencePaths.js';

export type PersistenceErrorCode =
  | 'PERSISTENCE_CORE_LOCKED'
  | 'PERSISTENCE_CORE_UNLOCK_FAILED'
  | 'PERSISTENCE_CRYPTO_SESSION_UNAVAILABLE'
  | 'PERSISTENCE_SNAPSHOT_ENCRYPT_FAILED'
  | 'PERSISTENCE_SNAPSHOT_DECRYPT_FAILED'
  | 'PERSISTENCE_CORE_EXTERNAL_MODIFIED'
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
  | {
      ok: true;
      exists: boolean;
      document: T;
      encrypted?: boolean;
      integrityWarning?: string;
      integrityFailure?: 'internal' | 'continuity';
      degraded?: boolean;
      code?: PersistenceErrorCode;
    }
  | {
      ok: true;
      exists: boolean;
      locked: true;
      encrypted: true;
      integrityWarning?: string;
      integrityFailure?: 'internal';
    }
  | { ok: false; code: PersistenceErrorCode; message: string };

export type PersistenceWriteResult =
  | { ok: true }
  | { ok: false; code: PersistenceErrorCode; message: string };

export type PersistenceEncryptSnapshotResult =
  | { ok: true; encrypted: EncryptedJsonEnvelope }
  | { ok: false; code: PersistenceErrorCode; message: string };

export type PersistenceDecryptSnapshotResult =
  | { ok: true; document: unknown }
  | { ok: false; code: PersistenceErrorCode; message: string };

export type CoreWriteOptions = {
  allowExternalCoreOverwrite?: boolean;
};

type PersistenceReadError = {
  ok: false;
  code: PersistenceErrorCode;
  message: string;
};

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
  writeCoreDocument: (
    document: unknown,
    options?: CoreWriteOptions
  ) => PersistenceWriteResult;
  unlockCoreDocument: (password: string) => PersistenceReadResult;
  enableCoreProtection: (
    document: unknown,
    password: string,
    options?: CoreWriteOptions
  ) => PersistenceWriteResult;
  changeCorePassword: (
    document: unknown,
    currentPassword: string,
    nextPassword: string,
    options?: CoreWriteOptions
  ) => PersistenceWriteResult;
  disableCoreProtection: (
    document: unknown,
    password: string,
    options?: CoreWriteOptions
  ) => PersistenceWriteResult;
  lockCoreDocument: () => PersistenceWriteResult;
  acknowledgeCoreIntegrityIssue: () => PersistenceWriteResult;
  encryptSnapshotDocument: (document: unknown) => PersistenceEncryptSnapshotResult;
  decryptSnapshotDocument: (encrypted: unknown) => PersistenceDecryptSnapshotResult;
  decryptSnapshotDocumentWithPassword: (
    encrypted: unknown,
    password: string
  ) => PersistenceDecryptSnapshotResult;
  readSettingsDocument: () => PersistenceReadResult;
  writeSettingsDocument: (document: unknown) => PersistenceWriteResult;
  readStateDocument: () => PersistenceReadResult;
  writeStateDocument: (document: unknown) => PersistenceWriteResult;
  readSecurityDocument: () => PersistenceReadResult;
  writeSecurityDocument: (document: unknown) => PersistenceWriteResult;
};

type WriteStage = 'create' | 'write' | 'sync' | 'verify';

type ExistingDocumentReadResult =
  | {
      ok: true;
      document: PersistenceDocument;
      encrypted?: boolean;
      session?: CoreCryptoSession;
      integrityWarning?: string;
    }
  | {
      ok: true;
      locked: true;
      encrypted: true;
      exists: boolean;
      integrityWarning?: string;
    }
  | PersistenceReadError;

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

const CORE_INTEGRITY_WARNING = '核心数据完整性验证失败';

const createDefaultCoreProtectionState = (): CoreProtectionState => ({
  schemaVersion: 1
});

const areCoreFileFingerprintsEqual = (
  left: CoreFileFingerprint | null | undefined,
  right: CoreFileFingerprint | null | undefined
) =>
  left === right ||
  (left !== null &&
    left !== undefined &&
    right !== null &&
    right !== undefined &&
    left.algorithm === right.algorithm &&
    left.value === right.value &&
    left.size === right.size);

const createReadError = (
  code: PersistenceErrorCode,
  message: string
): PersistenceReadError => ({ ok: false, code, message });

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

const readCoreFileFingerprint = (
  filePath: string,
  adapter: PersistenceFileAdapter
):
  | { ok: true; exists: boolean; fingerprint: CoreFileFingerprint | null }
  | { ok: false; error: unknown } => {
  const state = pathExists(filePath, adapter);

  if (!state.ok) {
    return { ok: false, error: state.error };
  }

  if (!state.exists) {
    return { ok: true, exists: false, fingerprint: null };
  }

  try {
    const raw = adapter.readFileSync(filePath);

    return {
      ok: true,
      exists: true,
      fingerprint: createCoreFileFingerprint(raw)
    };
  } catch (error) {
    return { ok: false, error };
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
  adapter: PersistenceFileAdapter,
  coreSession: CoreCryptoSession | string | null = null
): ExistingDocumentReadResult => {
  let raw: string;

  try {
    raw = adapter.readFileSync(filePath, 'utf8');
  } catch {
    return createReadError('PERSISTENCE_READ_FAILED', 'Failed to read persistence document.');
  }

  if (kind === 'core') {
    try {
      const decoded = decodeCoreFileText(raw, coreSession);

      if (decoded.status === 'locked') {
        return {
          ok: true as const,
          locked: true as const,
          encrypted: true as const,
          exists: true as const,
          ...(decoded.warning ? { integrityWarning: decoded.warning } : {})
        };
      }

      return {
        ok: true as const,
        document: decoded.document,
        encrypted: decoded.status === 'encrypted',
        ...('session' in decoded && decoded.session ? { session: decoded.session } : {}),
        ...(decoded.warning ? { integrityWarning: decoded.warning } : {})
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Persistence document is invalid.';
      const errorCode =
        error instanceof Error && 'code' in error
          ? String((error as { code?: unknown }).code)
          : null;
      const code =
        errorCode === 'CORE_DECRYPTION_FAILED' || errorCode?.startsWith('ENCRYPTED_')
          ? 'PERSISTENCE_CORE_UNLOCK_FAILED'
          : errorCode === 'CORE_JSON_INVALID'
            ? 'PERSISTENCE_READ_INVALID'
            : 'PERSISTENCE_SCHEMA_INVALID';

      return createReadError(code, message);
    }
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
  adapter: PersistenceFileAdapter,
  coreSession: CoreCryptoSession | null = null
) => {
  const readResult = readExistingDocument(kind, filePath, adapter, coreSession);

  return (
    readResult.ok &&
    !('locked' in readResult) &&
    JSON.stringify(readResult.document) === JSON.stringify(expectedDocument)
  );
};

const writeCandidate = ({
  kind,
  tmpPath,
  document,
  adapter,
  fsync,
  coreSession
}: {
  kind: PersistenceDocumentKind;
  tmpPath: string;
  document: PersistenceDocument;
  adapter: PersistenceFileAdapter;
  fsync: boolean;
  coreSession: CoreCryptoSession | null;
}): { ok: true } | { ok: false; stage: WriteStage; error?: unknown } => {
  let fd: number | null = null;
  let failure: { ok: false; stage: WriteStage; error?: unknown } | null = null;

  try {
    fd = adapter.openSync(tmpPath, 'wx');
  } catch (error) {
    return { ok: false, stage: 'create', error };
  }

  try {
    const content =
      kind === 'core'
        ? serializeCoreFile(
            coreSession === null
              ? encodePlainCoreFile(document as CoreDocument)
              : encodeEncryptedCoreFile(
                  document as CoreDocument,
                  coreSession
                )
          )
        : serializeDocument(document);

    writeAllSync(adapter, fd, content);
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

  if (!verifyDocumentFile(kind, tmpPath, document, adapter, coreSession)) {
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
  logger?: PersistenceLogger,
  coreSession: CoreCryptoSession | string | null = null
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

  const result = readExistingDocument(kind, filePath, adapter, coreSession);

  if (result.ok) {
    if ('locked' in result) {
      return {
        ok: true,
        exists: true,
        locked: true,
        encrypted: true,
        ...(result.integrityWarning
          ? { integrityWarning: result.integrityWarning }
          : {})
      };
    }

    return {
      ok: true,
      exists: true,
      document: result.document,
      ...(result.encrypted ? { encrypted: result.encrypted } : {}),
      ...(result.integrityWarning ? { integrityWarning: result.integrityWarning } : {})
    };
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
  logger?: PersistenceLogger,
  coreSession: CoreCryptoSession | null = null,
  options: {
    expectedCoreFileFingerprint?: CoreFileFingerprint | null;
    allowExternalCoreOverwrite?: boolean;
    existingCoreSession?: CoreCryptoSession | null;
  } = {}
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
    const currentRead = readExistingDocument(
      kind,
      filePath,
      adapter,
      options.existingCoreSession === undefined
        ? coreSession
        : options.existingCoreSession
    );

    if (!currentRead.ok) {
      return createWriteError(currentRead.code, currentRead.message);
    }

    if ('locked' in currentRead) {
      return createWriteError(
        'PERSISTENCE_CORE_LOCKED',
        'Core document is encrypted and locked.'
      );
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

  if (kind === 'core' && options.expectedCoreFileFingerprint !== undefined) {
    const currentFingerprint = readCoreFileFingerprint(filePath, adapter);

    if (!currentFingerprint.ok) {
      return createWriteError(
        'PERSISTENCE_READ_FAILED',
        'Failed to inspect current core document fingerprint.'
      );
    }

    if (!areCoreFileFingerprintsEqual(
      currentFingerprint.fingerprint,
      options.expectedCoreFileFingerprint
    )) {
      logWarn(logger, 'Detected externally modified core document before temp write.', {
        kind,
        stage: 'pre-temp-external-modification-check',
        code: 'PERSISTENCE_CORE_EXTERNAL_MODIFIED'
      });

      return createWriteError(
        'PERSISTENCE_CORE_EXTERNAL_MODIFIED',
        'Core document was modified outside NetraFlow. Confirm before overwriting.'
      );
    }
  }

  const candidateResult = writeCandidate({
    kind,
    tmpPath,
    document,
    adapter,
    fsync,
    coreSession
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

  if (
    kind === 'core' &&
    options.expectedCoreFileFingerprint !== undefined
  ) {
    const currentFingerprint = readCoreFileFingerprint(filePath, adapter);

    if (!currentFingerprint.ok) {
      cleanupFileIfExists(tmpPath, adapter);
      return createWriteError(
        'PERSISTENCE_READ_FAILED',
        'Failed to inspect current core document fingerprint.'
      );
    }

    if (!areCoreFileFingerprintsEqual(
      currentFingerprint.fingerprint,
      options.expectedCoreFileFingerprint
    )) {
      cleanupFileIfExists(tmpPath, adapter);
      logWarn(logger, 'Detected externally modified core document before replace.', {
        kind,
        stage: 'external-modification-check',
        code: 'PERSISTENCE_CORE_EXTERNAL_MODIFIED'
      });

      return createWriteError(
        'PERSISTENCE_CORE_EXTERNAL_MODIFIED',
        'Core document was modified outside NetraFlow. Confirm before overwriting.'
      );
    }
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

  if (!verifyDocumentFile(kind, filePath, document, adapter, coreSession)) {
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
}): PersistenceStore => {
  let coreSession: CoreCryptoSession | null = null;
  let lastCoreFileFingerprint: CoreFileFingerprint | null | undefined;

  const readCoreProtectionState = (): {
    coreProtection: CoreProtectionState;
    canPersist: boolean;
  } => {
    const stateResult = readDocument('state', paths, adapter, logger);

    if (!stateResult.ok || 'locked' in stateResult) {
      return {
        coreProtection: createDefaultCoreProtectionState(),
        canPersist: false
      };
    }

    const stateDocument = normalizePersistenceDocument(
      'state',
      stateResult.document
    ) as StateDocument;

    return {
      coreProtection: stateDocument.coreProtection ?? createDefaultCoreProtectionState(),
      canPersist: stateResult.degraded !== true
    };
  };

  const writeCoreProtectionState = (
    coreProtection: CoreProtectionState
  ): PersistenceWriteResult => {
    const stateResult = readDocument('state', paths, adapter, logger);
    const currentState =
      stateResult.ok && !('locked' in stateResult)
        ? (normalizePersistenceDocument('state', stateResult.document) as StateDocument)
        : (createDefaultPersistenceDocument('state') as StateDocument);
    const nextState = normalizePersistenceDocument('state', {
      ...currentState,
      coreProtection
    });

    return writeDocument('state', nextState, paths, adapter, logger);
  };

  const rememberCurrentCoreFileFingerprint = () => {
    const fingerprint = readCoreFileFingerprint(paths.core, adapter);

    if (fingerprint.ok) {
      lastCoreFileFingerprint = fingerprint.fingerprint;
    }
  };

  const persistCurrentCoreFileFingerprint = (): PersistenceWriteResult => {
    const fingerprint = readCoreFileFingerprint(paths.core, adapter);

    if (!fingerprint.ok) {
      return createWriteError(
        'PERSISTENCE_READ_FAILED',
        'Failed to inspect current core document fingerprint.'
      );
    }

    lastCoreFileFingerprint = fingerprint.fingerprint;

    if (!fingerprint.exists || fingerprint.fingerprint === null) {
      return { ok: true };
    }

    return writeCoreProtectionState({
      schemaVersion: 1,
      lastConfirmedFingerprint: fingerprint.fingerprint
    });
  };

  const stripCoreIntegrityWarning = (result: PersistenceReadResult): PersistenceReadResult => {
    if (!result.ok || 'locked' in result) {
      return result;
    }

    const {
      integrityWarning: _integrityWarning,
      integrityFailure: _integrityFailure,
      ...cleanResult
    } = result;

    return cleanResult;
  };

  const applyCoreProtectionReadRules = (
    result: PersistenceReadResult
  ): PersistenceReadResult => {
    if (!result.ok) {
      return result;
    }

    const fingerprint = readCoreFileFingerprint(paths.core, adapter);

    if (!fingerprint.ok) {
      return createReadError(
        'PERSISTENCE_READ_FAILED',
        'Failed to inspect current core document fingerprint.'
      );
    }

    lastCoreFileFingerprint = fingerprint.fingerprint;

    if (!fingerprint.exists || fingerprint.fingerprint === null) {
      return result;
    }

    if ('locked' in result) {
      const {
        integrityWarning: _integrityWarning,
        integrityFailure: _integrityFailure,
        ...lockedResult
      } = result;

      return lockedResult;
    }

    const currentFingerprint = fingerprint.fingerprint;
    const { coreProtection: protection, canPersist } = readCoreProtectionState();

    if (result.integrityWarning) {
      if (
        areCoreFileFingerprintsEqual(
          protection.acknowledgedInternalIntegrityFailureFingerprint,
          currentFingerprint
        )
      ) {
        return stripCoreIntegrityWarning(result);
      }

      lastCoreFileFingerprint = protection.lastConfirmedFingerprint ?? currentFingerprint;

      return {
        ...result,
        integrityWarning: CORE_INTEGRITY_WARNING,
        integrityFailure: 'internal'
      };
    }

    if (!protection.lastConfirmedFingerprint) {
      if (!canPersist) {
        lastCoreFileFingerprint = currentFingerprint;
        return result;
      }

      const persisted = writeCoreProtectionState({
        ...protection,
        lastConfirmedFingerprint: currentFingerprint
      });

      if (!persisted.ok) {
        return createReadError(persisted.code, persisted.message);
      }

      lastCoreFileFingerprint = currentFingerprint;
      return result;
    }

    if (!areCoreFileFingerprintsEqual(protection.lastConfirmedFingerprint, currentFingerprint)) {
      lastCoreFileFingerprint = protection.lastConfirmedFingerprint;

      return {
        ...result,
        integrityWarning: CORE_INTEGRITY_WARNING,
        integrityFailure: 'continuity'
      };
    }

    lastCoreFileFingerprint = currentFingerprint;
    return result;
  };

  const readCoreWithCredential = (credential: CoreCryptoSession | string | null) => {
    const result = readDocument('core', paths, adapter, logger, credential);

    return applyCoreProtectionReadRules(result);
  };

  const writeCoreWithSession = (
    document: unknown,
    session: CoreCryptoSession | null,
    options: CoreWriteOptions = {},
    existingSession?: CoreCryptoSession | null
  ) => {
    let expectedCoreFileFingerprint = lastCoreFileFingerprint;

    if (options.allowExternalCoreOverwrite === true) {
      const currentFingerprint = readCoreFileFingerprint(paths.core, adapter);

      if (!currentFingerprint.ok) {
        return createWriteError(
          'PERSISTENCE_READ_FAILED',
          'Failed to inspect current core document fingerprint.'
        );
      }

      expectedCoreFileFingerprint = currentFingerprint.fingerprint;
    }

    const result = writeDocument('core', document, paths, adapter, logger, session, {
      expectedCoreFileFingerprint,
      allowExternalCoreOverwrite: options.allowExternalCoreOverwrite,
      ...(existingSession !== undefined ? { existingCoreSession: existingSession } : {})
    });

    if (!result.ok) {
      return result;
    }

    return persistCurrentCoreFileFingerprint();
  };

  const verifyCorePassword = (
    password: string
  ): { result: PersistenceReadResult; session: CoreCryptoSession | null } => {
    cleanupAllStaleTmp(paths, adapter, logger);

    const filePath = getPersistenceDocumentPath(paths, 'core');
    const state = pathExists(filePath, adapter);

    if (!state.ok) {
      return {
        result: createReadError(
          'PERSISTENCE_READ_FAILED',
          'Failed to inspect persistence document.'
        ),
        session: null
      };
    }

    if (!state.exists) {
      const result: PersistenceReadResult = {
        ok: true,
        exists: false,
        document: createDefaultPersistenceDocument('core')
      };

      rememberCurrentCoreFileFingerprint();
      return { result, session: null };
    }

    const existing = readExistingDocument('core', filePath, adapter, password);

    if (!existing.ok) {
      return { result: existing, session: null };
    }

    if ('locked' in existing) {
      return {
        result: createReadError('PERSISTENCE_CORE_UNLOCK_FAILED', '无法解密该文件。'),
        session: null
      };
    }

    const result: PersistenceReadResult = {
      ok: true,
      exists: true,
      document: existing.document,
      ...(existing.encrypted ? { encrypted: existing.encrypted } : {}),
      ...(existing.integrityWarning ? { integrityWarning: existing.integrityWarning } : {})
    };
    const protectedResult = applyCoreProtectionReadRules(result);

    return {
      result: protectedResult,
      session: existing.encrypted && existing.session ? existing.session : null
    };
  };

  const acknowledgeCoreIntegrityIssue = (): PersistenceWriteResult => {
    const fingerprint = readCoreFileFingerprint(paths.core, adapter);

    if (!fingerprint.ok) {
      return createWriteError(
        'PERSISTENCE_READ_FAILED',
        'Failed to inspect current core document fingerprint.'
      );
    }

    if (!fingerprint.exists || fingerprint.fingerprint === null) {
      lastCoreFileFingerprint = null;
      return { ok: true };
    }

    const currentRead = readExistingDocument('core', paths.core, adapter, coreSession);
    const hasInternalIntegrityFailure =
      currentRead.ok && !('locked' in currentRead) && !!currentRead.integrityWarning;
    const nextProtection: CoreProtectionState = {
      schemaVersion: 1,
      lastConfirmedFingerprint: fingerprint.fingerprint,
      ...(hasInternalIntegrityFailure
        ? { acknowledgedInternalIntegrityFailureFingerprint: fingerprint.fingerprint }
        : {})
    };
    const result = writeCoreProtectionState(nextProtection);

    if (result.ok) {
      lastCoreFileFingerprint = fingerprint.fingerprint;
    }

    return result;
  };

  return {
    paths,
    readCoreDocument: () => readCoreWithCredential(coreSession),
    writeCoreDocument: (document, options) =>
      writeCoreWithSession(document, coreSession, options),
    unlockCoreDocument: (password) => {
      const verification = verifyCorePassword(password);
      const { result } = verification;

      if (result.ok && !('locked' in result)) {
        coreSession = verification.session;
      }

      return result;
    },
    enableCoreProtection: (document, password, options) => {
      if (password.trim() === '') {
        return createWriteError(
          'PERSISTENCE_CORE_UNLOCK_FAILED',
          'Core password cannot be empty.'
        );
      }

      const previousSession = coreSession;
      coreSession = createCoreCryptoSession(password);
      const result = writeCoreWithSession(document, coreSession, options);

      if (!result.ok) {
        coreSession = previousSession;
      }

      return result;
    },
    changeCorePassword: (document, currentPassword, nextPassword, options) => {
      if (nextPassword.trim() === '') {
        return createWriteError(
          'PERSISTENCE_CORE_UNLOCK_FAILED',
          'Core password cannot be empty.'
        );
      }

      const verification = verifyCorePassword(currentPassword);
      const { result: verified } = verification;

      if (!verified.ok || 'locked' in verified) {
        return createWriteError(
          'PERSISTENCE_CORE_UNLOCK_FAILED',
          verified.ok ? '无法解密该文件。' : verified.message
        );
      }

      const previousSession = coreSession;
      coreSession = createCoreCryptoSession(nextPassword);
      const result = writeCoreWithSession(
        document,
        coreSession,
        options,
        verification.session
      );

      if (!result.ok) {
        coreSession = previousSession;
      }

      return result;
    },
    disableCoreProtection: (document, password, options) => {
      const verification = verifyCorePassword(password);
      const { result: verified } = verification;

      if (!verified.ok || 'locked' in verified) {
        return createWriteError(
          'PERSISTENCE_CORE_UNLOCK_FAILED',
          verified.ok ? '无法解密该文件。' : verified.message
        );
      }

      const previousSession = coreSession;
      coreSession = null;
      const result = writeCoreWithSession(
        document,
        null,
        options,
        verification.session
      );

      if (!result.ok) {
        coreSession = previousSession;
      }

      return result;
    },
    lockCoreDocument: () => {
      coreSession = null;
      return { ok: true };
    },
    acknowledgeCoreIntegrityIssue,
    encryptSnapshotDocument: (document) => {
      if (coreSession === null) {
        return {
          ok: false,
          code: 'PERSISTENCE_CRYPTO_SESSION_UNAVAILABLE',
          message: '加密会话不可用，请先解锁 NF。'
        };
      }

      try {
        return {
          ok: true,
          encrypted: encryptJsonEnvelopeWithSession(
            document,
            coreSession,
            'netraflow-encrypted-snapshot'
          )
        };
      } catch {
        return {
          ok: false,
          code: 'PERSISTENCE_SNAPSHOT_ENCRYPT_FAILED',
          message: 'Snapshot encryption failed.'
        };
      }
    },
    decryptSnapshotDocument: (encrypted) => {
      if (coreSession === null) {
        return createReadError(
          'PERSISTENCE_CRYPTO_SESSION_UNAVAILABLE',
          '加密会话不可用，请先解锁 NF。'
        );
      }

      try {
        return {
          ok: true,
          document: decryptJsonEnvelopeWithSession(
            encrypted,
            coreSession,
            'netraflow-encrypted-snapshot'
          )
        };
      } catch {
        return createReadError(
          'PERSISTENCE_SNAPSHOT_DECRYPT_FAILED',
          '无法解密该文件。'
        );
      }
    },
    decryptSnapshotDocumentWithPassword: (encrypted, password) => {
      if (password.trim() === '') {
        return createReadError(
          'PERSISTENCE_SNAPSHOT_DECRYPT_FAILED',
          '无法解密该文件。'
        );
      }

      try {
        return {
          ok: true,
          document: decryptJsonEnvelope(
            encrypted,
            password,
            'netraflow-encrypted-snapshot'
          )
        };
      } catch {
        return createReadError(
          'PERSISTENCE_SNAPSHOT_DECRYPT_FAILED',
          '无法解密该文件。'
        );
      }
    },
    readSettingsDocument: () => readDocument('settings', paths, adapter, logger),
    writeSettingsDocument: (document) =>
      writeDocument('settings', document, paths, adapter, logger),
    readStateDocument: () => readDocument('state', paths, adapter, logger),
    writeStateDocument: (document) =>
      writeDocument('state', document, paths, adapter, logger),
    readSecurityDocument: () => readDocument('security', paths, adapter, logger),
    writeSecurityDocument: (document) =>
      writeDocument('security', document, paths, adapter, logger)
  };
};
