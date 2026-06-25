import {
  isEncryptedJsonEnvelope,
  type EncryptedJsonEnvelope
} from '../../electron/cryptoEnvelopeShared';

export const SNAPSHOT_DECRYPTION_ERROR_MESSAGE = '无法解密该文件。';

export type EncryptedSnapshotFile = EncryptedJsonEnvelope & {
  type: 'netraflow-encrypted-snapshot';
};

export const isEncryptedSnapshotFile = (value: unknown): value is EncryptedSnapshotFile =>
  isEncryptedJsonEnvelope(value, 'netraflow-encrypted-snapshot');
