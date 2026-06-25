/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEncryptedJsonExportText,
  parseNetraFlowJsonFile,
  verifyParsedJsonIntegrity,
  wrapEncryptedJson,
  wrapJsonPayload
} from './jsonIntegrity';
import { ENCRYPTION_KDF_ITERATIONS } from '../../electron/cryptoEnvelopeShared';
import { sha256Hex } from '../security/jsonHash';
import {
  isEncryptedSnapshotFile
} from '../security/snapshotCrypto';

test('wraps plain payloads with SHA-256 integrity', async () => {
  const payload = { accounts: [{ id: 'a1', balance: 12.5 }] };
  const wrapped = await wrapJsonPayload(payload);

  assert.equal(wrapped.integrity.algorithm, 'SHA-256');
  assert.equal(wrapped.integrity.hash, await sha256Hex(JSON.stringify(payload)));
  assert.deepEqual(wrapped.payload, payload);
});

test('accepts unchanged payload wrappers', async () => {
  const wrapped = await wrapJsonPayload({ groups: [{ id: 'g1', name: '现金' }] });
  const result = await verifyParsedJsonIntegrity(wrapped);

  assert.equal(result.status, 'valid');
  assert.deepEqual(result.content, wrapped.payload);
});

test('warns when a nested field value changes', async () => {
  const wrapped = await wrapJsonPayload({ account: { id: 'a1', balance: 10 } });
  const result = await verifyParsedJsonIntegrity({
    ...wrapped,
    payload: { account: { id: 'a1', balance: 11 } }
  });

  assert.equal(result.status, 'warning');
  assert.equal(result.reason, 'mismatch');
});

test('warns when a payload field is added', async () => {
  const wrapped = await wrapJsonPayload({ id: 'snapshot-1' });
  const result = await verifyParsedJsonIntegrity({
    ...wrapped,
    payload: { id: 'snapshot-1', extra: true }
  });

  assert.equal(result.status, 'warning');
  assert.equal(result.reason, 'mismatch');
});

test('warns when a payload field is deleted', async () => {
  const wrapped = await wrapJsonPayload({ id: 'snapshot-1', exportedAt: '2026-06-02' });
  const result = await verifyParsedJsonIntegrity({
    ...wrapped,
    payload: { id: 'snapshot-1' }
  });

  assert.equal(result.status, 'warning');
  assert.equal(result.reason, 'mismatch');
});

test('warns when array order changes', async () => {
  const wrapped = await wrapJsonPayload({ ids: ['a', 'b', 'c'] });
  const result = await verifyParsedJsonIntegrity({
    ...wrapped,
    payload: { ids: ['b', 'a', 'c'] }
  });

  assert.equal(result.status, 'warning');
  assert.equal(result.reason, 'mismatch');
});

test('warns when object field order changes', async () => {
  const wrapped = await wrapJsonPayload({ first: 1, second: 2 });
  const result = await verifyParsedJsonIntegrity({
    ...wrapped,
    payload: { second: 2, first: 1 }
  });

  assert.equal(result.status, 'warning');
  assert.equal(result.reason, 'mismatch');
});

test('ignores whitespace-only formatting changes', async () => {
  const payload = { groups: [{ id: 'g1' }], accounts: [{ id: 'a1' }] };
  const wrapped = await wrapJsonPayload(payload);
  const formattedText = `${JSON.stringify(wrapped, null, 2)}\n`;
  const result = await parseNetraFlowJsonFile(formattedText);

  assert.equal(result.status, 'valid');
  assert.deepEqual(result.content, payload);
});

test('hashes encrypted wrappers from encrypted content instead of plaintext', async () => {
  const encrypted = {
    createdAt: '2026-06-02T00:00:00.000Z',
    encryption: {
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-HMAC-SHA-256',
      iterations: 120000,
      salt: 'salt',
      iv: 'iv'
    },
    payload: 'ciphertext'
  };
  const plaintext = { groups: [{ id: 'plain' }] };
  const wrapped = await wrapEncryptedJson(encrypted);

  assert.equal(wrapped.integrity.hash, await sha256Hex(JSON.stringify(encrypted)));
  assert.notEqual(wrapped.integrity.hash, await sha256Hex(JSON.stringify(plaintext)));

  const text = await createEncryptedJsonExportText(encrypted);
  const result = await parseNetraFlowJsonFile(text);

  assert.equal(result.status, 'valid');
  assert.deepEqual(result.content, encrypted);
});

