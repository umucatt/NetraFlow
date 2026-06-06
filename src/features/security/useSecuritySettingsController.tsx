import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react';

import { createPasswordHash, verifyPassword } from '../../security/passwordHash';
import type {
  GlobalSettings,
  PasswordEditorMode,
  SnapshotPasswordEditorMode,
  SnapshotPasswordField
} from './securitySettingsTypes';

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
  autoBackupEnabled: boolean;
  updateGlobalSettings: (
    createNextSettings: (currentSettings: GlobalSettings) => GlobalSettings
  ) => void;
  showConfirmationDialog: (request: ConfirmationRequest) => void;
  showToast: (message: string, tone?: 'info' | 'success' | 'error') => string;
};

export function useSecuritySettingsController({
  globalSettings,
  autoBackupEnabled,
  updateGlobalSettings,
  showConfirmationDialog,
  showToast
}: SecuritySettingsControllerOptions) {
  const autoLockTimerRef = useRef<number | null>(null);
  const snapshotPasswordRevealTimerRef = useRef<number | null>(null);

  const [isLocked, setIsLocked] = useState(
    () => globalSettings.passwordProtectionEnabled
  );
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
  const [snapshotPasswordEditorMode, setSnapshotPasswordEditorMode] =
    useState<SnapshotPasswordEditorMode>(null);
  const [
    shouldEnableSnapshotEncryptionAfterPasswordSave,
    setShouldEnableSnapshotEncryptionAfterPasswordSave
  ] = useState(false);
  const [oldSnapshotPasswordInput, setOldSnapshotPasswordInput] = useState('');
  const [newSnapshotPasswordInput, setNewSnapshotPasswordInput] = useState('');
  const [confirmSnapshotPasswordInput, setConfirmSnapshotPasswordInput] =
    useState('');
  const [snapshotPasswordEditorError, setSnapshotPasswordEditorError] =
    useState('');
  const [isSavingSnapshotPassword, setIsSavingSnapshotPassword] =
    useState(false);
  const [visibleSnapshotPasswordField, setVisibleSnapshotPasswordField] =
    useState<SnapshotPasswordField | null>(null);
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
    if (!globalSettings.passwordProtectionEnabled) {
      setIsLocked(false);
      setUnlockPasswordInput('');
      setUnlockError('');
    }
  }, [globalSettings.passwordProtectionEnabled]);

  useEffect(() => {
    const api = window.electronAPI ?? window.electronWindow;

    if (!api?.onNetraFlowLock) {
      return;
    }

    return api.onNetraFlowLock(() => {
      if (!globalSettings.passwordProtectionEnabled || !globalSettings.passwordHash) {
        showToast('请先开启登陆密码保护', 'info');
        return;
      }

      setUnlockPasswordInput('');
      setUnlockError('');
      setIsLocked(true);
    });
  }, [globalSettings.passwordHash, globalSettings.passwordProtectionEnabled, showToast]);

  useEffect(() => {
    if (
      !globalSettings.passwordProtectionEnabled ||
      !globalSettings.passwordHash ||
      isLocked
    ) {
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
        setUnlockPasswordInput('');
        setUnlockError('');
        setIsLocked(true);
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
    globalSettings.passwordHash,
    globalSettings.passwordProtectionEnabled,
    isLocked
  ]);

  useEffect(
    () => () => {
      if (autoLockTimerRef.current !== null) {
        window.clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }

      if (snapshotPasswordRevealTimerRef.current !== null) {
        window.clearTimeout(snapshotPasswordRevealTimerRef.current);
        snapshotPasswordRevealTimerRef.current = null;
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
          <p>忘记登录密码将无法进入净流</p>
          <p>请妥善保存</p>
        </>
      ),
      confirmLabel: '继续设置',
      onConfirm: () => openPasswordEditor('setup')
    });
  };

  const requestOpenPasswordEditor = () => {
    if (globalSettings.passwordHash) {
      openPasswordEditor('edit');
      return;
    }

    requestFirstPasswordSetup();
  };

  const closePasswordDisableConfirm = () => {
    setIsPasswordDisableConfirmOpen(false);
    setPasswordDisableInput('');
    setPasswordDisableError('');
    setIsDisablingPasswordProtection(false);
  };

  const requestDisablePasswordProtection = () => {
    if (!globalSettings.passwordHash) {
      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        passwordProtectionEnabled: false
      }));
      return;
    }

    setIsPasswordDisableConfirmOpen(true);
    setPasswordDisableInput('');
    setPasswordDisableError('');
    setIsDisablingPasswordProtection(false);
  };

  const updatePasswordProtection = (value: string) => {
    if (value === 'yes') {
      if (globalSettings.passwordProtectionEnabled) {
        return;
      }

      if (!globalSettings.passwordHash) {
        requestFirstPasswordSetup();
        return;
      }

      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        passwordProtectionEnabled: true
      }));
      return;
    }

    if (value === 'no' && globalSettings.passwordProtectionEnabled) {
      requestDisablePasswordProtection();
    }
  };

  const confirmDisablePasswordProtection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!globalSettings.passwordHash) {
      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        passwordProtectionEnabled: false
      }));
      closePasswordDisableConfirm();
      return;
    }

    setIsDisablingPasswordProtection(true);
    setPasswordDisableError('');

    const isPasswordValid = await verifyPassword(
      passwordDisableInput,
      globalSettings.passwordHash
    );

    if (!isPasswordValid) {
      setPasswordDisableError('密码错误');
      setIsDisablingPasswordProtection(false);
      return;
    }

    updateGlobalSettings((currentSettings) => ({
      ...currentSettings,
      passwordProtectionEnabled: false
    }));
    setIsLocked(false);
    closePasswordDisableConfirm();
  };

  const saveLoginPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPasswordInput.trim() === '') {
      setPasswordEditorError('请输入新密码');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordEditorError('两次输入的新密码不一致');
      return;
    }

    const savedPasswordHash = globalSettings.passwordHash;

    setIsSavingPassword(true);
    setPasswordEditorError('');

    if (passwordEditorMode === 'edit') {
      if (!savedPasswordHash) {
        setPasswordEditorError('旧密码不正确');
        setIsSavingPassword(false);
        return;
      }

      const isOldPasswordValid = await verifyPassword(oldPasswordInput, savedPasswordHash);

      if (!isOldPasswordValid) {
        setPasswordEditorError('旧密码不正确');
        setIsSavingPassword(false);
        return;
      }
    }

    try {
      const nextPasswordHash = await createPasswordHash(newPasswordInput);

      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        passwordHash: nextPasswordHash,
        passwordProtectionEnabled:
          passwordEditorMode === 'setup' ? true : currentSettings.passwordProtectionEnabled
      }));
      resetPasswordEditor();
    } catch (error) {
      console.error('[NetraFlow security] Failed to save login password.', error);
      setPasswordEditorError('密码保存失败');
      setIsSavingPassword(false);
    }
  };

  const getSnapshotEncryptionEnableMessage = () =>
    autoBackupEnabled ? (
      <>
        <p>手动导出的快照文件和当前已开启的自动快照文件都将使用快照密码加密</p>
        <p>忘记快照密码将无法恢复这些加密快照</p>
        <strong>是否继续？</strong>
      </>
    ) : (
      <>
        <p>手动导出的快照文件将使用快照密码加密</p>
        <p>忘记快照密码将无法恢复这些加密快照</p>
        <strong>是否继续？</strong>
      </>
    );

  const resetSnapshotPasswordEditor = () => {
    setSnapshotPasswordEditorMode(null);
    setShouldEnableSnapshotEncryptionAfterPasswordSave(false);
    setOldSnapshotPasswordInput('');
    setNewSnapshotPasswordInput('');
    setConfirmSnapshotPasswordInput('');
    setSnapshotPasswordEditorError('');
    setIsSavingSnapshotPassword(false);
    setVisibleSnapshotPasswordField(null);

    if (snapshotPasswordRevealTimerRef.current !== null) {
      window.clearTimeout(snapshotPasswordRevealTimerRef.current);
      snapshotPasswordRevealTimerRef.current = null;
    }
  };

  const openSnapshotPasswordEditor = (
    mode: Exclude<SnapshotPasswordEditorMode, null>,
    enableAfterSave = false
  ) => {
    setSnapshotPasswordEditorMode(mode);
    setShouldEnableSnapshotEncryptionAfterPasswordSave(enableAfterSave);
    setOldSnapshotPasswordInput('');
    setNewSnapshotPasswordInput('');
    setConfirmSnapshotPasswordInput('');
    setSnapshotPasswordEditorError('');
    setIsSavingSnapshotPassword(false);
    setVisibleSnapshotPasswordField(null);

    if (snapshotPasswordRevealTimerRef.current !== null) {
      window.clearTimeout(snapshotPasswordRevealTimerRef.current);
      snapshotPasswordRevealTimerRef.current = null;
    }
  };

  const requestFirstSnapshotPasswordSetup = (enableAfterSave = false) => {
    showConfirmationDialog({
      title: '设置快照密码',
      message: (
        <>
          <p>忘记快照密码将无法恢复已加密的快照</p>
          <p>请妥善保存</p>
        </>
      ),
      confirmLabel: '继续设置',
      onConfirm: () => openSnapshotPasswordEditor('setup', enableAfterSave)
    });
  };

  const requestOpenSnapshotPasswordEditor = () => {
    if (!globalSettings.snapshotPasswordHash) {
      requestFirstSnapshotPasswordSetup();
      return;
    }

    showConfirmationDialog({
      title: '修改快照密码',
      message: (
        <>
          <p>之后生成的加密快照将使用新密码</p>
          <p>此前已经使用旧快照密码加密的文件，仍需要使用原密码解密</p>
        </>
      ),
      confirmLabel: '继续修改',
      onConfirm: () => openSnapshotPasswordEditor('edit')
    });
  };

  const closeSnapshotEncryptionDisableConfirm = () => {
    setIsSnapshotEncryptionDisableConfirmOpen(false);
    setSnapshotEncryptionDisableInput('');
    setSnapshotEncryptionDisableError('');
    setIsDisablingSnapshotEncryption(false);
  };

  const requestDisableSnapshotEncryption = () => {
    if (!globalSettings.snapshotPasswordHash) {
      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        snapshotEncryptionEnabled: false
      }));
      return;
    }

    setIsSnapshotEncryptionDisableConfirmOpen(true);
    setSnapshotEncryptionDisableInput('');
    setSnapshotEncryptionDisableError('');
    setIsDisablingSnapshotEncryption(false);
  };

  const updateSnapshotEncryption = (value: string) => {
    if (value === 'yes') {
      if (globalSettings.snapshotEncryptionEnabled) {
        return;
      }

      if (!globalSettings.snapshotPasswordHash) {
        showConfirmationDialog({
          title: '启用快照加密',
          message: getSnapshotEncryptionEnableMessage(),
          confirmLabel: '继续',
          onConfirm: () => requestFirstSnapshotPasswordSetup(true)
        });
        return;
      }

      showConfirmationDialog({
        title: '启用快照加密',
        message: getSnapshotEncryptionEnableMessage(),
        confirmLabel: '确认启用',
        onConfirm: () =>
          updateGlobalSettings((currentSettings) => ({
            ...currentSettings,
            snapshotEncryptionEnabled: true
          }))
      });
      return;
    }

    if (value === 'no' && globalSettings.snapshotEncryptionEnabled) {
      requestDisableSnapshotEncryption();
    }
  };

  const confirmDisableSnapshotEncryption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!globalSettings.snapshotPasswordHash) {
      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        snapshotEncryptionEnabled: false
      }));
      closeSnapshotEncryptionDisableConfirm();
      return;
    }

    setIsDisablingSnapshotEncryption(true);
    setSnapshotEncryptionDisableError('');

    const isPasswordValid = await verifyPassword(
      snapshotEncryptionDisableInput,
      globalSettings.snapshotPasswordHash
    );

    if (!isPasswordValid) {
      setSnapshotEncryptionDisableError('快照密码不正确');
      setIsDisablingSnapshotEncryption(false);
      return;
    }

    updateGlobalSettings((currentSettings) => ({
      ...currentSettings,
      snapshotEncryptionEnabled: false
    }));
    closeSnapshotEncryptionDisableConfirm();
  };

  const toggleSnapshotPasswordVisibility = (field: SnapshotPasswordField) => {
    if (snapshotPasswordRevealTimerRef.current !== null) {
      window.clearTimeout(snapshotPasswordRevealTimerRef.current);
      snapshotPasswordRevealTimerRef.current = null;
    }

    if (visibleSnapshotPasswordField === field) {
      setVisibleSnapshotPasswordField(null);
      return;
    }

    setVisibleSnapshotPasswordField(field);
    snapshotPasswordRevealTimerRef.current = window.setTimeout(() => {
      setVisibleSnapshotPasswordField(null);
      snapshotPasswordRevealTimerRef.current = null;
    }, 2400);
  };

  const saveSnapshotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newSnapshotPasswordInput.trim() === '') {
      setSnapshotPasswordEditorError('请输入新快照密码');
      return;
    }

    if (newSnapshotPasswordInput !== confirmSnapshotPasswordInput) {
      setSnapshotPasswordEditorError('两次输入的新快照密码不一致');
      return;
    }

    const savedSnapshotPasswordHash = globalSettings.snapshotPasswordHash;

    setIsSavingSnapshotPassword(true);
    setSnapshotPasswordEditorError('');

    if (snapshotPasswordEditorMode === 'edit') {
      if (!savedSnapshotPasswordHash) {
        setSnapshotPasswordEditorError('旧快照密码不正确');
        setIsSavingSnapshotPassword(false);
        return;
      }

      const isOldSnapshotPasswordValid = await verifyPassword(
        oldSnapshotPasswordInput,
        savedSnapshotPasswordHash
      );

      if (!isOldSnapshotPasswordValid) {
        setSnapshotPasswordEditorError('旧快照密码不正确');
        setIsSavingSnapshotPassword(false);
        return;
      }
    }

    try {
      const nextSnapshotPasswordHash = await createPasswordHash(newSnapshotPasswordInput);

      updateGlobalSettings((currentSettings) => ({
        ...currentSettings,
        snapshotPasswordHash: nextSnapshotPasswordHash,
        snapshotEncryptionEnabled:
          shouldEnableSnapshotEncryptionAfterPasswordSave ||
          currentSettings.snapshotEncryptionEnabled
      }));
      resetSnapshotPasswordEditor();
    } catch (error) {
      console.error('[NetraFlow security] Failed to save snapshot password.', error);
      setSnapshotPasswordEditorError('快照密码保存失败');
      setIsSavingSnapshotPassword(false);
    }
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

    if (!globalSettings.passwordProtectionEnabled || !globalSettings.passwordHash) {
      setIsLocked(false);
      setUnlockPasswordInput('');
      setUnlockError('');
      return;
    }

    setIsUnlocking(true);
    setUnlockError('');

    const isPasswordValid = await verifyPassword(
      unlockPasswordInput,
      globalSettings.passwordHash
    );

    if (!isPasswordValid) {
      setUnlockError('密码错误');
      setIsUnlocking(false);
      return;
    }

    setIsLocked(false);
    setUnlockPasswordInput('');
    setUnlockError('');
    setIsUnlocking(false);
  };

  const resetSecurityState = () => {
    setIsLocked(false);
    setUnlockPasswordInput('');
    setUnlockError('');
    setIsUnlocking(false);
    resetPasswordEditor();
    resetSnapshotPasswordEditor();
    closePasswordDisableConfirm();
    closeSnapshotEncryptionDisableConfirm();
  };

  return {
    isLocked,
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
    snapshotPasswordEditorMode,
    oldSnapshotPasswordInput,
    setOldSnapshotPasswordInput,
    newSnapshotPasswordInput,
    setNewSnapshotPasswordInput,
    confirmSnapshotPasswordInput,
    setConfirmSnapshotPasswordInput,
    snapshotPasswordEditorError,
    setSnapshotPasswordEditorError,
    isSavingSnapshotPassword,
    visibleSnapshotPasswordField,
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
    resetSnapshotPasswordEditor,
    requestOpenSnapshotPasswordEditor,
    updateSnapshotEncryption,
    confirmDisableSnapshotEncryption,
    toggleSnapshotPasswordVisibility,
    saveSnapshotPassword,
    updateAutoLockMinutesInput,
    resetInvalidAutoLockMinutesInput,
    unlockApp,
    resetSecurityState
  };
}
