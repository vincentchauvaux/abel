export type Period = 'today' | '7d' | '30d' | 'all';

export function nowIso(date = new Date()): string {
  return date.toISOString();
}

export function startOfLocalDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function periodRange(period: Period): { from: string | null } {
  if (period === 'all') return { from: null };
  if (period === 'today') return { from: startOfLocalDay().toISOString() };
  const d = new Date();
  d.setDate(d.getDate() - (period === '7d' ? 6 : 29));
  d.setHours(0, 0, 0, 0);
  return { from: d.toISOString() };
}

export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function eachLocalDay(fromIso: string, to = new Date()): string[] {
  const keys: string[] = [];
  const cursor = startOfLocalDay(new Date(fromIso));
  const end = startOfLocalDay(to);
  while (cursor <= end) {
    keys.push(localDateKey(cursor.toISOString()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function weekdayShort(dateKey: string): string {
  const label = new Date(`${dateKey}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
  });
  return label.replace('.', '');
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatMinutes(ms: number): string {
  return `${Math.round(ms / 60_000)} min`;
}

export function elapsedMs(startedAt: string, endedAt?: string | null, now = Date.now()): number {
  const end = endedAt ? new Date(endedAt).getTime() : now;
  return Math.max(0, end - new Date(startedAt).getTime());
}

export function parseDecimal(input: string): number | null {
  const n = Number.parseFloat(input.replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}
