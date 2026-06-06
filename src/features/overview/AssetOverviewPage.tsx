import type {
  DragEvent,
  PointerEvent,
  ReactNode
} from 'react';

import type { Account } from '../../app/types';
import AccountMark from '../../components/AccountMark';
import type { AssetOverviewGroup } from './assetOverviewLogic';

export type AssetOverviewDropIndicator = {
  groupId: string;
  position: 'before' | 'after';
} | null;

type HomeMoneyFormatter = (
  amount: number | null,
  options?: { compact?: boolean }
) => string;

export type AssetOverviewPageProps = {
  groups: AssetOverviewGroup[];
  expandedGroupIds: string[];
  isGroupEditMode: boolean;
  draggingGroupId: string;
  groupDropIndicator: AssetOverviewDropIndicator;
  legendColorByName: Map<string, string>;
  productIconPath: string;
  productNameZh: string;
  productNameEn: string;
  productTagline: string;
  sortIcon: ReactNode;
  deleteIcon: ReactNode;
  formatMoney: HomeMoneyFormatter;
  canDeleteGroup: (groupId: string) => boolean;
  onGroupClick: (groupId: string) => void;
  onOpenAccount: (groupId: string, account: Account) => void;
  onDeleteGroup: (groupId: string) => void;
  onGroupPointerDown: (event: PointerEvent<HTMLButtonElement>, groupId: string) => void;
  onGroupPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onGroupPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onGroupPointerLeave: (event: PointerEvent<HTMLButtonElement>) => void;
  onGroupPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onGroupDragStart: (event: DragEvent<HTMLElement>, groupId: string) => void;
  onGroupDragOver: (event: DragEvent<HTMLElement>, groupId: string) => void;
  onGroupDragLeave: (event: DragEvent<HTMLElement>, groupId: string) => void;
  onGroupDrop: (event: DragEvent<HTMLElement>, groupId: string) => void;
  onGroupDragEnd: () => void;
};

