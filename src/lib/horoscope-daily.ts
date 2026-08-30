import pools from '../../shared/horoscope-daily-pools.json';

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function dailyLineFor(signEn: string, day = todayKey()): string {
  const list = pools[signEn as keyof typeof pools];
  if (!list?.length) return '';
  const hash = [...`${signEn}:${day}`].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return list[hash % list.length];
}
