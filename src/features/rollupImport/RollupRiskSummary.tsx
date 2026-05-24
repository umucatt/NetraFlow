import type {
  RollupImportReview,
  RollupRiskLevel
} from '../../rollupImportLogic';

type RollupRiskSummaryProps = {
  review: RollupImportReview;
  getRiskLabel: (riskLevel: RollupRiskLevel, lowRiskKind?: RollupImportReview['lowRiskKind']) => string;
};

function RollupRiskSummary({ review, getRiskLabel }: RollupRiskSummaryProps) {
  return (
    <>
      <section className={`rollup-risk-card rollup-risk-card--${review.riskLevel}`}>
        <span>风险等级</span>
        <strong>{getRiskLabel(review.riskLevel, review.lowRiskKind)}</strong>
        <p>
          风险等级只表示 NetraFlow 是否发现明显格式或结构问题，不代表外部整理结果已经被证明正确
        </p>
      </section>

      {review.issues.length > 0 ? (
        <section className="rollup-issue-list" aria-label="导入风险原因">
          {review.issues.slice(0, 8).map((issue, index) => (
            <p key={`${issue.level}-${index}`}>
              <strong>{getRiskLabel(issue.level).split(' ')[0]}</strong>
              {issue.blocking ? ' · 阻断' : ''}：{issue.message}
            </p>
          ))}
          {review.issues.length > 8 ? (
            <p>还有 {review.issues.length - 8} 条提示未展开</p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

export default RollupRiskSummary;
