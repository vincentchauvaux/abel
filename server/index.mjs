import { createServer } from 'node:http';
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
}

async function verifyUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const ticket = await google.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.sub) return null;
  return { sub: payload.sub, email: payload.email || '' };
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

async function handleSync(user, body) {
  const changes = body?.changes && typeof body.changes === 'object' ? body.changes : {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let babyId = await canonicalBabyId(client, user.sub);

    const incomingBabies = Array.isArray(changes.babies) ? changes.babies : [];
    for (const baby of incomingBabies) {
      if (baby.userId && baby.userId !== user.sub) continue;
      const record = { ...baby, userId: user.sub };
      if (babyId && record.id !== babyId) {
        record.id = babyId;
      }
      try {
        await upsert(client, 'babies', toRow(TABLES.babies.fields, record));
        if (!babyId) babyId = record.id;
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
          babyId = await canonicalBabyId(client, user.sub);
        } else {
          throw err;
        }
      }
    }

    if (!babyId) {
      await client.query('COMMIT');
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
         WHERE f.baby_id = $1`,
        [babyId],
      );
    } else if (key === 'babies') {
      result = await pool.query(`SELECT * FROM babies WHERE id = $1`, [babyId]);
    } else {
      result = await pool.query(`SELECT * FROM ${def.sql} WHERE baby_id = $1`, [babyId]);
    }
    records[key] = result.rows.map((row) => fromRow(def.fields, row));
  }
  return records;
}

async function ensureSchema() {
  const sql = readFileSync(join(root, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

const server = createServer(async (req, res) => {
  cors(req, res);
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
      const payload = await dailyHoroscope(url.searchParams.get('sign'));
      if (!payload) {
        send(res, 400, { error: 'sign' });
        return;
      }
      send(res, 200, payload);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/sync') {
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
