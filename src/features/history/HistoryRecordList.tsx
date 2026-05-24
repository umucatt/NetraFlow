import type { ReactNode } from 'react';
import { NfRollupSourceWideIcon } from '../../assets/icons';
import NfSvgIcon from '../../components/NfSvgIcon';

export type HistoryRecordListRecord = {
  id: string;
  accountId: string;
  type: string;
  groupName: string;
  accountName: string;
  beforeAmount: number | null;
  afterAmount: number | null;
  time: string;
  relatedTime?: string;
  note?: string;
  source?: 'flash-note' | 'rollup';
};

export type HistoryRecordListChangeDisplay = {
  label: string;
  color: string;
  background: string;
  kind: 'increase' | 'decrease' | 'neutral';
};

export type HistoryRecordListTone = {
  background: string;
  border: string;
  emphasisBorder: string;
  divider: string;
  nestedBackground: string;
  text: string;
  labelBackground: string;
};

type HistoryRecordGroup<TRecord extends HistoryRecordListRecord> = {
  date: string;
  records: TRecord[];
};

type HistoryRecordCardOptions = {
  nested?: boolean;
  timeLabel?: string;
  extraInfo?: string;
  interactive?: boolean;
  expanded?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  children?: ReactNode;
};

type HistoryRecordListProps<TRecord extends HistoryRecordListRecord> = {
  records?: TRecord[];
  groups?: Array<HistoryRecordGroup<TRecord>>;
  expandedDates?: string[];
  highlightedRecordId?: string;
  emptyText?: string;
  compareRecords: (left: TRecord, right: TRecord) => number;
  getTypeLabel: (type: TRecord['type']) => string;
  getTone: (record: TRecord) => HistoryRecordListTone;
  getAmountChange: (record: TRecord) => HistoryRecordListChangeDisplay;
  formatAmount: (amount: number | null) => string;
  formatShortTime: (time: string) => string;
  renderFlashSourceIcon: (className: string) => ReactNode;
  onToggleDate?: (dateValue: string) => void;
};

