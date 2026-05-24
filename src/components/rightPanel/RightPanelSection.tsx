import type { ReactNode } from 'react';

export type RightPanelSectionProps = {
  title: ReactNode | null;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  contentOverlay?: ReactNode;
  eyebrow?: ReactNode | null;
  titleAccessory?: ReactNode;
  ariaDisabled?: boolean;
};

function RightPanelSection({
  title,
  children,
  footer,
  className = '',
  contentClassName = '',
  contentOverlay = null,
  eyebrow = '操作区',
  titleAccessory = null,
  ariaDisabled = false
}: RightPanelSectionProps) {
  const sectionClassName = `right-panel-section${className ? ` ${className}` : ''}${
    contentClassName ? ` ${contentClassName}` : ''
  }`;
  const innerContent = (
    <>
      {eyebrow ? <p className="eyebrow right-panel-eyebrow">{eyebrow}</p> : null}
      {title || titleAccessory ? (
        <div className="right-panel-title-row">
          {title ? <h2 className="right-panel-title">{title}</h2> : <span />}
          {titleAccessory}
        </div>
      ) : null}
      <div className="right-panel-stack">{children}</div>
    </>
  );

  return (
    <section className={sectionClassName} aria-disabled={ariaDisabled ? 'true' : undefined}>
      {innerContent}
      {footer ? <footer className="right-panel-section__footer">{footer}</footer> : null}
      {contentOverlay}
    </section>
  );
}

export default RightPanelSection;
