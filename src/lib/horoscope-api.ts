import { SYNC_URL } from '@/lib/google';
import { dailyLineFor, todayKey } from '@/lib/horoscope-daily';
import { horoscopeFor } from '@/lib/horoscope';

export type DailyHoroscope = {
  text: string;
  source: 'api' | 'cache' | 'offline';
};

const cacheKey = (signEn: string, day: string) => `abel-horoscope-v3:${signEn}:${day}`;

function isRemoteSource(source?: string) {
  return Boolean(source && source !== 'local');
}

export async function fetchDailyHoroscope(
  bornOn: string,
  opts?: { force?: boolean },
): Promise<DailyHoroscope> {
  const { signEn } = horoscopeFor(bornOn);
  const day = todayKey();
  const localFallback = dailyLineFor(signEn, day) || horoscopeFor(bornOn).line;

  if (!opts?.force) {
    const stored = localStorage.getItem(cacheKey(signEn, day));
    if (stored) return { text: stored, source: 'cache' };
  }

  if (!navigator.onLine) {
    return { text: localFallback, source: 'offline' };
  }

  try {
    const res = await fetch(`${SYNC_URL}/horoscope?sign=${encodeURIComponent(signEn)}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error('http');
    const data = (await res.json()) as { daily?: string; source?: string };
    const text = data.daily?.trim();
    if (!text) throw new Error('empty');
    if (isRemoteSource(data.source)) {
      localStorage.setItem(cacheKey(signEn, day), text);
      return { text, source: 'api' };
    }
    return { text, source: 'offline' };
  } catch {
    return { text: localFallback, source: 'offline' };
  }
}
