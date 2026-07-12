import { useEffect, useRef, useState } from 'react';
import DialogShell from '../../components/dialogs/DialogShell';
import { OverlayBackdrop } from '../overlay';
import { ToastViewport, useToastController } from '../feedback';
import {
  SANDBOX_CONSENT_DELAY_MS,
  canConfirmSandboxCompatibility,
  getSandboxConsentSecondsRemaining
} from './sandboxCompatibilityLogic';

export function SandboxCompatibilityGate() {
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [isWriting, setIsWriting] = useState(false);
  const startedAtRef = useRef(performance.now());
  const { toastMessages, showToast } = useToastController();

  useEffect(() => {
    return window.sandboxBootstrap?.onThemeChanged((theme) => {
      document.documentElement.dataset.theme = theme;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const reportFirstFrame = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!cancelled) window.sandboxBootstrap?.firstFrameReady();
    };
    void reportFirstFrame();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let timer = 0;
    const update = () => {
      const currentTime = performance.now();
      const remainingSeconds = getSandboxConsentSecondsRemaining(startedAtRef.current, currentTime);
      setSecondsRemaining(remainingSeconds);
      if (remainingSeconds > 0) {
        const elapsed = currentTime - startedAtRef.current;
        const remaining = Math.max(0, SANDBOX_CONSENT_DELAY_MS - elapsed);
        timer = window.setTimeout(update, Math.min(250, remaining));
      }
    };
    timer = window.setTimeout(update, 100);
    return () => window.clearTimeout(timer);
  }, []);

  const quit = () => {
    if (isWriting) return;
    void window.sandboxBootstrap?.quit();
  };

  const consent = async () => {
    if (!canConfirmSandboxCompatibility(startedAtRef.current, performance.now(), isWriting)) {
      return;
    }

    setIsWriting(true);
    try {
      const result = await window.sandboxBootstrap?.consent();
      if (!result?.ok) {
        showToast(result?.message ?? '无法保存兼容模式授权，请重试或退出', 'error');
        setIsWriting(false);
      }
    } catch {
      showToast('无法保存兼容模式授权，请重试或退出', 'error');
      setIsWriting(false);
    }
  };

  return (
    <div className="sandbox-compatibility-gate">
      <OverlayBackdrop onBack={quit} className="modal-backdrop">
        <DialogShell
          embedded
          role="alertdialog"
          title="无法启用 Chromium 沙盒"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isWriting) {
              event.preventDefault();
              quit();
            }
          }}
          actions={(
            <>
              <button type="button" className="modal-button modal-button--secondary" disabled={isWriting} onClick={quit}>
                退出
              </button>
              <button
                type="button"
                className="modal-button modal-button--secondary modal-button--danger"
                disabled={secondsRemaining > 0 || isWriting}
                onClick={() => void consent()}
              >
                {secondsRemaining > 0
                  ? `继续使用兼容模式（${secondsRemaining}）`
                  : isWriting
                    ? '正在进入'
                    : '继续使用兼容模式'}
              </button>
            </>
          )}
        >
          <div className="modal-message">
            <p>当前系统阻止 AppImage 启用 Chromium 沙盒，推荐改用 NetraFlow DEB 安装版，安装时可能需要管理员授权，日常运行仍使用普通用户权限</p>
            <p>你也可以继续使用 AppImage 兼容模式，但该模式会关闭 Chromium 进程沙盒，降低进程隔离保护</p>
          </div>
        </DialogShell>
      </OverlayBackdrop>
      <ToastViewport messages={toastMessages} />
    </div>
  );
}
