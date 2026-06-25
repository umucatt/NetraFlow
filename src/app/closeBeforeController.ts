export type CloseBeforeState =
  | 'idle'
  | 'requested'
  | 'awaiting-integrity'
  | 'saving-before-close'
  | 'allowed'
  | 'failed';

export type CloseBeforeControllerHandlers = {
  hasRuntimePersistenceError: () => boolean;
  hasVisibleIntegrityPrompt: () => boolean;
  upgradeVisibleIntegrityPromptForClose: () => void;
  readHasIntegrityWarning: () => boolean;
  hasPendingSave: () => boolean;
  showIntegrityPromptForClose: () => void;
  acknowledgeCoreIntegrity: () => void;
  acknowledgePendingSaveWithoutPersisting: () => void;
  flushPendingSaveForClose: (allowExternalCoreOverwrite: boolean) => boolean;
  reportRuntimePersistenceError: (error: unknown) => void;
  clearIntegrityPrompt: () => void;
  allowClose: () => void;
  cancelCloseRequest: () => void;
};

const createMissingHandlerError = () =>
  new Error('Close-before controller handlers have not been configured.');

export const createCloseBeforeController = () => {
  let state: CloseBeforeState = 'idle';
  let handlers: CloseBeforeControllerHandlers | null = null;

  const getHandlers = () => {
    if (!handlers) {
      throw createMissingHandlerError();
    }

    return handlers;
  };

  const allowClose = () => {
    state = 'allowed';
    getHandlers().allowClose();
  };

  const failCloseRequest = () => {
    state = 'failed';
    getHandlers().cancelCloseRequest();
  };

  const savePendingBeforeClose = (allowExternalCoreOverwrite: boolean) => {
    state = 'saving-before-close';

    try {
      if (getHandlers().flushPendingSaveForClose(allowExternalCoreOverwrite)) {
        allowClose();
        return;
      }
    } catch (error) {
      getHandlers().reportRuntimePersistenceError(error);
    }

    failCloseRequest();
  };

  const isCloseRequestInProgress = () =>
    state === 'requested' ||
    state === 'awaiting-integrity' ||
    state === 'saving-before-close' ||
    state === 'allowed';

  return {
    setHandlers: (nextHandlers: CloseBeforeControllerHandlers) => {
      handlers = nextHandlers;
    },

    getState: () => state,

    requestClose: () => {
      if (isCloseRequestInProgress()) {
        return;
      }

      const currentHandlers = getHandlers();
      state = 'requested';

      if (currentHandlers.hasRuntimePersistenceError()) {
        failCloseRequest();
        return;
      }

      if (currentHandlers.hasVisibleIntegrityPrompt()) {
        state = 'awaiting-integrity';
        currentHandlers.upgradeVisibleIntegrityPromptForClose();
        return;
      }

      let hasIntegrityWarning = false;

      try {
        hasIntegrityWarning = currentHandlers.readHasIntegrityWarning();
      } catch (error) {
        currentHandlers.reportRuntimePersistenceError(error);
        failCloseRequest();
        return;
      }

      if (!hasIntegrityWarning) {
        if (currentHandlers.hasPendingSave()) {
          savePendingBeforeClose(false);
          return;
        }

        allowClose();
        return;
      }

      state = 'awaiting-integrity';
      currentHandlers.showIntegrityPromptForClose();
    },

    handleAcknowledgePrompt: () => {
      if (state !== 'awaiting-integrity') {
        return false;
      }

      const currentHandlers = getHandlers();

      try {
        currentHandlers.acknowledgeCoreIntegrity();
      } catch (error) {
        currentHandlers.reportRuntimePersistenceError(error);
        failCloseRequest();
        return true;
      }

      if (currentHandlers.hasPendingSave()) {
        currentHandlers.acknowledgePendingSaveWithoutPersisting();
      }

      currentHandlers.clearIntegrityPrompt();
      allowClose();
      return true;
    },

    handleContinueSavePrompt: () => {
      if (state !== 'awaiting-integrity') {
        return false;
      }

      const currentHandlers = getHandlers();
      state = 'saving-before-close';

      try {
        currentHandlers.acknowledgeCoreIntegrity();
      } catch (error) {
        currentHandlers.reportRuntimePersistenceError(error);
        failCloseRequest();
        return true;
      }

      currentHandlers.clearIntegrityPrompt();
      savePendingBeforeClose(true);
      return true;
    }
  };
};

export type CloseBeforeController = ReturnType<typeof createCloseBeforeController>;
