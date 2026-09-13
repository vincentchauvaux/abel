import { clearAuthToken, readGoogleToken, SYNC_URL } from '@/lib/google';

export type AlbumMemberAccess = {
  userId: string;
  role: 'owner' | 'member' | 'guardian';
  albumAccess: boolean;
  label: string;
  isYou: boolean;
};

export type AlbumPhotoMeta = {
  id: string;
  takenAt: string;
  createdAt: string;
  width?: number | null;
  height?: number | null;
  canDelete: boolean;
};

export type AlbumState = {
  canView: boolean;
  canUpload: boolean;
  canManageAccess: boolean;
  photos: AlbumPhotoMeta[];
  members: AlbumMemberAccess[];
};

type ApiResult<T> = T | 'auth' | 'error' | 'rate_limit' | { error: string; status?: number };

async function albumFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const token = readGoogleToken();
  if (!token) return 'auth';
  const res = await fetch(`${SYNC_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    clearAuthToken();
    return 'auth';
  }
  if (res.status === 429) return 'rate_limit';
  if (!res.ok) {
    try {
      const body = (await res.json()) as { error?: string };
      return { error: body.error || 'error', status: res.status };
    } catch {
      return { error: 'error', status: res.status };
    }
  }
  if (res.status === 204) return {} as T;
  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('json')) return {} as T;
  return (await res.json()) as T;
}

export async function fetchAlbum(): Promise<ApiResult<AlbumState>> {
  return albumFetch<AlbumState>('/album');
}

export async function setAlbumAccess(
  userId: string,
  albumAccess: boolean,
): Promise<ApiResult<{ ok: true }>> {
  return albumFetch('/album/access', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, albumAccess }),
  });
}

export async function uploadAlbumPhoto(file: File): Promise<ApiResult<AlbumPhotoMeta>> {
  const data = new FormData();
  data.append('file', file, file.name || 'photo.jpg');
  return albumFetch<AlbumPhotoMeta>('/album/photos', { method: 'POST', body: data });
}

export async function deleteAlbumPhoto(id: string): Promise<ApiResult<{ ok: true }>> {
  return albumFetch(`/album/photos/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function fetchAlbumImage(id: string, variant: 'thumb' | 'full'): Promise<Blob | null> {
  const token = readGoogleToken();
  if (!token) return null;
  const res = await fetch(`${SYNC_URL}/album/photos/${encodeURIComponent(id)}?variant=${variant}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.blob();
}

export const ALBUM_ERROR_LABEL: Record<string, string> = {
  auth: 'Connecte-toi avec Google pour ouvrir l’album.',
  not_found: 'Aucun bébé synchronisé.',
  forbidden: 'Un parent doit t’ouvrir l’accès à l’album dans Profil.',
  album_unavailable: 'Album indisponible pour le moment (clé serveur manquante).',
  unsupported: 'Cette photo n’est pas lisible (jpg, png, heic…).',
  too_large: 'Photo trop lourde (8 Mo max).',
  album_full: 'Album plein (400 photos).',
  file: 'Choisis une photo.',
  rate_limit: 'Trop de requêtes — réessaie dans une minute.',
};
