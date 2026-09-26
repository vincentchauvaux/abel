import Dexie, { type Table } from 'dexie';

import type {
  Baby,
  BathEvent,
  BottleFeed,
  DiaperEvent,
  FeedingSegment,
  FeedingSession,
  Measurement,
  ExerciseItem,
  ExerciseSession,
  Note,
  PumpingSession,
  ReminderRule,
  SleepSession,
  SolidFood,
  Supplement,
  Temperature,
} from '@/db/types';

class AbelDB extends Dexie {
  babies!: Table<Baby, string>;
  feedingSessions!: Table<FeedingSession, string>;
  feedingSegments!: Table<FeedingSegment, string>;
  bottleFeeds!: Table<BottleFeed, string>;
  diaperEvents!: Table<DiaperEvent, string>;
  bathEvents!: Table<BathEvent, string>;
  pumpingSessions!: Table<PumpingSession, string>;
  measurements!: Table<Measurement, string>;
  reminderRules!: Table<ReminderRule, string>;
  solidFoods!: Table<SolidFood, string>;
  supplements!: Table<Supplement, string>;
  sleepSessions!: Table<SleepSession, string>;
  temperatures!: Table<Temperature, string>;
  notes!: Table<Note, string>;
  exerciseItems!: Table<ExerciseItem, string>;
  exerciseSessions!: Table<ExerciseSession, string>;

