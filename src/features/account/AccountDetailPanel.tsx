import type { ReactNode } from 'react';

export type AccountDetailPanelAccount = {
  name: string;
  archived?: boolean;
};

type AccountDetailPanelProps = {
  groupName: string;
  account: AccountDetailPanelAccount;
  currentAmount: number;
  historyRecords: readonly unknown[];
  historyList: ReactNode;
  chartPreview?: ReactNode;
  onOpenChart?: () => void;
  formatMoney: (amount: number) => string;
};

const getAccountDetailTitle = (groupName: string | undefined, accountName: string) => {
  const trimmedGroupName = groupName?.trim() ?? '';

  return trimmedGroupName ? `${trimmedGroupName} - ${accountName}` : accountName;
};

function AccountDetailPanel({
  groupName,
  account,
  currentAmount,
  historyRecords,
  historyList,
  chartPreview,
  onOpenChart,
  formatMoney
}: AccountDetailPanelProps) {
  const title = getAccountDetailTitle(groupName, account.name);

  return (
    <>
      <header className="account-detail-header">
        <div className="account-detail-header__main">
          <h1 className="account-detail-title">{title}</h1>
          <div className="account-detail-meta">
            <p className="description account-detail-balance">
              当前余额 {formatMoney(currentAmount)}
            </p>
            {account.archived ? (
              <span className="account-detail-archived-badge">已归档</span>
            ) : null}
          </div>
        </div>

        {chartPreview ? (
          <button
            type="button"
            aria-label="打开账户趋势图"
            className="l0-chart-button l0-chart-button--trend account-detail-chart-thumbnail"
            onClick={onOpenChart}
          >
            {chartPreview}
          </button>
        ) : null}
      </header>

      <section
        style={{
          borderTop: '1px solid var(--border-medium)',
          paddingTop: 18
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'baseline',
            marginBottom: 12
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>账户变动记录</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            共 {historyRecords.length} 条
          </span>
        </header>
        {historyRecords.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>暂无记录</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>{historyList}</div>
        )}
      </section>
    </>
  );
}

export default AccountDetailPanel;
