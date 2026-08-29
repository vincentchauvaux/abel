import { SYNC_URL } from '@/lib/google';
import { horoscopeFor } from '@/lib/horoscope';

export type DailyHoroscope = {
  text: string;
  source: 'api' | 'cache' | 'offline';
};

const cacheKey = (signEn: string, day: string) => `abel-horoscope:${signEn}:${day}`;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchDailyHoroscope(bornOn: string): Promise<DailyHoroscope> {
  const { signEn } = horoscopeFor(bornOn);
  const day = todayKey();
  const stored = localStorage.getItem(cacheKey(signEn, day));
  if (stored) return { text: stored, source: 'cache' };
  if (!navigator.onLine) {
    return { text: horoscopeFor(bornOn).line, source: 'offline' };
  }
  try {
    const res = await fetch(`${SYNC_URL}/horoscope?sign=${encodeURIComponent(signEn)}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error('http');
    const data = (await res.json()) as { daily?: string };
    const text = data.daily?.trim();
    if (!text) throw new Error('empty');
    localStorage.setItem(cacheKey(signEn, day), text);
    return { text, source: 'api' };
  } catch {
    return { text: horoscopeFor(bornOn).line, source: 'offline' };
  }
}
