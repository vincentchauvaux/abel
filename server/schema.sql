CREATE TABLE IF NOT EXISTS babies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  born_on DATE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS babies_one_per_user
  ON babies (user_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS feeding_sessions (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feeding_segments (
  id UUID PRIMARY KEY,
  feeding_session_id UUID NOT NULL REFERENCES feeding_sessions (id) ON DELETE CASCADE,
  side TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bottle_feeds (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  milk_type TEXT NOT NULL,
  amount_ml INTEGER,
  fed_at TIMESTAMPTZ NOT NULL,
  pumping_session_id UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS diaper_events (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pumping_sessions (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  amount_ml INTEGER,
  remaining_ml INTEGER,
  duration_minutes INTEGER,
  side TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS measurements (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reminder_rules (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  delay_minutes INTEGER NOT NULL,
  bottle_ml INTEGER,
  bottle_minutes INTEGER,
  diaper_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS solid_foods (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  food TEXT NOT NULL,
  eaten_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS supplements (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  given_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sleep_sessions (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS temperatures (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  celsius DOUBLE PRECISION NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  noted_at TIMESTAMPTZ NOT NULL,
  is_todo BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

ALTER TABLE babies ADD COLUMN IF NOT EXISTS born_on DATE;
ALTER TABLE reminder_rules ADD COLUMN IF NOT EXISTS bottle_ml INTEGER;
ALTER TABLE reminder_rules ADD COLUMN IF NOT EXISTS bottle_minutes INTEGER;
ALTER TABLE reminder_rules ADD COLUMN IF NOT EXISTS diaper_minutes INTEGER;
ALTER TABLE reminder_rules ADD COLUMN IF NOT EXISTS diaper_when TEXT;
ALTER TABLE bottle_feeds ADD COLUMN IF NOT EXISTS pumping_session_id UUID;
ALTER TABLE pumping_sessions ADD COLUMN IF NOT EXISTS remaining_ml INTEGER;
ALTER TABLE bottle_feeds ALTER COLUMN amount_ml DROP NOT NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_todo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ;
ALTER TABLE babies ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE TABLE IF NOT EXISTS baby_members (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS baby_members_one_per_user
  ON baby_members (user_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS baby_members_one_per_baby_user
  ON baby_members (baby_id, user_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS baby_invites (
  id UUID PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS baby_invites_one_pending
  ON baby_invites (baby_id, invited_email)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS auth_sessions_user
  ON auth_sessions (user_id)
  WHERE revoked_at IS NULL;
