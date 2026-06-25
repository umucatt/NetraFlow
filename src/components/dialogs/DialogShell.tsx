import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEventHandler,
  type MouseEvent,
  type ReactNode,
  useId,
  useRef
} from 'react';

type DialogShellProps = {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  onClose?: () => void;
  eyebrow?: ReactNode;
  titleId?: string;
  headerClassName?: string;
  titleClassName?: string;
  titleStyle?: CSSProperties;
  actionsClassName?: string;
  cardStyle?: CSSProperties;
  backdropClassName?: string;
  backdropStyle?: CSSProperties;
  as?: 'section' | 'form';
  role?: 'dialog' | 'alertdialog';
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
};

function DialogShell({
  title,
  children,
  actions,
  className,
  onClose,
  eyebrow,
  titleId,
  headerClassName,
  titleClassName,
  titleStyle,
  actionsClassName = 'modal-actions',
  cardStyle,
  backdropClassName = 'modal-backdrop',
  backdropStyle,
  as = 'section',
  role = 'dialog',
  onKeyDown,
  onSubmit
}: DialogShellProps) {
  const generatedTitleId = useId();
  const resolvedTitleId = titleId ?? generatedTitleId;
  const mouseDownStartedOnBackdropRef = useRef<{ x: number; y: number } | null>(null);
  const resolvedClassName = className ?? 'modal-card';

  const handleMouseDownCapture = (event: MouseEvent<HTMLDivElement>) => {
    mouseDownStartedOnBackdropRef.current =
      event.button === 0 && event.target === event.currentTarget
        ? { x: event.clientX, y: event.clientY }
        : null;
  };

  const handleMouseUpCapture = (event: MouseEvent<HTMLDivElement>) => {
    const startedOnBackdrop = mouseDownStartedOnBackdropRef.current;
    const shouldClose =
      startedOnBackdrop !== null &&
      event.button === 0 &&
      event.target === event.currentTarget &&
      Math.abs(event.clientX - startedOnBackdrop.x) <= 6 &&
      Math.abs(event.clientY - startedOnBackdrop.y) <= 6;

    mouseDownStartedOnBackdropRef.current = null;

    if (shouldClose) {
      onClose?.();
    }
  };

  const titleElement = (
    <h2
      id={resolvedTitleId}
      className={titleClassName}
      style={titleStyle ?? { margin: '0 0 10px', fontSize: '1.26rem' }}
    >
      {title}
    </h2>
  );

  const content = (
    <>
      {eyebrow ? (
        <p className="eyebrow" style={{ marginBottom: 8 }}>
          {eyebrow}
        </p>
      ) : null}
      {headerClassName ? <header className={headerClassName}>{titleElement}</header> : titleElement}
      {children}
      {actions ? <div className={actionsClassName}>{actions}</div> : null}
    </>
  );

  return (
    <div
      className={backdropClassName}
      style={backdropStyle}
      onMouseDownCapture={handleMouseDownCapture}
      onMouseUpCapture={handleMouseUpCapture}
    >
      {as === 'form' ? (
        <form
          role={role}
          aria-modal="true"
          aria-labelledby={resolvedTitleId}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={onKeyDown as KeyboardEventHandler<HTMLFormElement> | undefined}
          onSubmit={onSubmit}
          className={resolvedClassName}
          style={cardStyle}
        >
          {content}
        </form>
      ) : (
        <section
          role={role}
          aria-modal="true"
          aria-labelledby={resolvedTitleId}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={onKeyDown as KeyboardEventHandler<HTMLElement> | undefined}
          className={resolvedClassName}
          style={cardStyle}
        >
          {content}
        </section>
      )}
    </div>
  );
}

export default DialogShell;
