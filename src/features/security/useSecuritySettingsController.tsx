import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react';

import type { CoreDocument } from '../../app/persistence/persistenceDocuments';
import {
  isAppContentInertForLockScreen,
  type LockScreenState
} from '../../app/lockScreen/lockScreenLogic';
import type {
  GlobalSettings,
  PasswordEditorMode
} from './securitySettingsTypes';
import { SECURITY_ERROR_MESSAGES } from './securityErrorMessages';

type ConfirmationRequest = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  eyebrow?: string | null;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel?: () => void;
};

type SecuritySettingsControllerOptions = {
  globalSettings: GlobalSettings;
  initialCoreProtectionLocked: boolean;
  autoBackupEnabled: boolean;
  getCurrentCoreDocument: () => CoreDocument;
  unlockCoreDocument: (password: string) => void;
  enableCoreProtection: (
    document: CoreDocument,
    password: string,
    options?: { allowExternalCoreOverwrite?: boolean }
  ) => void;
  changeCorePassword: (
    document: CoreDocument,
    currentPassword: string,
    nextPassword: string,
    options?: { allowExternalCoreOverwrite?: boolean }
  ) => void;
  disableCoreProtection: (
    document: CoreDocument,
    password: string,
    options?: { allowExternalCoreOverwrite?: boolean }
  ) => void;
  lockCoreDocument: () => void;
  updateGlobalSettings: (
    createNextSettings: (currentSettings: GlobalSettings) => GlobalSettings
  ) => void;
  isPersistenceCurrent: () => boolean;
  showConfirmationDialog: (request: ConfirmationRequest) => void;
  showCoreIntegrityDialog: (request: {
    onAcknowledge?: () => void;
    onContinueSave: () => void;
  }) => void;
  showToast: (message: string, tone?: 'info' | 'success' | 'error') => string;
};

const PASSWORD_TRY_LEVELS = [
  '密码强度：很弱',
  '密码强度：较弱',
  '密码强度：一般',
  '密码强度：较强',
  '密码强度：强',
  '密码强度：很强'
] as const;

const isExternalCoreModificationError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if (
    'code' in error &&
    (error as { code?: unknown }).code === 'PERSISTENCE_CORE_EXTERNAL_MODIFIED'
  ) {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : 'message' in error
        ? String((error as { message?: unknown }).message)
        : '';

  return message.includes('Core document was modified outside NetraFlow');
};

export const shouldInitializeSecurityLocked = ({
  passwordProtectionEnabled,
  coreProtectionLocked
}: {
  passwordProtectionEnabled: boolean;
  coreProtectionLocked: boolean;
}) => passwordProtectionEnabled && coreProtectionLocked;

export type SnapshotEncryptionChangeAction =
  | 'require-login-protection'
  | 'blocked-by-force-encryption'
  | 'enable-directly'
  | 'open-disable-confirm'
  | 'noop';

export const resolveSnapshotEncryptionChangeAction = ({
  passwordProtectionEnabled,
  forceSnapshotEncryption,
  snapshotEncryptionEnabled,
  requestedValue
}: {
  passwordProtectionEnabled: boolean;
  forceSnapshotEncryption: boolean;
  snapshotEncryptionEnabled: boolean;
  requestedValue: string;
}): SnapshotEncryptionChangeAction => {
  if (!passwordProtectionEnabled) {
    return 'require-login-protection';
  }

  if (forceSnapshotEncryption) {
    return 'blocked-by-force-encryption';
  }

  if (requestedValue === 'yes') {
    return snapshotEncryptionEnabled ? 'noop' : 'enable-directly';
  }

  if (requestedValue === 'no') {
    return snapshotEncryptionEnabled ? 'open-disable-confirm' : 'noop';
  }

  return 'noop';
};

