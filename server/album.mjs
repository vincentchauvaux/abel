import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import sharp from 'sharp';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FILE_VERSION = 1;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS = 400;
const FULL_EDGE = 2400;
const THUMB_EDGE = 480;

const ALBUM_DIR = process.env.ALBUM_DIR || '/var/lib/abel/album';

function masterKey() {
  const raw = process.env.ALBUM_ENCRYPTION_KEY || '';
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  if (raw.length >= 32) return Buffer.from(raw).subarray(0, 32);
  return null;
}

export function albumConfigured() {
  return Boolean(masterKey());
}

function babyKey(babyId) {
  const master = masterKey();
  if (!master) throw new Error('album_unavailable');
  return Buffer.from(hkdfSync('sha256', master, '', `mimom-album-v1:${babyId}`, 32));
}

function encryptBuffer(key, plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([FILE_VERSION]), iv, cipher.getAuthTag(), ciphertext]);
}

function decryptBuffer(key, packed) {
  if (!packed || packed.length < 29 || packed[0] !== FILE_VERSION) {
    throw new Error('bad_file');
  }
  const iv = packed.subarray(1, 13);
  const tag = packed.subarray(13, 29);
  const ciphertext = packed.subarray(29);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function babyDir(babyId) {
  if (!isUuid(babyId)) throw new Error('bad_id');
  return join(ALBUM_DIR, babyId);
}

function photoPath(babyId, photoId, variant) {
  if (!isUuid(photoId)) throw new Error('bad_id');
  const suffix = variant === 'thumb' ? '.thumb.bin' : '.bin';
  return join(babyDir(babyId), `${photoId}${suffix}`);
}

async function ensureBabyDir(babyId) {
  await mkdir(babyDir(babyId), { recursive: true, mode: 0o700 });
}

export async function wipeAlbumFiles(babyId) {
  if (!isUuid(babyId)) return;
  await rm(babyDir(babyId), { recursive: true, force: true });
}

function hasAlbumView(access) {
  if (!access?.babyId) return false;
  if (access.role === 'owner') return true;
  return Boolean(access.albumAccess);
}

function canManageGrants(access, targetRole) {
  if (!access?.babyId || (access.role !== 'owner' && access.role !== 'member')) return false;
  if (targetRole === 'owner') return false;
  if (access.role === 'owner') return targetRole === 'member' || targetRole === 'guardian';
  return hasAlbumView(access) && targetRole === 'guardian';
}

function canDeletePhoto(access, photo, userId) {
  if (access.role === 'owner') return true;
  if (access.role === 'member' && hasAlbumView(access)) return true;
  return photo.created_by === userId;
}

function iso(value) {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function readRawBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('too_large');
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
}

export function parseMultipartFile(buffer, contentType) {
  const match = String(contentType || '').match(/boundary=(?:(?:"([^"]+)")|([^;]+))/i);
  if (!match) return null;
  const boundary = `--${(match[1] || match[2]).trim()}`;
  let start = buffer.indexOf(boundary);
  while (start !== -1) {
    const next = buffer.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    let part = buffer.subarray(start + boundary.length, next);
    if (part[0] === 13 && part[1] === 10) part = part.subarray(2);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      start = next;
      continue;
    }
    const headers = part.subarray(0, headerEnd).toString('utf8');
    let body = part.subarray(headerEnd + 4);
    if (body.length >= 2 && body[body.length - 2] === 13 && body[body.length - 1] === 10) {
      body = body.subarray(0, body.length - 2);
    }
    if (/filename=/i.test(headers) || /name="file"/i.test(headers)) {
      const filename = (headers.match(/filename="([^"]*)"/i) || [])[1] || 'photo.jpg';
      const mimeType = ((headers.match(/Content-Type:\s*([^\r\n]+)/i) || [])[1] || '').trim();
      return { filename, mimeType, data: body };
    }
    start = next;
  }
  return null;
}

function parseExifTakenAt(exif) {
  if (!exif || !Buffer.isBuffer(exif)) return null;
  const text = exif.toString('utf8');
  const match = text.match(/(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const isoish = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
  const date = new Date(isoish);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function processImage(input) {
  const image = sharp(input, { failOn: 'none', limitInputPixels: 40_000_000, sequentialRead: true });
  const meta = await image.metadata();
  const format = meta.format;
  if (!format || !['jpeg', 'png', 'webp', 'gif', 'heif', 'tiff'].includes(format)) {
    throw new Error('unsupported');
  }
  const takenAt = parseExifTakenAt(meta.exif) || new Date();
  const full = await sharp(input)
    .rotate()
    .resize({ width: FULL_EDGE, height: FULL_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  const thumbImage = sharp(full);
  const thumbMeta = await thumbImage.metadata();
  const thumb = await sharp(full)
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside' })
    .jpeg({ quality: 68 })
    .toBuffer();
  return {
    full,
    thumb,
    takenAt,
    width: thumbMeta.width || meta.width || null,
    height: thumbMeta.height || meta.height || null,
  };
}

export async function handleAlbumGet(pool, user, resolveBabyAccess) {
  if (!albumConfigured()) return { status: 503, body: { error: 'album_unavailable' } };
  const client = await pool.connect();
  try {
    const access = await resolveBabyAccess(client, user);
    if (!access.babyId) return { status: 404, body: { error: 'not_found' } };
    const canView = hasAlbumView(access);
    const { rows: memberRows } = await client.query(
      `SELECT m.user_id, m.role, m.album_access,
          COALESCE(NULLIF(p.name, ''), NULLIF(p.email, ''), '') AS label
       FROM baby_members m
       LEFT JOIN user_profiles p ON p.user_id = m.user_id
       WHERE m.baby_id = $1 AND m.deleted_at IS NULL
       ORDER BY m.joined_at ASC`,
      [access.babyId],
    );
    const members = memberRows.map((row) => ({
      userId: row.user_id,
      role: row.role,
      albumAccess: row.role === 'owner' || Boolean(row.album_access),
      label: row.label || '',
      isYou: row.user_id === user.sub,
    }));
    if (!canView) {
      return {
        status: 200,
        body: {
          canView: false,
          canUpload: false,
          canManageAccess: false,
          photos: [],
          members,
        },
      };
    }
    const { rows: photos } = await client.query(
      `SELECT id, created_by, taken_at, created_at, width, height
       FROM album_photos
       WHERE baby_id = $1 AND deleted_at IS NULL
       ORDER BY taken_at DESC, created_at DESC`,
      [access.babyId],
    );
    return {
      status: 200,
      body: {
        canView: true,
        canUpload: true,
        canManageAccess: access.role === 'owner' || (access.role === 'member' && canView),
        photos: photos.map((row) => ({
          id: row.id,
          takenAt: iso(row.taken_at),
          createdAt: iso(row.created_at),
          width: row.width,
          height: row.height,
          canDelete: canDeletePhoto(access, row, user.sub),
        })),
        members,
      },
    };
  } finally {
    client.release();
  }
}

export async function handleAlbumAccess(pool, user, body, resolveBabyAccess) {
  if (!albumConfigured()) return { status: 503, body: { error: 'album_unavailable' } };
  const targetUserId = typeof body?.userId === 'string' ? body.userId : '';
  const next = body?.albumAccess === true;
  if (!targetUserId) return { status: 400, body: { error: 'not_found' } };
  const client = await pool.connect();
  try {
    const access = await resolveBabyAccess(client, user);
    if (!access.babyId) return { status: 403, body: { error: 'forbidden' } };
    const { rows } = await client.query(
      `SELECT user_id, role FROM baby_members
       WHERE baby_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [access.babyId, targetUserId],
    );
    const target = rows[0];
    if (!target) return { status: 404, body: { error: 'not_found' } };
    if (target.user_id === user.sub) return { status: 403, body: { error: 'forbidden' } };
    if (!canManageGrants(access, target.role)) return { status: 403, body: { error: 'forbidden' } };
    await client.query(
      `UPDATE baby_members
       SET album_access = $3,
           album_granted_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
           album_granted_by = CASE WHEN $3 THEN $4 ELSE NULL END
       WHERE baby_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [access.babyId, targetUserId, next, user.sub],
    );
    return { status: 200, body: { ok: true, userId: targetUserId, albumAccess: next } };
  } finally {
    client.release();
  }
}

export async function handleAlbumUpload(pool, user, req, resolveBabyAccess) {
  if (!albumConfigured()) return { status: 503, body: { error: 'album_unavailable' } };
  const raw = await readRawBody(req, MAX_UPLOAD_BYTES + 64_000);
  const file = parseMultipartFile(raw, req.headers['content-type']);
  if (!file?.data?.length) return { status: 400, body: { error: 'file' } };
  if (file.data.length > MAX_UPLOAD_BYTES) return { status: 413, body: { error: 'too_large' } };

  let processed;
  try {
    processed = await processImage(file.data);
  } catch {
    return { status: 400, body: { error: 'unsupported' } };
  }

  const client = await pool.connect();
  try {
    const access = await resolveBabyAccess(client, user);
    if (!hasAlbumView(access)) return { status: 403, body: { error: 'forbidden' } };
    const { rows: countRows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM album_photos WHERE baby_id = $1 AND deleted_at IS NULL`,
      [access.babyId],
    );
    if ((countRows[0]?.n ?? 0) >= MAX_PHOTOS) return { status: 409, body: { error: 'album_full' } };

    const id = randomUUID();
    const key = babyKey(access.babyId);
    await ensureBabyDir(access.babyId);
    const fullPath = photoPath(access.babyId, id, 'full');
    const thumbPath = photoPath(access.babyId, id, 'thumb');
    try {
      await writeFile(fullPath, encryptBuffer(key, processed.full), { mode: 0o600 });
      await writeFile(thumbPath, encryptBuffer(key, processed.thumb), { mode: 0o600 });
      await client.query(
        `INSERT INTO album_photos
           (id, baby_id, created_by, taken_at, created_at, mime_type, byte_size, width, height)
         VALUES ($1, $2, $3, $4, NOW(), 'image/jpeg', $5, $6, $7)`,
        [id, access.babyId, user.sub, processed.takenAt, processed.full.length, processed.width, processed.height],
      );
    } catch (err) {
      await unlink(fullPath).catch(() => undefined);
      await unlink(thumbPath).catch(() => undefined);
      throw err;
    }
    return {
      status: 200,
      body: {
        id,
        takenAt: processed.takenAt.toISOString(),
        createdAt: new Date().toISOString(),
        width: processed.width,
        height: processed.height,
        canDelete: true,
      },
    };
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
}

export async function handleAlbumDownload(pool, user, photoId, variant, resolveBabyAccess) {
  if (!albumConfigured()) return { status: 503, body: { error: 'album_unavailable' } };
  if (!isUuid(photoId)) return { status: 400, body: { error: 'not_found' } };
  const kind = variant === 'full' ? 'full' : 'thumb';
  const client = await pool.connect();
  try {
    const access = await resolveBabyAccess(client, user);
    if (!hasAlbumView(access)) return { status: 403, body: { error: 'forbidden' } };
    const { rows } = await client.query(
      `SELECT id FROM album_photos WHERE id = $1 AND baby_id = $2 AND deleted_at IS NULL`,
      [photoId, access.babyId],
    );
    if (!rows.length) return { status: 404, body: { error: 'not_found' } };
    let packed;
    try {
      packed = await readFile(photoPath(access.babyId, photoId, kind));
    } catch {
      return { status: 404, body: { error: 'not_found' } };
    }
    const jpeg = decryptBuffer(babyKey(access.babyId), packed);
    return { status: 200, jpeg };
  } finally {
    client.release();
  }
}

export async function handleAlbumDelete(pool, user, photoId, resolveBabyAccess) {
  if (!albumConfigured()) return { status: 503, body: { error: 'album_unavailable' } };
  if (!isUuid(photoId)) return { status: 400, body: { error: 'not_found' } };
  const client = await pool.connect();
  try {
    const access = await resolveBabyAccess(client, user);
    if (!hasAlbumView(access)) return { status: 403, body: { error: 'forbidden' } };
    const { rows } = await client.query(
      `SELECT id, created_by FROM album_photos WHERE id = $1 AND baby_id = $2 AND deleted_at IS NULL`,
      [photoId, access.babyId],
    );
    const photo = rows[0];
    if (!photo) return { status: 404, body: { error: 'not_found' } };
    if (!canDeletePhoto(access, photo, user.sub)) return { status: 403, body: { error: 'forbidden' } };
    await client.query(`UPDATE album_photos SET deleted_at = NOW() WHERE id = $1 AND baby_id = $2`, [
      photoId,
      access.babyId,
    ]);
    await unlink(photoPath(access.babyId, photoId, 'full')).catch(() => undefined);
    await unlink(photoPath(access.babyId, photoId, 'thumb')).catch(() => undefined);
    return { status: 200, body: { ok: true } };
  } finally {
    client.release();
  }
}

export function sendJpeg(res, jpeg) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', 'inline; filename="photo.jpg"');
  res.writeHead(200, {
    'Content-Type': 'image/jpeg',
    'Content-Length': jpeg.length,
  });
  res.end(jpeg);
}
