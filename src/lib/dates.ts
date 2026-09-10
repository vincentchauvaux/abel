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

/** False si l’instant n’est pas encore arrivé (marge 90 s pour l’horloge). */
export function isNotFuture(iso: string, now = Date.now(), slackMs = 90_000): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t <= now + slackMs;
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

const DAY_MINUTES = 24 * 60;

/** Minutes depuis minuit local (0–1440). */
export function localMinutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60_000;
}

function localDayBounds(dayKey: string): { start: number; end: number } {
  const startDate = startOfLocalDay(new Date(`${dayKey}T12:00:00`));
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);
  return { start: startDate.getTime(), end: endDate.getTime() };
}

/** Intersection d’un intervalle avec un jour local, en minutes depuis minuit. */
export function clipToLocalDay(
  startedAt: string,
  endedAt: string | null,
  dayKey: string,
  now = Date.now(),
): { startMin: number; endMin: number } | null {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start) || !isNotFuture(startedAt, now)) return null;
  const { start: dayStart, end: dayEnd } = localDayBounds(dayKey);
  const finish = endedAt ? new Date(endedAt).getTime() : now;
  const from = Math.max(start, dayStart);
  const to = Math.min(finish, dayEnd, now + 90_000);
  if (to <= from) {
    if (start >= dayStart && start < dayEnd) {
      const startMin = (start - dayStart) / 60_000;
      return { startMin, endMin: startMin + 1 };
    }
    return null;
  }
  const startMin = (from - dayStart) / 60_000;
  let endMin = (to - dayStart) / 60_000;
  if (to >= dayEnd) endMin = Math.max(endMin, DAY_MINUTES);
  return { startMin, endMin };
}

/** Tétée / sieste notée sans chrono (durée nulle). */
export function isNotedSession(startedAt: string, endedAt?: string | null) {
  if (!endedAt) return false;
  return endedAt === startedAt || elapsedMs(startedAt, endedAt) < 15_000;
}

/** Millisecondes d’une séance dans [rangeStart, rangeEnd], 0 si notée. */
export function overlapMs(
  startedAt: string,
  endedAt: string | null | undefined,
  rangeStartMs: number,
  rangeEndMs: number,
  now = Date.now(),
): number {
  if (isNotedSession(startedAt, endedAt)) return 0;
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start) || !isNotFuture(startedAt, now)) return 0;
  const finish = endedAt ? new Date(endedAt).getTime() : now;
  const from = Math.max(start, rangeStartMs);
  const to = Math.min(finish, rangeEndMs, now + 90_000);
  return Math.max(0, to - from);
}

/** Minutes réellement couvertes par ce jour local (0 si notée). */
export function minutesOnLocalDay(
  startedAt: string,
  endedAt: string | null | undefined,
  dayKey: string,
  now = Date.now(),
): number {
  if (isNotedSession(startedAt, endedAt)) return 0;
  const clip = clipToLocalDay(startedAt, endedAt ?? null, dayKey, now);
  if (!clip) return 0;
  return Math.max(0, Math.round(clip.endMin - clip.startMin));
}

export function totalMinutesOnLocalDay(
  rows: { startedAt: string; endedAt?: string | null }[],
  dayKey: string,
  now = Date.now(),
): number {
  return rows.reduce((sum, row) => sum + minutesOnLocalDay(row.startedAt, row.endedAt, dayKey, now), 0);
}

export type LocalDaySpan = {
  id: string;
  startMin: number;
  endMin: number;
  minutes: number;
  noted: boolean;
};

/** Séances qui recouvrent ce jour, y compris une sieste commencée la veille. */
export function spansOnLocalDay(
  rows: { id: string; startedAt: string; endedAt?: string | null }[],
  dayKey: string,
  now = Date.now(),
): LocalDaySpan[] {
  const out: LocalDaySpan[] = [];
  for (const row of rows) {
    const clip = clipToLocalDay(row.startedAt, row.endedAt ?? null, dayKey, now);
    if (!clip) continue;
    const noted = isNotedSession(row.startedAt, row.endedAt);
    out.push({
      id: row.id,
      startMin: clip.startMin,
      endMin: clip.endMin,
      minutes: noted ? 0 : Math.max(0, Math.round(clip.endMin - clip.startMin)),
      noted,
    });
  }
  out.sort((a, b) => a.startMin - b.startMin || a.id.localeCompare(b.id));
  return out;
}

export function isoAtLocalMinutes(dayKey: string, minutes: number): string {
  const start = startOfLocalDay(new Date(`${dayKey}T12:00:00`));
  return new Date(start.getTime() + minutes * 60_000).toISOString();
}

/** 15, 2h, 2h48 — libellé des bâtons. */
export function formatCompactMinutes(minutes: number): string {
  const total = Math.round(Math.max(0, minutes));
  if (total <= 0) return '';
  if (total < 60) return String(total);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins === 0 ? `${hours}h` : `${hours}h${mins}`;
}

/** Ajoute la durée couverte (pondérée par la longueur de la sieste) sur les créneaux locaux. */
export function addLocalCoverage(
  counts: number[],
  startedAt: string,
  endedAt: string | null,
  now = Date.now(),
): void {
  const slots = counts.length;
  if (slots <= 0) return;
  const slotMinutes = DAY_MINUTES / slots;
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start) || !isNotFuture(startedAt, now)) return;
  const end = Math.min(endedAt ? new Date(endedAt).getTime() : now, now + 90_000);
  if (end <= start) return;
  const napMinutes = Math.max(1, (end - start) / 60_000);
  let t = start;
  let steps = 0;
  const maxSteps = slots * 400;
  while (t < end && steps < maxSteps) {
    steps += 1;
    const d = new Date(t);
    const mins = d.getHours() * 60 + d.getMinutes();
    const slot = Math.floor(mins / slotMinutes) % slots;
    const remain = slotMinutes - (mins % slotMinutes);
    const overlap = Math.min(remain, (end - t) / 60_000);
    counts[slot] += overlap * napMinutes;
    t += Math.max(1, remain) * 60_000;
  }
}

/** Point dans le temps (biberon, tétée notée) sur un cadran 24 h. */
export function addLocalInstant(counts: number[], iso: string, now = Date.now(), weight = 120): void {
  const slots = counts.length;
  if (slots <= 0) return;
  const start = new Date(iso).getTime();
  if (!Number.isFinite(start) || !isNotFuture(iso, now)) return;
  const slotMinutes = DAY_MINUTES / slots;
  const d = new Date(iso);
  const mins = d.getHours() * 60 + d.getMinutes();
  const slot = Math.floor(mins / slotMinutes) % slots;
  counts[slot] += weight;
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
  if (isNotedSession(startedAt, endedAt)) return 'notée';
  return formatMinutes(elapsedMs(startedAt, endedAt, now));
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

