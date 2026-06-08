import { OverlayBackdrop } from '../overlay';

import type { FirstWelcomeLayerProps } from './firstWelcomeLayerTypes';

export function FirstWelcomeLayer({
  stage,
  storyRoutes,
  onComplete,
  onOpenStory,
  onChooseStoryRoute
}: FirstWelcomeLayerProps) {
  if (stage === 'welcome') {
    return (
      <OverlayBackdrop onBack={onComplete} className="modal-backdrop">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-welcome-title"
          onClick={(event) => event.stopPropagation()}
          className="modal-card first-welcome-modal"
        >
          <h2 id="first-welcome-title" className="first-welcome-modal__message">
            Halo, 你好像是第一次来到净流，需要跟我一起看看吗？
          </h2>
          <div className="modal-actions first-welcome-modal__actions">
            <button
              type="button"
              onClick={onOpenStory}
              className="modal-button modal-button--primary"
            >
              拉手~
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="modal-button modal-button--secondary"
            >
              不用啦
            </button>
          </div>
        </section>
      </OverlayBackdrop>
    );
  }

  if (stage === 'story') {
    return (
      <OverlayBackdrop onBack={onComplete} className="modal-backdrop">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-welcome-story-title"
          onClick={(event) => event.stopPropagation()}
          className="modal-card first-welcome-modal first-welcome-modal--story"
        >
          <div className="first-welcome-story-copy">
            <h2 id="first-welcome-story-title">
              ta轻轻拉住你的手，推开了净流的小门
            </h2>
            <p>然后</p>
          </div>
          <div className="first-welcome-story-grid">
            {storyRoutes.map((route) => (
              <button
                key={route.templateId}
                type="button"
                className="first-welcome-story-card"
                onClick={() => onChooseStoryRoute(route.templateId)}
              >
                <strong>{route.title}</strong>
                <span>{route.description}</span>
              </button>
            ))}
          </div>
          <div className="modal-actions first-welcome-modal__actions">
            <button
              type="button"
              onClick={onComplete}
              className="modal-button modal-button--secondary first-welcome-modal__quiet-button"
            >
              还是先不用啦
            </button>
          </div>
        </section>
      </OverlayBackdrop>
    );
  }

  return null;
}
