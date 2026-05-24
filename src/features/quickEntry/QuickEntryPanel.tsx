import type { MouseEvent, ReactNode } from 'react';

type QuickEntryPanelProps = {
  title?: ReactNode;
  titleId?: string;
  selectedAccountLabel?: ReactNode;
  selectedAccountGroupName?: ReactNode;
  isAccountPickerOpen?: boolean;
  accountPickerContent?: ReactNode;
  formContent?: ReactNode;
  actionsContent?: ReactNode;
  emptyContent?: ReactNode;
  onOpenAccountPicker?: () => void;
};

function QuickEntryPanel({
  title = '选择账户',
  titleId = 'quick-single-entry-title',
  selectedAccountLabel,
  selectedAccountGroupName,
  isAccountPickerOpen = true,
  accountPickerContent,
  formContent,
  actionsContent,
  emptyContent,
  onOpenAccountPicker
}: QuickEntryPanelProps) {
  const stopPanelClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return (
    <section
      className="quick-single-entry-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={stopPanelClick}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
      </header>
      {selectedAccountLabel ? (
        <button
          type="button"
          className="quick-single-entry-selected-account"
          onClick={onOpenAccountPicker}
          disabled={!onOpenAccountPicker}
        >
          {selectedAccountGroupName ? <span>{selectedAccountGroupName}</span> : null}
          <strong>{selectedAccountLabel}</strong>
        </button>
      ) : null}
      {isAccountPickerOpen ? accountPickerContent : null}
      {emptyContent}
      {formContent}
      {actionsContent}
    </section>
  );
}

export default QuickEntryPanel;
