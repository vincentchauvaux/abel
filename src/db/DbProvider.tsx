import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ensureBaby, getBaby } from '@/db/api';
import type { Baby } from '@/db/types';
import { readGoogleToken } from '@/lib/google';
import { pullFromServer, scheduleSync } from '@/lib/sync';

type DbContextValue = {
  baby: Baby | null;
  tick: number;
  ready: boolean;
};

const DbContext = createContext<DbContextValue>({ baby: null, tick: 0, ready: false });

export function DbProvider({ children }: { children: ReactNode }) {
  const [baby, setBaby] = useState<Baby | null>(null);
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        if (readGoogleToken() && navigator.onLine) {
          const pulled = await pullFromServer();
          if (pulled) {
            setBaby((await getBaby()) ?? null);
            setReady(true);
            scheduleSync(400);
            return;
          }
        }
        const row = await ensureBaby();
        setBaby(row);
        setReady(true);
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
    const onChange = () => {
      setTick((n) => n + 1);
      getBaby().then((row) => setBaby(row ?? null));
      if (syncTimer.id) window.clearTimeout(syncTimer.id);
      syncTimer.id = window.setTimeout(() => scheduleSync(3000), 3000);
    };
    const onOnline = () => scheduleSync(2000);
    window.addEventListener('abel-db', onChange);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('abel-db', onChange);
      window.removeEventListener('online', onOnline);
      if (syncTimer.id) window.clearTimeout(syncTimer.id);
    };
  }, []);

  return <DbContext.Provider value={{ baby, tick, ready }}>{children}</DbContext.Provider>;
}

export function useDb() {
  return useContext(DbContext);
}