function AssetOverviewPage({
  groups,
  expandedGroupIds,
  isGroupEditMode,
  draggingGroupId,
  groupDropIndicator,
  legendColorByName,
  productIconPath,
  productNameZh,
  productNameEn,
  productTagline,
  sortIcon,
  deleteIcon,
  formatMoney,
  canDeleteGroup,
  onGroupClick,
  onOpenAccount,
  onDeleteGroup,
  onGroupPointerDown,
  onGroupPointerMove,
  onGroupPointerUp,
  onGroupPointerLeave,
  onGroupPointerCancel,
  onGroupDragStart,
  onGroupDragOver,
  onGroupDragLeave,
  onGroupDrop,
  onGroupDragEnd
}: AssetOverviewPageProps) {
  return (
    <>
      <div style={{ display: 'grid', gap: 12 }}>
        {groups.map((group) => {
          const expanded = expandedGroupIds.includes(group.id);
          const currentCanDeleteGroup = canDeleteGroup(group.id);
          const groupDropPosition =
            groupDropIndicator?.groupId === group.id && draggingGroupId !== group.id
              ? groupDropIndicator.position
              : null;
          const legendColor = legendColorByName.get(group.name) ?? 'var(--chart-empty)';

          return (
            <section
              key={group.id}
              className={[
                'account-type-entry',
                groupDropPosition ? `account-type-entry--drop-${groupDropPosition}` : ''
              ]
                .filter(Boolean)
                .join(' ')}
              data-account-type-entry="true"
              data-account-type-drop-indicator={groupDropPosition ?? undefined}
              draggable={isGroupEditMode}
              onDragStart={(event) => onGroupDragStart(event, group.id)}
              onDragOver={(event) => onGroupDragOver(event, group.id)}
              onDragLeave={(event) => onGroupDragLeave(event, group.id)}
              onDrop={(event) => onGroupDrop(event, group.id)}
              onDragEnd={onGroupDragEnd}
              style={{
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-section)',
                background: 'var(--surface-soft)',
                overflow: 'hidden',
                opacity: draggingGroupId === group.id ? 0.54 : 1,
                transition: 'opacity 0.16s ease, box-shadow 0.16s ease',
                boxShadow: isGroupEditMode
                  ? '0 10px 26px rgba(52, 43, 30, 0.08)'
                  : 'none'
              }}
            >
              <button
                type="button"
                onPointerDown={(event) => onGroupPointerDown(event, group.id)}
                onPointerMove={onGroupPointerMove}
                onPointerUp={onGroupPointerUp}
                onPointerLeave={onGroupPointerLeave}
                onPointerCancel={onGroupPointerCancel}
                onClick={() => onGroupClick(group.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 16,
                  alignItems: 'center',
                  position: 'relative',
                  width: '100%',
                  border: 0,
                  padding: '16px 18px',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  cursor: isGroupEditMode ? 'grab' : 'pointer',
                  font: 'inherit',
                  textAlign: 'left'
                }}
              >
                <div style={{ opacity: isGroupEditMode ? 0.62 : 1 }}>
                  <h2 className="account-type-entry-title">
                    <span
                      className="account-type-legend-swatch"
                      style={{ background: legendColor }}
                      aria-hidden="true"
                    />
                    <span>{group.name}</span>
                  </h2>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                    {group.activeAccounts.length} 个账户
                  </p>
                </div>
                <div style={{ textAlign: 'right', opacity: isGroupEditMode ? 0.62 : 1 }}>
                  <strong style={{ display: 'block', fontSize: '1.06rem' }}>
                    {formatMoney(group.total)}
                  </strong>
                  <span
                    style={{
                      color: group.percentageColor,
                      fontSize: '0.88rem'
                    }}
                  >
                    {group.percentageLabel}
                  </span>
                </div>
              </button>

              {isGroupEditMode ? (
                <div className="account-type-entry-actions" data-interactive>
                  <button
                    type="button"
                    className={[
                      'account-type-action-button',
                      'account-type-action-button--sort',
                      draggingGroupId === group.id ? 'is-active' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={`拖拽排序 ${group.name}`}
                    title="拖拽排序"
                    data-interactive
                    onClick={(event) => event.stopPropagation()}
                  >
                    {sortIcon}
                  </button>
                  <button
                    type="button"
                    className="account-type-action-button account-type-action-button--delete"
                    aria-label={`删除账户类型 ${group.name}`}
                    title={currentCanDeleteGroup ? '删除账户类型' : '请先归档或删除未归档账户'}
                    data-interactive
                    disabled={!currentCanDeleteGroup}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteGroup(group.id);
                    }}
                  >
                    {deleteIcon}
                  </button>
                </div>
              ) : null}

              {expanded ? (
                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    borderTop: '1px solid var(--border-soft)',
                    padding: 10
                  }}
                >
                  {group.activeAccounts.length === 0 ? (
                    <p style={{ margin: '6px 8px', color: 'var(--text-muted)' }}>暂无账户</p>
                  ) : (
                    group.activeAccounts.map((account) => (
                      <button
                        key={account.id}
                        id={`account-row-${account.id}`}
                        type="button"
                        onClick={() => onOpenAccount(group.id, account)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          border: '1px solid transparent',
                          borderRadius: 'var(--radius-card)',
                          background: 'var(--surface-muted)',
                          boxShadow: 'none',
                          padding: '9px 10px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          font: 'inherit',
                          textAlign: 'left'
                        }}
                      >
                        <AccountMark account={account} className="account-mark--list" />
                        <span style={{ flex: 1 }}>{account.name}</span>
                        <span style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block' }}>
                            {formatMoney(account.amount)}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              color: group.percentageColor,
                              fontSize: '0.78rem'
                            }}
                          >
                            {account.percentageLabel}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <footer
        aria-label="产品信息"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 24,
          paddingTop: 18,
          borderTop: '1px solid var(--border-soft)',
          color: 'var(--text-muted)'
        }}
      >
        <img
          src={productIconPath}
          alt=""
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            display: 'block',
            objectFit: 'contain',
            borderRadius: 0,
            flex: '0 0 auto'
          }}
        />
        <span style={{ display: 'grid', gap: 2 }}>
          <strong style={{ color: 'var(--text-main)', fontSize: '0.94rem' }}>
            {productNameZh} {productNameEn}
          </strong>
          <span style={{ fontSize: '0.84rem' }}>{productTagline}</span>
        </span>
      </footer>
    </>
  );
}

export default AssetOverviewPage;
