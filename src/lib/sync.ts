import {
  collectPending,
  getBaby,
  isPlaceholderBaby,
  markPushed,
  mirrorRemoteSnapshot,
  type SyncPayload,
} from '@/db/api';
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

type SyncResponse = {
  babyId: string | null;
  records: SyncPayload;
};

async function fetchRemoteSnapshot(token: string, method: 'GET' | 'POST', body?: unknown): Promise<SyncResponse | 'auth' | 'error'> {
  const res = await fetch(`${SYNC_URL}/sync`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) return 'auth';
  if (!res.ok) return 'error';
  return (await res.json()) as SyncResponse;
}

/** Télécharge le snapshot VPS et remplace le cache local. */
export async function pullFromServer(): Promise<boolean> {
  const token = readGoogleToken();
  if (!token || !navigator.onLine) return false;

  const payload = await fetchRemoteSnapshot(token, 'GET');
  if (payload === 'auth') {
    setState('auth');
    return false;
  }
  if (payload === 'error') return false;
  if (!payload.babyId) return false;

  await mirrorRemoteSnapshot(payload.records, payload.babyId);
  skipSchedule = true;
  notifyDb();
  skipSchedule = false;
  setState('ok');
  return true;
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
    const local = await getBaby();
    const skipPlaceholder = local ? await isPlaceholderBaby(local) : false;

    if (skipPlaceholder) {
      const pulled = await pullFromServer();
      if (pulled) return lastState;
    }

    const changes = await collectPending({ skipPlaceholderBaby: skipPlaceholder });
    const payload = await fetchRemoteSnapshot(token, 'POST', { changes });
    if (payload === 'auth') {
      setState('auth');
      return lastState;
    }
    if (payload === 'error') throw new Error('sync');

    await markPushed(changes);
    await mirrorRemoteSnapshot(payload.records, payload.babyId);
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
