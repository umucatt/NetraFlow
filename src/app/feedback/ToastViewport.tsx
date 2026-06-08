import type { ToastMessage } from './toastTypes';

type ToastViewportProps = {
  messages: ToastMessage[];
};

export function ToastViewport({ messages }: ToastViewportProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 22,
        bottom: 22,
        zIndex: 120,
        display: 'grid',
        gap: 10,
        width: 'min(320px, calc(100vw - 44px))',
        pointerEvents: 'none'
      }}
    >
      {messages.map((toast) => (
        <div
          key={toast.id}
          style={{
            border: `1px solid ${
              toast.tone === 'success'
                ? 'rgba(22, 163, 74, 0.18)'
                : toast.tone === 'error'
                  ? 'rgba(185, 28, 28, 0.18)'
                  : 'var(--border-soft)'
            }`,
            borderRadius: 'var(--radius-card)',
            padding: '11px 13px',
            background:
              toast.tone === 'success'
                ? 'rgba(240, 253, 244, 0.94)'
                : toast.tone === 'error'
                  ? 'rgba(254, 242, 242, 0.94)'
                  : 'var(--panel-bg-strong)',
            color:
              toast.tone === 'success'
                ? '#166534'
                : toast.tone === 'error'
                  ? '#991b1b'
                  : 'var(--text-main)',
            boxShadow: 'var(--shadow-popover)',
            backdropFilter: 'blur(10px)',
            fontSize: '0.92rem',
            fontWeight: 700
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
