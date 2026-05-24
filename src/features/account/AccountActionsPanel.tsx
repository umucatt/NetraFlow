import RightPanelActionButton from '../../components/rightPanel/RightPanelActionButton';

type AccountActionsPanelProps = {
  isArchived: boolean;
  onEditBalance: () => void;
  onEditAccount: () => void;
  onRestoreAccount?: () => void;
  onOpenDangerActions: () => void;
  onBack: () => void;
};

function AccountActionsPanel({
  isArchived,
  onEditBalance,
  onEditAccount,
  onRestoreAccount,
  onOpenDangerActions,
  onBack
}: AccountActionsPanelProps) {
  return (
    <section className="right-panel-page">
      <div className="right-panel-title-row">
        <h2 className="right-panel-title">账户变更</h2>
      </div>
      <div className="right-panel-stack">
      <RightPanelActionButton label="修改余额" tone="primary" onClick={onEditBalance} />
      <RightPanelActionButton label="编辑账户" onClick={onEditAccount} />
      {isArchived && onRestoreAccount ? (
        <RightPanelActionButton label="恢复账户" onClick={onRestoreAccount} />
      ) : null}
      <RightPanelActionButton label="危险操作" tone="danger" onClick={onOpenDangerActions} />
      <RightPanelActionButton label="返回上一层" onClick={onBack} />
      </div>
    </section>
  );
}

export default AccountActionsPanel;
