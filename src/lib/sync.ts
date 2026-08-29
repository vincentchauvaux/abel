import { db } from '@/db/client';
import { getDefaultBabyId } from '@/db/init';
import { markSynced, setBabyUserId } from '@/db/api';
import {
  babies,
  bottleFeeds,
  diaperEvents,
  feedingSegments,
  feedingSessions,
  measurements,
  pumpingSessions,
  reminderRules,
} from '@/db/schema';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

type TableName =
  | 'babies'
  | 'feeding_sessions'
  | 'feeding_segments'
  | 'bottle_feeds'
  | 'diaper_events'
  | 'pumping_sessions'
  | 'measurements'
  | 'reminder_rules';

function snakeBaby(row: typeof babies.$inferSelect) {
  return {
    id: row.id,
    user_id: row.userId,
    name: row.name,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

function snakeFeeding(row: typeof feedingSessions.$inferSelect) {
  return {
    id: row.id,
    baby_id: row.babyId,
    started_at: row.startedAt,
    ended_at: row.endedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

function snakeSegment(row: typeof feedingSegments.$inferSelect) {
  return {
    id: row.id,
    feeding_session_id: row.feedingSessionId,
    side: row.side,
    started_at: row.startedAt,
    ended_at: row.endedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

function snakeBottle(row: typeof bottleFeeds.$inferSelect) {
  return {
    id: row.id,
    baby_id: row.babyId,
    milk_type: row.milkType,
    amount_ml: row.amountMl,
    fed_at: row.fedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

function snakeDiaper(row: typeof diaperEvents.$inferSelect) {
  return {
    id: row.id,
    baby_id: row.babyId,
    kind: row.kind,
    occurred_at: row.occurredAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

function snakePumping(row: typeof pumpingSessions.$inferSelect) {
  return {
    id: row.id,
    baby_id: row.babyId,
    started_at: row.startedAt,
    amount_ml: row.amountMl,
    duration_minutes: row.durationMinutes,
    side: row.side,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

function snakeMeasurement(row: typeof measurements.$inferSelect) {
  return {
    id: row.id,
    baby_id: row.babyId,
    type: row.type,
    value: row.value,
    unit: row.unit,
    measured_at: row.measuredAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

function snakeReminder(row: typeof reminderRules.$inferSelect) {
  return {
    id: row.id,
    baby_id: row.babyId,
    enabled: row.enabled,
    delay_minutes: row.delayMinutes,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

async function pushTable<T extends { id: string; syncStatus: string }>(
  table: TableName,
  rows: T[],
  map: (row: T) => Record<string, unknown>,
) {
  const supabase = getSupabase();
  if (!supabase) return;
  const pending = rows.filter((row) => row.syncStatus === 'pending');
  for (const row of pending) {
    const { error } = await supabase.from(table).upsert(map(row));
    if (error) throw error;
    markSynced(table, row.id);
  }
}

export async function syncNow(): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase n’est pas configuré. Renseigne .env (voir .env.example).');
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error('Client Supabase indisponible.');

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Connecte-toi avec Google avant de synchroniser.');

  const babyId = getDefaultBabyId();
  setBabyUserId(babyId, userId);

  await pushTable('babies', db.select().from(babies).all(), snakeBaby);
  await pushTable('feeding_sessions', db.select().from(feedingSessions).all(), snakeFeeding);
  await pushTable('feeding_segments', db.select().from(feedingSegments).all(), snakeSegment);
  await pushTable('bottle_feeds', db.select().from(bottleFeeds).all(), snakeBottle);
  await pushTable('diaper_events', db.select().from(diaperEvents).all(), snakeDiaper);
  await pushTable('pumping_sessions', db.select().from(pumpingSessions).all(), snakePumping);
  await pushTable('measurements', db.select().from(measurements).all(), snakeMeasurement);
  await pushTable('reminder_rules', db.select().from(reminderRules).all(), snakeReminder);

  const pull = async (table: TableName) => {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return (data ?? []) as Record<string, unknown>[];
  };

  const newer = (localUpdatedAt: string | undefined, remoteUpdatedAt: unknown) =>
    Boolean(localUpdatedAt && localUpdatedAt > String(remoteUpdatedAt));

  for (const row of await pull('babies')) {
    const local = db.select().from(babies).all().find((item) => item.id === row.id);
    if (newer(local?.updatedAt, row.updated_at)) continue;
    db.insert(babies)
      .values({
        id: String(row.id),
        name: String(row.name),
        userId: row.user_id ? String(row.user_id) : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: row.deleted_at ? String(row.deleted_at) : null,
        syncStatus: 'synced',
      })
      .onConflictDoUpdate({
        target: babies.id,
        set: {
          name: String(row.name),
          userId: row.user_id ? String(row.user_id) : null,
          updatedAt: String(row.updated_at),
          deletedAt: row.deleted_at ? String(row.deleted_at) : null,
          syncStatus: 'synced',
        },
      })
      .run();
  }

  for (const row of await pull('feeding_sessions')) {
    const local = db.select().from(feedingSessions).all().find((item) => item.id === row.id);
    if (newer(local?.updatedAt, row.updated_at)) continue;
    db.insert(feedingSessions)
      .values({
        id: String(row.id),
        babyId: String(row.baby_id),
        startedAt: String(row.started_at),
        endedAt: row.ended_at ? String(row.ended_at) : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: row.deleted_at ? String(row.deleted_at) : null,
        syncStatus: 'synced',
      })
      .onConflictDoUpdate({
        target: feedingSessions.id,
        set: {
          endedAt: row.ended_at ? String(row.ended_at) : null,
          updatedAt: String(row.updated_at),
          deletedAt: row.deleted_at ? String(row.deleted_at) : null,
          syncStatus: 'synced',
        },
      })
      .run();
  }

  for (const row of await pull('feeding_segments')) {
    const local = db.select().from(feedingSegments).all().find((item) => item.id === row.id);
    if (newer(local?.updatedAt, row.updated_at)) continue;
    db.insert(feedingSegments)
      .values({
        id: String(row.id),
        feedingSessionId: String(row.feeding_session_id),
        side: String(row.side),
        startedAt: String(row.started_at),
        endedAt: row.ended_at ? String(row.ended_at) : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: row.deleted_at ? String(row.deleted_at) : null,
        syncStatus: 'synced',
      })
      .onConflictDoUpdate({
        target: feedingSegments.id,
        set: {
          endedAt: row.ended_at ? String(row.ended_at) : null,
          updatedAt: String(row.updated_at),
          deletedAt: row.deleted_at ? String(row.deleted_at) : null,
          syncStatus: 'synced',
        },
      })
      .run();
  }

  for (const row of await pull('bottle_feeds')) {
    const local = db.select().from(bottleFeeds).all().find((item) => item.id === row.id);
    if (newer(local?.updatedAt, row.updated_at)) continue;
    db.insert(bottleFeeds)
      .values({
        id: String(row.id),
        babyId: String(row.baby_id),
        milkType: String(row.milk_type),
        amountMl: Number(row.amount_ml),
        fedAt: String(row.fed_at),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: row.deleted_at ? String(row.deleted_at) : null,
        syncStatus: 'synced',
      })
      .onConflictDoUpdate({
        target: bottleFeeds.id,
        set: {
          amountMl: Number(row.amount_ml),
          milkType: String(row.milk_type),
          fedAt: String(row.fed_at),
          updatedAt: String(row.updated_at),
          deletedAt: row.deleted_at ? String(row.deleted_at) : null,
          syncStatus: 'synced',
        },
      })
      .run();
  }

  for (const row of await pull('diaper_events')) {
    const local = db.select().from(diaperEvents).all().find((item) => item.id === row.id);
    if (newer(local?.updatedAt, row.updated_at)) continue;
    db.insert(diaperEvents)
      .values({
        id: String(row.id),
        babyId: String(row.baby_id),
        kind: String(row.kind),
        occurredAt: String(row.occurred_at),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: row.deleted_at ? String(row.deleted_at) : null,
        syncStatus: 'synced',
      })
      .onConflictDoUpdate({
        target: diaperEvents.id,
        set: {
          kind: String(row.kind),
          occurredAt: String(row.occurred_at),
          updatedAt: String(row.updated_at),
          deletedAt: row.deleted_at ? String(row.deleted_at) : null,
          syncStatus: 'synced',
        },
      })
      .run();
  }

  for (const row of await pull('pumping_sessions')) {
    const local = db.select().from(pumpingSessions).all().find((item) => item.id === row.id);
    if (newer(local?.updatedAt, row.updated_at)) continue;
    db.insert(pumpingSessions)
      .values({
        id: String(row.id),
        babyId: String(row.baby_id),
        startedAt: String(row.started_at),
        amountMl: row.amount_ml == null ? null : Number(row.amount_ml),
        durationMinutes: row.duration_minutes == null ? null : Number(row.duration_minutes),
        side: row.side ? String(row.side) : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: row.deleted_at ? String(row.deleted_at) : null,
        syncStatus: 'synced',
      })
      .onConflictDoUpdate({
        target: pumpingSessions.id,
        set: {
          amountMl: row.amount_ml == null ? null : Number(row.amount_ml),
          durationMinutes: row.duration_minutes == null ? null : Number(row.duration_minutes),
          side: row.side ? String(row.side) : null,
          updatedAt: String(row.updated_at),
          deletedAt: row.deleted_at ? String(row.deleted_at) : null,
          syncStatus: 'synced',
        },
      })
      .run();
  }

  for (const row of await pull('measurements')) {
    const local = db.select().from(measurements).all().find((item) => item.id === row.id);
    if (newer(local?.updatedAt, row.updated_at)) continue;
    db.insert(measurements)
      .values({
        id: String(row.id),
        babyId: String(row.baby_id),
        type: String(row.type),
        value: Number(row.value),
        unit: String(row.unit),
        measuredAt: String(row.measured_at),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: row.deleted_at ? String(row.deleted_at) : null,
        syncStatus: 'synced',
      })
      .onConflictDoUpdate({
        target: measurements.id,
        set: {
          value: Number(row.value),
          measuredAt: String(row.measured_at),
          updatedAt: String(row.updated_at),
          deletedAt: row.deleted_at ? String(row.deleted_at) : null,
          syncStatus: 'synced',
        },
      })
      .run();
  }

  for (const row of await pull('reminder_rules')) {
    const local = db.select().from(reminderRules).all().find((item) => item.id === row.id);
    if (newer(local?.updatedAt, row.updated_at)) continue;
    db.insert(reminderRules)
      .values({
        id: String(row.id),
        babyId: String(row.baby_id),
        enabled: Boolean(row.enabled),
        delayMinutes: Number(row.delay_minutes),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        deletedAt: row.deleted_at ? String(row.deleted_at) : null,
        syncStatus: 'synced',
      })
      .onConflictDoUpdate({
        target: reminderRules.id,
        set: {
          enabled: Boolean(row.enabled),
          delayMinutes: Number(row.delay_minutes),
          updatedAt: String(row.updated_at),
          deletedAt: row.deleted_at ? String(row.deleted_at) : null,
          syncStatus: 'synced',
        },
      })
      .run();
  }
}