const estimatePasswordTryLevel = (password: string) => {
  const length = password.length;
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;
  const repeated = /^(.{1,4})\1+$/.test(password);
  const sequential = 'abcdefghijklmnopqrstuvwxyz0123456789'.includes(password.toLowerCase());
  const score = length + classes * 4 - (repeated ? 8 : 0) - (sequential ? 6 : 0);

  if (score < 10) {
    return PASSWORD_TRY_LEVELS[0];
  }

  if (score < 16) {
    return PASSWORD_TRY_LEVELS[1];
  }

  if (score < 22) {
    return PASSWORD_TRY_LEVELS[2];
  }

  if (score < 30) {
    return PASSWORD_TRY_LEVELS[3];
  }

  if (score < 38) {
    return PASSWORD_TRY_LEVELS[4];
  }

  return PASSWORD_TRY_LEVELS[5];
};

export function useSecuritySettingsController({
  globalSettings,
  initialCoreProtectionLocked,
  autoBackupEnabled: _autoBackupEnabled,
  getCurrentCoreDocument,
  unlockCoreDocument,
  enableCoreProtection,
  changeCorePassword,
  disableCoreProtection,
  lockCoreDocument,
  updateGlobalSettings,
  isPersistenceCurrent,
  showConfirmationDialog,
  showCoreIntegrityDialog,
  showToast
}: SecuritySettingsControllerOptions) {
  const autoLockTimerRef = useRef<number | null>(null);
  const unlockExitAnimationFrameRef = useRef<number | null>(null);
  const [lockScreenState, setLockScreenState] = useState<LockScreenState>(
    () =>
      shouldInitializeSecurityLocked({
        passwordProtectionEnabled: globalSettings.passwordProtectionEnabled,
        coreProtectionLocked: initialCoreProtectionLocked
      })
        ? 'locked'
        : 'unlocked'
  );
  const isLocked = isAppContentInertForLockScreen(lockScreenState);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [passwordEditorMode, setPasswordEditorMode] =
    useState<PasswordEditorMode>(null);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordEditorError, setPasswordEditorError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [autoLockMinutesInput, setAutoLockMinutesInput] = useState(
    () => String(globalSettings.autoLockMinutes)
  );
  const [isPasswordDisableConfirmOpen, setIsPasswordDisableConfirmOpen] =
    useState(false);
  const [passwordDisableInput, setPasswordDisableInput] = useState('');
  const [passwordDisableError, setPasswordDisableError] = useState('');
  const [isDisablingPasswordProtection, setIsDisablingPasswordProtection] =
    useState(false);

  const [
    isSnapshotEncryptionDisableConfirmOpen,
    setIsSnapshotEncryptionDisableConfirmOpen
  ] = useState(false);
  const [snapshotEncryptionDisableInput, setSnapshotEncryptionDisableInput] =
    useState('');
  const [snapshotEncryptionDisableError, setSnapshotEncryptionDisableError] =
    useState('');
  const [isDisablingSnapshotEncryption, setIsDisablingSnapshotEncryption] =
    useState(false);

  useEffect(() => {
    setAutoLockMinutesInput(String(globalSettings.autoLockMinutes));
  }, [globalSettings.autoLockMinutes]);

  useEffect(() => {
    if (globalSettings.passwordProtectionEnabled) {
      return;
    }

    setLockScreenState('unlocked');
    setUnlockPasswordInput('');
    setUnlockError('');
  }, [globalSettings.passwordProtectionEnabled]);

  useEffect(() => {
    const api = window.electronAPI ?? window.electronWindow;

    if (!api?.onNetraFlowLock) {
      return;
    }

    return api.onNetraFlowLock(() => {
      if (!globalSettings.passwordProtectionEnabled) {
        showToast('请先启用登录密码保护', 'info');
        return;
      }

      lockCoreDocument();
      setUnlockPasswordInput('');
      setUnlockError('');
      if (unlockExitAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(unlockExitAnimationFrameRef.current);
        unlockExitAnimationFrameRef.current = null;
      }
      setIsUnlocking(false);
      setLockScreenState('locked');
    });
  }, [globalSettings.passwordProtectionEnabled, lockCoreDocument, showToast]);

  useEffect(() => {
    const api = window.electronAPI ?? window.electronWindow;

    if (!api?.setLockMenuState) {
      return;
    }

    api.setLockMenuState({
      canLock:
        globalSettings.passwordProtectionEnabled && !isLocked && !isUnlocking
    });

    return () => {
      api.setLockMenuState?.({ canLock: false });
    };
  }, [globalSettings.passwordProtectionEnabled, isLocked, isUnlocking]);

  useEffect(() => {
    if (!globalSettings.passwordProtectionEnabled || isLocked) {
      if (autoLockTimerRef.current !== null) {
        window.clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }

      return;
    }

    const autoLockDelay = Math.max(1, globalSettings.autoLockMinutes) * 60 * 1000;
    const resetAutoLockTimer = () => {
      if (autoLockTimerRef.current !== null) {
        window.clearTimeout(autoLockTimerRef.current);
      }

      autoLockTimerRef.current = window.setTimeout(() => {
        lockCoreDocument();
        setUnlockPasswordInput('');
        setUnlockError('');
        setIsUnlocking(false);
        setLockScreenState('locked');
      }, autoLockDelay);
    };
    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'wheel',
      'scroll',
      'touchstart'
    ];
    const listenerOptions: AddEventListenerOptions = {
      capture: true,
      passive: true
    };

    resetAutoLockTimer();
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetAutoLockTimer, listenerOptions);
    });

    return () => {
      if (autoLockTimerRef.current !== null) {
        window.clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetAutoLockTimer, listenerOptions);
      });
    };
  }, [
    globalSettings.autoLockMinutes,
    globalSettings.passwordProtectionEnabled,
    isLocked,
    lockCoreDocument
  ]);

  useEffect(
    () => () => {
      if (autoLockTimerRef.current !== null) {
        window.clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }

      if (unlockExitAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(unlockExitAnimationFrameRef.current);
      }
    },
    []
  );

  const resetPasswordEditor = () => {
    setPasswordEditorMode(null);
    setOldPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordEditorError('');
    setIsSavingPassword(false);
  };

  const openPasswordEditor = (mode: Exclude<PasswordEditorMode, null>) => {
    setPasswordEditorMode(mode);
    setOldPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordEditorError('');
    setIsSavingPassword(false);
  };

  const requestFirstPasswordSetup = () => {
    showConfirmationDialog({
      title: '设置登录密码',
      message: (
        <>
          <p>登录密码将用于加密核心数据和之后创建的加密快照。</p>
          <p>忘记密码将无法恢复受保护的数据。</p>
          <p>不限制输入次数，输入错误后可立即重试。</p>
        </>
      ),
      confirmLabel: '继续设置',
      onConfirm: () => openPasswordEditor('setup')
    });
  };

  const requestOpenPasswordEditor = () => {
    openPasswordEditor(globalSettings.passwordProtectionEnabled ? 'edit' : 'setup');
  };

  const closePasswordDisableConfirm = () => {
    setIsPasswordDisableConfirmOpen(false);
    setPasswordDisableInput('');
    setPasswordDisableError('');
    setIsDisablingPasswordProtection(false);
  };

  const requestDisablePasswordProtection = () => {
    setIsPasswordDisableConfirmOpen(true);
    setPasswordDisableInput('');
    setPasswordDisableError('');
    setIsDisablingPasswordProtection(false);
  };

  const closeSnapshotEncryptionDisableConfirm = () => {
    setIsSnapshotEncryptionDisableConfirmOpen(false);
    setSnapshotEncryptionDisableInput('');
    setSnapshotEncryptionDisableError('');
    setIsDisablingSnapshotEncryption(false);
  };

  const requestDisableSnapshotEncryption = () => {
    setIsSnapshotEncryptionDisableConfirmOpen(true);
    setSnapshotEncryptionDisableInput('');
    setSnapshotEncryptionDisableError('');
    setIsDisablingSnapshotEncryption(false);
  };

  const updatePasswordProtection = (value: string) => {
    if (value === 'yes') {
      if (!globalSettings.passwordProtectionEnabled) {
        requestFirstPasswordSetup();
      }

      return;
    }

    if (value === 'no' && globalSettings.passwordProtectionEnabled) {
      requestDisablePasswordProtection();
    }
  };

  const confirmDisablePasswordProtection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDisablingPasswordProtection(true);
    setPasswordDisableError('');

    const document = getCurrentCoreDocument();
    const applyDisableSuccess = () => {
      if (!isPersistenceCurrent()) {
        setIsDisablingPasswordProtection(false);
        return;
      }

      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        passwordProtectionEnabled: false,
        snapshotEncryptionEnabled: false
      }));
      setLockScreenState('unlocked');
      closePasswordDisableConfirm();
    };

    try {
      disableCoreProtection(document, passwordDisableInput);

      if (!isPersistenceCurrent()) {
        setIsDisablingPasswordProtection(false);
        return;
      }

      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        passwordProtectionEnabled: false,
        snapshotEncryptionEnabled: false
      }));
      setLockScreenState('unlocked');
      closePasswordDisableConfirm();
    } catch (error) {
      if (isExternalCoreModificationError(error)) {
        setIsDisablingPasswordProtection(false);
        showCoreIntegrityDialog({
          onContinueSave: () => {
            try {
              disableCoreProtection(document, passwordDisableInput, {
                allowExternalCoreOverwrite: true
              });
              applyDisableSuccess();
            } catch (retryError) {
              if (isExternalCoreModificationError(retryError)) {
                showCoreIntegrityDialog({
                  onContinueSave: () => {
                    disableCoreProtection(document, passwordDisableInput, {
                      allowExternalCoreOverwrite: true
                    });
                    applyDisableSuccess();
                  }
                });
                return;
              }

              console.error(
                '[NetraFlow security] Failed to overwrite externally modified core.',
                retryError
              );
              setPasswordDisableError(SECURITY_ERROR_MESSAGES.passwordProtectionDisableFailed);
              setIsDisablingPasswordProtection(false);
            }
          }
        });
        return;
      }

      console.error('[NetraFlow security] Failed to disable core protection.', error);
      setPasswordDisableError(SECURITY_ERROR_MESSAGES.loginPasswordIncorrect);
      setIsDisablingPasswordProtection(false);
    }
  };

  const saveLoginPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPasswordInput.trim() === '') {
      setPasswordEditorError(SECURITY_ERROR_MESSAGES.newPasswordRequired);
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordEditorError(SECURITY_ERROR_MESSAGES.passwordMismatch);
      return;
    }

    setIsSavingPassword(true);
    setPasswordEditorError('');

    const document = getCurrentCoreDocument();
    const writePasswordChange = (options?: { allowExternalCoreOverwrite?: boolean }) => {
      if (passwordEditorMode === 'edit') {
        changeCorePassword(document, oldPasswordInput, newPasswordInput, options);
      } else {
        enableCoreProtection(document, newPasswordInput, options);
      }
    };

    try {
      writePasswordChange();

      if (!isPersistenceCurrent()) {
        setIsSavingPassword(false);
        return;
      }

      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        passwordProtectionEnabled: true,
        forceSnapshotEncryption:
          passwordEditorMode === 'setup' ? true : currentSettings.forceSnapshotEncryption,
        snapshotEncryptionEnabled:
          passwordEditorMode === 'setup' || currentSettings.forceSnapshotEncryption
            ? true
            : currentSettings.snapshotEncryptionEnabled
      }));
      resetPasswordEditor();
      showToast(estimatePasswordTryLevel(newPasswordInput), 'info');
    } catch (error) {
      if (isExternalCoreModificationError(error)) {
        setIsSavingPassword(false);
        showCoreIntegrityDialog({
          onContinueSave: () => {
            try {
              writePasswordChange({ allowExternalCoreOverwrite: true });

              if (!isPersistenceCurrent()) {
                setIsSavingPassword(false);
                return;
              }

              updateGlobalSettings((currentSettings) => ({
                ...currentSettings,
                passwordProtectionEnabled: true,
                forceSnapshotEncryption:
                  passwordEditorMode === 'setup'
                    ? true
                    : currentSettings.forceSnapshotEncryption,
                snapshotEncryptionEnabled:
                  passwordEditorMode === 'setup' || currentSettings.forceSnapshotEncryption
                    ? true
                    : currentSettings.snapshotEncryptionEnabled
              }));
              resetPasswordEditor();
              showToast(estimatePasswordTryLevel(newPasswordInput), 'info');
            } catch (retryError) {
              if (isExternalCoreModificationError(retryError)) {
                showCoreIntegrityDialog({
                  onContinueSave: () => {
                    writePasswordChange({ allowExternalCoreOverwrite: true });
                    if (!isPersistenceCurrent()) {
                      setIsSavingPassword(false);
                      return;
                    }
                    updateGlobalSettings((currentSettings) => ({
                      ...currentSettings,
                      passwordProtectionEnabled: true,
                      forceSnapshotEncryption:
                        passwordEditorMode === 'setup'
                          ? true
                          : currentSettings.forceSnapshotEncryption,
                      snapshotEncryptionEnabled:
                        passwordEditorMode === 'setup' || currentSettings.forceSnapshotEncryption
                          ? true
                          : currentSettings.snapshotEncryptionEnabled
                    }));
                    resetPasswordEditor();
                    showToast(estimatePasswordTryLevel(newPasswordInput), 'info');
                  }
                });
                return;
              }

              console.error(
                '[NetraFlow security] Failed to overwrite externally modified core.',
                retryError
              );
              setPasswordEditorError(SECURITY_ERROR_MESSAGES.loginPasswordChangeFailed);
              setIsSavingPassword(false);
            }
          }
        });
        return;
      }

      console.error('[NetraFlow security] Failed to save login password.', error);
      setPasswordEditorError(
        passwordEditorMode === 'edit'
          ? SECURITY_ERROR_MESSAGES.loginPasswordIncorrect
          : SECURITY_ERROR_MESSAGES.loginPasswordChangeFailed
      );
      setIsSavingPassword(false);
    }
  };

  const updateSnapshotEncryption = (value: string) => {
    const action = resolveSnapshotEncryptionChangeAction({
      passwordProtectionEnabled: globalSettings.passwordProtectionEnabled,
      forceSnapshotEncryption: globalSettings.forceSnapshotEncryption,
      snapshotEncryptionEnabled: globalSettings.snapshotEncryptionEnabled,
      requestedValue: value
    });

    if (action === 'require-login-protection') {
      showToast('请先启用登录密码保护', 'info');
      return;
    }

    if (action === 'blocked-by-force-encryption') {
      showToast('由“强制启用快照加密”设置管理。', 'info');
      return;
    }

    if (action === 'enable-directly') {
      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        snapshotEncryptionEnabled: true
      }));
      return;
    }

    if (action === 'open-disable-confirm') {
      requestDisableSnapshotEncryption();
    }
  };

  const confirmDisableSnapshotEncryption = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !globalSettings.passwordProtectionEnabled ||
      globalSettings.forceSnapshotEncryption ||
      !globalSettings.snapshotEncryptionEnabled
    ) {
      closeSnapshotEncryptionDisableConfirm();
      return;
    }

    setIsDisablingSnapshotEncryption(true);
    setSnapshotEncryptionDisableError('');

    try {
      unlockCoreDocument(snapshotEncryptionDisableInput);

      if (!isPersistenceCurrent()) {
        setIsDisablingSnapshotEncryption(false);
        return;
      }

      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        snapshotEncryptionEnabled: false
      }));
      closeSnapshotEncryptionDisableConfirm();
    } catch (error) {
      console.error('[NetraFlow security] Failed to disable snapshot encryption.', error);
      setSnapshotEncryptionDisableError(
        SECURITY_ERROR_MESSAGES.snapshotEncryptionDisableFailed
      );
      setIsDisablingSnapshotEncryption(false);
    }
  };

  const updateForceSnapshotEncryption = (value: string) => {
    if (!globalSettings.passwordProtectionEnabled) {
      return;
    }

    const enabled = value === 'yes';

    updateGlobalSettings((currentSettings) => ({
      ...currentSettings,
      forceSnapshotEncryption: enabled,
      snapshotEncryptionEnabled: enabled ? true : false
    }));
  };

  const updateAutoLockMinutesInput = (value: string) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setAutoLockMinutesInput(value);

    if (!value) {
      return;
    }

    const nextMinutes = Number(value);

    if (!Number.isFinite(nextMinutes) || nextMinutes < 1) {
      return;
    }

    updateGlobalSettings((currentSettings) => ({
      ...currentSettings,
      autoLockMinutes: Math.floor(nextMinutes)
    }));
  };

  const resetInvalidAutoLockMinutesInput = () => {
    const nextMinutes = Number(autoLockMinutesInput);

    if (!autoLockMinutesInput || !Number.isFinite(nextMinutes) || nextMinutes < 1) {
      setAutoLockMinutesInput(String(globalSettings.autoLockMinutes));
    }
  };

  const unlockApp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!globalSettings.passwordProtectionEnabled) {
      setLockScreenState('unlocked');
      setUnlockPasswordInput('');
      setUnlockError('');
      return;
    }

    setIsUnlocking(true);
    setUnlockError('');
    setLockScreenState('authenticating');

    try {
      unlockCoreDocument(unlockPasswordInput);
      setUnlockPasswordInput('');
      setUnlockError('');
      setIsUnlocking(false);

      unlockExitAnimationFrameRef.current = window.requestAnimationFrame(() => {
        unlockExitAnimationFrameRef.current = window.requestAnimationFrame(() => {
          unlockExitAnimationFrameRef.current = null;
          setLockScreenState('unlock-exiting');
        });
      });
    } catch (error) {
      console.error('[NetraFlow security] Failed to unlock core.', error);
      setUnlockError(SECURITY_ERROR_MESSAGES.coreDecryptFailed);
      setIsUnlocking(false);
      setLockScreenState('locked');
    }
  };

  const completeUnlockTransition = () => {
    setLockScreenState((currentState) =>
      currentState === 'unlock-exiting' ? 'unlocked' : currentState
    );
  };

  const resetSecurityState = () => {
    setLockScreenState('unlocked');
    setUnlockPasswordInput('');
    setUnlockError('');
    setIsUnlocking(false);
    resetPasswordEditor();
    closePasswordDisableConfirm();
    closeSnapshotEncryptionDisableConfirm();
  };

  return {
    isLocked,
    lockScreenState,
    unlockPasswordInput,
    setUnlockPasswordInput,
    unlockError,
    setUnlockError,
    isUnlocking,
    passwordEditorMode,
    oldPasswordInput,
    setOldPasswordInput,
    newPasswordInput,
    setNewPasswordInput,
    confirmPasswordInput,
    setConfirmPasswordInput,
    passwordEditorError,
    setPasswordEditorError,
    isSavingPassword,
    autoLockMinutesInput,
    isPasswordDisableConfirmOpen,
    passwordDisableInput,
    setPasswordDisableInput,
    passwordDisableError,
    setPasswordDisableError,
    isDisablingPasswordProtection,
    isSnapshotEncryptionDisableConfirmOpen,
    snapshotEncryptionDisableInput,
    setSnapshotEncryptionDisableInput,
    snapshotEncryptionDisableError,
    setSnapshotEncryptionDisableError,
    isDisablingSnapshotEncryption,
    closePasswordDisableConfirm,
    resetPasswordEditor,
    requestOpenPasswordEditor,
    updatePasswordProtection,
    confirmDisablePasswordProtection,
    saveLoginPassword,
    closeSnapshotEncryptionDisableConfirm,
    updateSnapshotEncryption,
    updateForceSnapshotEncryption,
    confirmDisableSnapshotEncryption,
    updateAutoLockMinutesInput,
    resetInvalidAutoLockMinutesInput,
    unlockApp,
    completeUnlockTransition,
    resetSecurityState
  };
}