test('warns when encrypted payload changes', async () => {
  const encrypted = {
    createdAt: '2026-06-02T00:00:00.000Z',
    encryption: {
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-HMAC-SHA-256',
      iterations: 120000,
      salt: 'salt',
      iv: 'iv'
    },
    payload: 'ciphertext'
  };
  const wrapped = await wrapEncryptedJson(encrypted);
  const result = await verifyParsedJsonIntegrity({
    ...wrapped,
    encrypted: {
      ...encrypted,
      payload: 'changed-ciphertext'
    }
  });

  assert.equal(result.status, 'warning');
  assert.equal(result.reason, 'mismatch');
});

test('warns when encrypted iv changes', async () => {
  const encrypted = {
    createdAt: '2026-06-02T00:00:00.000Z',
    encryption: {
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-HMAC-SHA-256',
      iterations: 120000,
      salt: 'salt',
      iv: 'iv'
    },
    payload: 'ciphertext'
  };
  const wrapped = await wrapEncryptedJson(encrypted);
  const result = await verifyParsedJsonIntegrity({
    ...wrapped,
    encrypted: {
      ...encrypted,
      encryption: {
        ...encrypted.encryption,
        iv: 'changed-iv'
      }
    }
  });

  assert.equal(result.status, 'warning');
  assert.equal(result.reason, 'mismatch');
});

test('missing integrity returns a warning instead of a parse failure', async () => {
  const legacyPayload = { app: 'NetraFlow', groups: [] };
  const result = await parseNetraFlowJsonFile(JSON.stringify(legacyPayload));

  assert.equal(result.status, 'warning');
  assert.equal(result.reason, 'missing');
  assert.deepEqual(result.content, legacyPayload);
});

test('malformed JSON returns invalid parse status', async () => {
  const result = await parseNetraFlowJsonFile('{');

  assert.equal(result.status, 'invalid');
  assert.equal(result.reason, 'parse-error');
});

test('integrity wrapper without payload or encrypted content is invalid', async () => {
  const result = await verifyParsedJsonIntegrity({
    integrity: { algorithm: 'SHA-256', hash: 'abc' }
  });

  assert.equal(result.status, 'invalid');
  assert.equal(result.reason, 'missing-content');
});

test('encrypted snapshots are recognized when extracted from integrity wrapper', async () => {
  const encrypted = {
    type: 'netraflow-encrypted-snapshot',
    version: 1,
    createdAt: '2026-06-02T00:00:00.000Z',
    encryption: {
      algorithm: 'AES-256-GCM',
      passwordKdf: {
        algorithm: 'PBKDF2-HMAC-SHA-256',
        iterations: ENCRYPTION_KDF_ITERATIONS,
        salt: 'cGFzc3dvcmQtc2FsdA=='
      },
      fileKeyKdf: {
        algorithm: 'HKDF-SHA-256',
        salt: 'ZmlsZS1rZXktc2FsdA==',
        purpose: 'netraflow-snapshot-v1'
      },
      iv: 'aW52YWxpZC1pdi0xMg=='
    },
    payload: 'Y2lwaGVydGV4dA=='
  };

  assert.equal(encrypted.type, 'netraflow-encrypted-snapshot');
  assert.equal(encrypted.version, 1);

  const wrapped = await wrapEncryptedJson(encrypted);
  const result = await verifyParsedJsonIntegrity(wrapped);

  assert.equal(result.status, 'valid');
  if (!isEncryptedSnapshotFile(result.content)) {
    assert.fail('Expected verified content to be an encrypted snapshot file.');
  }
});
