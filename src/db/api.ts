import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  babies,
  bottleFeeds,
  diaperEvents,
  feedingSegments,
  feedingSessions,
  measurements,
  pumpingSessions,
  reminderRules,
  type DiaperKind,
  type MeasurementType,
  type MilkType,
  type Side,
} from '@/db/schema';
import { nowIso } from '@/lib/dates';
import { createId } from '@/lib/ids';
import { measurementUnit } from '@/lib/labels';

function stamp() {
  const now = nowIso();
  return {
    createdAt: now,
    updatedAt: now,
    deletedAt: null as string | null,
    syncStatus: 'pending' as const,
  };
}

function touch() {
  return { updatedAt: nowIso(), syncStatus: 'pending' as const };
}

export function renameBaby(id: string, name: string) {
  db.update(babies).set({ name: name.trim() || 'Bébé', ...touch() }).where(eq(babies.id, id)).run();
}

export function setBabyUserId(id: string, userId: string) {
  db.update(babies).set({ userId, ...touch() }).where(eq(babies.id, id)).run();
}

export function startFeeding(babyId: string, side: Side) {
  const now = nowIso();
  const sessionId = createId();
  db.insert(feedingSessions)
    .values({ id: sessionId, babyId, startedAt: now, endedAt: null, ...stamp() })
    .run();
  db.insert(feedingSegments)
    .values({
      id: createId(),
      feedingSessionId: sessionId,
      side,
      startedAt: now,
      endedAt: null,
      ...stamp(),
    })
    .run();
  return sessionId;
}

export function switchFeedingSide(sessionId: string, side: Side) {
  const now = nowIso();
  const open = db
    .select()
    .from(feedingSegments)
    .where(
      and(
        eq(feedingSegments.feedingSessionId, sessionId),
        isNull(feedingSegments.endedAt),
        isNull(feedingSegments.deletedAt),
      ),
    )
    .all()[0];
  if (open?.side === side) return;
  if (open) {
    db.update(feedingSegments)
      .set({ endedAt: now, ...touch() })
      .where(eq(feedingSegments.id, open.id))
      .run();
  }
  db.insert(feedingSegments)
    .values({
      id: createId(),
      feedingSessionId: sessionId,
      side,
      startedAt: now,
      endedAt: null,
      ...stamp(),
    })
    .run();
}

export function stopFeeding(sessionId: string): string {
  const now = nowIso();
  db.update(feedingSegments)
    .set({ endedAt: now, ...touch() })
    .where(
      and(
        eq(feedingSegments.feedingSessionId, sessionId),
        isNull(feedingSegments.endedAt),
        isNull(feedingSegments.deletedAt),
      ),
    )
    .run();
  db.update(feedingSessions)
    .set({ endedAt: now, ...touch() })
    .where(eq(feedingSessions.id, sessionId))
    .run();
  return now;
}

export function addDiaper(babyId: string, kind: DiaperKind) {
  const now = nowIso();
  db.insert(diaperEvents)
    .values({ id: createId(), babyId, kind, occurredAt: now, ...stamp() })
    .run();
}

export function updateDiaper(id: string, kind: DiaperKind) {
  db.update(diaperEvents).set({ kind, ...touch() }).where(eq(diaperEvents.id, id)).run();
}

export function deleteDiaper(id: string) {
  db.update(diaperEvents)
    .set({ deletedAt: nowIso(), ...touch() })
    .where(eq(diaperEvents.id, id))
    .run();
}

export function startPumping(babyId: string) {
  const now = nowIso();
  const id = createId();
  db.insert(pumpingSessions)
    .values({
      id,
      babyId,
      startedAt: now,
      amountMl: null,
      durationMinutes: null,
      side: null,
      ...stamp(),
    })
    .run();
  return id;
}

export function updatePumping(
  id: string,
  values: { amountMl: number; durationMinutes?: number | null; side?: Side | null },
) {
  db.update(pumpingSessions)
    .set({
      amountMl: values.amountMl,
      durationMinutes: values.durationMinutes ?? null,
      side: values.side ?? null,
      ...touch(),
    })
    .where(eq(pumpingSessions.id, id))
    .run();
}

export function addBottle(babyId: string, milkType: MilkType, amountMl: number, fedAt: string) {
  db.insert(bottleFeeds)
    .values({ id: createId(), babyId, milkType, amountMl, fedAt, ...stamp() })
    .run();
}

export function addMeasurement(babyId: string, type: MeasurementType, value: number) {
  const now = nowIso();
  db.insert(measurements)
    .values({
      id: createId(),
      babyId,
      type,
      value,
      unit: measurementUnit[type],
      measuredAt: now,
      ...stamp(),
    })
    .run();
}

export function upsertReminderRule(babyId: string, delayMinutes: number) {
  const existing = db
    .select()
    .from(reminderRules)
    .where(and(eq(reminderRules.babyId, babyId), isNull(reminderRules.deletedAt)))
    .limit(1)
    .all()[0];
  if (existing) {
    db.update(reminderRules)
      .set({ delayMinutes, enabled: delayMinutes > 0, ...touch() })
      .where(eq(reminderRules.id, existing.id))
      .run();
    return;
  }
  db.insert(reminderRules)
    .values({
      id: createId(),
      babyId,
      enabled: delayMinutes > 0,
      delayMinutes,
      ...stamp(),
    })
    .run();
}

export function lastEndedFeeding(babyId: string) {
  return db
    .select()
    .from(feedingSessions)
    .where(
      and(
        eq(feedingSessions.babyId, babyId),
        isNull(feedingSessions.deletedAt),
      ),
    )
    .orderBy(desc(feedingSessions.startedAt))
    .all()
    .find((row) => row.endedAt);
}

export function markSynced(
  table:
    | 'babies'
    | 'feeding_sessions'
    | 'feeding_segments'
    | 'bottle_feeds'
    | 'diaper_events'
    | 'pumping_sessions'
    | 'measurements'
    | 'reminder_rules',
  id: string,
) {
  const map = {
    babies,
    feeding_sessions: feedingSessions,
    feeding_segments: feedingSegments,
    bottle_feeds: bottleFeeds,
    diaper_events: diaperEvents,
    pumping_sessions: pumpingSessions,
    measurements,
    reminder_rules: reminderRules,
  } as const;
  const target = map[table as keyof typeof map];
  db.update(target).set({ syncStatus: 'synced', updatedAt: nowIso() }).where(eq(target.id, id))    .run();
}
