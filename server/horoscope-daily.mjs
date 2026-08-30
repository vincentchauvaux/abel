import pools from '../shared/horoscope-daily-pools.json' with { type: 'json' };

export function dailyLineFor(sign, day) {
  const key = String(sign || '').toLowerCase();
  const list = pools[key];
  if (!list?.length) return '';
  const hash = [...`${key}:${day}`].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return list[hash % list.length];
}
