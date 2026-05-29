import { useEffect } from 'react';
import type { FlashConfirmNavigationKey } from './flashNoteUtils';

type FlashKeyboardStep = 'input' | 'confirm';

export type FlashKeyboardAction =
  | { type: 'escape' }
  | { type: 'ctrl-z' }
  | { type: 'enter' }
  | { type: 'backspace' }
  | { type: 'delete' }
  | { type: 'move-selection'; key: FlashConfirmNavigationKey }
  | { type: 'input-character'; key: string };

type UseFlashKeyboardInputOptions = {
  enabled: boolean;
  step: FlashKeyboardStep;
  hasConfirmSelection?: boolean;
  onInputCharacter: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  onCtrlZ: () => void;
  onDelete: () => void;
  onMoveSelection?: (key: FlashConfirmNavigationKey) => void;
  onEscape: () => void;
};

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

const isFlashConfirmNavigationKey = (key: string): key is FlashConfirmNavigationKey =>
  key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown';

export const resolveFlashKeyboardAction = ({
  ctrlKey = false,
  hasConfirmSelection = false,
  key,
  metaKey = false,
  step
}: {
  ctrlKey?: boolean;
  hasConfirmSelection?: boolean;
  key: string;
  metaKey?: boolean;
  step: FlashKeyboardStep;
}): FlashKeyboardAction | null => {
  if (key === 'Escape') {
    return { type: 'escape' };
  }

  if ((ctrlKey || metaKey) && key.toLowerCase() === 'z') {
    return { type: 'ctrl-z' };
  }

  if (key === 'Enter') {
    return { type: 'enter' };
  }

  if (key === 'Backspace') {
    return { type: 'backspace' };
  }

  if (key === 'Delete') {
    return { type: 'delete' };
  }

  if (step === 'confirm' && hasConfirmSelection && isFlashConfirmNavigationKey(key)) {
    return { type: 'move-selection', key };
  }

  if (step === 'confirm' && !hasConfirmSelection) {
    return null;
  }

  return /^[\d.+-]$/.test(key) ? { type: 'input-character', key } : null;
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
  onMoveSelection,
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

      const action = resolveFlashKeyboardAction({
        ctrlKey: event.ctrlKey,
        hasConfirmSelection,
        key: event.key,
        metaKey: event.metaKey,
        step
      });

      if (!action) {
        return;
      }

      event.preventDefault();

      if (action.type === 'escape') {
        onEscape();
      } else if (action.type === 'ctrl-z') {
        onCtrlZ();
      } else if (action.type === 'enter') {
        onEnter();
      } else if (action.type === 'backspace') {
        onBackspace();
      } else if (action.type === 'delete') {
        onDelete();
      } else if (action.type === 'move-selection') {
        onMoveSelection?.(action.key);
      } else {
        onInputCharacter(action.key);
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
    onMoveSelection,
    step
  ]);
}
