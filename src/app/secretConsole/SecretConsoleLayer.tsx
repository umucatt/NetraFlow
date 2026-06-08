import { forwardRef } from 'react';

import type { SecretConsoleLayerProps } from './secretConsoleLayerTypes';

export const SecretConsoleLayer = forwardRef<HTMLInputElement, SecretConsoleLayerProps>(
  function SecretConsoleLayer(
    {
      value,
      placeholder,
      isHighlighted,
      onClose,
      onClearResultPlaceholder,
      onChange,
      onKeyDown
    },
    ref
  ) {
    return (
      <div
        className="secret-console-layer"
        onMouseDown={onClose}
        onTouchStart={onClose}
      >
        <input
          ref={ref}
          className={`secret-console-input${isHighlighted ? ' is-highlighted' : ''}`}
          value={value}
          placeholder={placeholder}
          aria-label="隐藏控制台"
          spellCheck={false}
          autoComplete="off"
          onMouseDown={(event) => {
            event.stopPropagation();
            onClearResultPlaceholder();
          }}
          onTouchStart={(event) => {
            event.stopPropagation();
            onClearResultPlaceholder();
          }}
          onChange={(event) => {
            onClearResultPlaceholder();
            onChange(event.target.value);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
    );
  }
);
