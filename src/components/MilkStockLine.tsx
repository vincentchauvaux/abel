import { Moon, Sun } from 'lucide-react';

import type { PumpingSession } from '@/db/types';
import { formatStockWhen, isDayMilk, stockIdLabel } from '@/lib/milk-stock';

export function MilkStockLine({
  row,
  selected = false,
  onClick,
}: {
  row: PumpingSession;
  selected?: boolean;
  onClick?: () => void;
}) {
  const daytime = isDayMilk(row.startedAt);
  const Icon = daytime ? Sun : Moon;
  const period = daytime ? 'Jour' : 'Nuit';
  const inner = (
    <>
      <span className="stock-line-body">
        <span>
          <strong>{stockIdLabel(row.stockNo)}</strong>
          <span className="muted"> : {formatStockWhen(row.startedAt)}</span>
        </span>
        <span className="muted">{row.remainingMl ?? 0} ml restants</span>
      </span>
      <span className={`stock-line-period${daytime ? ' is-day' : ' is-night'}`} title={period}>
        <Icon size={20} strokeWidth={2.2} aria-hidden />
        <span className="sr-only">{period}</span>
      </span>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={`stock-line${selected ? ' is-selected' : ''}`}
        onClick={onClick}
        aria-pressed={selected}>
        {inner}
      </button>
    );
  }
  return <div className="stock-line">{inner}</div>;
}
