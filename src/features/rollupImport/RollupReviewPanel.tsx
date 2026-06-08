import RightPanelActionButton from '../../components/rightPanel/RightPanelActionButton';
import type {
  RollupAccountAssignment,
  RollupImportRecord,
  RollupImportReview,
  RollupRiskLevel
} from '../../rollupImportLogic';
import RollupRecordGroupList from './RollupRecordGroupList';
import RollupRiskSummary from './RollupRiskSummary';
import type {
  RollupImportAccountGroup,
  RollupImportAccountMatch,
  RollupImportRecordGroup
} from './rollupImportTypes';

type RollupReviewPanelProps = {
  review: RollupImportReview;
  recordGroups: RollupImportRecordGroup[];
  accountGroups: RollupImportAccountGroup[];
  accountAssignments: Record<string, RollupAccountAssignment | null>;
  getAccountMatches: (keyword: string) => RollupImportAccountMatch[];
  getRiskLabel: (riskLevel: RollupRiskLevel, lowRiskKind?: RollupImportReview['lowRiskKind']) => string;
  formatRecordAmount: (record: RollupImportRecord) => string;
  onSelectAccount: (keyword: string, accountId: string) => void;
  onCreateAccount: (keyword: string) => void;
};

export type RollupReviewActionsPanelProps = {
  confirmedAccountCount: number;
  accountGroupCount: number;
  recordCount: number;
  hasBlockingIssues: boolean;
  canConfirm: boolean;
  onDiscardImport: () => void;
  onConfirmImport: () => void;
  onClose: () => void;
};

export function RollupReviewActionsPanel({
  confirmedAccountCount,
  accountGroupCount,
  recordCount,
  hasBlockingIssues,
  canConfirm,
  onDiscardImport,
  onConfirmImport
}: RollupReviewActionsPanelProps) {
  return (
    <>
      <article className="right-panel-preview">
        <span>账户确认进度</span>
        <strong>
          {confirmedAccountCount} / {accountGroupCount}
        </strong>
        <p>{recordCount} 条汇总记录等待整批导入</p>
      </article>
      {hasBlockingIssues ? (
        <p className="right-panel-note">
          本地校验存在必须阻断的问题，建议舍弃并重新生成汇总 JSON
        </p>
      ) : null}
      <RightPanelActionButton
        label="舍弃本次导入"
        tone="danger"
        onClick={onDiscardImport}
      />
      <RightPanelActionButton
        label="全部导入"
        tone="primary"
        disabled={!canConfirm}
        onClick={onConfirmImport}
      />
    </>
  );
}

function RollupReviewPanel({
  review,
  recordGroups,
  accountGroups,
  accountAssignments,
  getAccountMatches,
  getRiskLabel,
  formatRecordAmount,
  onSelectAccount,
  onCreateAccount
}: RollupReviewPanelProps) {
  return (
    <div className="rollup-import-confirm-panel">
      <RollupRiskSummary review={review} getRiskLabel={getRiskLabel} />
      <RollupRecordGroupList
        groups={recordGroups}
        accountGroups={accountGroups}
        accountAssignments={accountAssignments}
        getAccountMatches={getAccountMatches}
        formatRecordAmount={formatRecordAmount}
        onSelectAccount={onSelectAccount}
        onCreateAccount={onCreateAccount}
      />
    </div>
  );
}

export default RollupReviewPanel;
