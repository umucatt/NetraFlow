import type { ReactNode } from 'react';
import { ARCHIVED_CHART_BADGE_LABEL } from '../../chartLogic';

export type ChartLegendItemData = {
  id: string;
  label: string;
  color: string;
  value?: ReactNode;
  detail?: ReactNode;
  swatch?: 'block' | 'line';
  archived?: boolean;
};

export const getInteractiveChartClassName = (
  baseClassName: string,
  id: string,
  activeId: string | null | undefined
) =>
  [
    baseClassName,
    activeId === id ? 'is-active' : '',
    activeId && activeId !== id ? 'is-dimmed' : ''
  ]
    .filter(Boolean)
    .join(' ');

type ChartLegendListProps = {
  items: ChartLegendItemData[];
  emptyMessage: string;
  activeId?: string | null;
  onActiveIdChange?: (id: string | null) => void;
  className?: string;
};

function ChartLegendList({
  items,
  emptyMessage,
  activeId,
  onActiveIdChange,
  className = ''
}: ChartLegendListProps) {
  return (
    <div className={`chart-legend-list${className ? ` ${className}` : ''}`} role="list">
      {items.length === 0 ? (
        <p className="asset-chart-empty">{emptyMessage}</p>
      ) : (
        items.map((item) => (
          <div
            key={`${item.id}-${item.color}`}
            role="listitem"
            tabIndex={onActiveIdChange ? 0 : undefined}
            className={getInteractiveChartClassName('chart-legend-item', item.id, activeId)}
            onMouseEnter={() => onActiveIdChange?.(item.id)}
            onMouseLeave={() => onActiveIdChange?.(null)}
            onFocus={() => onActiveIdChange?.(item.id)}
            onBlur={() => onActiveIdChange?.(null)}
          >
            <span className="chart-legend-item__identity">
              <span
                aria-hidden="true"
                className={`chart-legend-item__swatch chart-legend-item__swatch--${item.swatch ?? 'block'}`}
                style={{ background: item.color }}
              />
              <strong>{item.label}</strong>
              {item.archived ? (
                <span className="chart-legend-item__archived">
                  {ARCHIVED_CHART_BADGE_LABEL}
                </span>
              ) : null}
            </span>
            {item.value !== undefined ? (
              <span className="chart-legend-item__metric chart-legend-item__metric--value">
                {item.value}
              </span>
            ) : null}
            {item.detail !== undefined ? (
              <span className="chart-legend-item__metric chart-legend-item__metric--detail">
                {item.detail}
              </span>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

export default ChartLegendList;
