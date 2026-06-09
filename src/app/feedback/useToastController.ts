import { useCallback, useEffect, useRef, useState } from 'react';

import type { ToastMessage, ToastTone } from './toastTypes';

const TOAST_AUTO_DISMISS_MS = 2500;

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useToastController() {
  const toastTimerRefs = useRef<number[]>([]);
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((toastId: string) => {
    setToastMessages((currentMessages) =>
      currentMessages.filter((message) => message.id !== toastId)
    );
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      toastTimerRefs.current.forEach((currentTimerId) =>
        window.clearTimeout(currentTimerId)
      );

      const toastId = createId('toast');
      const timerId = window.setTimeout(() => dismissToast(toastId), TOAST_AUTO_DISMISS_MS);

      toastTimerRefs.current = [timerId];
      setToastMessages([
        {
          id: toastId,
          message,
          tone
        }
      ]);

      return toastId;
    },
    [dismissToast]
  );

  useEffect(
    () => () => {
      toastTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
      toastTimerRefs.current = [];
    },
    []
  );

  return {
    toastMessages,
    showToast,
    dismissToast
  };
}