export default function HistoryRecordList<TRecord extends HistoryRecordListRecord>({
  records,
  groups,
  expandedDates = [],
  highlightedRecordId = '',
  emptyText = '暂无匹配记录',
  compareRecords,
  getTypeLabel,
  getTone,
  getAmountChange,
  formatAmount,
  formatShortTime,
  renderFlashSourceIcon,
  onToggleDate
}: HistoryRecordListProps<TRecord>) {
  const renderHistoryCardContent = (
    record: TRecord,
    tone: HistoryRecordListTone,
    change: HistoryRecordListChangeDisplay,
    options: Required<Pick<HistoryRecordCardOptions, 'nested' | 'timeLabel'>> &
      Pick<HistoryRecordCardOptions, 'extraInfo'>
  ) => {
    const { nested, timeLabel, extraInfo } = options;

    return (
      <>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'flex-start'
          }}
        >
          <strong
            style={{
              flex: 1,
              minWidth: 0,
              color: 'var(--text-main)',
              fontSize: nested ? '0.94rem' : '1rem',
              lineHeight: 1.35
            }}
          >
            {record.groupName} - {record.accountName}
          </strong>
          <span
            style={{
              flex: '0 0 auto',
              borderRadius: 999,
              padding: nested ? '3px 8px' : '4px 9px',
              background: tone.labelBackground,
              color: tone.text,
              fontSize: nested ? '0.76rem' : '0.82rem',
              fontWeight: 700,
              lineHeight: 1
            }}
          >
            {getTypeLabel(record.type)}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 12,
            alignItems: 'center'
          }}
        >
          <span
            style={{
              minWidth: 0,
              color: 'var(--text-secondary)',
              fontSize: nested ? '0.92rem' : '0.98rem',
              fontWeight: 600,
              lineHeight: 1.4
            }}
          >
            {formatAmount(record.beforeAmount)} → {formatAmount(record.afterAmount)}
          </span>
          <strong
            style={{
              justifySelf: 'end',
              borderRadius: 999,
              padding: nested ? '4px 9px' : '5px 10px',
              background: change.background,
              color: change.color,
              fontSize: nested ? '0.84rem' : '0.9rem',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}
          >
            {change.label}
          </strong>
        </div>

        {record.note ? (
          <p
            style={{
              margin: 0,
              color: 'var(--text-muted)',
              fontSize: nested ? '0.78rem' : '0.84rem',
              lineHeight: 1.35
            }}
          >
            备注：{record.note}
          </p>
        ) : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            color: 'var(--text-muted)',
            fontSize: nested ? '0.78rem' : '0.84rem',
            lineHeight: 1.35
          }}
        >
          <span>{timeLabel}</span>
          <span className="history-card-source-row">
            {extraInfo ? (
              <span
                style={{
                  whiteSpace: 'nowrap',
                  color: 'var(--text-secondary)',
                  fontWeight: 600
                }}
              >
                {extraInfo}
              </span>
            ) : null}
            {record.source === 'flash-note'
              ? renderFlashSourceIcon('history-flash-source')
              : null}
            {record.source === 'rollup' ? (
              <NfSvgIcon
                svg={NfRollupSourceWideIcon}
                className="history-rollup-source"
                title="汇总导入"
                decorative
              />
            ) : null}
            {!extraInfo && !record.source ? (
              <span aria-hidden="true" style={{ minWidth: nested ? 44 : 60 }} />
            ) : null}
          </span>
        </div>
      </>
    );
  };

  const renderHistoryCard = (record: TRecord, options: HistoryRecordCardOptions = {}) => {
    const {
      nested = false,
      timeLabel = record.relatedTime
        ? `${formatShortTime(record.relatedTime)} · ${formatShortTime(record.time)}`
        : formatShortTime(record.time),
      extraInfo,
      interactive = false,
      expanded = false,
      highlighted = record.id === highlightedRecordId,
      onClick,
      children
    } = options;
    const tone = getTone(record);
    const change = getAmountChange(record);
    const contentGap = nested ? 10 : 12;
    const cardRadius = nested ? 14 : 16;
    const cardPadding = nested ? '12px 14px' : '14px 16px';
    const cardStyle = {
      borderRadius: cardRadius,
      padding: cardPadding,
      background: nested ? tone.nestedBackground : tone.background,
      border: `1px solid ${
        highlighted ? 'var(--accent-border)' : interactive ? tone.emphasisBorder : tone.border
      }`,
      boxShadow: highlighted
        ? '0 0 0 3px var(--accent-bg), var(--shadow-panel)'
        : interactive && expanded
          ? 'var(--shadow-panel)'
          : 'none'
    } as const;
    const cardContent = renderHistoryCardContent(record, tone, change, {
      nested,
      timeLabel,
      extraInfo
    });

    if (interactive) {
      return (
        <section
          key={record.id}
          id={`history-record-${record.id}`}
          style={{
            ...cardStyle,
            display: 'grid',
            gap: children ? 10 : 0
          }}
        >
          <button
            type="button"
            onClick={onClick}
            aria-expanded={expanded}
            style={{
              display: 'grid',
              gap: contentGap,
              width: '100%',
              border: 0,
              padding: 0,
              background: 'transparent',
              color: 'var(--text-main)',
              cursor: 'pointer',
              font: 'inherit',
              textAlign: 'left'
            }}
          >
            {cardContent}
          </button>

          {children ? (
            <div
              style={{
                display: 'grid',
                gap: 8,
                paddingTop: 10,
                paddingLeft: 12,
                borderTop: `1px solid ${tone.divider}`
              }}
            >
              {children}
            </div>
          ) : null}
        </section>
      );
    }

    return (
      <article
        key={record.id}
        id={`history-record-${record.id}`}
        style={{
          ...cardStyle,
          display: 'grid',
          gap: contentGap
        }}
      >
        {cardContent}
      </article>
    );
  };

  const renderHistoryGroup = (group: HistoryRecordGroup<TRecord>) => {
    if (group.records.length === 1) {
      const record = group.records[0];
      return record ? renderHistoryCard(record) : null;
    }

    const recordsByTimeDesc = [...group.records].sort(compareRecords);
    const firstRecord = recordsByTimeDesc[recordsByTimeDesc.length - 1];
    const lastRecord = recordsByTimeDesc[0];

    if (!firstRecord || !lastRecord) {
      return null;
    }

    const expanded = expandedDates.includes(group.date);
    const summaryRecord = {
      ...lastRecord,
      id: `history-group-${group.date}`,
      beforeAmount: firstRecord.beforeAmount,
      afterAmount: lastRecord.afterAmount,
      source: group.records.some((record) => record.source === 'flash-note')
        ? 'flash-note'
        : group.records.some((record) => record.source === 'rollup')
          ? 'rollup'
          : lastRecord.source
    } as TRecord;

    return (
      <div key={group.date}>
        {renderHistoryCard(summaryRecord, {
          interactive: true,
          expanded,
          timeLabel: group.date,
          extraInfo: `${group.records.length}条记录`,
          onClick: () => onToggleDate?.(group.date),
          children: expanded
            ? recordsByTimeDesc.map((record) =>
                renderHistoryCard(record, {
                  nested: true
                })
              )
            : undefined
        })}
      </div>
    );
  };

  if (groups) {
    return <>{groups.map(renderHistoryGroup)}</>;
  }

  if (!records || records.length === 0) {
    return (
      <p className="history-empty-panel" style={{ margin: 0, color: 'var(--text-muted)' }}>
        {emptyText}
      </p>
    );
  }

  return (
    <div
      className="history-result-list-panel"
      style={{
        display: 'grid',
        gap: 10,
        border: '1px solid var(--border-soft)',
        borderRadius: 12,
        padding: '12px 4px 12px 12px',
        background: 'var(--surface-strong)'
      }}
    >
      {records.map((record) => renderHistoryCard(record))}
    </div>
  );
}
