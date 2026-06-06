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

export type HistoryRecordListGroupSummary<TRecord extends HistoryRecordListRecord> = {
  beforeAmount: number | null;
  afterAmount: number | null;
  displayType: TRecord['type'];
};

export type HistoryRecordGroup<TRecord extends HistoryRecordListRecord> = {
  date: string;
  records: TRecord[];
};

type HistoryRecordCardOptions = {
  nested?: boolean;
  timeLabel?: string;
  extraInfo?: string;
  showNote?: boolean;
  showSourceMarker?: boolean;
  interactive?: boolean;
  expanded?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  children?: ReactNode;
};

export type HistoryRecordListProps<TRecord extends HistoryRecordListRecord> = {
  records?: TRecord[];
  groups?: Array<HistoryRecordGroup<TRecord>>;
  expandedDates?: string[];
  highlightedRecordId?: string;
  emptyText?: string;
  compareRecords: (left: TRecord, right: TRecord) => number;
  getTypeLabel: (type: TRecord['type']) => string;
  getTone: (record: TRecord) => HistoryRecordListTone;
  getAmountChange: (record: TRecord) => HistoryRecordListChangeDisplay;
  getGroupRecords?: (records: TRecord[]) => TRecord[];
  getGroupDisplayRecords?: (records: TRecord[]) => TRecord[];
  getGroupSummaryRecords?: (records: TRecord[]) => TRecord[];
  getGroupSummary?: (
    records: TRecord[]
  ) => HistoryRecordListGroupSummary<TRecord> | null;
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
  getGroupRecords,
  getGroupDisplayRecords,
  getGroupSummaryRecords,
  getGroupSummary,
  formatAmount,
  formatShortTime,
  renderFlashSourceIcon,
  onToggleDate
}: HistoryRecordListProps<TRecord>) {
  const getHistoryBadgeClass = (className: string, nested: boolean) =>
    ['history-badge-base', className, nested ? 'history-badge-base--nested' : '']
      .filter(Boolean)
      .join(' ');

  const renderHistoryCardContent = (
    record: TRecord,
    tone: HistoryRecordListTone,
    change: HistoryRecordListChangeDisplay,
    options: Required<Pick<HistoryRecordCardOptions, 'nested' | 'timeLabel'>> &
      Pick<HistoryRecordCardOptions, 'extraInfo' | 'showNote' | 'showSourceMarker'>
  ) => {
    const { nested, timeLabel, extraInfo, showNote = true, showSourceMarker = true } = options;
    const shouldShowNote = showNote && Boolean(record.note);
    const source = showSourceMarker ? record.source : undefined;

    return (
      <div className={`history-card-grid${nested ? ' history-card-grid--nested' : ''}`}>
        <strong className="history-card-title history-card-title-row">
          {record.groupName} - {record.accountName}
        </strong>
        <span
          className={getHistoryBadgeClass(
            'history-type-badge history-card-right-cell',
            nested
          )}
          style={{
            background: tone.labelBackground,
            color: tone.text
          }}
        >
          {getTypeLabel(record.type)}
        </span>

        <span className="history-card-amount-flow history-card-amount-row">
          {formatAmount(record.beforeAmount)} → {formatAmount(record.afterAmount)}
        </span>
        <strong
          className={getHistoryBadgeClass(
            `history-delta-badge history-delta-badge--${change.kind} history-card-right-cell`,
            nested
          )}
          style={{
            background: change.background,
            color: change.color
          }}
        >
          {change.label}
        </strong>

        <span className="history-card-date-note history-card-date-row">
          <span className="history-card-date">{timeLabel}</span>
          {shouldShowNote ? (
            <span className="history-card-note-inline">备注：{record.note}</span>
          ) : null}
        </span>
        <span className="history-card-source-row history-card-right-cell">
          {extraInfo ? (
            <span className={getHistoryBadgeClass('history-count-badge', nested)}>
              {extraInfo}
            </span>
          ) : null}
          {source === 'flash-note'
            ? renderFlashSourceIcon('history-flash-source')
            : null}
          {source === 'rollup' ? (
            <NfSvgIcon
              svg={NfRollupSourceWideIcon}
              className="history-rollup-source"
              title="汇总导入"
              decorative
            />
          ) : null}
          {showSourceMarker && !extraInfo && !source ? (
            <span
              aria-hidden="true"
              className={`history-card-source-placeholder${
                nested ? ' history-card-source-placeholder--nested' : ''
              }`}
            />
          ) : null}
        </span>
      </div>
    );
  };

  const renderHistoryCard = (record: TRecord, options: HistoryRecordCardOptions = {}) => {
    const {
      nested = false,
      timeLabel = record.relatedTime
        ? `${formatShortTime(record.relatedTime)} · ${formatShortTime(record.time)}`
        : formatShortTime(record.time),
      extraInfo,
      showNote = true,
      showSourceMarker = true,
      interactive = false,
      expanded = false,
      highlighted = record.id === highlightedRecordId,
      onClick,
      children
    } = options;
    const tone = getTone(record);
    const change = getAmountChange(record);
    const contentGap = nested ? 10 : 12;
    const cardRadius = 'var(--radius-card)';
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
      extraInfo,
      showNote,
      showSourceMarker
    });

    if (interactive) {
      return (
        <section
          key={record.id}
          id={`history-record-${record.id}`}
          className={[
            'history-record-card',
            nested ? 'history-record-card--nested' : '',
            !nested ? 'history-record-card--group' : ''
          ]
            .filter(Boolean)
            .join(' ')}
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
        className={`history-record-card${nested ? ' history-record-card--nested' : ''}`}
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

    const defaultDisplayRecords = [...group.records].sort(compareRecords);
    const displayRecords = getGroupDisplayRecords
      ? getGroupDisplayRecords(group.records)
      : getGroupRecords
        ? getGroupRecords(group.records)
        : defaultDisplayRecords;
    const summaryRecords = getGroupSummaryRecords
      ? getGroupSummaryRecords(group.records)
      : getGroupRecords
        ? getGroupRecords(group.records)
        : defaultDisplayRecords;
    const firstRecord =
      getGroupSummaryRecords || getGroupRecords
        ? summaryRecords[0]
        : summaryRecords[summaryRecords.length - 1];
    const lastRecord =
      getGroupSummaryRecords || getGroupRecords
        ? summaryRecords[summaryRecords.length - 1]
        : summaryRecords[0];

    if (!firstRecord || !lastRecord) {
      return null;
    }

    const expanded = expandedDates.includes(group.date);
    const groupSummary = getGroupSummary?.(summaryRecords);
    const summaryRecord = {
      ...lastRecord,
      id: `history-group-${group.date}`,
      type: groupSummary ? groupSummary.displayType : lastRecord.type,
      beforeAmount: groupSummary ? groupSummary.beforeAmount : firstRecord.beforeAmount,
      afterAmount: groupSummary ? groupSummary.afterAmount : lastRecord.afterAmount,
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
          showNote: false,
          showSourceMarker: false,
          onClick: () => onToggleDate?.(group.date),
          children: expanded
            ? displayRecords.map((record) =>
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
        gap: 10
      }}
    >
      {records.map((record) => renderHistoryCard(record))}
    </div>
  );
}
