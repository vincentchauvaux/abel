import type { PumpingSession } from '@/db/types';
import { formatTime } from '@/lib/dates';

/** Jour : 7 h–19 h locales. Nuit sinon. */
export function isDayMilk(iso: string): boolean {
  const hour = new Date(iso).getHours();
  return hour >= 7 && hour < 19;
}

export function stockIdLabel(stockNo: number | null | undefined): string {
  return typeof stockNo === 'number' && stockNo > 0 ? `ID ${stockNo}` : 'ID —';
}

export function formatStockWhen(iso: string): string {
  const date = new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${date} · ${formatTime(iso)}`;
}

export function sortStockNewestFirst(rows: PumpingSession[]): PumpingSession[] {
  return [...rows].sort(
    (a, b) => b.startedAt.localeCompare(a.startedAt) || (b.stockNo ?? 0) - (a.stockNo ?? 0),
  );
}
