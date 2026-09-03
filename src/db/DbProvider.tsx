import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ensureBaby, getBaby } from '@/db/api';
import type { Baby } from '@/db/types';
import { ensureAbelSession, readGoogleToken, readGoogleUser } from '@/lib/google';
import { fetchSharing, pushLocalProfile, type SharingMember, type SharingRole } from '@/lib/sharing';
import { pullFromServer, schedulePull, scheduleSync } from '@/lib/sync';

const SHARING_META_KEY = 'abel-sharing-meta';

export type SharingActor = {
  userId: string;
  name: string;
  picture: string;
};

type SharingMeta = {
  role: SharingRole | null;
  members: SharingActor[];
};

function overlaySelf(members: SharingActor[]): SharingActor[] {
  const self = readGoogleUser();
  if (!self) return members;
  return members.map((row) =>
    row.userId === self.sub
      ? { ...row, name: row.name || self.name, picture: row.picture || self.picture }
      : row,
  );
}

function actorsFromMembers(members: SharingMember[]): SharingActor[] {
  const self = readGoogleUser();
  return overlaySelf(
    members
      .filter((row) => row.userId)
      .map((row) => {
        const mine = Boolean(self && row.userId === self.sub);
        return {
          userId: row.userId,
          name: row.name || row.email || row.label || (mine ? self!.name : '') || '',
          picture: row.picture || (mine ? self!.picture : '') || '',
        };
      }),
  );
}

function readSharingMeta(): SharingMeta {
  try {
    const raw = localStorage.getItem(SHARING_META_KEY);
    if (!raw) return { role: null, members: [] };
    const parsed = JSON.parse(raw) as SharingMeta;
    return {
      role: parsed.role === 'owner' || parsed.role === 'member' || parsed.role === 'guardian' ? parsed.role : null,
      members: Array.isArray(parsed.members) ? parsed.members.filter((row) => row?.userId) : [],
    };
  } catch {
    return { role: null, members: [] };
  }
}

function writeSharingMeta(meta: SharingMeta) {
  localStorage.setItem(SHARING_META_KEY, JSON.stringify(meta));
}

function sameBaby(a: Baby | null, b: Baby | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.updatedAt === b.updatedAt &&
    a.name === b.name &&
    a.bornOn === b.bornOn &&
    a.photoUrl === b.photoUrl &&
    a.userId === b.userId
  );
}

type DbContextValue = {
  baby: Baby | null;
  tick: number;
  ready: boolean;
  pendingInvitesCount: number;
  sharingRole: SharingRole | null;
  sharingMembers: SharingActor[];
  refreshSharing: () => Promise<void>;
};

const DbContext = createContext<DbContextValue>({
  baby: null,
  tick: 0,
  ready: false,
  pendingInvitesCount: 0,
  sharingRole: null,
  sharingMembers: [],
  refreshSharing: async () => {},
});

export function DbProvider({ children }: { children: ReactNode }) {
  const cached = readSharingMeta();
  const [baby, setBaby] = useState<Baby | null>(null);
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [sharingRole, setSharingRole] = useState<SharingRole | null>(cached.role);
  const [sharingMembers, setSharingMembers] = useState<SharingActor[]>(() => overlaySelf(cached.members));

  const applyMeta = (meta: SharingMeta) => {
    const members = overlaySelf(meta.members);
    setSharingRole(meta.role);
    setSharingMembers(members);
    writeSharingMeta({ role: meta.role, members });
  };

  const refreshSharing = async () => {
    if (!readGoogleToken()) {
      setPendingInvitesCount(0);
      applyMeta({ role: null, members: [] });
      return;
    }
    await pushLocalProfile();
    const state = await fetchSharing();
    if (state === 'auth') {
      setPendingInvitesCount(0);
      applyMeta({ role: null, members: [] });
      return;
    }
    if (state === 'error' || state === 'rate_limit' || 'error' in state) {
      setPendingInvitesCount(0);
      return;
    }
    setPendingInvitesCount(state.pendingInvitesCount);
    applyMeta({ role: state.role, members: actorsFromMembers(state.members) });
  };

  useEffect(() => {
    void (async () => {
      try {
        if (navigator.onLine) await ensureAbelSession();
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
      const detail = (event as CustomEvent<{ priority?: string; silent?: boolean }>).detail ?? {};
      const urgent = detail.priority === 'urgent';
      setTick((n) => n + 1);
      void getBaby().then((row) => {
        const next = row ?? null;
        setBaby((prev) => (sameBaby(prev, next) ? prev : next));
      });
      if (detail.silent) return;
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
    <DbContext.Provider
      value={{ baby, tick, ready, pendingInvitesCount, sharingRole, sharingMembers, refreshSharing }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}
