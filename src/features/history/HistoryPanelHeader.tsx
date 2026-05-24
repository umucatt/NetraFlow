import type { ReactNode } from 'react';

type HistoryPanelHeaderProps = {
  title: ReactNode;
};

export default function HistoryPanelHeader({ title }: HistoryPanelHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'flex-start',
        marginBottom: 16
      }}
    >
      <h2 className="history-panel-title">{title}</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} />
    </header>
  );
}
