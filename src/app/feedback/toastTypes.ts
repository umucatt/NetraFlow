export type ToastTone = 'info' | 'success' | 'error';

export type ToastMessage = {
  id: string;
  message: string;
  tone: ToastTone;
};
