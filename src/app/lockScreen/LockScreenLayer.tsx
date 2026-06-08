import type { LockScreenLayerProps } from './lockScreenTypes';

export function LockScreenLayer({
  isLocked,
  productIconPath,
  password,
  error,
  isUnlocking,
  onPasswordChange,
  onSubmit
}: LockScreenLayerProps) {
  if (!isLocked) {
    return null;
  }

  return (
    <div className="lock-screen" role="dialog" aria-modal="true" aria-labelledby="lock-title">
      <form className="lock-screen__panel" onSubmit={onSubmit}>
        <div className="lock-screen__brand">
          <img src={productIconPath} alt="" aria-hidden="true" />
          <div>
            <p className="eyebrow">净流 / NetraFlow</p>
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
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>
        {error ? <p className="lock-screen__error">{error}</p> : null}
        <button type="submit" disabled={isUnlocking} className="lock-screen__button">
          {isUnlocking ? '解锁中' : '解锁'}
        </button>
      </form>
    </div>
  );
}
