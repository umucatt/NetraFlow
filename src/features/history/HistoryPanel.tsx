import { forwardRef, type MouseEvent, type ReactNode, type UIEvent } from 'react';
import HistoryPanelHeader from './HistoryPanelHeader';

export type HistoryPanelView = 'history' | 'backup';

type HistoryPanelProps = {
  view: HistoryPanelView;
  historyContent: ReactNode;
  backupContent: ReactNode;
  onPanelClick: (event: MouseEvent<HTMLElement>) => void;
  onPanelScroll: (event: UIEvent<HTMLElement>) => void;
};

const HistoryPanel = forwardRef<HTMLElement, HistoryPanelProps>(
  ({ view, historyContent, backupContent, onPanelClick, onPanelScroll }, ref) => (
    <section
      ref={ref}
      onClick={onPanelClick}
      onScroll={onPanelScroll}
      className="history-browse-panel two-column-page-panel"
      style={{
        width: 'min(760px, 100%)',
        maxHeight: '84vh',
        overflowY: 'auto',
        borderRadius: 16,
        padding: 'var(--two-column-panel-padding)',
        border: '1px solid var(--border-soft)',
        background: 'var(--panel-bg-strong)',
        boxShadow: 'var(--shadow-popover)'
      }}
    >
      {view === 'backup' ? null : <HistoryPanelHeader title="浏览记录" />}

      {view === 'history' ? historyContent : backupContent}
    </section>
  )
);

HistoryPanel.displayName = 'HistoryPanel';

export default HistoryPanel;
