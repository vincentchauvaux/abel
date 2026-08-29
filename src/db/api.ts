import { db, createId, notifyDb } from '@/db/client';
import type {
  Baby,
  BottleFeed,
  DiaperEvent,
  DiaperKind,
  FeedingSegment,
  FeedingSession,
  Measurement,
  MeasurementType,
  MilkType,
  Note,
  PumpingSession,
  ReminderRule,
  Side,
  SleepSession,
  SolidFood,
  Supplement,
  Temperature,
} from '@/db/types';
import { nowIso } from '@/lib/dates';
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

function alive<T extends { deletedAt: string | null }>(rows: T[]): T[] {
  return rows.filter((row) => !row.deletedAt);
}

export async function ensureBaby(): Promise<Baby> {
  const existing = alive(await db.babies.toArray())[0];
  if (existing) return existing;
  const now = nowIso();
  const baby: Baby = {
    id: createId(),
    name: 'Bébé',
    userId: null,
    bornOn: null,
    ...stamp(),
  };
  await db.babies.add(baby);
  await db.reminderRules.add({
    id: createId(),
    babyId: baby.id,
    enabled: false,
    delayMinutes: 0,
    bottleMl: null,
    bottleMinutes: null,
    diaperMinutes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'pending',
  });
  notifyDb();
  return baby;
}

export async function getBaby(): Promise<Baby | undefined> {
  return alive(await db.babies.toArray())[0];
}

export async function renameBaby(id: string, name: string) {
  await db.babies.update(id, { name: name.trim() || 'Bébé', ...touch() });
  notifyDb();
}

export async function updateBaby(id: string, values: { name?: string; bornOn?: string | null }) {
  await db.babies.update(id, {
    ...(values.name !== undefined ? { name: values.name.trim() || 'Bébé' } : {}),
    ...(values.bornOn !== undefined ? { bornOn: values.bornOn || null } : {}),
    ...touch(),
  });
  notifyDb();
}

export async function startFeeding(babyId: string, side: Side) {
  const now = nowIso();
  const sessionId = createId();
  await db.feedingSessions.add({
    id: sessionId,
    babyId,
    startedAt: now,
    endedAt: null,
    ...stamp(),
  });
  await db.feedingSegments.add({
    id: createId(),
    feedingSessionId: sessionId,
    side,
    startedAt: now,
    endedAt: null,
    ...stamp(),
  });
  notifyDb();
  return sessionId;
}

export async function switchFeedingSide(sessionId: string, side: Side) {
  const now = nowIso();
  const open = alive(await db.feedingSegments.where('feedingSessionId').equals(sessionId).toArray()).find(
    (row) => !row.endedAt,
  );
  if (open?.side === side) return;
  if (open) await db.feedingSegments.update(open.id, { endedAt: now, ...touch() });
  await db.feedingSegments.add({
    id: createId(),
    feedingSessionId: sessionId,
    side,
    startedAt: now,
    endedAt: null,
    ...stamp(),
  });
  notifyDb();
}

export async function stopFeeding(sessionId: string) {
  const now = nowIso();
  const open = alive(await db.feedingSegments.where('feedingSessionId').equals(sessionId).toArray()).filter(
    (row) => !row.endedAt,
  );
  await Promise.all(open.map((row) => db.feedingSegments.update(row.id, { endedAt: now, ...touch() })));
  await db.feedingSessions.update(sessionId, { endedAt: now, ...touch() });
  notifyDb();
  return now;
}

export async function addDiaper(babyId: string, kind: DiaperKind) {
  await db.diaperEvents.add({
    id: createId(),
    babyId,
    kind,
    occurredAt: nowIso(),
    ...stamp(),
  });
  notifyDb();
}

export async function updateDiaper(id: string, kind: DiaperKind) {
  await db.diaperEvents.update(id, { kind, ...touch() });
  notifyDb();
}

export async function deleteDiaper(id: string) {
  await db.diaperEvents.update(id, { deletedAt: nowIso(), ...touch() });
  notifyDb();
}

export async function startPumping(babyId: string) {
  const id = createId();
  await db.pumpingSessions.add({
    id,
    babyId,
    startedAt: nowIso(),
    amountMl: null,
    durationMinutes: null,
    side: null,
    ...stamp(),
  });
  notifyDb();
  return id;
}

