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
  }
}

export const db = new AbelDB();

export function createId(): string {
  return crypto.randomUUID();
}

export function notifyDb() {
  window.dispatchEvent(new Event('abel-db'));
}
