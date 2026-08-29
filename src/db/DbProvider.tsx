import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ensureBaby, getBaby } from '@/db/api';
import type { Baby } from '@/db/types';
import { scheduleSync } from '@/lib/sync';

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
    ensureBaby()
      .then((row) => {
        setBaby(row);
        setReady(true);
        scheduleSync(400);
      })
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    const onChange = () => {
      setTick((n) => n + 1);
      getBaby().then((row) => setBaby(row ?? null));
      scheduleSync();
    };
    const onOnline = () => scheduleSync(200);
    window.addEventListener('abel-db', onChange);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('abel-db', onChange);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return <DbContext.Provider value={{ baby, tick, ready }}>{children}</DbContext.Provider>;
}

export function useDb() {
  return useContext(DbContext);
}
