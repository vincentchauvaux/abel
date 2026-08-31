import { db, createId, notifyDb } from '@/db/client';
import type {
  Baby,
  BottleFeed,
  DiaperEvent,
  DiaperKind,
  DiaperWhen,
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
    diaperWhen: null,
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

export async function logFeedingNow(babyId: string, side: Side, at = nowIso()) {
  const sessionId = createId();
  await db.feedingSessions.add({
    id: sessionId,
    babyId,
    startedAt: at,
    endedAt: at,
    ...stamp(),
  });
  await db.feedingSegments.add({
    id: createId(),
    feedingSessionId: sessionId,
    side,
    startedAt: at,
    endedAt: at,
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

export async function addDiaper(babyId: string, kind: DiaperKind, occurredAt = nowIso()) {
  await db.diaperEvents.add({
    id: createId(),
    babyId,
    kind,
    occurredAt,
    ...stamp(),
  });
  notifyDb();
}

export async function updateDiaper(id: string, kind: DiaperKind, occurredAt?: string) {
  await db.diaperEvents.update(id, {
    kind,
    ...(occurredAt !== undefined ? { occurredAt } : {}),
    ...touch(),
  });
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
    remainingMl: null,
    durationMinutes: null,
    side: null,
    ...stamp(),
  });
  notifyDb();
  return id;
}

export async function addPumping(
  babyId: string,
  values: {
    amountMl: number;
    startedAt: string;
    durationMinutes?: number | null;
    side?: Side | null;
  },
) {
  const id = createId();
  await db.pumpingSessions.add({
    id,
    babyId,
    startedAt: values.startedAt,
    amountMl: values.amountMl,
    remainingMl: values.amountMl,
    durationMinutes: values.durationMinutes ?? null,
    side: values.side ?? null,
    ...stamp(),
  });
  notifyDb();
  return id;
}

export async function updatePumping(
  id: string,
  values: {
    amountMl?: number;
    remainingMl?: number | null;
    durationMinutes?: number | null;
    side?: Side | null;
    startedAt?: string;
  },
) {
  const row = await db.pumpingSessions.get(id);
  if (!row) return;
  const next: Record<string, unknown> = { ...touch() };
  if (values.startedAt !== undefined) next.startedAt = values.startedAt;
  if (values.durationMinutes !== undefined) next.durationMinutes = values.durationMinutes;
  if (values.side !== undefined) next.side = values.side;
  if (values.amountMl !== undefined) {
    next.amountMl = values.amountMl;
    if (values.remainingMl !== undefined) {
      next.remainingMl = values.remainingMl;
    } else if (row.remainingMl == null || row.remainingMl === row.amountMl) {
      next.remainingMl = values.amountMl;
    } else {
      const used = (row.amountMl ?? 0) - row.remainingMl;
      next.remainingMl = Math.max(0, values.amountMl - used);
    }
  } else if (values.remainingMl !== undefined) {
    next.remainingMl = values.remainingMl;
  }
  await db.pumpingSessions.update(id, next);
  notifyDb();
}

export async function deletePumping(id: string) {
  await db.pumpingSessions.update(id, { deletedAt: nowIso(), ...touch() });
  notifyDb();
}

export async function listMilkStock(babyId: string): Promise<PumpingSession[]> {
  return (await listPumps(babyId)).filter((row) => (row.remainingMl ?? 0) > 0);
}

export async function addBottle(
  babyId: string,
  milkType: MilkType,
  amountMl: number,
  fedAt: string,
  pumpingSessionId: string | null = null,
) {
  await db.transaction('rw', db.bottleFeeds, db.pumpingSessions, async () => {
    if (pumpingSessionId) {
      const pump = await db.pumpingSessions.get(pumpingSessionId);
      const left = pump?.remainingMl ?? 0;
      if (!pump || left < amountMl) throw new Error('stock');
      await db.pumpingSessions.update(pumpingSessionId, {
        remainingMl: left - amountMl,
        ...touch(),
      });
    }
    await db.bottleFeeds.add({
      id: createId(),
      babyId,
      milkType,
      amountMl,
      fedAt,
      pumpingSessionId,
      ...stamp(),
    });
  });
  notifyDb();
}

export async function updateBottle(
  id: string,
  values: { amountMl?: number; milkType?: MilkType; fedAt?: string },
) {
  const row = await db.bottleFeeds.get(id);
  if (!row) return;
  await db.transaction('rw', db.bottleFeeds, db.pumpingSessions, async () => {
    if (row.pumpingSessionId && values.amountMl !== undefined && values.amountMl !== row.amountMl) {
      const pump = await db.pumpingSessions.get(row.pumpingSessionId);
      if (pump) {
        const restored = (pump.remainingMl ?? 0) + row.amountMl;
        const need = values.amountMl;
        if (restored < need) throw new Error('stock');
        await db.pumpingSessions.update(row.pumpingSessionId, {
          remainingMl: restored - need,
          ...touch(),
        });
      }
    }
    await db.bottleFeeds.update(id, {
      ...(values.amountMl !== undefined ? { amountMl: values.amountMl } : {}),
      ...(values.milkType !== undefined ? { milkType: values.milkType } : {}),
      ...(values.fedAt !== undefined ? { fedAt: values.fedAt } : {}),
      ...touch(),
    });
  });
  notifyDb();
}

export async function deleteBottle(id: string) {
  const row = await db.bottleFeeds.get(id);
  if (!row) return;
  await db.transaction('rw', db.bottleFeeds, db.pumpingSessions, async () => {
    if (row.pumpingSessionId) {
      const pump = await db.pumpingSessions.get(row.pumpingSessionId);
      if (pump) {
        await db.pumpingSessions.update(row.pumpingSessionId, {
          remainingMl: (pump.remainingMl ?? 0) + row.amountMl,
          ...touch(),
        });
      }
    }
    await db.bottleFeeds.update(id, { deletedAt: nowIso(), ...touch() });
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
  diaperWhen?: DiaperWhen | null;
};

export async function upsertCareGoals(babyId: string, patch: CareGoalsPatch) {
  const existing = alive(await db.reminderRules.where('babyId').equals(babyId).toArray())[0];
  const delayMinutes = patch.delayMinutes ?? existing?.delayMinutes ?? 0;
  const bottleMl = patch.bottleMl !== undefined ? patch.bottleMl : (existing?.bottleMl ?? null);
  const bottleMinutes = patch.bottleMinutes !== undefined ? patch.bottleMinutes : (existing?.bottleMinutes ?? null);
  const diaperMinutes = patch.diaperMinutes !== undefined ? patch.diaperMinutes : (existing?.diaperMinutes ?? null);
  const diaperWhen =
    patch.diaperWhen !== undefined
      ? patch.diaperWhen
      : existing?.diaperWhen ?? (diaperMinutes && diaperMinutes > 0 ? 'after' : null);
  const values = {
    delayMinutes,
    enabled: delayMinutes > 0 || (bottleMinutes ?? 0) > 0 || (diaperMinutes ?? 0) > 0,
    bottleMl,
    bottleMinutes,
    diaperMinutes,
    diaperWhen,
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
      diaperWhen,
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

export async function lastFeeding(babyId: string) {
  return (await listSessions(babyId))[0];
}

export async function linkBabyUser(babyId: string, userId: string | null) {
  await db.babies.update(babyId, { userId, ...touch() });
  notifyDb();
}

export async function addSolidFood(babyId: string, food: string, eatenAt = nowIso()) {
  await db.solidFoods.add({
    id: createId(),
    babyId,
    food: food.trim(),
    eatenAt,
    ...stamp(),
  });
  notifyDb();
}

export async function listSolidFoods(babyId: string): Promise<SolidFood[]> {
  return alive(await db.solidFoods.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.eatenAt.localeCompare(a.eatenAt),
  );
}

export async function updateSolidFood(id: string, values: { food?: string; eatenAt?: string }) {
  await db.solidFoods.update(id, { ...values, ...(values.food !== undefined ? { food: values.food.trim() } : {}), ...touch() });
  notifyDb();
}

export async function deleteSolidFood(id: string) {
  await db.solidFoods.update(id, { deletedAt: nowIso(), ...touch() });
  notifyDb();
}

export async function addSupplement(babyId: string, name: string, givenAt = nowIso()) {
  await db.supplements.add({
    id: createId(),
    babyId,
    name: name.trim(),
    givenAt,
    ...stamp(),
  });
  notifyDb();
}

export async function listSupplements(babyId: string): Promise<Supplement[]> {
  return alive(await db.supplements.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.givenAt.localeCompare(a.givenAt),
  );
}

export async function updateSupplement(id: string, values: { name?: string; givenAt?: string }) {
  await db.supplements.update(id, {
    ...values,
    ...(values.name !== undefined ? { name: values.name.trim() } : {}),
    ...touch(),
  });
  notifyDb();
}

export async function deleteSupplement(id: string) {
  await db.supplements.update(id, { deletedAt: nowIso(), ...touch() });
  notifyDb();
}

export async function startSleep(babyId: string, startedAt = nowIso()) {
  const open = alive(await db.sleepSessions.where('babyId').equals(babyId).toArray()).find((row) => !row.endedAt);
  if (open) {
    await db.sleepSessions.update(open.id, { startedAt, ...touch() });
    notifyDb();
    return open.id;
  }
  const id = createId();
  await db.sleepSessions.add({
    id,
    babyId,
    startedAt,
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

export async function addTemperature(babyId: string, celsius: number, measuredAt = nowIso()) {
  await db.temperatures.add({
    id: createId(),
    babyId,
    celsius,
    measuredAt,
    ...stamp(),
  });
  notifyDb();
}

export async function listTemperatures(babyId: string): Promise<Temperature[]> {
  return alive(await db.temperatures.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.measuredAt.localeCompare(a.measuredAt),
  );
}

export async function updateTemperature(id: string, values: { celsius?: number; measuredAt?: string }) {
  await db.temperatures.update(id, { ...values, ...touch() });
  notifyDb();
}

export async function deleteTemperature(id: string) {
  await db.temperatures.update(id, { deletedAt: nowIso(), ...touch() });
  notifyDb();
}

export async function addNote(
  babyId: string,
  body: string,
  notedAt = nowIso(),
  isTodo = false,
) {
  await db.notes.add({
    id: createId(),
    babyId,
    body: body.trim(),
    notedAt,
    isTodo,
    doneAt: null,
    ...stamp(),
  });
  notifyDb();
}

export async function listNotes(babyId: string): Promise<Note[]> {
  return alive(await db.notes.where('babyId').equals(babyId).toArray()).sort((a, b) =>
    b.notedAt.localeCompare(a.notedAt),
  );
}

export async function listOpenNoteTodos(babyId: string): Promise<Note[]> {
  return alive(await db.notes.where('babyId').equals(babyId).toArray())
    .filter((row) => row.isTodo && !row.doneAt)
    .sort((a, b) => b.notedAt.localeCompare(a.notedAt));
}

export async function completeNoteTodo(id: string) {
  await db.notes.update(id, { doneAt: nowIso(), ...touch() });
  notifyDb();
}

export async function updateNote(
  id: string,
  values: { body?: string; notedAt?: string; isTodo?: boolean; doneAt?: string | null },
) {
  await db.notes.update(id, {
    ...values,
    ...(values.body !== undefined ? { body: values.body.trim() } : {}),
    ...(values.isTodo === false ? { doneAt: null } : {}),
    ...touch(),
  });
  notifyDb();
}

export async function deleteNote(id: string) {
  await db.notes.update(id, { deletedAt: nowIso(), ...touch() });
  notifyDb();
}

export async function updateFeedingSession(
  id: string,
  values: { startedAt?: string; endedAt?: string | null },
) {
  await db.feedingSessions.update(id, { ...values, ...touch() });
  notifyDb();
}

/** Remplace le(s) côté(s) d’une tétée par un seul côté (édition journal). */
export async function setFeedingSide(sessionId: string, side: Side) {
  const session = await db.feedingSessions.get(sessionId);
  if (!session) return;
  const now = nowIso();
  const segments = alive(await db.feedingSegments.where('feedingSessionId').equals(sessionId).toArray());
  await Promise.all(segments.map((row) => db.feedingSegments.update(row.id, { deletedAt: now, ...touch() })));
  await db.feedingSegments.add({
    id: createId(),
    feedingSessionId: sessionId,
    side,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    ...stamp(),
  });
  notifyDb();
}

export async function listSessionSides(sessionId: string): Promise<Side[]> {
  const segments = alive(await db.feedingSegments.where('feedingSessionId').equals(sessionId).toArray()).sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
  return [...new Set(segments.map((row) => row.side))];
}

export async function deleteFeeding(id: string) {
  const now = nowIso();
  const segments = alive(await db.feedingSegments.where('feedingSessionId').equals(id).toArray());
  await Promise.all(segments.map((row) => db.feedingSegments.update(row.id, { deletedAt: now, ...touch() })));
  await db.feedingSessions.update(id, { deletedAt: now, ...touch() });
  notifyDb();
}

export async function updateSleep(
  id: string,
  values: { startedAt?: string; endedAt?: string | null },
) {
  await db.sleepSessions.update(id, { ...values, ...touch() });
  notifyDb();
}

export async function deleteSleep(id: string) {
  await db.sleepSessions.update(id, { deletedAt: nowIso(), ...touch() });
  notifyDb();
}

export async function updateMeasurement(id: string, values: { value?: number; measuredAt?: string }) {
  await db.measurements.update(id, { ...values, ...touch() });
  notifyDb();
}

export async function deleteMeasurement(id: string) {
  await db.measurements.update(id, { deletedAt: nowIso(), ...touch() });
  notifyDb();
}

export async function addMeasurementAt(babyId: string, type: MeasurementType, value: number, measuredAt: string) {
  await db.measurements.add({
    id: createId(),
    babyId,
    type,
    value,
    unit: measurementUnit[type],
    measuredAt,
    ...stamp(),
  });
  notifyDb();
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

export async function collectPending(options?: { skipPlaceholderBaby?: boolean }): Promise<SyncPayload> {
  const changes = {} as SyncPayload;
  let skipBabyId: string | null = null;
  if (options?.skipPlaceholderBaby) {
    const local = await getBaby();
    if (local && (await isPlaceholderBaby(local))) skipBabyId = local.id;
  }
  for (const name of SYNC_TABLES) {
    let rows = await db.table(name).toArray();
    rows = rows.filter((row) => row.syncStatus === 'pending');
    if (skipBabyId) {
      if (name === 'babies') {
        rows = rows.filter((row) => row.id !== skipBabyId);
      } else if (name === 'reminderRules') {
        rows = rows.filter((row) => row.babyId !== skipBabyId);
      }
    }
    changes[name] = rows;
  }
  return changes;
}

/** Profil vide créé automatiquement avant toute saisie. */
export async function isPlaceholderBaby(baby: Baby): Promise<boolean> {
  if (baby.bornOn) return false;
  const name = baby.name.trim();
  if (name !== 'Bébé' && name !== '') return false;
  return !(await hasLocalActivity(baby.id));
}

export async function hasLocalActivity(babyId: string): Promise<boolean> {
  const checks = await Promise.all([
    db.feedingSessions.where('babyId').equals(babyId).count(),
    db.bottleFeeds.where('babyId').equals(babyId).count(),
    db.diaperEvents.where('babyId').equals(babyId).count(),
    db.pumpingSessions.where('babyId').equals(babyId).count(),
    db.solidFoods.where('babyId').equals(babyId).count(),
    db.supplements.where('babyId').equals(babyId).count(),
    db.sleepSessions.where('babyId').equals(babyId).count(),
    db.temperatures.where('babyId').equals(babyId).count(),
    db.notes.where('babyId').equals(babyId).count(),
    db.measurements.where('babyId').equals(babyId).count(),
  ]);
  return checks.some((n) => n > 0);
}

/** Remplace le cache local par le snapshot VPS (source de vérité). */
export async function mirrorRemoteSnapshot(records: SyncPayload, canonicalBabyId: string | null) {
  const remoteIds = Object.fromEntries(
    SYNC_TABLES.map((name) => [
      name,
      new Set((records[name] ?? []).map((row) => String(row.id ?? '')).filter(Boolean)),
    ]),
  ) as Record<SyncTable, Set<string>>;

  await db.transaction('rw', SYNC_TABLES.map((name) => db.table(name)), async () => {
    for (const name of SYNC_TABLES) {
      for (const row of records[name] ?? []) {
        const id = String(row.id ?? '');
        if (!id) continue;
        await db.table(name).put({ ...row, syncStatus: 'synced' });
      }
    }

    if (!canonicalBabyId) return;

    for (const row of await db.babies.toArray()) {
      if (!remoteIds.babies.has(row.id)) await db.babies.delete(row.id);
    }

    for (const name of SYNC_TABLES) {
      if (name === 'babies' || name === 'feedingSegments') continue;
      for (const row of await db.table(name).toArray()) {
        const id = String(row.id);
        const babyId = 'babyId' in row ? String(row.babyId) : '';
        if (babyId === canonicalBabyId && !remoteIds[name].has(id)) {
          await db.table(name).delete(id);
        }
      }
    }

    for (const row of await db.feedingSegments.toArray()) {
      const id = String(row.id);
      if (remoteIds.feedingSegments.has(id)) continue;
      const session = await db.feedingSessions.get(row.feedingSessionId);
      if (session?.babyId === canonicalBabyId) await db.feedingSegments.delete(id);
    }
  });
  notifyDb();
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
  await mirrorRemoteSnapshot(records, canonicalBabyId);
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
