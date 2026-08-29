import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const syncStatuses = ['pending', 'synced'] as const;
export type SyncStatus = (typeof syncStatuses)[number];

export const sides = ['LEFT', 'RIGHT', 'BOTH'] as const;
export type Side = (typeof sides)[number];

export const diaperKinds = ['PEE', 'POO', 'BOTH'] as const;
export type DiaperKind = (typeof diaperKinds)[number];

export const milkTypes = ['BREAST_MILK', 'FORMULA'] as const;
export type MilkType = (typeof milkTypes)[number];

export const measurementTypes = ['WEIGHT', 'HEIGHT', 'HEAD_CIRCUMFERENCE'] as const;
export type MeasurementType = (typeof measurementTypes)[number];

const syncStatus = () => text('sync_status').notNull().default('pending');

export const babies = sqliteTable('babies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userId: text('user_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  syncStatus: syncStatus(),
});

export const feedingSessions = sqliteTable('feeding_sessions', {
  id: text('id').primaryKey(),
  babyId: text('baby_id').notNull(),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  syncStatus: syncStatus(),
});

export const feedingSegments = sqliteTable('feeding_segments', {
  id: text('id').primaryKey(),
  feedingSessionId: text('feeding_session_id').notNull(),
  side: text('side').notNull(),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  syncStatus: syncStatus(),
});

export const bottleFeeds = sqliteTable('bottle_feeds', {
  id: text('id').primaryKey(),
  babyId: text('baby_id').notNull(),
  milkType: text('milk_type').notNull(),
  amountMl: integer('amount_ml').notNull(),
  fedAt: text('fed_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  syncStatus: syncStatus(),
});

export const diaperEvents = sqliteTable('diaper_events', {
  id: text('id').primaryKey(),
  babyId: text('baby_id').notNull(),
  kind: text('kind').notNull(),
  occurredAt: text('occurred_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  syncStatus: syncStatus(),
});

export const pumpingSessions = sqliteTable('pumping_sessions', {
  id: text('id').primaryKey(),
  babyId: text('baby_id').notNull(),
  startedAt: text('started_at').notNull(),
  amountMl: integer('amount_ml'),
  durationMinutes: integer('duration_minutes'),
  side: text('side'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  syncStatus: syncStatus(),
});

export const measurements = sqliteTable('measurements', {
  id: text('id').primaryKey(),
  babyId: text('baby_id').notNull(),
  type: text('type').notNull(),
  value: real('value').notNull(),
  unit: text('unit').notNull(),
  measuredAt: text('measured_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  syncStatus: syncStatus(),
});

export const reminderRules = sqliteTable('reminder_rules', {
  id: text('id').primaryKey(),
  babyId: text('baby_id').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  delayMinutes: integer('delay_minutes').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  syncStatus: syncStatus(),
});