export async function updatePumping(
  id: string,
  values: { amountMl: number; durationMinutes?: number | null; side?: Side | null },
) {
  await db.pumpingSessions.update(id, {
    amountMl: values.amountMl,
    durationMinutes: values.durationMinutes ?? null,
    side: values.side ?? null,
    ...touch(),
  });
  notifyDb();
}

export async function addBottle(babyId: string, milkType: MilkType, amountMl: number, fedAt: string) {
  await db.bottleFeeds.add({
    id: createId(),
    babyId,
    milkType,
    amountMl,
    fedAt,
    ...stamp(),
  });
  notifyDb();
}

export async function addMeasurement(babyId: string, type: MeasurementType, value: number) {
  await db.measurements.add({
    id: createId(),
    babyId,
    type,
    value,
    unit: measurementUnit[type],
    measuredAt: nowIso(),
    ...stamp(),
  });
  notifyDb();
}

export async function upsertReminderRule(babyId: string, delayMinutes: number) {
  return upsertCareGoals(babyId, { delayMinutes });
}

export type CareGoalsPatch = {
  delayMinutes?: number;
  bottleMl?: number | null;
  bottleMinutes?: number | null;
  diaperMinutes?: number | null;
};

export async function upsertCareGoals(babyId: string, patch: CareGoalsPatch) {
  const existing = alive(await db.reminderRules.where('babyId').equals(babyId).toArray())[0];
  const delayMinutes = patch.delayMinutes ?? existing?.delayMinutes ?? 0;
  const bottleMl = patch.bottleMl !== undefined ? patch.bottleMl : (existing?.bottleMl ?? null);
  const bottleMinutes = patch.bottleMinutes !== undefined ? patch.bottleMinutes : (existing?.bottleMinutes ?? null);
  const diaperMinutes = patch.diaperMinutes !== undefined ? patch.diaperMinutes : (existing?.diaperMinutes ?? null);
  const values = {
    delayMinutes,
    enabled: delayMinutes > 0 || (bottleMinutes ?? 0) > 0 || (diaperMinutes ?? 0) > 0,
    bottleMl,
    bottleMinutes,
    diaperMinutes,
    ...touch(),
  };
  if (existing) {
    await db.reminderRules.update(existing.id, values);
  } else {
    await db.reminderRules.add({
      id: createId(),
      babyId,
      delayMinutes,
      enabled: values.enabled,
      bottleMl,
      bottleMinutes,
      diaperMinutes,
      ...stamp(),
    });
  }
  notifyDb();
}

