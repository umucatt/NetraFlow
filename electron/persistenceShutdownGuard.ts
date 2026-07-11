export const PERSISTENCE_SHUTTING_DOWN_ERROR = Object.freeze({
  ok: false as const,
  code: 'PERSISTENCE_SHUTTING_DOWN' as const,
  message: 'NetraFlow is clearing local data and shutting down.'
});

export const runWithPersistenceShutdownGuard = <T>(
  isBlocked: () => boolean,
  action: () => T
): T | typeof PERSISTENCE_SHUTTING_DOWN_ERROR =>
  isBlocked() ? PERSISTENCE_SHUTTING_DOWN_ERROR : action();
