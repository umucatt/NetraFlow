import type { ReactNode } from 'react';

export type RightPanelActionButtonProps = {
  label: ReactNode;
  description?: ReactNode;
  tone?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
};

function RightPanelActionButton({
  label,
  description,
  tone = 'default',
  disabled = false,
  className = '',
  onClick
}: RightPanelActionButtonProps) {
  return (
    <button
      type="button"
      className={`right-panel-action right-panel-action--${tone}${className ? ` ${className}` : ''}`}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      <strong>{label}</strong>
      {description ? <span>{description}</span> : null}
    </button>
  );
}

export default RightPanelActionButton;
