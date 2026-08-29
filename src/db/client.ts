import Dexie, { type Table } from 'dexie';

import type {
  Baby,
  BottleFeed,
  DiaperEvent,
  FeedingSegment,
  FeedingSession,
  Measurement,
  PumpingSession,
  ReminderRule,
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
  }
}

export const db = new AbelDB();

export function createId(): string {
  return crypto.randomUUID();
}

export function notifyDb() {
  window.dispatchEvent(new Event('abel-db'));
}
