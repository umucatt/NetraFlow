export type AppShutdownIntent =
  | 'normal'
  | 'window-close-request'
  | 'app-quit-request'
  | 'app-quit-approved'
  | 'destructive-shutdown';

export type AppQuitRequest =
  | 'continue-quit'
  | 'start-close-approval'
  | 'awaiting-close-approval';

export const createAppShutdownState = () => {
  let intent: AppShutdownIntent = 'normal';

  return {
    getIntent: () => intent,

    isAppQuitInProgress: () =>
      intent === 'app-quit-request' || intent === 'app-quit-approved',

    requestWindowClose: () => {
      if (intent === 'normal') {
        intent = 'window-close-request';
      }
    },

    requestAppQuit: (hasOpenWindow: boolean): AppQuitRequest => {
      if (!hasOpenWindow || intent === 'app-quit-approved' || intent === 'destructive-shutdown') {
        return 'continue-quit';
      }

      if (intent === 'app-quit-request') {
        return 'awaiting-close-approval';
      }

      intent = 'app-quit-request';
      return 'start-close-approval';
    },

    cancelCloseRequest: () => {
      if (intent === 'destructive-shutdown' || intent === 'app-quit-approved') {
        return;
      }

      intent = 'normal';
    },

    handleWindowClosed: () => {
      if (intent === 'app-quit-request') {
        intent = 'app-quit-approved';
        return true;
      }

      if (intent === 'window-close-request') {
        intent = 'normal';
      }

      return false;
    },

    beginDestructiveShutdown: () => {
      intent = 'destructive-shutdown';
    }
  };
};

export type AppShutdownState = ReturnType<typeof createAppShutdownState>;
