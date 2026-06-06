import type {
  HomeAssetStatDisplay,
  RecentNetWorthChange
} from './dashboardStatsLogic';

type HomeMoneyFormatter = (
  amount: number | null,
  options?: { compact?: boolean }
) => string;

type ChangeMoneyFormatter = (amount: number | null) => string;

type DashboardSummaryCardsProps = {
  homeAssetStat: HomeAssetStatDisplay;
  recentNetWorthChange: RecentNetWorthChange;
  formatHomeMoneyAmount: HomeMoneyFormatter;
  formatChangeAmount: ChangeMoneyFormatter;
};

function DashboardSummaryCards({
  homeAssetStat,
  recentNetWorthChange,
  formatHomeMoneyAmount,
  formatChangeAmount
}: DashboardSummaryCardsProps) {
  return (
    <div className="net-worth-summary">
      <h1 className="net-worth-summary__heading">
        <span className="net-worth-summary__label">{homeAssetStat.label}</span>
        <span className="net-worth-summary__amount">
          {formatHomeMoneyAmount(homeAssetStat.value, {
            compact: homeAssetStat.compact
          })}
        </span>
      </h1>
      <div
        className={`net-worth-change${
          recentNetWorthChange && recentNetWorthChange.amount > 0
            ? ' is-positive'
            : recentNetWorthChange && recentNetWorthChange.amount < 0
              ? ' is-negative'
              : ''
        }`}
      >
        {recentNetWorthChange && recentNetWorthChange.amount !== 0 ? (
          <>
            <strong>
              {recentNetWorthChange.amount > 0 ? '▲' : '▼'}{' '}
              {formatChangeAmount(Math.abs(recentNetWorthChange.amount))}
            </strong>
            <span>{recentNetWorthChange.relativeLabel}</span>
          </>
        ) : (
          <strong>暂无变化</strong>
        )}
      </div>
    </div>
  );
}

export default DashboardSummaryCards;
