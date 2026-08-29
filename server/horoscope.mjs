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

async function fromAztro(sign) {
  const res = await fetch(`https://aztro.sameerkumar.website/?sign=${sign}&day=today`, {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('aztro');
  const data = await readJson(res);
  const description = data?.description;
  if (!description) throw new Error('aztro-empty');
  return String(description);
}

async function fromVercel(sign) {
  const res = await fetch(
    `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${sign}&day=TODAY`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error('vercel');
  const data = await readJson(res);
  const text = data?.data?.horoscope_data || data?.horoscope_data || data?.horoscope;
  if (!text) throw new Error('vercel-empty');
  return String(text);
}

async function toFrench(text) {
  if (!text) return '';
  const looksEnglish = /\b(the|and|you|your|today|energy)\b/i.test(text);
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
  const cacheId = `${key}:${todayKey()}`;
  if (cache.has(cacheId)) return cache.get(cacheId);
  let raw = '';
  let source = 'offline';
  try {
    raw = await fromAztro(key);
    source = 'aztro';
  } catch {
    try {
      raw = await fromVercel(key);
      source = 'vercel';
    } catch {
      raw = '';
    }
  }
  const daily = raw ? await toFrench(raw) : '';
  const payload = { sign: key, daily, source, day: todayKey() };
  if (daily) cache.set(cacheId, payload);
  return payload;
}