  constructor() {
    super('abel');
    this.version(1).stores({
      babies: 'id',
      feedingSessions: 'id, babyId, startedAt',
      feedingSegments: 'id, feedingSessionId, startedAt',
      bottleFeeds: 'id, babyId, fedAt',
      diaperEvents: 'id, babyId, occurredAt',
      pumpingSessions: 'id, babyId, startedAt',
      measurements: 'id, babyId, type, measuredAt',
      reminderRules: 'id, babyId',
    });
    this.version(2).stores({
      babies: 'id',
      feedingSessions: 'id, babyId, startedAt',
      feedingSegments: 'id, feedingSessionId, startedAt',
      bottleFeeds: 'id, babyId, fedAt',
      diaperEvents: 'id, babyId, occurredAt',
      pumpingSessions: 'id, babyId, startedAt',
      measurements: 'id, babyId, type, measuredAt',
      reminderRules: 'id, babyId',
      solidFoods: 'id, babyId, eatenAt',
      supplements: 'id, babyId, givenAt',
      sleepSessions: 'id, babyId, startedAt',
      temperatures: 'id, babyId, measuredAt',
      notes: 'id, babyId, notedAt',
    });
    this.version(3)
      .stores({
        babies: 'id',
        feedingSessions: 'id, babyId, startedAt',
        feedingSegments: 'id, feedingSessionId, startedAt',
        bottleFeeds: 'id, babyId, fedAt, pumpingSessionId',
        diaperEvents: 'id, babyId, occurredAt',
        pumpingSessions: 'id, babyId, startedAt',
        measurements: 'id, babyId, type, measuredAt',
        reminderRules: 'id, babyId',
        solidFoods: 'id, babyId, eatenAt',
        supplements: 'id, babyId, givenAt',
        sleepSessions: 'id, babyId, startedAt',
        temperatures: 'id, babyId, measuredAt',
        notes: 'id, babyId, notedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('pumpingSessions')
          .toCollection()
          .modify((row: { amountMl?: number | null; remainingMl?: number | null }) => {
            if (row.remainingMl == null && row.amountMl != null) row.remainingMl = row.amountMl;
          });
        await tx
          .table('bottleFeeds')
          .toCollection()
          .modify((row: { pumpingSessionId?: string | null }) => {
            if (row.pumpingSessionId === undefined) row.pumpingSessionId = null;
          });
      });
    this.version(4)
      .stores({
        babies: 'id',
        feedingSessions: 'id, babyId, startedAt',
        feedingSegments: 'id, feedingSessionId, startedAt',
        bottleFeeds: 'id, babyId, fedAt, pumpingSessionId',
        diaperEvents: 'id, babyId, occurredAt',
        pumpingSessions: 'id, babyId, startedAt',
        measurements: 'id, babyId, type, measuredAt',
        reminderRules: 'id, babyId',
        solidFoods: 'id, babyId, eatenAt',
        supplements: 'id, babyId, givenAt',
        sleepSessions: 'id, babyId, startedAt',
        temperatures: 'id, babyId, measuredAt',
        notes: 'id, babyId, notedAt, isTodo, doneAt',
      })
      .upgrade(async (tx) => {
        await tx.table('notes').toCollection().modify((row: { isTodo?: boolean; doneAt?: string | null }) => {
          if (row.isTodo === undefined) row.isTodo = false;
          if (row.doneAt === undefined) row.doneAt = null;
        });
      });
    this.version(5)
      .stores({
        babies: 'id',
        feedingSessions: 'id, babyId, startedAt',
        feedingSegments: 'id, feedingSessionId, startedAt',
        bottleFeeds: 'id, babyId, fedAt, pumpingSessionId',
        diaperEvents: 'id, babyId, occurredAt',
        pumpingSessions: 'id, babyId, startedAt',
        measurements: 'id, babyId, type, measuredAt',
        reminderRules: 'id, babyId',
        solidFoods: 'id, babyId, eatenAt',
        supplements: 'id, babyId, givenAt',
        sleepSessions: 'id, babyId, startedAt',
        temperatures: 'id, babyId, measuredAt',
        notes: 'id, babyId, notedAt, isTodo, doneAt',
      })
      .upgrade(async (tx) => {
        await tx.table('babies').toCollection().modify((row: { photoUrl?: string | null }) => {
          if (row.photoUrl === undefined) row.photoUrl = null;
        });
      });
    this.version(6).stores({
      babies: 'id',
      feedingSessions: 'id, babyId, startedAt',
      feedingSegments: 'id, feedingSessionId, startedAt',
      bottleFeeds: 'id, babyId, fedAt, pumpingSessionId',
      diaperEvents: 'id, babyId, occurredAt',
      pumpingSessions: 'id, babyId, startedAt',
      measurements: 'id, babyId, type, measuredAt',
      reminderRules: 'id, babyId',
      solidFoods: 'id, babyId, eatenAt',
      supplements: 'id, babyId, givenAt',
      sleepSessions: 'id, babyId, startedAt',
      temperatures: 'id, babyId, measuredAt',
      notes: 'id, babyId, notedAt, isTodo, doneAt',
      exerciseItems: 'id, babyId, createdAt',
    });
    this.version(7).stores({
      babies: 'id',
      feedingSessions: 'id, babyId, startedAt',
      feedingSegments: 'id, feedingSessionId, startedAt',
      bottleFeeds: 'id, babyId, fedAt, pumpingSessionId',
      diaperEvents: 'id, babyId, occurredAt',
      pumpingSessions: 'id, babyId, startedAt',
      measurements: 'id, babyId, type, measuredAt',
      reminderRules: 'id, babyId',
      solidFoods: 'id, babyId, eatenAt',
      supplements: 'id, babyId, givenAt',
      sleepSessions: 'id, babyId, startedAt',
      temperatures: 'id, babyId, measuredAt',
      notes: 'id, babyId, notedAt, isTodo, doneAt',
      exerciseItems: 'id, babyId, createdAt',
      bathEvents: 'id, babyId, occurredAt',
    });
    this.version(8).stores({
      babies: 'id',
      feedingSessions: 'id, babyId, startedAt',
      feedingSegments: 'id, feedingSessionId, startedAt',
      bottleFeeds: 'id, babyId, fedAt, pumpingSessionId',
      diaperEvents: 'id, babyId, occurredAt',
      pumpingSessions: 'id, babyId, startedAt',
      measurements: 'id, babyId, type, measuredAt',
      reminderRules: 'id, babyId',
      solidFoods: 'id, babyId, eatenAt',
      supplements: 'id, babyId, givenAt',
      sleepSessions: 'id, babyId, startedAt',
      temperatures: 'id, babyId, measuredAt',
      notes: 'id, babyId, notedAt, isTodo, doneAt',
      exerciseItems: 'id, babyId, createdAt',
      bathEvents: 'id, babyId, occurredAt',
      exerciseSessions: 'id, babyId, exerciseItemId, startedAt',
    });
    this.version(9)
      .stores({
        babies: 'id',
        feedingSessions: 'id, babyId, startedAt',
        feedingSegments: 'id, feedingSessionId, startedAt',
        bottleFeeds: 'id, babyId, fedAt, pumpingSessionId',
        diaperEvents: 'id, babyId, occurredAt',
        pumpingSessions: 'id, babyId, startedAt',
        measurements: 'id, babyId, type, measuredAt',
        reminderRules: 'id, babyId',
        solidFoods: 'id, babyId, eatenAt',
        supplements: 'id, babyId, givenAt',
        sleepSessions: 'id, babyId, startedAt',
        temperatures: 'id, babyId, measuredAt',
        notes: 'id, babyId, notedAt, isTodo, doneAt',
        exerciseItems: 'id, babyId, createdAt',
        bathEvents: 'id, babyId, occurredAt',
        exerciseSessions: 'id, babyId, exerciseItemId, startedAt',
      })
      .upgrade(async (tx) => {
        const rows = await tx.table('pumpingSessions').toArray();
        const byBaby = new Map<string, typeof rows>();
        for (const row of rows) {
          const babyId = String(row.babyId ?? '');
          const list = byBaby.get(babyId) ?? [];
          list.push(row);
          byBaby.set(babyId, list);
        }
        for (const list of byBaby.values()) {
          let max = 0;
          for (const row of list) {
            const n = row.stockNo;
            if (typeof n === 'number' && n > max) max = n;
          }
          const missing = list
            .filter((row) => typeof row.stockNo !== 'number' || row.stockNo < 1)
            .sort(
              (a, b) =>
                String(a.startedAt ?? '').localeCompare(String(b.startedAt ?? '')) ||
                String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) ||
                String(a.id).localeCompare(String(b.id)),
            );
          for (const row of missing) {
            max += 1;
            await tx.table('pumpingSessions').update(row.id, { stockNo: max });
          }
        }
      });
  }
}

export const db = new AbelDB();

export function createId(): string {
  return crypto.randomUUID();
}

export type DbNotifyPriority = 'normal' | 'urgent';

type DbNotifyOptions = {
  silent?: boolean;
};

export function notifyDb(priority: DbNotifyPriority = 'normal', options?: DbNotifyOptions) {
  window.dispatchEvent(new CustomEvent('abel-db', { detail: { priority, silent: options?.silent } }));
}

export function notifyDbUrgent() {
  notifyDb('urgent');
}
