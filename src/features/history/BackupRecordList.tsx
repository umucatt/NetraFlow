export type BackupRecordListRecord = {
  id: string;
  backedUpAt: string;
  historyCount: number;
  incrementCount: number;
  method: 'manual' | 'auto';
};

type BackupRecordListProps<TRecord extends BackupRecordListRecord> = {
  records: TRecord[];
  formatPreciseBackupTime: (time: string) => string;
  getBackupMethodLabel: (method: TRecord['method']) => string;
  manualRecordBackground?: string;
};

export default function BackupRecordList<TRecord extends BackupRecordListRecord>({
  records,
  formatPreciseBackupTime,
  getBackupMethodLabel,
  manualRecordBackground = 'var(--surface-muted)'
}: BackupRecordListProps<TRecord>) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 12
      }}
    >
      <strong>快照记录列表</strong>
      {records.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>暂无快照记录</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {records.map((record) => (
            <article
              key={record.id}
              id={`backup-record-${record.id}`}
              style={{
                display: 'grid',
                gap: 12,
                border: `1px solid ${
                  record.method === 'auto' ? 'rgba(37, 99, 235, 0.16)' : 'var(--border-soft)'
                }`,
                borderRadius: 'var(--radius-card)',
                padding: 14,
                background:
                  record.method === 'auto' ? 'rgba(37, 99, 235, 0.08)' : manualRecordBackground,
                boxShadow: 'none'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    精确时间
                  </p>
                  <strong
                    style={{
                      display: 'block',
                      marginTop: 3,
                      color: 'var(--text-main)',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {formatPreciseBackupTime(record.backedUpAt)}
                  </strong>
                </div>
                <span
                  style={{
                    flex: '0 0 auto',
                    borderRadius: 'var(--radius-chip)',
                    padding: '4px 8px',
                    background:
                      record.method === 'auto' ? 'rgba(37, 99, 235, 0.12)' : 'var(--surface-muted)',
                    color: record.method === 'auto' ? '#2563eb' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  {getBackupMethodLabel(record.method)}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10
                }}
              >
                {[
                  { label: '快照总条数', value: `${record.historyCount} 条` },
                  { label: '增量记录', value: `${record.incrementCount} 条` }
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      minWidth: 0,
                      borderRadius: 'var(--radius-card)',
                      padding: '9px 10px',
                      background: 'var(--surface-bg)'
                    }}
                  >
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {item.label}
                    </p>
                    <strong
                      style={{
                        display: 'block',
                        marginTop: 3,
                        color: 'var(--text-main)',
                        fontSize: '0.95rem'
                      }}
                    >
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
