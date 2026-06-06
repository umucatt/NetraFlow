import RightPanelActionButton from '../../components/rightPanel/RightPanelActionButton';
import RollupImportDropzone from './RollupImportDropzone';
import { RollupReviewActionsPanel } from './RollupReviewPanel';
import type { RollupImportActionsPanelProps } from './rollupImportTypes';

function RollupImportActionsPanel(props: RollupImportActionsPanelProps) {
  if (props.mode === 'review') {
    return (
      <RollupReviewActionsPanel
        confirmedAccountCount={props.confirmedAccountCount}
        accountGroupCount={props.accountGroupCount}
        recordCount={props.recordCount}
        hasBlockingIssues={props.hasBlockingIssues}
        canConfirm={props.canConfirm}
        onDiscardImport={props.onDiscardImport}
        onConfirmImport={props.onConfirmImport}
        onClose={props.onClose}
      />
    );
  }

  return (
    <>
      <RightPanelActionButton label="复制提示词" tone="primary" onClick={props.onCopyPrompt} />
      <RollupImportDropzone
        inputValue={props.inputValue}
        error={props.error}
        onInputChange={props.onInputChange}
        onImportText={props.onImportText}
        onSelectFile={props.onSelectFile}
      />
      <RightPanelActionButton
        label="返回资产总览"
        onClick={props.onClose}
        className="rollup-import-return-action"
      />
    </>
  );
}

export default RollupImportActionsPanel;
