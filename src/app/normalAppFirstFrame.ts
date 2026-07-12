import { useEffect } from 'react';

export type NormalAppFirstFrameState =
  | 'initializing'
  | 'onboarding'
  | 'locked'
  | 'application';

let normalAppFirstFrameWasSent = false;

export const resolveNormalAppFirstFrameState = ({
  initializing,
  onboarding,
  locked
}: {
  initializing: boolean;
  onboarding: boolean;
  locked: boolean;
}): NormalAppFirstFrameState => {
  if (initializing) return 'initializing';
  if (onboarding) return 'onboarding';
  if (locked) return 'locked';
  return 'application';
};

const hasNonZeroRect = (element: Element | null) => {
  const rect = element?.getBoundingClientRect();
  return Boolean(rect && rect.width > 0 && rect.height > 0);
};

export const isNormalAppFirstFrameLayoutStable = (
  state: NormalAppFirstFrameState,
  documentRoot: HTMLElement,
  documentBody: HTMLElement,
  requiresTwoColumnLayout = false
) => {
  if (state === 'initializing') {
    return false;
  }

  const resolvedTheme = documentRoot.dataset.resolvedTheme ?? documentRoot.dataset.theme;
  const windowFrame = documentBody.querySelector<HTMLElement>('.window-frame');

  if (
    !resolvedTheme ||
    !windowFrame ||
    windowFrame.dataset.resolvedTheme !== resolvedTheme ||
    !hasNonZeroRect(windowFrame)
  ) {
    return false;
  }

  if (state === 'onboarding') {
    return hasNonZeroRect(documentBody.querySelector('.first-welcome-modal'));
  }

  if (state === 'locked') {
    return hasNonZeroRect(documentBody.querySelector('.lock-screen'));
  }

  const shell = documentBody.querySelector<HTMLElement>('.app-shell');
  if (!shell || !hasNonZeroRect(shell)) {
    return false;
  }

  if (!requiresTwoColumnLayout) return true;

  const left = shell.querySelector<HTMLElement>('.left-browse-panel');
  const right = shell.querySelector<HTMLElement>('.right-action-panel');
  const leftRect = left?.getBoundingClientRect();
  const rightRect = right?.getBoundingClientRect();

  return Boolean(
    leftRect &&
      rightRect &&
      leftRect.width > 0 &&
      leftRect.height > 0 &&
      rightRect.width > 0 &&
      rightRect.height > 0 &&
      Math.abs(leftRect.left - rightRect.left) > 1
  );
};

export const useNormalAppFirstFrameReady = (
  state: NormalAppFirstFrameState,
  requiresTwoColumnLayout = false
) => {
  useEffect(() => {
    if (
      normalAppFirstFrameWasSent ||
      state === 'initializing' ||
      window.appInfo?.platform !== 'linux' ||
      !window.appInfo.initialTheme ||
      !window.electronAPI?.normalAppFirstFrameReady
    ) {
      return;
    }

    let cancelled = false;
    let inspectionFrame = 0;
    let firstPaintFrame = 0;
    let secondPaintFrame = 0;
    window.electronAPI?.normalAppStartupStateResolved?.(state);

    const waitForStableLayout = () => {
      const inspect = () => {
        if (cancelled || normalAppFirstFrameWasSent) {
          return;
        }

        if (!isNormalAppFirstFrameLayoutStable(
          state,
          document.documentElement,
          document.body,
          requiresTwoColumnLayout
        )) {
          inspectionFrame = window.requestAnimationFrame(inspect);
          return;
        }

        firstPaintFrame = window.requestAnimationFrame(() => {
          secondPaintFrame = window.requestAnimationFrame(() => {
            if (cancelled || normalAppFirstFrameWasSent) {
              return;
            }

            normalAppFirstFrameWasSent = true;
            window.electronAPI?.normalAppFirstFrameReady?.();
          });
        });
      };

      inspectionFrame = window.requestAnimationFrame(inspect);
    };

    waitForStableLayout();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(inspectionFrame);
      window.cancelAnimationFrame(firstPaintFrame);
      window.cancelAnimationFrame(secondPaintFrame);
    };
  }, [requiresTwoColumnLayout, state]);
};
