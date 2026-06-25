import type { ReactNode } from 'react';

type FatalErrorPageProps = {
  title: ReactNode;
  description: ReactNode;
  suggestion?: ReactNode;
  technicalInfo?: ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
};

function FatalErrorPage({
  title,
  description,
  suggestion,
  technicalInfo,
  primaryAction,
  secondaryAction
}: FatalErrorPageProps) {
  return (
    <main className="fatal-error-page">
      <section
        role="alert"
        aria-labelledby="fatal-error-title"
        className="fatal-error-page__panel"
      >
        <h1 id="fatal-error-title" className="fatal-error-page__title">
          {title}
        </h1>
        <p className="fatal-error-page__description">{description}</p>
        {suggestion ? <p className="fatal-error-page__suggestion">{suggestion}</p> : null}
        {technicalInfo ? (
          <p className="fatal-error-page__technical">{technicalInfo}</p>
        ) : null}
        {(primaryAction || secondaryAction) ? (
          <div className="fatal-error-page__actions">
            {primaryAction ? (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="modal-button modal-button--primary"
              >
                {primaryAction.label}
              </button>
            ) : null}
            {secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="modal-button modal-button--secondary"
              >
                {secondaryAction.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default FatalErrorPage;
