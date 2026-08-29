import { db } from '@/db/client';
import { SYNC_TABLES } from '@/db/api';
import { clearLegalConsent } from '@/lib/consent';
import { readGoogleToken, signOutGoogle, SYNC_URL } from '@/lib/google';

const HOROSCOPE_CACHE_PREFIX = 'abel-horoscope-';

export async function exportLocalData(): Promise<Record<string, unknown>> {
  const tables: Record<string, unknown[]> = {};
  for (const name of SYNC_TABLES) {
    tables[name] = await db.table(name).toArray();
  }
  return {
    app: 'Abel',
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function wipeLocalData() {
  await db.transaction('rw', SYNC_TABLES.map((name) => db.table(name)), async () => {
    for (const name of SYNC_TABLES) {
      await db.table(name).clear();
    }
  });
  signOutGoogle();
  clearLegalConsent();
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(HOROSCOPE_CACHE_PREFIX)) localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event('abel-db'));
}

export async function deleteRemoteAccount(): Promise<'ok' | 'auth' | 'error'> {
  const token = readGoogleToken();
  if (!token) return 'auth';
  try {
    const res = await fetch(`${SYNC_URL}/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return 'auth';
    if (!res.ok) return 'error';
    return 'ok';
  } catch {
    return 'error';
  }
}
