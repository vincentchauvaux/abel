import type { BottleAmountEntry, BottleFeed } from '@/db/types';

export function bottleAmountHistory(row: BottleFeed): BottleAmountEntry[] {
  if (row.amountHistory?.length) {
    return [...row.amountHistory].sort((a, b) => b.at.localeCompare(a.at));
  }
  return [{ at: row.fedAt, amountMl: row.amountMl }];
}
