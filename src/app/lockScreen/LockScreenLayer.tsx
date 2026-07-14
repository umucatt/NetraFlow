import { useEffect, useRef } from 'react';
import NetraFlowLogo from '../branding/NetraFlowLogo';
import InlineErrorSlot from '../../components/InlineErrorSlot';
import { isLockScreenPanelExiting, isLockScreenVisible } from './lockScreenLogic';
import type { LockScreenLayerProps } from './lockScreenTypes';

export function LockScreenLayer({
  state,
  password,
  error,
  isUnlocking,
  onPasswordChange,
  onSubmit,
  onPanelExitComplete
}: LockScreenLayerProps) {
  const hasCompletedExitRef = useRef(false);
  const isExiting = isLockScreenPanelExiting(state);

  useEffect(() => {
    hasCompletedExitRef.current = false;
  }, [state]);

  useEffect(() => {
    if (!isExiting) {
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      if (hasCompletedExitRef.current) {
        return;
      }

      hasCompletedExitRef.current = true;
      onPanelExitComplete();
    }, 160);

    return () => window.clearTimeout(fallbackTimer);
  }, [isExiting, onPanelExitComplete]);

  if (!isLockScreenVisible(state)) {
    return null;
  }

  const completePanelExit = () => {
    if (!isExiting || hasCompletedExitRef.current) {
      return;
    }

    hasCompletedExitRef.current = true;
    onPanelExitComplete();
  };

  return (
    <div
      className="lock-screen"
      data-state={state}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-title"
    >
      <form
        className="lock-screen__panel"
        onAnimationEnd={(event) => {
          if (event.animationName === 'lock-screen-panel-exit') {
            completePanelExit();
          }
        }}
        onSubmit={onSubmit}
      >
        <div className="lock-screen__brand">
          <NetraFlowLogo className="lock-screen__brand-logo" />
          <div>
            <p className="eyebrow">NetraFlow</p>
            <h2 id="lock-title">已锁定</h2>
          </div>
        </div>
        <label className="lock-screen__field">
          登录密码
          <input
            autoFocus
            type="password"
            autoComplete="current-password"
            value={password}
            className={error ? 'input--error' : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby="lock-screen-error"
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>
        <InlineErrorSlot id="lock-screen-error" message={error} />
        <button type="submit" disabled={isUnlocking} className="lock-screen__button">
          {isUnlocking ? '解锁中' : '解锁'}
        </button>
      </form>
    </div>
  );
}
