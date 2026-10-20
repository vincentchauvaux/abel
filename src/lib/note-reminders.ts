/** Rappels de notes : notification navigateur (onglet / PWA ouverte). Pas de push distant. */

const fired = new Set<string>();
const timeouts = new Map<string, number>();
const FIRED_KEY = 'abel.note-remind-fired';

function loadFired() {
  try {
    const raw = sessionStorage.getItem(FIRED_KEY);
    if (!raw) return;
    const list = JSON.parse(raw) as string[];
    if (Array.isArray(list)) for (const key of list) fired.add(key);
  } catch {
    /* ignore */
  }
}

function persistFired() {
  try {
    sessionStorage.setItem(FIRED_KEY, JSON.stringify([...fired]));
  } catch {
    /* ignore */
  }
}

loadFired();

export function noteRemindKey(id: string, remindAt: string) {
  return `${id}:${remindAt}`;
}

export async function ensureNoteNotifyPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const ok = await Notification.requestPermission();
    return ok === 'granted';
  } catch {
    return false;
  }
}

export async function announceNoteReminder(body: string, key: string) {
  if (fired.has(key)) return;
  fired.add(key);
  persistFired();
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* ignore */
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Mimom · Rappel', {
        body: body.slice(0, 160) || 'Rappel',
        tag: key,
      });
    } catch {
      /* ignore */
    }
  }
}

export type NoteRemindRow = {
  id: string;
  body: string;
  isTodo: boolean;
  doneAt: string | null;
  remindAt?: string | null;
};

/** Programme / annule les timeouts pour les rappels ouverts. */
export function syncNoteReminderTimers(notes: NoteRemindRow[]) {
  const activeIds = new Set<string>();

  for (const note of notes) {
    const at = note.remindAt;
    if (!note.isTodo || note.doneAt || !at) continue;
    activeIds.add(note.id);
    const key = noteRemindKey(note.id, at);
    if (fired.has(key)) continue;

    const ms = new Date(at).getTime() - Date.now();
    const prev = timeouts.get(note.id);
    if (prev != null) {
      window.clearTimeout(prev);
      timeouts.delete(note.id);
    }

    if (ms <= 0) {
      // En retard mais pas encore notifié cette session → notifier une fois à l’ouverture.
      void announceNoteReminder(note.body, key);
      continue;
    }

    const delay = Math.min(ms, 2_147_483_647);
    const tid = window.setTimeout(() => {
      timeouts.delete(note.id);
      void announceNoteReminder(note.body, key);
    }, delay);
    timeouts.set(note.id, tid);
  }

  for (const [id, tid] of timeouts) {
    if (activeIds.has(id)) continue;
    window.clearTimeout(tid);
    timeouts.delete(id);
  }
}

export function clearNoteReminderTimers() {
  for (const tid of timeouts.values()) window.clearTimeout(tid);
  timeouts.clear();
}
