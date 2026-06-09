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
      className="toast-viewport"
    >
      {messages.map((toast) => (
        <div
          key={toast.id}
          className="toast-viewport__item"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
