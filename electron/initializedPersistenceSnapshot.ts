import type {
  PersistenceStore,
  PersistenceWriteResult
} from './persistenceFileStore.js';

type InitializedPersistenceSnapshotDocuments = {
  core: unknown;
  state: unknown;
};

type InitializedPersistenceSnapshotStore = Pick<
  PersistenceStore,
  'writeCoreDocument' | 'writeStateDocument'
>;

export const writeInitializedPersistenceSnapshotDocuments = (
  store: InitializedPersistenceSnapshotStore,
  documents: InitializedPersistenceSnapshotDocuments
): PersistenceWriteResult => {
  const stateWrite = store.writeStateDocument(documents.state);
  if (!stateWrite.ok) {
    return stateWrite;
  }

  return store.writeCoreDocument(documents.core, {
    allowExternalCoreOverwrite: true
  });
};
