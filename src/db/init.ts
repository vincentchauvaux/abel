import { and, isNull } from 'drizzle-orm';

import { db, sqlite } from '@/db/client';
import { babies, reminderRules } from '@/db/schema';
import { nowIso } from '@/lib/dates';
import { createId } from '@/lib/ids';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS babies (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS feeding_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS feeding_segments (
  id TEXT PRIMARY KEY NOT NULL,
  feeding_session_id TEXT NOT NULL,
  side TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS bottle_feeds (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL,
  milk_type TEXT NOT NULL,
  amount_ml INTEGER NOT NULL,
  fed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS diaper_events (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS pumping_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  amount_ml INTEGER,
  duration_minutes INTEGER,
  side TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  measured_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS reminder_rules (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
`;

export async function initDatabase(): Promise<void> {
  sqlite.execSync(SCHEMA_SQL);

  const existing = db.select().from(babies).where(isNull(babies.deletedAt)).limit(1).all();
  if (existing.length > 0) return;

  const now = nowIso();
  const babyId = createId();
  db.insert(babies)
    .values({
      id: babyId,
      name: 'Bébé',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
    .run();
  db.insert(reminderRules)
    .values({
      id: createId(),
      babyId,
      enabled: true,
      delayMinutes: 0,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
    .run();
}

export function getDefaultBabyId(): string {
  const row = db
    .select()
    .from(babies)
    .where(and(isNull(babies.deletedAt)))
    .limit(1)
    .all()[0];
  if (!row) throw new Error('Aucun bébé en local');
  return row.id;
}
