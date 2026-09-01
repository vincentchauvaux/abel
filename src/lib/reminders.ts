import type { DiaperWhen } from '@/lib/goals';
import { diaperReminderAt } from '@/lib/goals';
import type { ReminderRule } from '@/db/types';
import { formatFromNow, formatTime } from '@/lib/dates';

/** Notifications navigateur (onglet ou PWA ouverte). Pas de push distant. */

export async function notifyAfterMs(ms: number, body: string) {
  if (ms <= 0 || !('Notification' in window)) return;
  const ok = await Notification.requestPermission();
  if (ok !== 'granted') return;
  window.setTimeout(() => new Notification('Mimom', { body }), ms);
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

export function mealNotifyDelayMs(
  mealAt: string | null,
  intervalMinutes: number,
  now = Date.now(),
): number | null {
  if (!mealAt || intervalMinutes <= 0) return null;
  const fire = new Date(mealAt);
  fire.setMinutes(fire.getMinutes() + intervalMinutes);
  const ms = fire.getTime() - now;
  return ms > 0 ? ms : null;
}

export async function notifyMealFromGoals(goals: ReminderRule | undefined, mealAt: string) {
  const ms = mealNotifyDelayMs(mealAt, goals?.delayMinutes ?? 0);
  if (ms === null) return;
  await notifyAfterMs(ms, 'Rappel repas');
}

export type MealAlertInput = {
  feed?: { startedAt: string; endedAt: string | null } | null;
  bottle?: { fedAt: string; amountMl: number } | null;
  mealIntervalMinutes: number;
  now?: number;
};

export function mealAlertLine(input: MealAlertInput): string {
  const now = input.now ?? Date.now();
  const { feed, bottle, mealIntervalMinutes } = input;

  if (feed && !feed.endedAt) {
    return `Repas en cours (tétée depuis ${formatTime(feed.startedAt)}).`;
  }

  const at = lastMealAt(feed, bottle);
  if (!at) return 'Pas encore de repas.';

  const feedAt = mealEndedAt(feed);
  const bottleAt = bottle?.fedAt ?? null;
  const lastWasBottle = Boolean(bottleAt && (!feedAt || bottleAt >= feedAt));

  let line = lastWasBottle && bottle
    ? `Dernier repas ${formatTime(at)} (biberon ${bottle.amountMl} ml).`
    : `Dernier repas ${formatTime(at)} (tétée).`;

  if (mealIntervalMinutes <= 0) return line;

  const fire = new Date(at);
  fire.setMinutes(fire.getMinutes() + mealIntervalMinutes);
  const iso = fire.toISOString();
  if (fire.getTime() > now) {
    return `${line} Prochain repas ${formatFromNow(iso, now)}.`;
  }
  return `${line} Rappel repas dépassé ${formatFromNow(iso, now)}.`;
}

export function bottleMlAlertLine(
  goalMl: number | null | undefined,
  todayMl: number,
): string | null {
  if (!goalMl || goalMl <= 0) {
    return todayMl > 0 ? `Aujourd’hui ${todayMl} ml de biberon.` : null;
  }
  return `Aujourd’hui ${todayMl} ml · objectif ${goalMl} ml par repas biberon.`;
}

export type DiaperAlertInput = {
  lastDiaper?: { occurredAt: string } | null;
  mealAt: string | null;
  mealIntervalMinutes: number;
  diaperWhen: DiaperWhen;
  diaperOffset: number;
  now?: number;
};

export function diaperAlertLine(input: DiaperAlertInput): string {
  const now = input.now ?? Date.now();
  const { lastDiaper, mealAt, mealIntervalMinutes, diaperWhen, diaperOffset } = input;
  const lastLine = lastDiaper
    ? `Dernière couche à ${formatTime(lastDiaper.occurredAt)}.`
    : 'Pas encore de couche.';
  if (diaperOffset <= 0) return lastLine;
  if (!mealAt) return `${lastLine} Pas encore de repas pour démarrer le rappel.`;
  if (diaperWhen === 'before' && mealIntervalMinutes <= 0) {
    return `${lastLine} Définis un intervalle de repas pour le rappel avant le repas.`;
  }
  const fire = diaperReminderAt(mealAt, mealIntervalMinutes, diaperWhen, diaperOffset);
  const iso = fire.toISOString();
  if (lastDiaper && lastDiaper.occurredAt >= iso) {
    return `Couche déjà notée · ${formatTime(lastDiaper.occurredAt)}.`;
  }
  const whenLabel = diaperWhen === 'before' ? 'avant le prochain repas' : 'après le repas';
  if (fire.getTime() > now) {
    return `Rappel couche ${formatFromNow(iso, now)} (${whenLabel}, repas ${formatTime(mealAt)}).`;
  }
  return `Rappel couche dépassé ${formatFromNow(iso, now)} (${whenLabel}).`;
}

export function sleepAlertLine(
  activeSleep?: { startedAt: string } | null,
  now = Date.now(),
): string {
  if (activeSleep) {
    return `Endormi depuis ${formatTime(activeSleep.startedAt)} · ${formatFromNow(activeSleep.startedAt, now)}.`;
  }
  return 'Pas de sieste en cours.';
}
