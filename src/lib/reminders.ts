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
