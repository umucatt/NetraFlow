import type {
  NfStorageErrorCode,
  NfStorageItems,
  StorageReadResult,
  StorageWriteResult
} from './storageFile.js';

export type NfStorageBatchErrorCode = NfStorageErrorCode | 'INVALID_BATCH';

export type NfStorageBridgeErrorResult = {
  ok: false;
  code: NfStorageBatchErrorCode;
  message: string;
};

export type NfStorageWriteResponse = { ok: true } | NfStorageBridgeErrorResult;

type ValidatedBatch = {
  ok: true;
  entries: Array<[string, string]>;
} | NfStorageBridgeErrorResult;

type NfStorageBatchDependencies = {
  whitelistKeys: readonly string[];
  readItems: () => StorageReadResult;
  writeItems: (items: Record<string, unknown>) => StorageWriteResult;
};

const unsafeBatchKeys = new Set(['__proto__', 'prototype', 'constructor']);

const createBridgeErrorResult = (
  code: NfStorageBatchErrorCode,
  message: string
): NfStorageBridgeErrorResult => ({ ok: false, code, message });

const getReadErrorResult = (
  result: Extract<StorageReadResult, { ok: false }>
): NfStorageBridgeErrorResult => createBridgeErrorResult(result.code, result.message);

const getWriteErrorResult = (
  result: Extract<StorageWriteResult, { ok: false }>
): NfStorageBridgeErrorResult => createBridgeErrorResult(result.code, result.message);

const isPlainBatchObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

export const validateNfStorageBatchItems = (
  items: unknown,
  whitelistKeys: readonly string[]
): ValidatedBatch => {
  if (!isPlainBatchObject(items)) {
    return createBridgeErrorResult('INVALID_BATCH', 'Storage batch must be a plain object.');
  }

  let keys: string[];

  try {
    keys = Object.keys(items);
  } catch {
    return createBridgeErrorResult('INVALID_BATCH', 'Storage batch keys could not be read.');
  }

  const allowedKeys = new Set(whitelistKeys);
  const entries: Array<[string, string]> = [];

  for (const key of keys) {
    if (unsafeBatchKeys.has(key)) {
      return createBridgeErrorResult('INVALID_BATCH', 'Storage batch contains an unsafe key.');
    }

    if (!allowedKeys.has(key)) {
      return createBridgeErrorResult('INVALID_BATCH', 'Storage batch contains an unsupported key.');
    }

    let value: unknown;

    try {
      value = items[key];
    } catch {
      return createBridgeErrorResult('INVALID_BATCH', 'Storage batch value could not be read.');
    }

    if (typeof value !== 'string') {
      return createBridgeErrorResult('INVALID_BATCH', 'Storage batch values must be strings.');
    }

    entries.push([key, value]);
  }

  return { ok: true, entries };
};

export const setNfStorageBatchItems = (
  items: unknown,
  dependencies: NfStorageBatchDependencies
): NfStorageWriteResponse => {
  const validation = validateNfStorageBatchItems(items, dependencies.whitelistKeys);

  if (!validation.ok) {
    return validation;
  }

  if (validation.entries.length === 0) {
    return { ok: true };
  }

  const currentItemsResult = dependencies.readItems();

  if (!currentItemsResult.ok) {
    return getReadErrorResult(currentItemsResult);
  }

  const nextItems: NfStorageItems = { ...(currentItemsResult.items as NfStorageItems) };

  validation.entries.forEach(([key, value]) => {
    nextItems[key] = value;
  });

  const writeResult = dependencies.writeItems(nextItems);

  if (!writeResult.ok) {
    return getWriteErrorResult(writeResult);
  }

  return { ok: true };
};
