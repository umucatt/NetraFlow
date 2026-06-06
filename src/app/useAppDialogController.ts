import {
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  parseNetraFlowJsonFile,
  type JsonIntegrityStatus
} from './jsonIntegrity';

export type AppConfirmationDialogRequest = {
  title: ReactNode;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  eyebrow?: ReactNode;
  tone?: 'default' | 'danger';
};

export type AppCallbackConfirmationDialogRequest = AppConfirmationDialogRequest & {
  onConfirm: () => void;
  onCancel?: () => void;
};

export type AppNoticeDialogRequest = {
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
};

export type AppInputDialogRequest = {
  title: ReactNode;
  message?: ReactNode;
  label: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  inputType?: 'text' | 'password';
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
};

export type AppConfirmationDialogState = AppConfirmationDialogRequest | null;
export type AppNoticeDialogState = AppNoticeDialogRequest | null;
export type AppInputDialogState =
  Omit<AppInputDialogRequest, 'defaultValue'> | null;

export type AppDialogControllerSnapshot = {
  confirmationDialog: AppConfirmationDialogState;
  noticeDialog: AppNoticeDialogState;
  inputDialog: AppInputDialogState;
  inputDialogValue: string;
};

export type AppDialogControllerModel = {
  getSnapshot: () => AppDialogControllerSnapshot;
  requestConfirmationDialog: (
    options: AppConfirmationDialogRequest
  ) => Promise<boolean>;
  requestJsonIntegrityWarningConfirmation: () => Promise<boolean>;
  showConfirmationDialog: (
    options: AppCallbackConfirmationDialogRequest
  ) => void;
  closeConfirmationDialog: () => void;
  confirmAndClose: () => void;
  showNoticeDialog: (options: AppNoticeDialogRequest) => Promise<void>;
  closeNoticeDialog: () => void;
  requestInputDialog: (options: AppInputDialogRequest) => Promise<string | null>;
  closeInputDialog: () => void;
  confirmInputDialog: () => void;
  setInputDialogValue: (value: string) => void;
  getImportContentAfterIntegrityCheck: (text: string) => Promise<unknown | null>;
  dispose: () => void;
};

