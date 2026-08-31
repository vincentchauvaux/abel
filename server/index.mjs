import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { OAuth2Client } from 'google-auth-library';
import pg from 'pg';

import { dailyHoroscope } from './horoscope.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const PORT = Number(process.env.PORT || 3030);
const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const ALLOWED_ORIGINS = new Set([
  'https://vincentchauvaux.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

if (!DATABASE_URL || !GOOGLE_CLIENT_ID) {
  console.error('DATABASE_URL et GOOGLE_CLIENT_ID sont requis');
  process.exit(1);
}

const google = new OAuth2Client(GOOGLE_CLIENT_ID);
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8 });

const TABLES = {
  babies: {
    sql: 'babies',
    fields: {
      id: 'id',
      name: 'name',
      userId: 'user_id',
      bornOn: 'born_on',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  feedingSessions: {
    sql: 'feeding_sessions',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      startedAt: 'started_at',
      endedAt: 'ended_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  feedingSegments: {
    sql: 'feeding_segments',
    fields: {
      id: 'id',
      feedingSessionId: 'feeding_session_id',
      side: 'side',
      startedAt: 'started_at',
      endedAt: 'ended_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  bottleFeeds: {
    sql: 'bottle_feeds',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      milkType: 'milk_type',
      amountMl: 'amount_ml',
      fedAt: 'fed_at',
      pumpingSessionId: 'pumping_session_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  diaperEvents: {
    sql: 'diaper_events',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      kind: 'kind',
      occurredAt: 'occurred_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  pumpingSessions: {
    sql: 'pumping_sessions',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      startedAt: 'started_at',
      amountMl: 'amount_ml',
      remainingMl: 'remaining_ml',
      durationMinutes: 'duration_minutes',
      side: 'side',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  measurements: {
    sql: 'measurements',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      type: 'type',
      value: 'value',
      unit: 'unit',
      measuredAt: 'measured_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  reminderRules: {
    sql: 'reminder_rules',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      enabled: 'enabled',
      delayMinutes: 'delay_minutes',
      bottleMl: 'bottle_ml',
      bottleMinutes: 'bottle_minutes',
      diaperMinutes: 'diaper_minutes',
      diaperWhen: 'diaper_when',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  solidFoods: {
    sql: 'solid_foods',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      food: 'food',
      eatenAt: 'eaten_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  supplements: {
    sql: 'supplements',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      name: 'name',
      givenAt: 'given_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  sleepSessions: {
    sql: 'sleep_sessions',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      startedAt: 'started_at',
      endedAt: 'ended_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  temperatures: {
    sql: 'temperatures',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      celsius: 'celsius',
      measuredAt: 'measured_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
  notes: {
    sql: 'notes',
    fields: {
      id: 'id',
      babyId: 'baby_id',
      body: 'body',
      notedAt: 'noted_at',
      isTodo: 'is_todo',
      doneAt: 'done_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  },
};

const PUSH_ORDER = [
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
];

function dateOnly(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function toRow(fields, record) {
  const row = {};
  for (const [camel, sql] of Object.entries(fields)) {
    let value = record[camel];
    if (value === undefined) continue;
    if (sql === 'born_on') {
      row[sql] = value ? String(value).slice(0, 10) : null;
      continue;
    }
    if (typeof value === 'string' && (sql.endsWith('_at') || sql === 'created_at')) {
      value = value ? new Date(value) : null;
    }
    row[sql] = value ?? null;
  }
  return row;
}

function fromRow(fields, pgRow) {
  const record = { syncStatus: 'synced' };
  for (const [camel, sql] of Object.entries(fields)) {
    const value = pgRow[sql];
    if (sql === 'born_on') {
      record[camel] = dateOnly(value);
    } else {
      record[camel] = value instanceof Date ? value.toISOString() : value;
    }
  }
  return record;
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  }
}

const RATE_LIMITS = {
  horoscope: { max: 40, windowMs: 60_000 },
  sync: { max: 120, windowMs: 60_000 },
  account: { max: 5, windowMs: 60_000 },
  sharing: { max: 60, windowMs: 60_000 },
  invites: { max: 10, windowMs: 3_600_000 },
};

const MAX_BABY_MEMBERS = 2;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const rateBuckets = new Map();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function overRateLimit(req, route) {
  const cfg = RATE_LIMITS[route];
  if (!cfg) return false;
  const key = `${clientIp(req)}:${route}`;
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + cfg.windowMs };
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return bucket.count > cfg.max;
}

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cache-Control', 'no-store');
}

async function verifyUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  try {
    const ticket = await google.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub) return null;
    return { sub: payload.sub, email: payload.email || '' };
  } catch {
    return null;
  }
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error('too_large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function upsert(client, sqlTable, row) {
  const cols = Object.keys(row);
  const vals = cols.map((_, i) => `$${i + 1}`);
  const updates = cols.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`);
  await client.query(
    `INSERT INTO ${sqlTable} (${cols.join(', ')}) VALUES (${vals.join(', ')})
     ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}
     WHERE ${sqlTable}.updated_at <= EXCLUDED.updated_at`,
    cols.map((c) => row[c]),
  );
}

async function canonicalBabyId(client, sub) {
  const { rows } = await client.query(
    `SELECT id FROM babies WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`,
    [sub],
  );
  return rows[0]?.id ?? null;
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

async function ensureOwnerMembership(client, babyId, sub, ts = new Date().toISOString()) {
  const { rows } = await client.query(
    `SELECT id FROM baby_members
     WHERE baby_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [babyId, sub],
  );
  if (rows.length) return;
  await client.query(
    `INSERT INTO baby_members (id, baby_id, user_id, role, joined_at, created_at)
     VALUES ($1, $2, $3, 'owner', $4, $4)`,
    [randomUUID(), babyId, sub, ts],
  );
}

async function resolveBabyAccess(client, user) {
  const { rows } = await client.query(
    `SELECT m.baby_id, m.role FROM baby_members m
     JOIN babies b ON b.id = m.baby_id AND b.deleted_at IS NULL
     WHERE m.user_id = $1 AND m.deleted_at IS NULL
     ORDER BY m.joined_at ASC LIMIT 1`,
    [user.sub],
  );
  if (rows[0]) {
    return { babyId: rows[0].baby_id, role: rows[0].role };
  }
  const babyId = await canonicalBabyId(client, user.sub);
  if (!babyId) return { babyId: null, role: null };
  await ensureOwnerMembership(client, babyId, user.sub);
  return { babyId, role: 'owner' };
}

async function countActiveMembers(client, babyId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM baby_members WHERE baby_id = $1 AND deleted_at IS NULL`,
    [babyId],
  );
  return rows[0]?.n ?? 0;
}

async function expirePendingInvites(client) {
  const ts = new Date().toISOString();
  await client.query(
    `UPDATE baby_invites SET status = 'expired', responded_at = $1
     WHERE status = 'pending' AND expires_at < $1`,
    [ts],
  );
}

async function userOwnsNonPlaceholderBaby(client, sub) {
  const { rows } = await client.query(
    `SELECT name, born_on FROM babies WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [sub],
  );
  if (!rows[0]) return false;
  const name = (rows[0].name || '').trim();
  return Boolean(rows[0].born_on) || (name !== 'Bébé' && name !== '');
}

async function getBabyName(client, babyId) {
  const { rows } = await client.query(`SELECT name FROM babies WHERE id = $1 AND deleted_at IS NULL`, [babyId]);
  return rows[0]?.name ?? 'Bébé';
}

async function handleSharingGet(user) {
  const client = await pool.connect();
  try {
    await expirePendingInvites(client);
    const access = await resolveBabyAccess(client, user);
    const email = normalizeEmail(user.email);
    const received = email
      ? (
          await client.query(
            `SELECT i.id, i.baby_id, i.expires_at, b.name AS baby_name
             FROM baby_invites i
             JOIN babies b ON b.id = i.baby_id AND b.deleted_at IS NULL
             WHERE i.invited_email = $1 AND i.status = 'pending' AND i.expires_at > NOW()
             ORDER BY i.created_at DESC`,
            [email],
          )
        ).rows.map((row) => ({
          id: row.id,
          babyName: row.baby_name,
          expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
        }))
      : [];

    if (!access.babyId) {
      return {
        babyId: null,
        babyName: null,
        role: null,
        members: [],
        sentInvites: [],
        receivedInvites: received,
        pendingInvitesCount: received.length,
      };
    }

    const babyName = await getBabyName(client, access.babyId);
    const members = (
      await client.query(
        `SELECT role, user_id FROM baby_members
         WHERE baby_id = $1 AND deleted_at IS NULL ORDER BY joined_at ASC`,
        [access.babyId],
      )
    ).rows.map((row) => ({
      role: row.role,
      isYou: row.user_id === user.sub,
      label: row.user_id === user.sub ? 'Vous' : row.role === 'owner' ? 'Propriétaire' : 'Co-parent',
    }));

    const sentInvites = (
      await client.query(
        `SELECT id, invited_email, status, expires_at FROM baby_invites
         WHERE baby_id = $1 AND status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')
         ORDER BY created_at DESC LIMIT 20`,
        [access.babyId],
      )
    ).rows.map((row) => ({
      id: row.id,
      email: row.invited_email,
      status: row.status,
      expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    }));

    return {
      babyId: access.babyId,
      babyName,
      role: access.role,
      members,
      sentInvites,
      receivedInvites: received,
      pendingInvitesCount: received.length,
    };
  } finally {
    client.release();
  }
}

async function handleInviteCreate(user, body) {
  const invitedEmail = normalizeEmail(body?.email);
  if (!invitedEmail || !invitedEmail.includes('@')) {
    return { status: 400, body: { error: 'invalid_email' } };
  }
  if (normalizeEmail(user.email) === invitedEmail) {
    return { status: 400, body: { error: 'self_invite' } };
  }

  const client = await pool.connect();
  const ts = new Date().toISOString();
  try {
    await expirePendingInvites(client);
    const access = await resolveBabyAccess(client, user);
    if (!access.babyId) {
      return { status: 403, body: { error: 'forbidden' } };
    }
    const members = await countActiveMembers(client, access.babyId);
    if (members >= MAX_BABY_MEMBERS) {
      return { status: 409, body: { error: 'max_members' } };
    }
    const pending = await client.query(
      `SELECT id FROM baby_invites
       WHERE baby_id = $1 AND invited_email = $2 AND status = 'pending' AND expires_at > NOW()`,
      [access.babyId, invitedEmail],
    );
    if (pending.rows.length) {
      return { status: 409, body: { error: 'already_invited' } };
    }
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    await client.query(
      `INSERT INTO baby_invites (id, baby_id, invited_email, invited_by, status, expires_at, created_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
      [id, access.babyId, invitedEmail, user.sub, expiresAt, ts],
    );
    return { status: 201, body: { ok: true, id, expiresAt } };
  } finally {
    client.release();
  }
}

async function getInviteForUser(client, inviteId, user) {
  const email = normalizeEmail(user.email);
  const { rows } = await client.query(`SELECT * FROM baby_invites WHERE id = $1`, [inviteId]);
  return { invite: rows[0] ?? null, email };
}

async function handleInviteAccept(user, inviteId) {
  const client = await pool.connect();
  const ts = new Date().toISOString();
  try {
    await client.query('BEGIN');
    await expirePendingInvites(client);
    const { invite, email } = await getInviteForUser(client, inviteId, user);
    if (!invite) {
      await client.query('ROLLBACK');
      return { status: 404, body: { error: 'not_found' } };
    }
    if (invite.status !== 'pending' || new Date(invite.expires_at) <= new Date()) {
      await client.query('ROLLBACK');
      return { status: 410, body: { error: 'expired' } };
    }
    if (invite.invited_email !== email) {
      await client.query('ROLLBACK');
      return { status: 403, body: { error: 'forbidden' } };
    }
    const existingMember = await client.query(
      `SELECT 1 FROM baby_members WHERE user_id = $1 AND deleted_at IS NULL`,
      [user.sub],
    );
    if (existingMember.rows.length) {
      await client.query('ROLLBACK');
      return { status: 409, body: { error: 'already_member' } };
    }
    if (await userOwnsNonPlaceholderBaby(client, user.sub)) {
      await client.query('ROLLBACK');
      return { status: 409, body: { error: 'has_own_baby' } };
    }
    const members = await countActiveMembers(client, invite.baby_id);
    if (members >= MAX_BABY_MEMBERS) {
      await client.query('ROLLBACK');
      return { status: 409, body: { error: 'max_members' } };
    }
    await client.query(
      `INSERT INTO baby_members (id, baby_id, user_id, role, joined_at, created_at)
       VALUES ($1, $2, $3, 'member', $4, $4)`,
      [randomUUID(), invite.baby_id, user.sub, ts],
    );
    await client.query(
      `UPDATE baby_invites SET status = 'accepted', responded_at = $2 WHERE id = $1`,
      [inviteId, ts],
    );
    await client.query(
      `UPDATE baby_invites SET status = 'cancelled', responded_at = $2
       WHERE baby_id = $1 AND invited_email = $3 AND status = 'pending' AND id <> $4`,
      [invite.baby_id, ts, email, inviteId],
    );
    await client.query('COMMIT');
    return { status: 200, body: { ok: true, babyId: invite.baby_id } };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function handleInviteDecline(user, inviteId) {
  const client = await pool.connect();
  const ts = new Date().toISOString();
  try {
    const { invite, email } = await getInviteForUser(client, inviteId, user);
    if (!invite) return { status: 404, body: { error: 'not_found' } };
    if (invite.status !== 'pending') return { status: 410, body: { error: 'expired' } };
    if (invite.invited_email !== email) return { status: 403, body: { error: 'forbidden' } };
    await client.query(`UPDATE baby_invites SET status = 'declined', responded_at = $2 WHERE id = $1`, [
      inviteId,
      ts,
    ]);
    return { status: 200, body: { ok: true } };
  } finally {
    client.release();
  }
}

async function handleInviteCancel(user, inviteId) {
  const client = await pool.connect();
  const ts = new Date().toISOString();
  try {
    const access = await resolveBabyAccess(client, user);
    const { rows } = await client.query(`SELECT * FROM baby_invites WHERE id = $1`, [inviteId]);
    const invite = rows[0];
    if (!invite) return { status: 404, body: { error: 'not_found' } };
    if (!access.babyId || invite.baby_id !== access.babyId) {
      return { status: 403, body: { error: 'forbidden' } };
    }
    if (invite.status !== 'pending') return { status: 410, body: { error: 'expired' } };
    await client.query(`UPDATE baby_invites SET status = 'cancelled', responded_at = $2 WHERE id = $1`, [
      inviteId,
      ts,
    ]);
    return { status: 200, body: { ok: true } };
  } finally {
    client.release();
  }
}

function isPlaceholderBabyRow(baby) {
  const name = (baby.name || '').trim();
  return !baby.bornOn && (name === 'Bébé' || name === '');
}

async function handlePull(user) {
  const client = await pool.connect();
  try {
    const { babyId } = await resolveBabyAccess(client, user);
    if (!babyId) return { babyId: null, records: emptyRecords() };
    return { babyId, records: await dumpUser(babyId) };
  } finally {
    client.release();
  }
}

async function getOwnerUserId(client, babyId) {
  const { rows } = await client.query(`SELECT user_id FROM babies WHERE id = $1 AND deleted_at IS NULL`, [babyId]);
  return rows[0]?.user_id ?? null;
}

async function handleSync(user, body) {
  const changes = body?.changes && typeof body.changes === 'object' ? body.changes : {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const access = await resolveBabyAccess(client, user);
    let babyId = access.babyId;
    const ownerUserId = babyId ? await getOwnerUserId(client, babyId) : null;

    const incomingBabies = Array.isArray(changes.babies) ? changes.babies : [];
    for (const baby of incomingBabies) {
      if (access.role === 'member') {
        if (!babyId) continue;
        if (baby.id && baby.id !== babyId) continue;
      } else if (baby.userId && baby.userId !== user.sub) {
        continue;
      }
      if (babyId && isPlaceholderBabyRow(baby)) continue;
      const record = { ...baby };
      if (access.role === 'owner' || !babyId) {
        record.userId = user.sub;
      } else if (ownerUserId) {
        record.userId = ownerUserId;
      }
      if (babyId && record.id !== babyId) {
        record.id = babyId;
      }
      try {
        await upsert(client, 'babies', toRow(TABLES.babies.fields, record));
        if (!babyId) {
          babyId = record.id;
          await ensureOwnerMembership(client, babyId, user.sub);
        }
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
          const resolved = await resolveBabyAccess(client, user);
          babyId = resolved.babyId;
        } else {
          throw err;
        }
      }
    }

    if (!babyId) {
      await client.query('COMMIT');
      return { babyId: null, records: emptyRecords() };
    }

    const allowed = await resolveBabyAccess(client, user);
    if (allowed.babyId !== babyId) {
      await client.query('ROLLBACK');
      return { babyId: null, records: emptyRecords() };
    }

    const rewrite = (row) => {
      if (row && 'babyId' in row) return { ...row, babyId };
      return row;
    };

    for (const key of PUSH_ORDER) {
      if (key === 'babies') continue;
      const def = TABLES[key];
      const rows = Array.isArray(changes[key]) ? changes[key] : [];
      for (const raw of rows) {
        const record = rewrite(raw);
        if (record.babyId && record.babyId !== babyId) continue;
        if (key === 'feedingSegments') {
          const { rows: sessions } = await client.query(
            `SELECT 1 FROM feeding_sessions WHERE id = $1 AND baby_id = $2`,
            [record.feedingSessionId, babyId],
          );
          if (!sessions.length) continue;
        }
        await upsert(client, def.sql, toRow(def.fields, record));
      }
    }

    await client.query('COMMIT');
    return { babyId, records: await dumpUser(babyId) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function emptyRecords() {
  return Object.fromEntries(PUSH_ORDER.map((key) => [key, []]));
}

async function dumpUser(babyId) {
  const records = emptyRecords();
  for (const [key, def] of Object.entries(TABLES)) {
    let result;
    if (key === 'feedingSegments') {
      result = await pool.query(
        `SELECT s.* FROM feeding_segments s
         JOIN feeding_sessions f ON f.id = s.feeding_session_id
         WHERE f.baby_id = $1 AND s.deleted_at IS NULL`,
        [babyId],
      );
    } else if (key === 'babies') {
      result = await pool.query(`SELECT * FROM babies WHERE id = $1 AND deleted_at IS NULL`, [babyId]);
    } else {
      result = await pool.query(`SELECT * FROM ${def.sql} WHERE baby_id = $1 AND deleted_at IS NULL`, [babyId]);
    }
    records[key] = result.rows.map((row) => fromRow(def.fields, row));
  }
  return records;
}

async function deleteAccount(user) {
  const client = await pool.connect();
  const ts = new Date().toISOString();
  try {
    await client.query('BEGIN');
    const access = await resolveBabyAccess(client, user);
    if (!access.babyId) {
      await client.query('COMMIT');
      return { action: 'none' };
    }

    if (access.role === 'member') {
      await client.query(
        `UPDATE baby_members SET deleted_at = $2 WHERE baby_id = $1 AND user_id = $3 AND deleted_at IS NULL`,
        [access.babyId, ts, user.sub],
      );
      await client.query('COMMIT');
      return { action: 'left' };
    }

    const babyId = access.babyId;
    await client.query(`UPDATE babies SET deleted_at = $2, updated_at = $2, user_id = NULL WHERE id = $1`, [
      babyId,
      ts,
    ]);
    const babyTables = [
      'feeding_sessions',
      'bottle_feeds',
      'diaper_events',
      'pumping_sessions',
      'measurements',
      'reminder_rules',
      'solid_foods',
      'supplements',
      'sleep_sessions',
      'temperatures',
      'notes',
    ];
    for (const table of babyTables) {
      await client.query(`UPDATE ${table} SET deleted_at = $2, updated_at = $2 WHERE baby_id = $1`, [babyId, ts]);
    }
    await client.query(
      `UPDATE feeding_segments s SET deleted_at = $2, updated_at = $2
       FROM feeding_sessions f WHERE f.id = s.feeding_session_id AND f.baby_id = $1`,
      [babyId, ts],
    );
    await client.query(`UPDATE baby_members SET deleted_at = $2 WHERE baby_id = $1 AND deleted_at IS NULL`, [
      babyId,
      ts,
    ]);
    await client.query(
      `UPDATE baby_invites SET status = 'cancelled', responded_at = $2
       WHERE baby_id = $1 AND status = 'pending'`,
      [babyId, ts],
    );
    await client.query('COMMIT');
    return { action: 'deleted' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  const sql = readFileSync(join(root, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  securityHeaders(res);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

const server = createServer(async (req, res) => {
  cors(req, res);
  securityHeaders(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', 'http://127.0.0.1');
  try {
    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
      send(res, 200, { ok: true });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/horoscope') {
      if (overRateLimit(req, 'horoscope')) {
        send(res, 429, { error: 'rate_limit' });
        return;
      }
      const payload = await dailyHoroscope(url.searchParams.get('sign'));
      if (!payload) {
        send(res, 400, { error: 'sign' });
        return;
      }
      send(res, 200, payload);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/sync') {
      if (overRateLimit(req, 'sync')) {
        send(res, 429, { error: 'rate_limit' });
        return;
      }
      const user = await verifyUser(req);
      if (!user) {
        send(res, 401, { error: 'auth' });
        return;
      }
      const result = await handlePull(user);
      send(res, 200, result);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/sync') {
      if (overRateLimit(req, 'sync')) {
        send(res, 429, { error: 'rate_limit' });
        return;
      }
      const user = await verifyUser(req);
      if (!user) {
        send(res, 401, { error: 'auth' });
        return;
      }
      const body = await readBody(req);
      const result = await handleSync(user, body);
      send(res, 200, result);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/sharing') {
      if (overRateLimit(req, 'sharing')) {
        send(res, 429, { error: 'rate_limit' });
        return;
      }
      const user = await verifyUser(req);
      if (!user) {
        send(res, 401, { error: 'auth' });
        return;
      }
      const result = await handleSharingGet(user);
      send(res, 200, result);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/invites') {
      if (overRateLimit(req, 'invites')) {
        send(res, 429, { error: 'rate_limit' });
        return;
      }
      const user = await verifyUser(req);
      if (!user) {
        send(res, 401, { error: 'auth' });
        return;
      }
      const body = await readBody(req);
      const result = await handleInviteCreate(user, body);
      send(res, result.status, result.body);
      return;
    }
    const inviteAction = url.pathname.match(/^\/invites\/([^/]+)\/(accept|decline)$/);
    if (req.method === 'POST' && inviteAction) {
      if (overRateLimit(req, 'invites')) {
        send(res, 429, { error: 'rate_limit' });
        return;
      }
      const user = await verifyUser(req);
      if (!user) {
        send(res, 401, { error: 'auth' });
        return;
      }
      const [, inviteId, action] = inviteAction;
      const result =
        action === 'accept' ? await handleInviteAccept(user, inviteId) : await handleInviteDecline(user, inviteId);
      send(res, result.status, result.body);
      return;
    }
    const inviteDelete = url.pathname.match(/^\/invites\/([^/]+)$/);
    if (req.method === 'DELETE' && inviteDelete) {
      if (overRateLimit(req, 'invites')) {
        send(res, 429, { error: 'rate_limit' });
        return;
      }
      const user = await verifyUser(req);
      if (!user) {
        send(res, 401, { error: 'auth' });
        return;
      }
      const result = await handleInviteCancel(user, inviteDelete[1]);
      send(res, result.status, result.body);
      return;
    }
    if (req.method === 'DELETE' && url.pathname === '/account') {
      if (overRateLimit(req, 'account')) {
        send(res, 429, { error: 'rate_limit' });
        return;
      }
      const user = await verifyUser(req);
      if (!user) {
        send(res, 401, { error: 'auth' });
        return;
      }
      const result = await deleteAccount(user);
      send(res, 200, { ok: true, ...result });
      return;
    }
    send(res, 404, { error: 'not_found' });
  } catch (err) {
    console.error(err);
    send(res, err.message === 'too_large' ? 413 : 500, { error: 'server' });
  }
});

await ensureSchema();
server.listen(PORT, '127.0.0.1', () => {
  console.log(`abel-api sur 127.0.0.1:${PORT}`);
});
