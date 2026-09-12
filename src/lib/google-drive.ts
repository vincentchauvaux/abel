import { albumFolderName, type LinkedAlbum } from '@/lib/album';
import { localDateKey } from '@/lib/dates';
import { GOOGLE_CLIENT_ID, loadGis, readGoogleUser, type GoogleTokenClient } from '@/lib/google';

export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const TOKEN_KEY = 'abel-drive-token';

type StoredDriveToken = { accessToken: string; expiresAt: number };

export type DriveFolder = {
  id: string;
  name: string;
  mimeType?: string;
  trashed?: boolean;
  webViewLink?: string;
  driveId?: string;
  appProperties?: { mimom?: string; mimomBabyId?: string };
};

export type SharedDrive = {
  id: string;
  name: string;
};

export type AlbumPhoto = {
  id: string;
  name: string;
  takenAt: string;
  dateKey: string;
  thumbnailLink?: string;
  webViewLink?: string;
  width?: number;
  height?: number;
};

type DriveErrorBody = { error?: { message?: string; status?: string } };

let tokenClient: GoogleTokenClient | null = null;
let pendingToken: {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
} | null = null;

function readStoredToken(): StoredDriveToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as StoredDriveToken) : null;
  } catch {
    return null;
  }
}

function writeStoredToken(token: StoredDriveToken | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function hasDriveToken(): boolean {
  const cached = readStoredToken();
  return Boolean(cached && Date.now() < cached.expiresAt - 60_000);
}

export function clearDriveSession() {
  const stored = readStoredToken();
  writeStoredToken(null);
  if (stored?.accessToken) {
    window.google?.accounts.oauth2?.revoke(stored.accessToken);
  }
}

window.addEventListener('abel-drive-logout', () => clearDriveSession());

export function driveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (error.message === 'popup_closed' || error.message === 'popup_failed_to_open') {
      return 'La fenêtre Google s’est fermée. Réessaie, ou ouvre Mimom dans le navigateur (pas en plein écran).';
    }
    if (error.message === 'access_denied') {
      return 'Accès Drive refusé. Mimom n’utilise que le dossier de l’album, pas tout ton Drive.';
    }
    if (error.message.includes('API has not been used') || error.message.includes('accessNotConfigured')) {
      return 'L’API Google Drive n’est pas encore activée pour ce projet Google Cloud.';
    }
    if (error.message.includes('insufficientPermissions') || error.message.includes('403')) {
      return 'Google n’a pas autorisé l’accès au dossier. Recrée l’album ou colle le lien d’un dossier partagé avec ce compte.';
    }
    return error.message;
  }
  return 'Impossible de parler à Google Drive pour le moment.';
}

