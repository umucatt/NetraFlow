import {
  type MouseEvent,
  useRef
} from 'react';

export const useOverlayBack = <T extends HTMLElement>(handleBack: () => void) => {
  const mouseDownStartedOnBackdropRef = useRef<{ x: number; y: number } | null>(null);

  return {
    onMouseDownCapture: (event: MouseEvent<T>) => {
      mouseDownStartedOnBackdropRef.current =
        event.button === 0 && event.target === event.currentTarget
          ? { x: event.clientX, y: event.clientY }
          : null;
    },

    onMouseUpCapture: (event: MouseEvent<T>) => {
      const startedOnBackdrop = mouseDownStartedOnBackdropRef.current;
      const shouldBack =
        startedOnBackdrop !== null &&
        event.button === 0 &&
        event.target === event.currentTarget &&
        Math.abs(event.clientX - startedOnBackdrop.x) <= 6 &&
        Math.abs(event.clientY - startedOnBackdrop.y) <= 6;

      mouseDownStartedOnBackdropRef.current = null;

      if (!shouldBack) {
        return;
      }

      handleBack();
    }
  };
};
