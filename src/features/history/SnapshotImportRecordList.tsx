import { useLayoutEffect, useRef, useState } from 'react';

export type SnapshotImportRecordListRecord = {
  id: string;
  importedAt: string;
  snapshotCreatedAt: string | null;
  historyRecordCount: number;
  changedHistoryRecordCount: number;
};

type SnapshotImportRecordListProps<TRecord extends SnapshotImportRecordListRecord> = {
  records: TRecord[];
  formatPreciseBackupTime: (time: string) => string;
};

const VISIBLE_IMPORT_RECORD_COUNT = 2;

export default function SnapshotImportRecordList<
  TRecord extends SnapshotImportRecordListRecord
>({
  records,
  formatPreciseBackupTime
}: SnapshotImportRecordListProps<TRecord>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [visibleRecordHeight, setVisibleRecordHeight] = useState<number | null>(null);
  const hasHiddenRecords = records.length > VISIBLE_IMPORT_RECORD_COUNT;

  useLayoutEffect(() => {
    if (!hasHiddenRecords) {
      setVisibleRecordHeight(null);
      return;
    }

    const scrollElement = scrollRef.current;

    if (!scrollElement) {
      return;
    }

    let frameId = 0;

    const getVisibleRecords = () =>
      Array.from(scrollElement.children)
        .slice(0, VISIBLE_IMPORT_RECORD_COUNT)
        .filter((child): child is HTMLElement => child instanceof HTMLElement);

    const measureVisibleHeight = () => {
      const visibleRecords = getVisibleRecords();

      if (visibleRecords.length < VISIBLE_IMPORT_RECORD_COUNT) {
        setVisibleRecordHeight(null);
        return;
      }

      const [firstRecord, secondRecord] = visibleRecords;
      const firstRect = firstRecord.getBoundingClientRect();
      const secondRect = secondRecord.getBoundingClientRect();
      const recordGap = Math.max(0, secondRect.top - firstRect.bottom);
      const nextVisibleHeight = Math.ceil(firstRect.height + recordGap + secondRect.height);

      setVisibleRecordHeight((currentHeight) =>
        currentHeight === nextVisibleHeight ? currentHeight : nextVisibleHeight
      );
    };

    const scheduleMeasure = () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(measureVisibleHeight);
    };

    measureVisibleHeight();
    window.addEventListener('resize', scheduleMeasure);

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(scheduleMeasure);

    if (resizeObserver) {
      resizeObserver.observe(scrollElement);
      getVisibleRecords().forEach((recordElement) => resizeObserver.observe(recordElement));
    }

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('resize', scheduleMeasure);
      resizeObserver?.disconnect();
    };
  }, [formatPreciseBackupTime, hasHiddenRecords, records]);

  return (
    <section
      style={{
        display: 'grid',
        gap: 12
      }}
    >
      <strong>快照导入记录</strong>
      {records.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>暂无导入记录</p>
      ) : (
        <div
          className={`snapshot-import-record-frame${
            hasHiddenRecords ? ' snapshot-import-record-frame--overflow' : ''
          }`}
        >
          <div
            ref={scrollRef}
            className="snapshot-import-record-scroll"
            style={
              hasHiddenRecords && visibleRecordHeight !== null
                ? { maxHeight: visibleRecordHeight }
                : undefined
            }
          >
            {records.map((record) => (
              <article
                key={record.id}
                style={{
                  display: 'grid',
                  gap: 6,
                  borderRadius: 'var(--radius-card)',
                  padding: '10px 12px',
                  background: 'var(--surface-muted)'
                }}
              >
                <strong
                  style={{
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    lineHeight: 1.35,
                    overflowWrap: 'anywhere'
                  }}
                >
                  {formatPreciseBackupTime(record.importedAt)} 导入
                </strong>
                <p
                  style={{
                    margin: 0,
                    color: 'var(--text-secondary)',
                    fontSize: '0.84rem',
                    lineHeight: 1.45,
                    overflowWrap: 'anywhere'
                  }}
                >
                  {record.snapshotCreatedAt
                    ? `快照生成于 ${formatPreciseBackupTime(record.snapshotCreatedAt)}`
                    : '生成时间未知'}
                </p>
                <p
                  style={{
                    margin: 0,
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    lineHeight: 1.4
                  }}
                >
                  历史记录 {record.historyRecordCount} 条 · 实际变更{' '}
                  {record.changedHistoryRecordCount} 条
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