export async function requestDriveToken(prompt: '' | 'consent' = 'consent'): Promise<string> {
  const cached = readStoredToken();
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.accessToken;
  if (prompt === '' && !cached) throw new Error('needs_consent');
  if (!GOOGLE_CLIENT_ID) throw new Error('Identifiant Google manquant.');
  await loadGis();
  const oauth = window.google?.accounts.oauth2;
  if (!oauth) throw new Error('Google n’est pas chargé.');

  return new Promise((resolve, reject) => {
    pendingToken = { resolve, reject };
    if (!tokenClient) {
      tokenClient = oauth.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_FILE_SCOPE,
        hint: readGoogleUser()?.email || undefined,
        callback: (response) => {
          const waiter = pendingToken;
          pendingToken = null;
          if (!response.access_token || response.error) {
            waiter?.reject(new Error(response.error || 'access_denied'));
            return;
          }
          writeStoredToken({
            accessToken: response.access_token,
            expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
          });
          waiter?.resolve(response.access_token);
        },
        error_callback: (error) => {
          const waiter = pendingToken;
          pendingToken = null;
          waiter?.reject(new Error(error.type || error.message || 'popup_failed_to_open'));
        },
      });
    }
    tokenClient.requestAccessToken({ prompt });
  });
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await requestDriveToken(hasDriveToken() ? '' : 'consent');
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (res.status !== 401) return res;
  writeStoredToken(null);
  const retryToken = await requestDriveToken('consent');
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${retryToken}`,
      ...init.headers,
    },
  });
}

async function driveJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await driveFetch(`${DRIVE_API}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = `Erreur Drive (${res.status})`;
    try {
      const body = (await res.json()) as DriveErrorBody;
      if (body.error?.message) detail = body.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function listSharedDrives(): Promise<SharedDrive[]> {
  try {
    const body = await driveJson<{ drives?: SharedDrive[] }>('/drives?pageSize=20&fields=drives(id,name)');
    return body.drives ?? [];
  } catch {
    return [];
  }
}

export async function findAppAlbumFolders(babyId: string): Promise<DriveFolder[]> {
  const q = [
    "appProperties has { key='mimom' and value='album' }",
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
  ].join(' and ');
  const body = await driveJson<{ files?: DriveFolder[] }>(
    `/files?q=${encodeURIComponent(q)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,webViewLink,driveId,appProperties)&pageSize=20`,
  );
  const files = body.files ?? [];
  const matching = files.filter((row) => row.appProperties?.mimomBabyId === babyId);
  return matching.length ? matching : files;
}

export async function getDriveFolder(folderId: string): Promise<DriveFolder> {
  return driveJson<DriveFolder>(
    `/files/${encodeURIComponent(folderId)}?supportsAllDrives=true&fields=id,name,mimeType,webViewLink,driveId,trashed`,
  );
}

export async function createAlbumFolder(params: {
  babyId: string;
  babyName: string;
  driveId?: string | null;
}): Promise<DriveFolder> {
  const body: Record<string, unknown> = {
    name: albumFolderName(params.babyName),
    mimeType: 'application/vnd.google-apps.folder',
    appProperties: { mimom: 'album', mimomBabyId: params.babyId },
  };
  if (params.driveId) body.parents = [params.driveId];
  return driveJson<DriveFolder>(
    '/files?supportsAllDrives=true&fields=id,name,webViewLink,driveId',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function shareAlbumFolder(folderId: string, emails: string[]): Promise<string[]> {
  const unique = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  const self = readGoogleUser()?.email.trim().toLowerCase();
  const failed: string[] = [];
  for (const email of unique) {
    if (email === self) continue;
    try {
      await driveJson(
        `/files/${encodeURIComponent(folderId)}/permissions?supportsAllDrives=true&sendNotificationEmail=true`,
        {
          method: 'POST',
          body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email }),
        },
      );
    } catch {
      failed.push(email);
    }
  }
  return failed;
}

function parseExifTime(raw: string | undefined, fallbackIso: string): string {
  if (!raw) return fallbackIso;
  const isoish = raw.includes('T')
    ? raw
    : raw.replace(/^(\d{4}):(\d{2}):(\d{2})[ T]/, '$1-$2-$3T');
  const date = new Date(isoish);
  return Number.isNaN(date.getTime()) ? fallbackIso : date.toISOString();
}

export async function listAlbumPhotos(folderId: string): Promise<AlbumPhoto[]> {
  const photos: AlbumPhoto[] = [];
  let pageToken = '';
  const q = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false and mimeType contains 'image/'`;
  do {
    const params = new URLSearchParams({
      q,
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      pageSize: '100',
      orderBy: 'createdTime desc',
      fields:
        'nextPageToken,files(id,name,createdTime,thumbnailLink,webViewLink,imageMediaMetadata(time,width,height))',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const body = await driveJson<{
      nextPageToken?: string;
      files?: {
        id: string;
        name: string;
        createdTime: string;
        thumbnailLink?: string;
        webViewLink?: string;
        imageMediaMetadata?: { time?: string; width?: number; height?: number };
      }[];
    }>(`/files?${params.toString()}`);
    for (const file of body.files ?? []) {
      const takenAt = parseExifTime(file.imageMediaMetadata?.time, file.createdTime);
      photos.push({
        id: file.id,
        name: file.name,
        takenAt,
        dateKey: localDateKey(takenAt),
        thumbnailLink: scaledThumb(file.thumbnailLink, 400),
        webViewLink: file.webViewLink,
        width: file.imageMediaMetadata?.width,
        height: file.imageMediaMetadata?.height,
      });
    }
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  photos.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  return photos;
}

function scaledThumb(url: string | undefined, size: number): string | undefined {
  if (!url) return undefined;
  return url.replace(/=s\d+/, `=s${size}`).replace(/=w\d+/, `=w${size}`);
}

export async function uploadAlbumPhoto(folderId: string, file: File): Promise<void> {
  const takenAt = new Date(file.lastModified).toISOString();
  const metadata = {
    name: file.name || `photo-${Date.now()}.jpg`,
    parents: [folderId],
    createdTime: takenAt,
    appProperties: { mimom: 'photo' },
  };
  const boundary = `mimom_${crypto.randomUUID()}`;
  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const fileHeader = `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
  const closing = `\r\n--${boundary}--\r\n`;
  const body = new Blob([metaPart, fileHeader, file, closing]);
  const res = await driveFetch(`${DRIVE_UPLOAD}?uploadType=multipart&supportsAllDrives=true`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    let detail = `Envoi impossible (${res.status})`;
    try {
      const json = (await res.json()) as DriveErrorBody;
      if (json.error?.message) detail = json.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
}

export async function fetchAlbumPhotoBlob(fileId: string): Promise<Blob> {
  const res = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
  );
  if (!res.ok) throw new Error('Photo illisible depuis Drive.');
  return res.blob();
}

export function folderToLinkedAlbum(folder: DriveFolder): LinkedAlbum {
  return {
    folderId: folder.id,
    folderName: folder.name,
    driveId: folder.driveId ?? null,
    webViewLink: folder.webViewLink ?? `https://drive.google.com/drive/folders/${folder.id}`,
  };
}
