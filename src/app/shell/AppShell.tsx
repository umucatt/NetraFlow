import type { AppShellProps } from './appShellTypes';

export function AppShell({
  children,
  className,
  mainContentPosition = 'left',
  style,
  shellProps,
  hiddenControls,
  focusRestoreRef,
  mainContent,
  mainContentRef,
  mainContentClassName,
  mainContentAriaDisabled,
  onMainContentClick,
  onMainContentScroll,
  rightPanel,
  rightPanelRef,
  rightPanelClassName = 'right-action-panel',
  rightPanelAriaLabel,
  onRightPanelClick,
  onRightPanelScroll
}: AppShellProps) {
  const shouldRenderRightPanel = rightPanel !== null && rightPanel !== undefined;
  const shellClassName = [
    className,
    mainContentPosition === 'right' ? 'app-shell--main-right' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <main
      ref={focusRestoreRef}
      className={`${shellClassName} app-shell--focus-restore-target`}
      tabIndex={-1}
      {...shellProps}
      style={style}
    >
      {hiddenControls}
      <section
        ref={mainContentRef}
        className={mainContentClassName}
        aria-disabled={mainContentAriaDisabled ? 'true' : undefined}
        onClick={onMainContentClick}
        onScroll={onMainContentScroll}
      >
        {mainContent}
      </section>
      {shouldRenderRightPanel ? (
        <aside
          ref={rightPanelRef}
          className={rightPanelClassName}
          aria-label={rightPanelAriaLabel}
          onClick={onRightPanelClick}
          onScroll={onRightPanelScroll}
        >
          {rightPanel}
        </aside>
      ) : null}
      {children}
    </main>
  );
}
