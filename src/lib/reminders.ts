import type { DiaperWhen } from '@/lib/goals';
import { diaperReminderAt } from '@/lib/goals';
import type { ReminderRule } from '@/db/types';

/** Notifications navigateur (onglet ouvert uniquement). */

export async function notifyAfterMs(ms: number, body: string) {
  if (ms <= 0 || !('Notification' in window)) return;
  const ok = await Notification.requestPermission();
  if (ok !== 'granted') return;
  window.setTimeout(() => new Notification('Abel', { body }), ms);
}

export async function notifyIn(minutes: number, body: string) {
  return notifyAfterMs(minutes * 60_000, body);
}

export function mealEndedAt(feed?: { startedAt: string; endedAt: string | null } | null): string | null {
  if (!feed) return null;
  return feed.endedAt ?? null;
}

export function lastMealAt(
  feed?: { startedAt: string; endedAt: string | null } | null,
  bottle?: { fedAt: string } | null,
): string | null {
  const feedAt = mealEndedAt(feed);
  const bottleAt = bottle?.fedAt ?? null;
  if (feedAt && bottleAt) return feedAt > bottleAt ? feedAt : bottleAt;
  return feedAt ?? bottleAt;
}

/** Délai avant notification couche (ms), ou null si passé / désactivé. */
export function diaperNotifyDelayMs(
  mealAt: string | null,
  mealIntervalMinutes: number,
  when: DiaperWhen | null | undefined,
  offsetMinutes: number,
  now = Date.now(),
): number | null {
  if (!mealAt || offsetMinutes <= 0) return null;
  const timing: DiaperWhen = when === 'before' ? 'before' : 'after';
  const interval = timing === 'before' ? mealIntervalMinutes : 0;
  if (timing === 'before' && interval <= 0) return null;
  const fire = diaperReminderAt(mealAt, interval || offsetMinutes, timing, offsetMinutes);
  const ms = fire.getTime() - now;
  return ms > 0 ? ms : null;
}

export async function notifyDiaperReminder(
  mealAt: string | null,
  mealIntervalMinutes: number,
  when: DiaperWhen | null | undefined,
  offsetMinutes: number,
) {
  const ms = diaperNotifyDelayMs(mealAt, mealIntervalMinutes, when, offsetMinutes);
  if (ms === null) return;
  const body =
    when === 'before' ? 'Rappel couche avant le prochain repas' : 'Rappel couche après le repas';
  await notifyAfterMs(ms, body);
}

export async function notifyDiaperFromGoals(goals: ReminderRule | undefined, mealAt: string) {
  await notifyDiaperReminder(
    mealAt,
    goals?.delayMinutes ?? 0,
    goals?.diaperWhen,
    goals?.diaperMinutes ?? 0,
  );
}
