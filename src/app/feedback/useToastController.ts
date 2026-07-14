import { useCallback, useEffect, useRef, useState } from 'react';

import type { ToastMessage, ToastTone } from './toastTypes';

const TOAST_AUTO_DISMISS_MS = 2500;

export const shouldReuseActiveToast = (
  activeToast: ToastMessage | null,
  message: string,
  tone: ToastTone
) => activeToast?.message === message && activeToast.tone === tone;

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useToastController() {
  const toastTimerRefs = useRef<number[]>([]);
  const activeToastRef = useRef<ToastMessage | null>(null);
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((toastId: string) => {
    if (activeToastRef.current?.id === toastId) {
      activeToastRef.current = null;
    }

    setToastMessages((currentMessages) =>
      currentMessages.filter((message) => message.id !== toastId)
    );
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      if (shouldReuseActiveToast(activeToastRef.current, message, tone)) {
        return activeToastRef.current?.id ?? '';
      }

      toastTimerRefs.current.forEach((currentTimerId) =>
        window.clearTimeout(currentTimerId)
      );

      const toastId = createId('toast');
      const timerId = window.setTimeout(() => dismissToast(toastId), TOAST_AUTO_DISMISS_MS);

      toastTimerRefs.current = [timerId];
      const nextToast = { id: toastId, message, tone };

      activeToastRef.current = nextToast;
      setToastMessages([nextToast]);

      return toastId;
    },
    [dismissToast]
  );

  useEffect(
    () => () => {
      toastTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
      toastTimerRefs.current = [];
      activeToastRef.current = null;
    },
    []
  );

  return {
    toastMessages,
    showToast,
    dismissToast
  };
}
