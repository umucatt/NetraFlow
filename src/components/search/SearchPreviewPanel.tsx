import type { ReactNode } from 'react';
import type { AssetGroup, GlobalSearchResult, HistoryRecord } from '../../search/searchTypes';
import RightPanelActionButton from '../rightPanel/RightPanelActionButton';

type SearchPreviewPanelProps = {
  hasQuery: boolean;
  focusedResult: GlobalSearchResult | null;
  sortedHistory: HistoryRecord[];
  onOpenResult: (result: GlobalSearchResult) => void;
  onCloseSearch: () => void;
  formatMoney: (amount: number | null) => string;
  formatShortTime: (time: string) => string;
  getAmountChange: (record: HistoryRecord) => { label: string };
  getAccountNatureLabel: (nature: AssetGroup['nature']) => string;
};

const getSearchPreviewTypeLabel = (result: GlobalSearchResult) => {
  if (result.category === 'account') {
    return '账户';
  }

  if (result.category === 'history') {
    return '历史记录';
  }

  if (result.category === 'snapshot') {
    return '快照';
  }

  return '设置';
};

const getSearchPreviewNote = (result: GlobalSearchResult) => {
  if (result.category === 'history') {
    return result.record.note ?? '';
  }

  if (result.category === 'settings') {
    return result.item.description;
  }

  if (result.category === 'snapshot') {
    return `历史记录 ${result.record.historyCount} · 增量 ${result.record.incrementCount}`;
  }

  if (result.account.archived) {
    return '已归档账户';
  }

  return '';
};

const getSearchAccountLastUpdateLabel = (records: HistoryRecord[]) => {
  const latestRecord = records[0];

  if (!latestRecord) {
    return '暂无更新';
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const latestDate = new Date(latestRecord.time);
  const targetStart = Number.isFinite(latestDate.getTime())
    ? new Date(latestDate.getFullYear(), latestDate.getMonth(), latestDate.getDate()).getTime()
    : todayStart;
  const dayDistance = Math.max(0, Math.floor((todayStart - targetStart) / dayMs));

  return dayDistance === 0 ? '今天' : `${dayDistance}天前`;
};

const getHistoryPreviewSourceLabel = (record: HistoryRecord) => {
  if (record.source === 'flash-note') {
    return '闪记';
  }

  if (record.source === 'rollup' || record.relatedTime) {
    return '汇总导入';
  }

  return '手动';
};

const getHistoryPreviewTypeModeLabel = (
  result: Extract<GlobalSearchResult, { category: 'history' }>
) => {
  const matchField = result.matchedAmount?.field ?? result.primaryMatch.field;
  const mode =
    matchField === 'balanceBefore' || matchField === 'balanceAfter' ? 'balance' : 'change';

  return `${result.record.type}-${mode}`;
};

function SearchPreviewPanel({
  hasQuery,
  focusedResult,
  sortedHistory,
  onOpenResult,
  onCloseSearch,
  formatMoney,
  formatShortTime,
  getAmountChange,
  getAccountNatureLabel
}: SearchPreviewPanelProps) {
  const getSearchAccountHistoryRecords = (
    result: Extract<GlobalSearchResult, { category: 'account' }>
  ) =>
    sortedHistory.filter(
      (record) =>
        record.accountId === result.account.id ||
        (record.groupName === result.group.name && record.accountName === result.account.name)
    );

  const renderSearchPreviewLead = (result: GlobalSearchResult) => {
    if (result.category === 'snapshot') {
      return null;
    }

    if (result.category === 'account') {
      return (
        <p>
          {result.group.name} · {getAccountNatureLabel(result.group.nature)} ·{' '}
          {result.group.includeInStats ? '参与统计' : '不参与统计'}
        </p>
      );
    }

    if (result.category === 'settings') {
      return <p>{result.subtitle}</p>;
    }

    return null;
  };

  const renderSearchPreviewValue = (result: GlobalSearchResult) => {
    if (
      result.category === 'account' ||
      result.category === 'history' ||
      result.category === 'snapshot'
    ) {
      return null;
    }

    return <em>{result.value}</em>;
  };

  const renderSearchPreviewDetails = (result: GlobalSearchResult): ReactNode => {
    if (result.category === 'account') {
      const accountHistoryRecords = getSearchAccountHistoryRecords(result);

      return (
        <div className="search-preview-details">
          <div>
            <span>当前余额</span>
            <strong>{result.value}</strong>
          </div>
          <div>
            <span>上次更新</span>
            <strong>{getSearchAccountLastUpdateLabel(accountHistoryRecords)}</strong>
          </div>
          <div>
            <span>历史记录</span>
            <strong>{accountHistoryRecords.length}条历史记录</strong>
          </div>
        </div>
      );
    }

    if (result.category === 'snapshot') {
      return (
        <div className="search-preview-details">
          <div>
            <span>快照类型</span>
            <strong>{result.subtitle}</strong>
          </div>
          <div>
            <span>历史记录</span>
            <strong>{result.record.historyCount}</strong>
          </div>
          <div>
            <span>增量记录</span>
            <strong>{result.record.incrementCount}</strong>
          </div>
        </div>
      );
    }

    if (result.category !== 'history') {
      return <small className="right-panel-preview__note">{getSearchPreviewNote(result)}</small>;
    }

    const record = result.record;
    const change = getAmountChange(record);
    const sourceLabel = getHistoryPreviewSourceLabel(record);

    return (
      <div className="search-preview-details">
        <div>
          <span>记录类型</span>
          <strong>{getHistoryPreviewTypeModeLabel(result)}</strong>
        </div>
        <div>
          <span>时间</span>
          <strong>{formatShortTime(record.time)}</strong>
        </div>
        <div>
          <span>余额变化</span>
          <strong>
            {formatMoney(record.beforeAmount)} → {formatMoney(record.afterAmount)}
          </strong>
        </div>
        <div>
          <span>净变动</span>
          <strong>{change.label}</strong>
        </div>
        <div>
          <span>来源</span>
          <strong>{sourceLabel}</strong>
        </div>
        <div className="search-preview-details__note">
          <span>备注</span>
          <p>{record.note ?? ''}</p>
        </div>
      </div>
    );
  };

  return (
    <section className="right-panel-page right-panel-page--search-preview">
      <div className="right-panel-title-row">
        <h2 className="right-panel-title">搜索结果预览</h2>
      </div>
      <div className="right-panel-stack">
      {!hasQuery ? (
        <>
          <article className="right-panel-preview right-panel-preview--search-empty">
            <span className="global-search-preview-empty">键入关键词开始搜索</span>
          </article>
          <RightPanelActionButton label="退出搜索" onClick={onCloseSearch} />
        </>
      ) : focusedResult ? (
        <>
          <article className="right-panel-preview right-panel-preview--search-result">
            <span>{getSearchPreviewTypeLabel(focusedResult)}</span>
            <strong>{focusedResult.title}</strong>
            {renderSearchPreviewLead(focusedResult)}
            {renderSearchPreviewValue(focusedResult)}
            {renderSearchPreviewDetails(focusedResult)}
          </article>
          <RightPanelActionButton
            label="打开 / 定位"
            tone="primary"
            onClick={() => onOpenResult(focusedResult)}
          />
          <RightPanelActionButton label="退出搜索" onClick={onCloseSearch} />
        </>
      ) : (
        <>
          <article className="right-panel-preview right-panel-preview--search-empty">
            <span className="global-search-preview-empty">暂无预览项</span>
          </article>
          <RightPanelActionButton label="退出搜索" onClick={onCloseSearch} />
        </>
      )}
      </div>
    </section>
  );
}

export default SearchPreviewPanel;
