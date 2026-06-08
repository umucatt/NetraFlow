import RightPanelActionButton from '../../components/rightPanel/RightPanelActionButton';
import type { AccountDangerActionsPanelProps } from './accountOperationTypes';

function AccountDangerActionsPanel({
  isArchived,
  onArchiveAccount,
  onDeleteAccount
}: AccountDangerActionsPanelProps) {
  return (
    <section className="right-panel-page">
      <div className="right-panel-title-row">
        <h2 className="right-panel-title">危险操作</h2>
      </div>
      <div className="right-panel-stack">
        {!isArchived ? (
          <RightPanelActionButton label="归档账户" onClick={onArchiveAccount} />
        ) : null}
        <RightPanelActionButton label="删除账户" tone="danger" onClick={onDeleteAccount} />
      </div>
    </section>
  );
}

export default AccountDangerActionsPanel;
