import type { CSSProperties, ReactNode } from 'react';

export type SettingsOption = {
  value: string;
  label: string;
};

export type SettingsSectionFrameProps = {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  disabledOverlay?: ReactNode;
  className?: string;
  ariaDisabled?: boolean;
};

const getSegmentedControlStyle = (optionCount: number): CSSProperties =>
  ({ '--segmented-option-count': optionCount } as CSSProperties);

function SettingsSectionFrame({
  id,
  title,
  description,
  children,
  disabledOverlay,
  className = '',
  ariaDisabled = false
}: SettingsSectionFrameProps) {
  return (
    <section
      id={id}
      className={`global-settings-field${className ? ` ${className}` : ''}`}
      aria-disabled={ariaDisabled ? 'true' : undefined}
    >
      <div className="global-settings-field__header">
        <h3>{title}</h3>
        {description ? <span>{description}</span> : null}
      </div>
      {children}
      {disabledOverlay}
    </section>
  );
}

export type SettingsSegmentedControlProps = {
  id?: string;
  label: string;
  options: SettingsOption[];
  currentValue: string;
  note?: ReactNode;
  onChange?: (value: string) => void;
  statusLabel?: ReactNode | null;
  className?: string;
};

export function SettingsSegmentedControl({
  id,
  label,
  options,
  currentValue,
  note,
  onChange,
  statusLabel,
  className = ''
}: SettingsSegmentedControlProps) {
  const isEnabled = Boolean(onChange);
  const resolvedStatusLabel =
    statusLabel === undefined ? (isEnabled ? null : '稍后开放') : statusLabel;

  return (
    <SettingsSectionFrame
      id={id}
      title={label}
      description={resolvedStatusLabel}
      className={className}
    >
      <div
        className="segmented-control global-settings-segmented"
        style={getSegmentedControlStyle(options.length)}
        aria-label={label}
        aria-disabled={isEnabled ? undefined : 'true'}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={!isEnabled}
            className={currentValue === option.value ? 'is-selected' : undefined}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {note ? <p className="global-settings-note">{note}</p> : null}
    </SettingsSectionFrame>
  );
}

export type SettingsControlRowProps = {
  label: string;
  options: SettingsOption[];
  currentValue: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function SettingsControlRow({
  label,
  options,
  currentValue,
  onChange,
  disabled = false
}: SettingsControlRowProps) {
  return (
    <div className="global-settings-control-row">
      <span className="global-settings-control-label">{label}</span>
      <div
        className="segmented-control global-settings-segmented"
        style={getSegmentedControlStyle(options.length)}
        aria-label={label}
        aria-disabled={disabled ? 'true' : undefined}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            className={currentValue === option.value ? 'is-selected' : undefined}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export type SettingsActionRowProps = {
  label: string;
  children: ReactNode;
};

export function SettingsActionRow({ label, children }: SettingsActionRowProps) {
  return (
    <div className="global-settings-control-row">
      <span className="global-settings-control-label">{label}</span>
      <div className="global-settings-action-cell">{children}</div>
    </div>
  );
}

export type SettingsFieldGroupProps = {
  title: string;
  children: ReactNode;
  note?: ReactNode;
};

export function SettingsFieldGroup({ title, children, note }: SettingsFieldGroupProps) {
  return (
    <SettingsSectionFrame title={title} className="global-settings-field--chart-group">
      <div className="global-settings-control-stack">{children}</div>
      {note ? <p className="global-settings-note">{note}</p> : null}
    </SettingsSectionFrame>
  );
}

export default SettingsSectionFrame;