type ConfirmationSession = {
  resolve?: (value: boolean) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type InputSession = {
  resolve: (value: string | null) => void;
};

type NoticeSession = {
  resolve: () => void;
};

const createInitialSnapshot = (): AppDialogControllerSnapshot => ({
  confirmationDialog: null,
  noticeDialog: null,
  inputDialog: null,
  inputDialogValue: ''
});

const getConfirmationDialogState = (
  options: AppConfirmationDialogRequest
): AppConfirmationDialogRequest => ({
  title: options.title,
  message: options.message,
  confirmLabel: options.confirmLabel,
  cancelLabel: options.cancelLabel,
  eyebrow: options.eyebrow,
  tone: options.tone
});

const getInputDialogState = (
  options: AppInputDialogRequest
): AppInputDialogState => ({
  title: options.title,
  message: options.message,
  label: options.label,
  confirmLabel: options.confirmLabel,
  cancelLabel: options.cancelLabel,
  inputType: options.inputType,
  autoComplete: options.autoComplete,
  placeholder: options.placeholder
});

export const createAppDialogControllerModel = (
  onSnapshotChange?: (snapshot: AppDialogControllerSnapshot) => void
): AppDialogControllerModel => {
  let snapshot = createInitialSnapshot();
  let confirmationSession: ConfirmationSession | null = null;
  let inputSession: InputSession | null = null;
  let noticeSession: NoticeSession | null = null;

  const emit = () => {
    onSnapshotChange?.(snapshot);
  };

  const updateSnapshot = (nextSnapshot: AppDialogControllerSnapshot) => {
    snapshot = nextSnapshot;
    emit();
  };

  const patchSnapshot = (patch: Partial<AppDialogControllerSnapshot>) => {
    updateSnapshot({
      ...snapshot,
      ...patch
    });
  };

  const resolvePendingConfirmationAsCancel = () => {
    const session = confirmationSession;

    confirmationSession = null;

    if (!session) {
      return;
    }

    session.resolve?.(false);
    session.onCancel?.();
  };

  const resolvePendingInputAsCancel = () => {
    const session = inputSession;

    inputSession = null;
    session?.resolve(null);
  };

  const resolvePendingNotice = () => {
    const session = noticeSession;

    noticeSession = null;
    session?.resolve();
  };

  const requestConfirmationDialog = (options: AppConfirmationDialogRequest) =>
    new Promise<boolean>((resolve) => {
      resolvePendingConfirmationAsCancel();
      confirmationSession = { resolve };
      patchSnapshot({
        confirmationDialog: getConfirmationDialogState(options)
      });
    });

  const requestJsonIntegrityWarningConfirmation = () =>
    requestConfirmationDialog({
      title: '文件完整性无法确认',
      message:
        '该文件可能被修改、损坏，或不是由当前版本 NetraFlow 完整导出的文件，继续导入可能带来数据异常',
      confirmLabel: '继续导入',
      cancelLabel: '取消导入'
    });

  const showConfirmationDialog = (
    options: AppCallbackConfirmationDialogRequest
  ) => {
    resolvePendingConfirmationAsCancel();
    confirmationSession = {
      onConfirm: options.onConfirm,
      onCancel: options.onCancel
    };
    patchSnapshot({
      confirmationDialog: getConfirmationDialogState(options)
    });
  };

  const closeConfirmationDialog = () => {
    const session = confirmationSession;

    confirmationSession = null;
    patchSnapshot({ confirmationDialog: null });
    session?.resolve?.(false);
    session?.onCancel?.();
  };

  const confirmAndClose = () => {
    const session = confirmationSession;

    confirmationSession = null;
    patchSnapshot({ confirmationDialog: null });
    session?.resolve?.(true);
    session?.onConfirm?.();
  };

  const showNoticeDialog = (options: AppNoticeDialogRequest) =>
    new Promise<void>((resolve) => {
      resolvePendingNotice();
      noticeSession = { resolve };
      patchSnapshot({ noticeDialog: options });
    });

  const closeNoticeDialog = () => {
    const session = noticeSession;

    noticeSession = null;
    patchSnapshot({ noticeDialog: null });
    session?.resolve();
  };

  const requestInputDialog = (options: AppInputDialogRequest) =>
    new Promise<string | null>((resolve) => {
      resolvePendingInputAsCancel();
      inputSession = { resolve };
      patchSnapshot({
        inputDialog: getInputDialogState(options),
        inputDialogValue: options.defaultValue ?? ''
      });
    });

  const closeInputDialog = () => {
    const session = inputSession;

    inputSession = null;
    patchSnapshot({
      inputDialog: null,
      inputDialogValue: ''
    });
    session?.resolve(null);
  };

  const confirmInputDialog = () => {
    const session = inputSession;
    const value = snapshot.inputDialogValue;

    inputSession = null;
    patchSnapshot({
      inputDialog: null,
      inputDialogValue: ''
    });
    session?.resolve(value);
  };

  const setInputDialogValue = (value: string) => {
    patchSnapshot({ inputDialogValue: value });
  };

  const getImportContentAfterIntegrityCheck = async (
    text: string
  ): Promise<unknown | null> => {
    const result: JsonIntegrityStatus = await parseNetraFlowJsonFile(text);

    if (result.status === 'invalid') {
      throw new Error(result.message);
    }

    if (result.status === 'warning') {
      const shouldContinue = await requestJsonIntegrityWarningConfirmation();

      if (!shouldContinue) {
        return null;
      }
    }

    return result.content;
  };

  const dispose = () => {
    resolvePendingConfirmationAsCancel();
    resolvePendingInputAsCancel();
    resolvePendingNotice();
    snapshot = createInitialSnapshot();
  };

  return {
    getSnapshot: () => snapshot,
    requestConfirmationDialog,
    requestJsonIntegrityWarningConfirmation,
    showConfirmationDialog,
    closeConfirmationDialog,
    confirmAndClose,
    showNoticeDialog,
    closeNoticeDialog,
    requestInputDialog,
    closeInputDialog,
    confirmInputDialog,
    setInputDialogValue,
    getImportContentAfterIntegrityCheck,
    dispose
  };
};

export function useAppDialogController() {
  const [snapshot, setSnapshot] = useState<AppDialogControllerSnapshot>(
    createInitialSnapshot
  );
  const modelRef = useRef<AppDialogControllerModel | null>(null);

  if (modelRef.current === null) {
    modelRef.current = createAppDialogControllerModel(setSnapshot);
  }

  useEffect(
    () => () => {
      modelRef.current?.dispose();
    },
    []
  );

  const model = modelRef.current;

  return {
    ...snapshot,
    requestConfirmationDialog: model.requestConfirmationDialog,
    requestJsonIntegrityWarningConfirmation:
      model.requestJsonIntegrityWarningConfirmation,
    showConfirmationDialog: model.showConfirmationDialog,
    closeConfirmationDialog: model.closeConfirmationDialog,
    confirmAndClose: model.confirmAndClose,
    showNoticeDialog: model.showNoticeDialog,
    closeNoticeDialog: model.closeNoticeDialog,
    requestInputDialog: model.requestInputDialog,
    closeInputDialog: model.closeInputDialog,
    confirmInputDialog: model.confirmInputDialog,
    setInputDialogValue: model.setInputDialogValue,
    getImportContentAfterIntegrityCheck:
      model.getImportContentAfterIntegrityCheck
  };
}
