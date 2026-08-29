import { applyRemoteRecords, collectPending, markPushed } from '@/db/api';
import { notifyDb } from '@/db/client';
import { readGoogleToken, SYNC_URL } from '@/lib/google';

export type SyncState = 'idle' | 'syncing' | 'ok' | 'auth' | 'offline' | 'error';

let inFlight = false;
let queued = false;
let skipSchedule = false;
let timer: number | null = null;
let lastState: SyncState = 'idle';
const listeners = new Set<(state: SyncState) => void>();

function setState(state: SyncState) {
  lastState = state;
  listeners.forEach((fn) => fn(state));
}

export function subscribeSync(fn: (state: SyncState) => void) {
  listeners.add(fn);
  fn(lastState);
  return () => {
    listeners.delete(fn);
  };
}

export function scheduleSync(delayMs = 1200) {
  if (skipSchedule) return;
  if (inFlight) {
    queued = true;
    return;
  }
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void runSync();
  }, delayMs);
}

export async function runSync(): Promise<SyncState> {
  if (inFlight) {
    queued = true;
    return lastState;
  }
  const token = readGoogleToken();
  if (!token) {
    setState(navigator.onLine ? 'auth' : 'offline');
    return lastState;
  }
  if (!navigator.onLine) {
    setState('offline');
    return lastState;
  }

  inFlight = true;
  setState('syncing');
  try {
    const changes = await collectPending();
    const res = await fetch(`${SYNC_URL}/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ changes }),
    });
    if (res.status === 401) {
      setState('auth');
      return lastState;
    }
    if (!res.ok) throw new Error('sync');
    const payload = (await res.json()) as {
      babyId: string | null;
      records: Parameters<typeof applyRemoteRecords>[0];
    };
    await markPushed(changes);
    await applyRemoteRecords(payload.records, payload.babyId);
    skipSchedule = true;
    notifyDb();
    skipSchedule = false;
    setState('ok');
    return lastState;
  } catch {
    setState(navigator.onLine ? 'error' : 'offline');
    return lastState;
  } finally {
    inFlight = false;
    if (queued) {
      queued = false;
      scheduleSync(400);
    }
  }
}
