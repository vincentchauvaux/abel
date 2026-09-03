import {
  collectPending,
  getBaby,
  isPlaceholderBaby,
  markPushed,
  mirrorRemoteSnapshot,
  type SyncPayload,
} from '@/db/api';
import { notifyDb } from '@/db/client';
import { clearAuthToken, readGoogleToken, SYNC_URL } from '@/lib/google';

export type SyncState = 'idle' | 'syncing' | 'ok' | 'auth' | 'offline' | 'error' | 'rate_limit';

let inFlight = false;
let pullInFlight = false;
let queued = false;
let skipSchedule = false;
let timer: number | null = null;
let pullTimer: number | null = null;
let lastState: SyncState = 'idle';
let rateLimitUntil = 0;
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

export function scheduleSync(delayMs = 2500) {
  if (skipSchedule) return;
  if (inFlight) {
    queued = true;
    return;
  }
  const wait = Math.max(delayMs, Math.max(0, rateLimitUntil - Date.now()));
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void runSync();
  }, wait);
}

/** Push d’abord s’il y a du pending, sinon pull. Pour le retour d’onglet / le tick co-parent. */
export function scheduleRefresh(delayMs = 0) {
  if (skipSchedule) return;
  if (!readGoogleToken() || !navigator.onLine) return;
  if (pullTimer) window.clearTimeout(pullTimer);
  pullTimer = window.setTimeout(() => {
    pullTimer = null;
    void refreshFromServer();
  }, delayMs);
}

async function refreshFromServer() {
  if (inFlight || pullInFlight) return;
  const changes = await collectPending();
  const hasPending = Object.values(changes).some((rows) => (rows?.length ?? 0) > 0);
  if (hasPending) {
    await runSync();
    return;
  }
  await pullFromServer();
}

type SyncResponse = {
  babyId: string | null;
  records: SyncPayload;
};

type FetchResult = SyncResponse | 'auth' | 'error' | 'rate_limit';

async function fetchRemoteSnapshot(
  token: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<FetchResult> {
  const res = await fetch(`${SYNC_URL}/sync`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    clearAuthToken();
    return 'auth';
  }
  if (res.status === 429) return 'rate_limit';
  if (!res.ok) return 'error';
  return (await res.json()) as SyncResponse;
}

function handleRateLimit() {
  rateLimitUntil = Date.now() + 60_000;
  setState('rate_limit');
}

/** Télécharge le snapshot VPS et remplace le cache local. */
export async function pullFromServer(): Promise<boolean> {
  if (pullInFlight || inFlight) return false;
  const token = readGoogleToken();
  if (!token || !navigator.onLine) return false;

  pullInFlight = true;
  try {
    const payload = await fetchRemoteSnapshot(token, 'GET');
    if (payload === 'auth') {
      setState('auth');
      return false;
    }
    if (payload === 'rate_limit') {
      handleRateLimit();
      return false;
    }
    if (payload === 'error') return false;
    if (!payload.babyId) return false;

    await mirrorRemoteSnapshot(payload.records, payload.babyId);
    skipSchedule = true;
    notifyDb('normal', { silent: true });
    skipSchedule = false;
    setState('ok');
    return true;
  } finally {
    pullInFlight = false;
  }
}

export async function runSync(): Promise<SyncState> {
  if (inFlight) {
    queued = true;
    return lastState;
  }
  if (Date.now() < rateLimitUntil) {
    setState('rate_limit');
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
  let shouldRetry = false;
  let hadPending = false;
  try {
    const local = await getBaby();
    const skipPlaceholder = local ? await isPlaceholderBaby(local) : false;

    if (skipPlaceholder) {
      const pulled = await pullFromServer();
      if (pulled) return lastState;
      if (lastState === 'rate_limit') return lastState;
    }

    const changes = await collectPending({ skipPlaceholderBaby: skipPlaceholder });
    hadPending = Object.values(changes).some((rows) => (rows?.length ?? 0) > 0);
    if (hadPending) setState('syncing');

    const payload = await fetchRemoteSnapshot(token, 'POST', { changes });
    if (payload === 'auth') {
      setState('auth');
      return lastState;
    }
    if (payload === 'rate_limit') {
      handleRateLimit();
      return lastState;
    }
    if (payload === 'error') throw new Error('sync');

    await markPushed(changes);
    await mirrorRemoteSnapshot(payload.records, payload.babyId);
    skipSchedule = true;
    notifyDb('normal', { silent: !hadPending });
    skipSchedule = false;
    setState('ok');
    return lastState;
  } catch {
    setState(navigator.onLine ? 'error' : 'offline');
    return lastState;
  } finally {
    inFlight = false;
    if (queued && lastState !== 'rate_limit') {
      queued = false;
      shouldRetry = true;
    } else {
      queued = false;
    }
    if (shouldRetry) scheduleSync(3000);
  }
}
