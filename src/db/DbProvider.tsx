import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ensureBaby, getBaby } from '@/db/api';
import type { Baby } from '@/db/types';
import { readGoogleToken } from '@/lib/google';
import { fetchSharing } from '@/lib/sharing';
import { pullFromServer, schedulePull, scheduleSync } from '@/lib/sync';

type DbContextValue = {
  baby: Baby | null;
  tick: number;
  ready: boolean;
  pendingInvitesCount: number;
  refreshSharing: () => Promise<void>;
};

const DbContext = createContext<DbContextValue>({
  baby: null,
  tick: 0,
  ready: false,
  pendingInvitesCount: 0,
  refreshSharing: async () => {},
});

export function DbProvider({ children }: { children: ReactNode }) {
  const [baby, setBaby] = useState<Baby | null>(null);
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  const refreshSharing = async () => {
    if (!readGoogleToken()) {
      setPendingInvitesCount(0);
      return;
    }
    const state = await fetchSharing();
    if (state === 'auth' || state === 'error' || state === 'rate_limit' || 'error' in state) {
      setPendingInvitesCount(0);
      return;
    }
    setPendingInvitesCount(state.pendingInvitesCount);
  };

  useEffect(() => {
    void (async () => {
      try {
        if (readGoogleToken() && navigator.onLine) {
          const pulled = await pullFromServer();
          if (pulled) {
            setBaby((await getBaby()) ?? null);
            setReady(true);
            await refreshSharing();
            scheduleSync(400);
            return;
          }
        }
        const row = await ensureBaby();
        setBaby(row);
        setReady(true);
        await refreshSharing();
        scheduleSync(400);
      } catch {
        const row = await ensureBaby();
        setBaby(row);
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    const syncTimer = { id: 0 };
    const onChange = (event: Event) => {
      const urgent = (event as CustomEvent<{ priority?: string }>).detail?.priority === 'urgent';
      setTick((n) => n + 1);
      getBaby().then((row) => setBaby(row ?? null));
      if (syncTimer.id) window.clearTimeout(syncTimer.id);
      syncTimer.id = window.setTimeout(
        () => scheduleSync(urgent ? 250 : 700),
        urgent ? 350 : 1200,
      );
    };
    const onOnline = () => {
      scheduleSync(800);
      schedulePull(0);
      void refreshSharing();
    };
    const onVisible = () => {
      if (document.hidden || !readGoogleToken() || !navigator.onLine) return;
      schedulePull(0);
      scheduleSync(800);
    };
    const pullInterval = window.setInterval(() => {
      if (document.hidden || !readGoogleToken() || !navigator.onLine) return;
      schedulePull(0);
    }, 20_000);

    window.addEventListener('abel-db', onChange);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('abel-db', onChange);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(pullInterval);
      if (syncTimer.id) window.clearTimeout(syncTimer.id);
    };
  }, []);

  return (
    <DbContext.Provider value={{ baby, tick, ready, pendingInvitesCount, refreshSharing }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}
