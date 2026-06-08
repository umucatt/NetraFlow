import { FlashNotePage } from '../../features/flashNote/FlashNotePage';
import { OverlayBackdrop } from '../overlay';

import type { FlashNoteHostLayerProps } from './flashNoteLayerTypes';

export function FlashNoteHostLayer({
  page,
  exitConfirm,
  returnDateConfirm
}: FlashNoteHostLayerProps) {
  if (!page.isOpen) {
    return null;
  }

  return (
    <>
      <FlashNotePage {...page.pageProps} />

      {exitConfirm.isOpen ? (
        <OverlayBackdrop onBack={exitConfirm.onCancel} className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="flash-exit-title"
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="flash-exit-title" style={{ margin: '0 0 10px', fontSize: '1.26rem' }}>
              退出后，本次闪记内容不会保留
            </h2>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-button modal-button--secondary"
                onClick={exitConfirm.onCancel}
              >
                继续编辑
              </button>
              <button
                type="button"
                className="modal-button modal-button--danger"
                onClick={exitConfirm.onConfirm}
              >
                退出
              </button>
            </div>
          </section>
        </OverlayBackdrop>
      ) : null}

      {returnDateConfirm.isOpen ? (
        <OverlayBackdrop
          onBack={returnDateConfirm.onCancel}
          className="modal-backdrop"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="flash-return-date-title"
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              返回日期选择
            </p>
            <h2
              id="flash-return-date-title"
              style={{ margin: '0 0 10px', fontSize: '1.26rem' }}
            >
              返回日期选择后，当前顺序输入内容不会保留
            </h2>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-button modal-button--secondary"
                onClick={returnDateConfirm.onCancel}
              >
                取消
              </button>
              <button
                type="button"
                className="modal-button modal-button--primary"
                onClick={returnDateConfirm.onConfirm}
              >
                返回日期选择
              </button>
            </div>
          </section>
        </OverlayBackdrop>
      ) : null}
    </>
  );
}
