const ALBUM_PREFIX = 'abel.drive-album.';
const THUMB_KEY = 'abel.album-thumb-size';

export const ALBUM_THUMB_MIN = 72;
export const ALBUM_THUMB_MAX = 220;
export const ALBUM_THUMB_DEFAULT = 118;

export type LinkedAlbum = {
  folderId: string;
  folderName: string;
  driveId: string | null;
  webViewLink: string | null;
};

export function albumStorageKey(babyId: string) {
  return `${ALBUM_PREFIX}${babyId}`;
}

export function readLinkedAlbum(babyId: string): LinkedAlbum | null {
  try {
    const raw = localStorage.getItem(albumStorageKey(babyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LinkedAlbum>;
    if (!parsed.folderId || !parsed.folderName) return null;
    return {
      folderId: parsed.folderId,
      folderName: parsed.folderName,
      driveId: parsed.driveId ?? null,
      webViewLink: parsed.webViewLink ?? null,
    };
  } catch {
    return null;
  }
}

export function writeLinkedAlbum(babyId: string, album: LinkedAlbum | null) {
  const key = albumStorageKey(babyId);
  if (album) localStorage.setItem(key, JSON.stringify(album));
  else localStorage.removeItem(key);
}

export function readAlbumThumbSize(): number {
  const n = Number.parseInt(localStorage.getItem(THUMB_KEY) ?? '', 10);
  if (!Number.isFinite(n)) return ALBUM_THUMB_DEFAULT;
  return Math.min(ALBUM_THUMB_MAX, Math.max(ALBUM_THUMB_MIN, n));
}

export function writeAlbumThumbSize(size: number) {
  localStorage.setItem(THUMB_KEY, String(size));
}

export function clearAlbumLocalData() {
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(ALBUM_PREFIX) || key === THUMB_KEY) localStorage.removeItem(key);
  }
}

export function albumFolderName(babyName: string) {
  const name = babyName.trim() || 'Bébé';
  return `Mimom — ${name}`;
}

export function parseDriveFolderId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const fromPath = text.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (fromPath?.[1]) return fromPath[1];
  const fromQuery = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fromQuery?.[1]) return fromQuery[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(text)) return text;
  return null;
}