export async function listSessions(babyId: string): Promise<FeedingSession[]> {
  return alive(await db.feedingSessions.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
}

export async function listSegments(): Promise<FeedingSegment[]> {
  return alive(await db.feedingSegments.toArray());
}

export async function listBottles(babyId: string): Promise<BottleFeed[]> {
  return alive(await db.bottleFeeds.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.fedAt.localeCompare(a.fedAt),
  );
}

export async function listDiapers(babyId: string): Promise<DiaperEvent[]> {
  return alive(await db.diaperEvents.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  );
}

export async function listPumps(babyId: string): Promise<PumpingSession[]> {
  return alive(await db.pumpingSessions.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
}

export async function listMeasurements(babyId: string): Promise<Measurement[]> {
  return alive(await db.measurements.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.measuredAt.localeCompare(a.measuredAt),
  );
}

export async function getReminder(babyId: string): Promise<ReminderRule | undefined> {
  return alive(await db.reminderRules.where('babyId').equals(babyId).toArray())[0];
}

export async function lastEndedFeeding(babyId: string) {
  return (await listSessions(babyId)).find((row) => row.endedAt);
}

export async function linkBabyUser(babyId: string, userId: string | null) {
  await db.babies.update(babyId, { userId, ...touch() });
  notifyDb();
}

export async function addSolidFood(babyId: string, food: string) {
  await db.solidFoods.add({
    id: createId(),
    babyId,
    food: food.trim(),
    eatenAt: nowIso(),
    ...stamp(),
  });
  notifyDb();
}

export async function listSolidFoods(babyId: string): Promise<SolidFood[]> {
  return alive(await db.solidFoods.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.eatenAt.localeCompare(a.eatenAt),
  );
}

export async function addSupplement(babyId: string, name: string) {
  await db.supplements.add({
    id: createId(),
    babyId,
    name: name.trim(),
    givenAt: nowIso(),
    ...stamp(),
  });
  notifyDb();
}

export async function listSupplements(babyId: string): Promise<Supplement[]> {
  return alive(await db.supplements.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.givenAt.localeCompare(a.givenAt),
  );
}

export async function startSleep(babyId: string) {
  const open = alive(await db.sleepSessions.where('babyId').equals(babyId).toArray()).find((row) => !row.endedAt);
  if (open) return open.id;
  const id = createId();
  await db.sleepSessions.add({
    id,
    babyId,
    startedAt: nowIso(),
    endedAt: null,
    ...stamp(),
  });
  notifyDb();
  return id;
}

export async function stopSleep(id: string) {
  await db.sleepSessions.update(id, { endedAt: nowIso(), ...touch() });
  notifyDb();
}

export async function listSleep(babyId: string): Promise<SleepSession[]> {
  return alive(await db.sleepSessions.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
}

export async function addTemperature(babyId: string, celsius: number) {
  await db.temperatures.add({
    id: createId(),
    babyId,
    celsius,
    measuredAt: nowIso(),
    ...stamp(),
  });
  notifyDb();
}

export async function listTemperatures(babyId: string): Promise<Temperature[]> {
  return alive(await db.temperatures.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.measuredAt.localeCompare(a.measuredAt),
  );
}

export async function addNote(babyId: string, body: string) {
  await db.notes.add({
    id: createId(),
    babyId,
    body: body.trim(),
    notedAt: nowIso(),
    ...stamp(),
  });
  notifyDb();
}

export async function listNotes(babyId: string): Promise<Note[]> {
  return alive(await db.notes.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.notedAt.localeCompare(a.notedAt),
  );
}

export const SYNC_TABLES = [
  'babies',
  'feedingSessions',
  'feedingSegments',
  'bottleFeeds',
  'diaperEvents',
  'pumpingSessions',
  'measurements',
  'reminderRules',
  'solidFoods',
  'supplements',
  'sleepSessions',
  'temperatures',
  'notes',
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];
export type SyncPayload = Record<SyncTable, Array<Record<string, unknown>>>;

const BABY_ID_TABLES = SYNC_TABLES.filter((name) => name !== 'babies' && name !== 'feedingSegments');

export async function collectPending(): Promise<SyncPayload> {
  const changes = {} as SyncPayload;
  for (const name of SYNC_TABLES) {
    const rows = await db.table(name).toArray();
    changes[name] = rows.filter((row) => row.syncStatus === 'pending');
  }
  return changes;
}

export async function remapBabyId(from: string, to: string) {
  if (from === to) return;
  await db.transaction('rw', SYNC_TABLES.map((name) => db.table(name)), async () => {
    for (const name of BABY_ID_TABLES) {
      const rows = await db.table(name).where('babyId').equals(from).toArray();
      for (const row of rows) {
        await db.table(name).put({ ...row, babyId: to });
      }
    }
    const fromBaby = await db.babies.get(from);
    const toBaby = await db.babies.get(to);
    if (fromBaby && !toBaby) {
      await db.babies.delete(from);
      await db.babies.put({ ...fromBaby, id: to });
    } else if (fromBaby) {
      await db.babies.delete(from);
    }
  });
}

export async function applyRemoteRecords(records: SyncPayload, canonicalBabyId: string | null) {
  const local = await getBaby();
  if (local && canonicalBabyId && local.id !== canonicalBabyId) {
    await remapBabyId(local.id, canonicalBabyId);
  }
  await db.transaction('rw', SYNC_TABLES.map((name) => db.table(name)), async () => {
    for (const name of SYNC_TABLES) {
      const rows = records[name] ?? [];
      for (const row of rows) {
        const id = String(row.id ?? '');
        if (!id) continue;
        const existing = await db.table(name).get(id);
        if (!existing || String(row.updatedAt ?? '') >= String(existing.updatedAt)) {
          await db.table(name).put({ ...row, syncStatus: 'synced' });
        }
      }
    }
  });
}

export async function markPushed(changes: SyncPayload) {
  await db.transaction('rw', SYNC_TABLES.map((name) => db.table(name)), async () => {
    for (const name of SYNC_TABLES) {
      for (const row of changes[name] ?? []) {
        const id = String(row.id ?? '');
        const current = await db.table(name).get(id);
        if (current && current.updatedAt === row.updatedAt && current.syncStatus === 'pending') {
          await db.table(name).update(id, { syncStatus: 'synced' });
        }
      }
    }
  });
}
