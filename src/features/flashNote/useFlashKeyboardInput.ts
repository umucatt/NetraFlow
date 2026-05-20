import { useEffect } from 'react';

type FlashKeyboardStep = 'input' | 'confirm';

type UseFlashKeyboardInputOptions = {
  enabled: boolean;
  step: FlashKeyboardStep;
  hasConfirmSelection?: boolean;
  onInputCharacter: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  onCtrlZ: () => void;
  onDelete: () => void;
  onEscape: () => void;
};

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

export function useFlashKeyboardInput({
  enabled,
  step,
  hasConfirmSelection = false,
  onInputCharacter,
  onEnter,
  onBackspace,
  onCtrlZ,
  onDelete,
  onEscape
}: UseFlashKeyboardInputOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableElement(event.target)) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        onCtrlZ();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        onEnter();
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        onBackspace();
        return;
      }

      if (event.key === 'Delete') {
        event.preventDefault();
        onDelete();
        return;
      }

      if (step === 'confirm' && !hasConfirmSelection) {
        return;
      }

      if (/^[\d.+-]$/.test(event.key)) {
        event.preventDefault();
        onInputCharacter(event.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    enabled,
    hasConfirmSelection,
    onBackspace,
    onCtrlZ,
    onDelete,
    onEnter,
    onEscape,
    onInputCharacter,
    step
  ]);
}
