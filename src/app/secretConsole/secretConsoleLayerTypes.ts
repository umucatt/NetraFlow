import type { KeyboardEventHandler } from 'react';

export type SecretConsoleLayerProps = {
  value: string;
  placeholder: string;
  isHighlighted: boolean;
  onClose: () => void;
  onClearResultPlaceholder: () => void;
  onChange: (value: string) => void;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
};
