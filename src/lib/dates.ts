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
  return new Date(`${dateKey}T12:00:00`)
    .toLocaleDateString('fr-FR', { weekday: 'short' })
    .replace('.', '');
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

export function formatAge(bornOn: string, now = new Date()): string {
  const birth = startOfLocalDay(new Date(`${bornOn}T12:00:00`));
  const today = startOfLocalDay(now);
  if (birth > today) return 'Date à venir';
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  let days = today.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    const prev = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prev;
  }
  const totalDays = Math.round((today.getTime() - birth.getTime()) / 86_400_000);
  if (totalDays === 0) return 'Né aujourd’hui';
  if (totalDays === 1) return '1 jour';
  if (months < 1) return `${totalDays} jours`;
  if (months < 24) {
    if (days === 0) return months === 1 ? '1 mois' : `${months} mois`;
    return `${months} mois et ${days} jour${days > 1 ? 's' : ''}`;
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return years === 1 ? '1 an' : `${years} ans`;
  return `${years} an${years > 1 ? 's' : ''} et ${rest} mois`;
}

export function formatFromNow(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const label =
    hours >= 1 ? `${hours} h${mins ? ` ${mins}` : ''}` : minutes <= 1 ? '1 min' : `${minutes} min`;
  return diff >= 0 ? `dans ${label}` : `il y a ${label}`;
}

export function formatLongDate(bornOn: string): string {
  return new Date(`${bornOn}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
