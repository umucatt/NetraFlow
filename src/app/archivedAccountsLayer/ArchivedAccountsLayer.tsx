import AccountMark from '../../components/AccountMark';
import { OverlayBackdrop } from '../overlay';

import type { ArchivedAccountsLayerProps } from './archivedAccountsLayerTypes';

export function ArchivedAccountsLayer({
  state,
  formatters,
  callbacks
}: ArchivedAccountsLayerProps) {
  if (!state.isOpen) {
    return null;
  }

  const { archivedAccounts } = state;

  return (
    <OverlayBackdrop
      onBack={callbacks.onBack}
      className="layout-layer layout-layer--left"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'var(--modal-backdrop)'
      }}
    >
      <section
        ref={state.panelRef}
        onClick={(event) => event.stopPropagation()}
        onScroll={(event) => callbacks.onPanelScroll(event.currentTarget.scrollTop)}
        style={{
          width: 'min(640px, 100%)',
          maxHeight: '80vh',
          overflowY: 'auto',
          borderRadius: 'var(--radius-page)',
          padding: 24,
          background: 'var(--surface-strong)',
          boxShadow: 'var(--shadow-popover)'
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'baseline',
            marginBottom: 16
          }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              已归档账户
            </p>
            <h2 style={{ margin: 0, fontSize: '1.45rem' }}>
              共 {archivedAccounts.length} 个账户
            </h2>
          </div>
        </header>

        {archivedAccounts.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>暂无已归档账户</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {archivedAccounts.map((account) => (
              <article
                key={account.id}
                id={`account-row-${account.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gap: 12,
                  alignItems: 'center',
                  borderRadius: 'var(--radius-card)',
                  padding: '12px 14px',
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.12)',
                  boxShadow: 'none'
                }}
              >
                <button
                  type="button"
                  onClick={() => callbacks.onSelect(account)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minWidth: 0,
                    border: 0,
                    padding: 0,
                    background: 'transparent',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    font: 'inherit',
                    textAlign: 'left'
                  }}
                >
                  <AccountMark account={account} className="account-mark--archived" />
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block' }}>{account.name}</strong>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 4,
                        color: 'var(--text-secondary)',
                        fontSize: '0.92rem'
                      }}
                    >
                      {account.groupName ? `${account.groupName} · ` : null}
                      {formatters.formatMoney(account.amount)}
                    </span>
                    {account.archivedAt ? (
                      <span
                        style={{
                          display: 'block',
                          marginTop: 4,
                          color: 'var(--text-muted)',
                          fontSize: '0.82rem'
                        }}
                      >
                        归档于 {formatters.formatArchivedTime(account.archivedAt)}
                      </span>
                    ) : null}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => callbacks.onRestore(account)}
                  style={{
                    display: 'none',
                    border: '1px solid rgba(37, 99, 235, 0.22)',
                    borderRadius: 'var(--radius-control)',
                    padding: '8px 10px',
                    background: 'var(--surface-strong)',
                    color: '#2563eb',
                    cursor: 'pointer',
                    font: 'inherit'
                  }}
                >
                  重新启用
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </OverlayBackdrop>
  );
}
