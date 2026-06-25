type CloseBeforeWindowState = {
  requested: boolean;
  allowNextClose: boolean;
};

type CloseBeforeTargetWindow = {
  close: () => void;
  webContents: {
    send: (channel: string) => void;
  };
};

type PreventableCloseEvent = {
  preventDefault: () => void;
};

type CloseBeforeWindowStateEvent = {
  event:
    | 'request-sent'
    | 'request-ignored'
    | 'allow-next-close'
    | 'cancel-request'
    | 'allowed-close-consumed'
    | 'close-prevented'
    | 'window-deleted';
  requested: boolean;
  allowNextClose: boolean;
};

export const createCloseBeforeWindowCoordinator = ({
  onStateChange
}: {
  onStateChange?: (event: CloseBeforeWindowStateEvent) => void;
} = {}) => {
  const windowStates = new WeakMap<object, CloseBeforeWindowState>();

  const getWindowState = (targetWindow: object) => {
    const currentState = windowStates.get(targetWindow);

    if (currentState) {
      return currentState;
    }

    const nextState: CloseBeforeWindowState = {
      requested: false,
      allowNextClose: false
    };
    windowStates.set(targetWindow, nextState);

    return nextState;
  };

  const emitState = (event: CloseBeforeWindowStateEvent['event'], state: CloseBeforeWindowState) => {
    onStateChange?.({
      event,
      requested: state.requested,
      allowNextClose: state.allowNextClose
    });
  };

  return {
    requestRendererCloseApproval: (targetWindow: CloseBeforeTargetWindow) => {
      const closeState = getWindowState(targetWindow);

      if (closeState.requested) {
        emitState('request-ignored', closeState);
        return false;
      }

      closeState.requested = true;
      targetWindow.webContents.send('app:close-request');
      emitState('request-sent', closeState);
      return true;
    },

    allowNextWindowClose: (targetWindow: CloseBeforeTargetWindow) => {
      const closeState = getWindowState(targetWindow);

      closeState.allowNextClose = true;
      closeState.requested = false;
      emitState('allow-next-close', closeState);
      targetWindow.close();
    },

    cancelCloseRequest: (targetWindow: CloseBeforeTargetWindow) => {
      const closeState = getWindowState(targetWindow);

      closeState.requested = false;
      emitState('cancel-request', closeState);
    },

    handleWindowClose: (
      targetWindow: CloseBeforeTargetWindow,
      event: PreventableCloseEvent
    ) => {
      const closeState = getWindowState(targetWindow);

      if (closeState.allowNextClose) {
        closeState.allowNextClose = false;
        closeState.requested = false;
        emitState('allowed-close-consumed', closeState);
        return true;
      }

      event.preventDefault();
      emitState('close-prevented', closeState);
      return false;
    },

    deleteWindow: (targetWindow: CloseBeforeTargetWindow) => {
      const closeState = getWindowState(targetWindow);

      emitState('window-deleted', closeState);
      windowStates.delete(targetWindow);
    },

    getWindowStateForTest: (targetWindow: CloseBeforeTargetWindow) => ({
      ...getWindowState(targetWindow)
    })
  };
};
