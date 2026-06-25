export const CORE_AUTO_SAVE_COALESCE_MS = 150;

export type CoreSaveRequest<TAppData> = {
  revision: number;
  appData: TAppData;
  options: {
    allowEmptyHistoryOverwrite?: boolean;
  };
  onSaved: () => void;
  acceptedInMemory: boolean;
};

export type CoreSaveScheduleOptions = {
  flush?: boolean;
};

export type CoreSaveCoordinatorState<TAppData> = {
  saving: boolean;
  dirtyRevision: number;
  persistedRevision: number;
  changedDuringSave: boolean;
  acknowledgedWithoutSaveRevision: number;
  persistenceBlocked: boolean;
  pendingSave: CoreSaveRequest<TAppData> | null;
  autoSaveTimer: unknown | null;
};

export type CoreSaveTimerApi = {
  setTimeout: (handler: () => void, delayMs: number) => unknown;
  clearTimeout: (timerId: unknown) => void;
};

export type CoreSaveCoordinatorHandlers<TAppData> = {
  timerApi: CoreSaveTimerApi;
  cloneAppData: (appData: TAppData) => TAppData;
  saveAppData: (
    appData: TAppData,
    options: {
      allowEmptyHistoryOverwrite?: boolean;
      allowExternalCoreOverwrite?: boolean;
    }
  ) => void;
  isExternalCoreModificationError: (error: unknown) => boolean;
  showCoreIntegrityPrompt: (pendingSave: CoreSaveRequest<TAppData>) => void;
  onCoalescedSaveError: (error: unknown) => void;
};

const createInitialState = <TAppData>(): CoreSaveCoordinatorState<TAppData> => ({
  saving: false,
  dirtyRevision: 0,
  persistedRevision: 0,
  changedDuringSave: false,
  acknowledgedWithoutSaveRevision: 0,
  persistenceBlocked: false,
  pendingSave: null,
  autoSaveTimer: null
});

export const createCoreSaveCoordinator = <TAppData>(
  initialHandlers: CoreSaveCoordinatorHandlers<TAppData>
) => {
  const state = createInitialState<TAppData>();
  let handlers = initialHandlers;

  const getHandlers = () => handlers;

  const acceptCoreSaveRequestInMemory = (saveRequest: CoreSaveRequest<TAppData>) => {
    if (saveRequest.acceptedInMemory) {
      return;
    }

    saveRequest.onSaved();
    saveRequest.acceptedInMemory = true;
  };

  const clearAutoSaveTimer = () => {
    if (state.autoSaveTimer === null) {
      return;
    }

    getHandlers().timerApi.clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = null;
  };

  const getLatestPendingSaveRequest = () => state.pendingSave;

  const hasPendingSaveData = () =>
    state.dirtyRevision > state.persistedRevision ||
    state.autoSaveTimer !== null ||
    (state.pendingSave !== null && state.pendingSave.revision > state.persistedRevision) ||
    (state.saving && state.dirtyRevision > state.persistedRevision) ||
    (state.acknowledgedWithoutSaveRevision > state.persistedRevision &&
      state.acknowledgedWithoutSaveRevision >= state.dirtyRevision);

  const scheduleAutoSave = () => {
    clearAutoSaveTimer();

    if (!state.pendingSave) {
      return;
    }

    state.autoSaveTimer = getHandlers().timerApi.setTimeout(() => {
      state.autoSaveTimer = null;

      try {
        flushLatestSave(false);
      } catch (error) {
        getHandlers().onCoalescedSaveError(error);
      }
    }, CORE_AUTO_SAVE_COALESCE_MS);
  };

  const performSaveRequest = (
    saveRequest: CoreSaveRequest<TAppData>,
    allowExternalCoreOverwrite = false
  ): boolean => {
    const currentHandlers = getHandlers();

    if (
      !allowExternalCoreOverwrite &&
      saveRequest.revision === state.acknowledgedWithoutSaveRevision
    ) {
      return false;
    }

    if (state.saving) {
      state.changedDuringSave = true;
      state.pendingSave = saveRequest;
      return false;
    }

    state.saving = true;
    state.persistenceBlocked = false;

    try {
      currentHandlers.saveAppData(saveRequest.appData, {
        ...saveRequest.options,
        allowExternalCoreOverwrite
      });
      acceptCoreSaveRequestInMemory(saveRequest);
      state.persistedRevision = saveRequest.revision;

      if (state.pendingSave?.revision === saveRequest.revision) {
        state.pendingSave = null;
      }

      return true;
    } catch (error) {
      if (!currentHandlers.isExternalCoreModificationError(error)) {
        throw error;
      }

      state.persistenceBlocked = true;
      state.pendingSave = saveRequest;
      acceptCoreSaveRequestInMemory(saveRequest);
      currentHandlers.showCoreIntegrityPrompt(saveRequest);

      return false;
    } finally {
      state.saving = false;
      const shouldScheduleTrailingSave =
        state.changedDuringSave &&
        !state.persistenceBlocked &&
        state.pendingSave !== null &&
        state.pendingSave.revision > state.persistedRevision;
      state.changedDuringSave = false;

      if (shouldScheduleTrailingSave) {
        scheduleAutoSave();
      }
    }
  };

  const flushLatestSave = (allowExternalCoreOverwrite = false) => {
    clearAutoSaveTimer();
    const pendingSave = getLatestPendingSaveRequest();

    if (!pendingSave) {
      return !hasPendingSaveData();
    }

    return performSaveRequest(
      {
        ...pendingSave,
        appData: getHandlers().cloneAppData(pendingSave.appData)
      },
      allowExternalCoreOverwrite
    );
  };

  const saveWithExternalModificationCheck = (
    nextAppData: TAppData,
    options: { allowEmptyHistoryOverwrite?: boolean },
    onSaved: () => void,
    scheduleOptions: CoreSaveScheduleOptions = {}
  ) => {
    const revision = state.dirtyRevision + 1;
    const saveRequest: CoreSaveRequest<TAppData> = {
      revision,
      appData: getHandlers().cloneAppData(nextAppData),
      options,
      onSaved,
      acceptedInMemory: false
    };

    state.dirtyRevision = revision;
    state.pendingSave = saveRequest;

    if (!scheduleOptions.flush) {
      acceptCoreSaveRequestInMemory(saveRequest);
      scheduleAutoSave();
      return true;
    }

    clearAutoSaveTimer();
    const saved = performSaveRequest(saveRequest);

    return (
      saved ||
      (state.persistenceBlocked && state.pendingSave?.revision === saveRequest.revision)
    );
  };

  const acknowledgePendingSaveWithoutPersisting = (revision = 0) => {
    clearAutoSaveTimer();
    state.acknowledgedWithoutSaveRevision = Math.max(
      state.acknowledgedWithoutSaveRevision,
      state.dirtyRevision,
      revision
    );
    state.pendingSave = null;
    state.changedDuringSave = false;
    state.persistenceBlocked = false;
  };

  return {
    setHandlers: (nextHandlers: CoreSaveCoordinatorHandlers<TAppData>) => {
      handlers = nextHandlers;
    },
    getState: () => state,
    clearAutoSaveTimer,
    getLatestPendingSaveRequest,
    hasPendingSaveData,
    flushLatestSave,
    saveWithExternalModificationCheck,
    acknowledgePendingSaveWithoutPersisting
  };
};

export type CoreSaveCoordinator<TAppData> = ReturnType<
  typeof createCoreSaveCoordinator<TAppData>
>;
