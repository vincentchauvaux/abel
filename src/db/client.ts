import Dexie, { type Table } from 'dexie';

import type {
  Baby,
  BottleFeed,
  DiaperEvent,
  FeedingSegment,
  FeedingSession,
  Measurement,
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
  pumpingSessions!: Table<PumpingSession, string>;
  measurements!: Table<Measurement, string>;
  reminderRules!: Table<ReminderRule, string>;
  solidFoods!: Table<SolidFood, string>;
  supplements!: Table<Supplement, string>;
  sleepSessions!: Table<SleepSession, string>;
  temperatures!: Table<Temperature, string>;
  notes!: Table<Note, string>;

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
  }
}

export const db = new AbelDB();

export function createId(): string {
  return crypto.randomUUID();
}

export function notifyDb() {
  window.dispatchEvent(new Event('abel-db'));
}
