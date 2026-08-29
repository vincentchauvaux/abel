-- Abel — schéma Supabase (PostgreSQL + RLS)
-- À exécuter dans l’éditeur SQL du projet Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.babies (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.feeding_sessions (
  id uuid primary key,
  baby_id uuid not null references public.babies (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.feeding_segments (
  id uuid primary key,
  feeding_session_id uuid not null references public.feeding_sessions (id) on delete cascade,
  side text not null check (side in ('LEFT', 'RIGHT', 'BOTH')),
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.bottle_feeds (
  id uuid primary key,
  baby_id uuid not null references public.babies (id) on delete cascade,
  milk_type text not null check (milk_type in ('BREAST_MILK', 'FORMULA')),
  amount_ml integer not null,
  fed_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.diaper_events (
  id uuid primary key,
  baby_id uuid not null references public.babies (id) on delete cascade,
  kind text not null check (kind in ('PEE', 'POO', 'BOTH')),
  occurred_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.pumping_sessions (
  id uuid primary key,
  baby_id uuid not null references public.babies (id) on delete cascade,
  started_at timestamptz not null,
  amount_ml integer,
  duration_minutes integer,
  side text check (side in ('LEFT', 'RIGHT', 'BOTH')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.measurements (
  id uuid primary key,
  baby_id uuid not null references public.babies (id) on delete cascade,
  type text not null check (type in ('WEIGHT', 'HEIGHT', 'HEAD_CIRCUMFERENCE')),
  value double precision not null,
  unit text not null,
  measured_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.reminder_rules (
  id uuid primary key,
  baby_id uuid not null references public.babies (id) on delete cascade,
  enabled boolean not null default true,
  delay_minutes integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

alter table public.babies enable row level security;
alter table public.feeding_sessions enable row level security;
alter table public.feeding_segments enable row level security;
alter table public.bottle_feeds enable row level security;
alter table public.diaper_events enable row level security;
alter table public.pumping_sessions enable row level security;
alter table public.measurements enable row level security;
alter table public.reminder_rules enable row level security;

create policy "own babies" on public.babies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own feeding_sessions" on public.feeding_sessions
  for all using (
    baby_id in (select id from public.babies where user_id = auth.uid())
  ) with check (
    baby_id in (select id from public.babies where user_id = auth.uid())
  );

create policy "own feeding_segments" on public.feeding_segments
  for all using (
    feeding_session_id in (
      select s.id from public.feeding_sessions s
      join public.babies b on b.id = s.baby_id
      where b.user_id = auth.uid()
    )
  ) with check (
    feeding_session_id in (
      select s.id from public.feeding_sessions s
      join public.babies b on b.id = s.baby_id
      where b.user_id = auth.uid()
    )
  );

create policy "own bottle_feeds" on public.bottle_feeds
  for all using (
    baby_id in (select id from public.babies where user_id = auth.uid())
  ) with check (
    baby_id in (select id from public.babies where user_id = auth.uid())
  );

create policy "own diaper_events" on public.diaper_events
  for all using (
    baby_id in (select id from public.babies where user_id = auth.uid())
  ) with check (
    baby_id in (select id from public.babies where user_id = auth.uid())
  );

create policy "own pumping_sessions" on public.pumping_sessions
  for all using (
    baby_id in (select id from public.babies where user_id = auth.uid())
  ) with check (
    baby_id in (select id from public.babies where user_id = auth.uid())
  );

create policy "own measurements" on public.measurements
  for all using (
    baby_id in (select id from public.babies where user_id = auth.uid())
  ) with check (
    baby_id in (select id from public.babies where user_id = auth.uid())
  );

create policy "own reminder_rules" on public.reminder_rules
  for all using (
    baby_id in (select id from public.babies where user_id = auth.uid())
  ) with check (
    baby_id in (select id from public.babies where user_id = auth.uid())
  );
