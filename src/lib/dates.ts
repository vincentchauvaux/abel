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

/** Minutes arrondies → libellé lisible (45 min, 2 h 15 min, 3 j 5 h). */
export function formatMinuteCount(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total === 0) return '0 min';
  if (total < 60) return total === 1 ? '1 min' : `${total} min`;

  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;

  if (days >= 1) {
    const parts: string[] = [days === 1 ? '1 j' : `${days} j`];
    if (hours > 0) parts.push(`${hours} h`);
    return parts.join(' ');
  }

  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

export function formatMinutes(ms: number): string {
  return formatMinuteCount(Math.round(ms / 60_000));
}

export function elapsedMs(startedAt: string, endedAt?: string | null, now = Date.now()): number {
  const end = endedAt ? new Date(endedAt).getTime() : now;
  return Math.max(0, end - new Date(startedAt).getTime());
}

/** Ajoute des minutes à un timestamp ISO (UTC). */
export function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/** Heure affichée / tri journal : fin si chronométré, sinon début. */
export function activityAt(startedAt: string, endedAt?: string | null): string {
  return endedAt ?? startedAt;
}

export function activityAtFromDuration(
  startedAt: string,
  durationMinutes: number | null | undefined,
): string {
  if (durationMinutes != null && durationMinutes > 0) {
    return addMinutesIso(startedAt, durationMinutes);
  }
  return startedAt;
}

export function formatFeedLabel(startedAt: string, endedAt?: string | null, now = Date.now()): string {
  if (endedAt && endedAt === startedAt) return 'notée';
  const ms = elapsedMs(startedAt, endedAt, now);
  if (endedAt && ms < 15_000) return 'notée';
  return formatMinutes(ms);
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
  const label = formatMinuteCount(Math.round(abs / 60_000));
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

/** Valeur pour `<input type="datetime-local">` en heure locale. */
export function toDatetimeLocalValue(iso: string = nowIso()): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(local: string): string {
  return new Date(local).toISOString();
}

/** Minutes arrondies entre deux valeurs `<input type="datetime-local">` (peut être négatif). */
export function minutesBetweenLocal(startLocal: string, endLocal: string): number | null {
  if (!startLocal.trim() || !endLocal.trim()) return null;
  const start = new Date(startLocal).getTime();
  const end = new Date(endLocal).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.round((end - start) / 60_000);
}

/** Valeur datetime-local = début + minutes. */
export function addMinutesToLocal(startLocal: string, minutes: number): string {
  if (!startLocal.trim()) return '';
  return toDatetimeLocalValue(addMinutesIso(fromDatetimeLocalValue(startLocal), minutes));
}

export function splitDatetimeLocal(local: string): { date: string; time: string } {
  const [date = '', time = ''] = local.split('T');
  return { date, time: time.slice(0, 5) };
}

export function joinDatetimeLocal(date: string, time: string): string {
  if (!date.trim()) return '';
  return `${date}T${time.trim() || '00:00'}`;
}

/** Heure de fin + date du début ; si l’heure est avant le début, on passe au lendemain. */
export function endLocalFromStartAndTime(startLocal: string, endTime: string): string {
  if (!startLocal.trim() || !endTime.trim()) return '';
  const { date } = splitDatetimeLocal(startLocal);
  let end = joinDatetimeLocal(date, endTime);
  const startMs = new Date(startLocal).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs) {
    end = addMinutesToLocal(end, 1440);
  }
  return end;
}

