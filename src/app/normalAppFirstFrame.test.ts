import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isNormalAppFirstFrameLayoutStable,
  resolveNormalAppFirstFrameState,
  shouldReportNormalAppFirstFrame,
  shouldReportNormalAppStartupState
} from './normalAppFirstFrame';

const element = (width: number, height: number, left = 0) => ({
  getBoundingClientRect: () => ({ width, height, left })
});

const createLayout = (selectors: Record<string, unknown>) => {
  const querySelector = (selector: string) => selectors[selector] ?? null;
  return {
    root: { dataset: { resolvedTheme: 'dark' } },
    body: { querySelector },
    frame: {
      ...element(960, 640),
      dataset: { resolvedTheme: 'dark' }
    }
  };
};

test('only Linux packaged first-frame scenarios report renderer readiness', () => {
  [
    ['win32', 'dark', false],
    ['win32', 'light', false],
    ['win32', undefined, false],
    ['linux', 'dark', true],
    ['linux', 'light', true],
    ['linux', undefined, false],
    ['darwin', 'dark', false],
    ['darwin', 'light', false],
    ['freebsd', 'dark', false]
  ].forEach(([platform, initialTheme, expected]) => {
    assert.equal(
      shouldReportNormalAppFirstFrame(
        platform as string,
        initialTheme as 'light' | 'dark' | undefined
      ),
      expected
    );
  });
});

test('every delayed normal window reports its resolved startup state', () => {
  assert.equal(shouldReportNormalAppStartupState('light'), true);
  assert.equal(shouldReportNormalAppStartupState('dark'), true);
  assert.equal(shouldReportNormalAppStartupState(undefined), false);
});

test('normal first-frame lifecycle resolves every legal initial branch', () => {
  assert.equal(resolveNormalAppFirstFrameState({ initializing: true, onboarding: true, locked: true }), 'initializing');
  assert.equal(resolveNormalAppFirstFrameState({ initializing: false, onboarding: true, locked: false }), 'onboarding');
  assert.equal(resolveNormalAppFirstFrameState({ initializing: false, onboarding: false, locked: true }), 'locked');
  assert.equal(resolveNormalAppFirstFrameState({ initializing: false, onboarding: false, locked: false }), 'application');
});

test('onboarding and locked first frames use their own mounted roots', () => {
  const onboarding = createLayout({});
  const onboardingBody = {
    querySelector: (selector: string) => ({
      '.window-frame': onboarding.frame,
      '.first-welcome-modal': element(520, 300)
    })[selector] ?? null
  };
  assert.equal(
    isNormalAppFirstFrameLayoutStable(
      'onboarding',
      onboarding.root as unknown as HTMLElement,
      onboardingBody as unknown as HTMLElement
    ),
    true
  );

  const lockedBody = {
    querySelector: (selector: string) => ({
      '.window-frame': onboarding.frame,
      '.lock-screen': element(960, 640)
    })[selector] ?? null
  };
  assert.equal(
    isNormalAppFirstFrameLayoutStable(
      'locked',
      onboarding.root as unknown as HTMLElement,
      lockedBody as unknown as HTMLElement
    ),
    true
  );
});

test('initializing never becomes ready and application pages retain two-column stability', () => {
  const layout = createLayout({});
  assert.equal(
    isNormalAppFirstFrameLayoutStable(
      'initializing',
      layout.root as unknown as HTMLElement,
      layout.body as unknown as HTMLElement
    ),
    false
  );

  const shell = {
    ...element(900, 600),
    querySelector: (selector: string) => ({
      '.left-browse-panel': element(650, 600, 0),
      '.right-action-panel': element(230, 600, 670)
    })[selector] ?? null
  };
  const body = {
    querySelector: (selector: string) => ({
      '.window-frame': layout.frame,
      '.app-shell': shell
    })[selector] ?? null
  };
  assert.equal(
    isNormalAppFirstFrameLayoutStable(
      'application',
      layout.root as unknown as HTMLElement,
      body as unknown as HTMLElement,
      true
    ),
    true
  );
});

test('ordinary application pages do not require settings two-column layout', () => {
  const layout = createLayout({});
  const shell = { ...element(900, 600), querySelector: () => null };
  const body = {
    querySelector: (selector: string) => ({
      '.window-frame': layout.frame,
      '.app-shell': shell
    })[selector] ?? null
  };
  assert.equal(isNormalAppFirstFrameLayoutStable('application', layout.root as unknown as HTMLElement, body as unknown as HTMLElement), true);
  assert.equal(isNormalAppFirstFrameLayoutStable('application', layout.root as unknown as HTMLElement, body as unknown as HTMLElement, true), false);
});
