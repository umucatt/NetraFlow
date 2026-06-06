import RollupPromptPanel from './RollupPromptPanel';
import RollupReviewPanel from './RollupReviewPanel';
import type { RollupImportPageProps } from './rollupImportTypes';

function RollupImportPage({
  mode,
  promptTab,
  promptExplanation,
  promptContent,
  onPromptTabChange,
  review,
  recordGroups,
  accountGroups,
  accountAssignments,
  getAccountMatches,
  getRiskLabel,
  formatRecordAmount,
  onSelectAccount,
  onCreateAccount
}: RollupImportPageProps) {
  return (
    <div className="rollup-import-page">
      <header className="rollup-import-header">
        <h1>汇总记录导入</h1>
        <p>导入外部整理后的按日汇总结果</p>
      </header>
      {mode === 'review' && review ? (
        <RollupReviewPanel
          review={review}
          recordGroups={recordGroups}
          accountGroups={accountGroups}
          accountAssignments={accountAssignments}
          getAccountMatches={getAccountMatches}
          getRiskLabel={getRiskLabel}
          formatRecordAmount={formatRecordAmount}
          onSelectAccount={onSelectAccount}
          onCreateAccount={onCreateAccount}
        />
      ) : (
        <RollupPromptPanel
          promptTab={promptTab}
          promptExplanation={promptExplanation}
          promptContent={promptContent}
          onPromptTabChange={onPromptTabChange}
        />
      )}
    </div>
  );
}

export default RollupImportPage;
