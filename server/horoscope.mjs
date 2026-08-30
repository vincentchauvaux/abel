import { dailyLineFor } from './horoscope-daily.mjs';

const cache = new Map();

const SIGNS = new Set([
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
]);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fromOhmanda(sign) {
  const res = await fetch(`https://ohmanda.com/api/horoscope/${sign}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('ohmanda');
  const data = await readJson(res);
  const text = data?.horoscope;
  if (!text) throw new Error('ohmanda-empty');
  return String(text);
}

async function fromViewbits(sign) {
  const res = await fetch(`https://api.viewbits.com/v1/horoscope?sign=${sign}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('viewbits');
  const data = await readJson(res);
  const text = data?.prediction;
  if (!text) throw new Error('viewbits-empty');
  return String(text);
}

async function toFrench(text) {
  if (!text) return '';
  const looksEnglish = /\b(the|and|you|your|today|energy|dear)\b/i.test(text);
  if (!looksEnglish) return text;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=en|fr`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return text;
  const data = await readJson(res);
  const translated = data?.responseData?.translatedText;
  return translated && !translated.includes('MYMEMORY') ? translated : text;
}

export async function dailyHoroscope(sign) {
  const key = String(sign || '').toLowerCase();
  if (!SIGNS.has(key)) return null;
  const day = todayKey();
  const cacheId = `${key}:${day}`;
  if (cache.has(cacheId)) return cache.get(cacheId);

  let raw = '';
  let source = 'local';
  try {
    raw = await fromOhmanda(key);
    source = 'ohmanda';
  } catch {
    try {
      raw = await fromViewbits(key);
      source = 'viewbits';
    } catch {
      raw = '';
    }
  }

  let daily = '';
  if (raw) {
    daily = await toFrench(raw);
    source = `${source}-fr`;
  } else {
    daily = dailyLineFor(key, day);
  }

  const payload = { sign: key, daily, source, day };
  if (daily) cache.set(cacheId, payload);
  return payload;
}
