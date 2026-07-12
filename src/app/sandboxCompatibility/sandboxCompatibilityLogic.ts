export const SANDBOX_CONSENT_DELAY_MS = 5000;

export const getSandboxConsentSecondsRemaining = (
  startedAt: number,
  currentMonotonicTime: number
) => Math.ceil(Math.max(0, SANDBOX_CONSENT_DELAY_MS - (currentMonotonicTime - startedAt)) / 1000);

export const canConfirmSandboxCompatibility = (
  startedAt: number,
  currentMonotonicTime: number,
  isWriting: boolean
) => !isWriting && getSandboxConsentSecondsRemaining(startedAt, currentMonotonicTime) === 0;
