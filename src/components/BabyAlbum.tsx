import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui';
import {
  ALBUM_THUMB_MAX,
  ALBUM_THUMB_MIN,
  readAlbumGroupByDate,
  readAlbumThumbSize,
  writeAlbumGroupByDate,
  writeAlbumThumbSize,
} from '@/lib/album';
import {
  ALBUM_ERROR_LABEL,
  deleteAlbumPhoto,
  fetchAlbum,
  fetchAlbumImage,
  uploadAlbumPhoto,
  type AlbumPhotoMeta,
  type AlbumState,
} from '@/lib/album-api';
import { formatLongDate, localDateKey } from '@/lib/dates';
import { readGoogleToken, readGoogleUser } from '@/lib/google';

type Props = {
  open: boolean;
};

function errorLabel(result: unknown): string {
  if (result === 'auth') return ALBUM_ERROR_LABEL.auth;
  if (result === 'rate_limit') return ALBUM_ERROR_LABEL.rate_limit;
  if (result && typeof result === 'object' && 'error' in result) {
    const code = (result as { error: string }).error;
    return ALBUM_ERROR_LABEL[code] || 'Impossible de charger l’album.';
  }
  return 'Impossible de charger l’album.';
}

function groupPhotosByDate(photos: AlbumPhotoMeta[]): [string, AlbumPhotoMeta[]][] {
  const map = new Map<string, AlbumPhotoMeta[]>();
  for (const photo of photos) {
    const key = localDateKey(photo.takenAt);
    const list = map.get(key) ?? [];
    list.push(photo);
    map.set(key, list);
  }
  return [...map.entries()];
}

export function BabyAlbum({ open }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const urls = useRef(new Map<string, string>());
  const fullUrls = useRef(new Map<string, string>());
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [signedIn, setSignedIn] = useState(() => Boolean(readGoogleToken() && readGoogleUser()));
  const [album, setAlbum] = useState<AlbumState | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [fulls, setFulls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [groupByDate, setGroupByDate] = useState(readAlbumGroupByDate);
  const [thumbSize, setThumbSize] = useState(readAlbumThumbSize);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });

  const photos = album?.photos ?? [];
  const lightboxPhoto = lightboxIndex != null ? (photos[lightboxIndex] ?? null) : null;
  const lightboxUrl = lightboxPhoto ? fulls[lightboxPhoto.id] : '';

  useEffect(() => {
    const syncAuth = () => setSignedIn(Boolean(readGoogleToken() && readGoogleUser()));
    window.addEventListener('abel-auth', syncAuth);
    return () => window.removeEventListener('abel-auth', syncAuth);
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    const result = await fetchAlbum();
    if (result === 'auth' || result === 'error' || result === 'rate_limit' || 'error' in result) {
      setAlbum(null);
      setError(errorLabel(result));
    } else {
      setAlbum(result);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!open || !signedIn) return;
    void load();
  }, [open, signedIn]);

  useEffect(() => {
    if (!open || !album?.canView) return;
    let cancelled = false;
    const missing = album.photos.filter((photo) => !urls.current.has(photo.id));
    void Promise.all(
      missing.map(async (photo) => {
        const blob = await fetchAlbumImage(photo.id, 'thumb');
        if (!blob || cancelled) return;
        const url = URL.createObjectURL(blob);
        urls.current.set(photo.id, url);
      }),
    ).then(() => {
      if (cancelled) return;
      setThumbs(Object.fromEntries(urls.current));
    });
    return () => {
      cancelled = true;
    };
  }, [open, album]);

  useEffect(() => {
    return () => {
      for (const url of urls.current.values()) URL.revokeObjectURL(url);
      urls.current.clear();
      for (const url of fullUrls.current.values()) URL.revokeObjectURL(url);
      fullUrls.current.clear();
    };
  }, []);

  useEffect(() => {
    if (lightboxIndex == null || !photos.length) return;
    if (lightboxIndex >= photos.length) {
      setLightboxIndex(photos.length - 1);
    }
  }, [lightboxIndex, photos.length]);

  useEffect(() => {
    if (lightboxIndex == null) return;
    let cancelled = false;
    const ids = [lightboxIndex - 1, lightboxIndex, lightboxIndex + 1]
      .map((index) => photos[index]?.id)
      .filter((id): id is string => Boolean(id));
    void Promise.all(
      ids.map(async (id) => {
        if (fullUrls.current.has(id)) return;
        const blob = await fetchAlbumImage(id, 'full');
        if (!blob || cancelled) return;
        const url = URL.createObjectURL(blob);
        fullUrls.current.set(id, url);
      }),
    ).then(() => {
      if (cancelled) return;
      setFulls(Object.fromEntries(fullUrls.current));
    });
    return () => {
      cancelled = true;
    };
  }, [lightboxIndex, photos]);

  useEffect(() => {
    if (lightboxIndex == null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxIndex(null);
      if (event.key === 'ArrowLeft') setLightboxIndex((index) => (index == null || index <= 0 ? index : index - 1));
      if (event.key === 'ArrowRight') {
        setLightboxIndex((index) => (index == null || index >= photos.length - 1 ? index : index + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxIndex, photos.length]);

  const groups = useMemo(() => groupPhotosByDate(photos), [photos]);

  const closeLightbox = () => {
    dragRef.current = null;
    setDrag({ x: 0, y: 0 });
    setLightboxIndex(null);
  };

  const goLightbox = (delta: number) => {
    setLightboxIndex((index) => {
      if (index == null) return index;
      const next = index + delta;
      if (next < 0 || next >= photos.length) return index;
      return next;
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setDrag({ x: event.clientX - start.x, y: event.clientY - start.y });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    dragRef.current = null;
    setDrag({ x: 0, y: 0 });
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) {
      closeLightbox();
      return;
    }
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      goLightbox(dx < 0 ? 1 : -1);
    }
  };

  const onPickFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = [...list].filter((file) => file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name));
    if (!files.length) {
      setError(ALBUM_ERROR_LABEL.file);
      return;
    }
    setBusy('upload');
    setError('');
    let done = 0;
    try {
      for (const file of files) {
        const result = await uploadAlbumPhoto(file);
        if (result === 'auth' || result === 'error' || result === 'rate_limit' || 'error' in result) {
          setError(errorLabel(result));
          break;
        }
        done += 1;
        setNotice(`${done} / ${files.length} photo${files.length > 1 ? 's' : ''} enregistrée${done > 1 ? 's' : ''}…`);
      }
      if (done) {
        setNotice(done === 1 ? 'Photo enregistrée.' : `${done} photos enregistrées.`);
        await load();
      }
    } finally {
      setBusy('');
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const onDelete = async (photo: AlbumPhotoMeta) => {
    if (!photo.canDelete) return;
    setBusy('delete');
    const result = await deleteAlbumPhoto(photo.id);
    setBusy('');
    if (result === 'auth' || result === 'error' || result === 'rate_limit' || 'error' in result) {
      setError(errorLabel(result));
      return;
    }
    const thumb = urls.current.get(photo.id);
    if (thumb) {
      URL.revokeObjectURL(thumb);
      urls.current.delete(photo.id);
    }
    const full = fullUrls.current.get(photo.id);
    if (full) {
      URL.revokeObjectURL(full);
      fullUrls.current.delete(photo.id);
    }
    const remaining = photos.length - 1;
    if (remaining <= 0) closeLightbox();
    else if (lightboxIndex != null && lightboxIndex >= remaining) setLightboxIndex(remaining - 1);
    setNotice('Photo supprimée.');
    await load();
  };

  const renderTiles = (items: AlbumPhotoMeta[]) =>
    items.map((photo) => (
      <button
        key={photo.id}
        type="button"
        className="album-tile"
        onClick={() => setLightboxIndex(photos.findIndex((row) => row.id === photo.id))}
        aria-label={`Photo du ${formatLongDate(localDateKey(photo.takenAt))}`}>
        {thumbs[photo.id] ? <img src={thumbs[photo.id]} alt="" /> : <span className="album-tile-fallback">…</span>}
      </button>
    ));

  if (!open) return null;

  if (!signedIn) {
    return (
      <>
        <p className="muted">
          L’album est chiffré sur mimom.be. Connecte-toi avec Google. Le co-parent et les gardiens n’y ont accès que si
          un parent l’ouvre dans Profil.
        </p>
        <Link to="/profile" className="btn btn-primary album-link-btn">
          Aller au Profil
        </Link>
      </>
    );
  }

  if (loading && !album) {
    return <p className="muted">Chargement de l’album…</p>;
  }

  if (!album?.canView) {
    return (
      <>
        <p className="muted">
          Un album par bébé, chiffré sur le serveur Mimom. Le co-parent et les gardiens ne voient les photos que si un
          parent leur ouvre l’accès dans <Link to="/profile">Profil</Link>.
        </p>
        {error ? <p className="muted album-error">{error}</p> : null}
      </>
    );
  }

  const dragging = drag.x !== 0 || drag.y !== 0;
  const slideStyle =
    lightboxPhoto && dragging
      ? {
          transform: `translate3d(${drag.x}px, ${Math.max(0, drag.y)}px, 0)`,
          opacity: drag.y > 0 ? Math.max(0.35, 1 - drag.y / 420) : 1,
        }
      : undefined;

  return (
    <>
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => void onPickFiles(e.target.files)}
      />
      <p className="muted">Photos chiffrées sur mimom.be. Elles ne passent pas par Google Drive.</p>
      {album.canUpload ? (
        <Button disabled={Boolean(busy) || loading} onClick={() => fileInput.current?.click()}>
          {busy === 'upload' ? 'Envoi…' : 'Ajouter des photos'}
        </Button>
      ) : null}
      <label className="album-zoom">
        <span>Aperçus</span>
        <input
          type="range"
          min={ALBUM_THUMB_MIN}
          max={ALBUM_THUMB_MAX}
          value={thumbSize}
          onChange={(e) => {
            const next = Number.parseInt(e.target.value, 10);
            setThumbSize(next);
            writeAlbumThumbSize(next);
          }}
          aria-label="Taille des aperçus"
        />
      </label>
      <label className="check-inline">
        <input
          type="checkbox"
          checked={groupByDate}
          onChange={(e) => {
            setGroupByDate(e.target.checked);
            writeAlbumGroupByDate(e.target.checked);
          }}
        />
        Grouper par date
      </label>
      {loading ? <p className="muted">Actualisation…</p> : null}
      {error ? <p className="muted album-error">{error}</p> : null}
      {notice ? <p className="muted">{notice}</p> : null}
      {!loading && photos.length === 0 ? <p className="muted">Aucune photo pour l’instant.</p> : null}
      {photos.length > 0 && groupByDate
        ? groups.map(([dateKey, items]) => (
            <section key={dateKey} className="album-day">
              <h3>{formatLongDate(dateKey)}</h3>
              <div className="album-masonry" style={{ columnWidth: `${thumbSize}px` }}>
                {renderTiles(items)}
              </div>
            </section>
          ))
        : photos.length > 0
          ? (
              <div className="album-masonry" style={{ columnWidth: `${thumbSize}px` }}>
                {renderTiles(photos)}
              </div>
            )
          : null}
      {lightboxPhoto
        ? createPortal(
            <div
              className="album-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={`Photo ${(lightboxIndex ?? 0) + 1} sur ${photos.length}`}>
              <div className="album-lightbox-bar">
                <button type="button" className="album-lightbox-icon" onClick={closeLightbox} aria-label="Fermer">
                  <X size={22} />
                </button>
                <span className="album-lightbox-count">
                  {(lightboxIndex ?? 0) + 1} / {photos.length}
                </span>
              </div>
              <div
                className="album-lightbox-stage"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}>
                <div className={`album-lightbox-slide${dragging ? ' dragging' : ''}`} style={slideStyle}>
                  {lightboxUrl ? (
                    <img src={lightboxUrl} alt="" draggable={false} />
                  ) : thumbs[lightboxPhoto.id] ? (
                    <img src={thumbs[lightboxPhoto.id]} alt="" draggable={false} />
                  ) : (
                    <p className="muted">Ouverture…</p>
                  )}
                </div>
                {photos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      className="album-lightbox-nav prev"
                      disabled={(lightboxIndex ?? 0) <= 0}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => goLightbox(-1)}
                      aria-label="Photo précédente">
                      <ChevronLeft size={28} />
                    </button>
                    <button
                      type="button"
                      className="album-lightbox-nav next"
                      disabled={(lightboxIndex ?? 0) >= photos.length - 1}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => goLightbox(1)}
                      aria-label="Photo suivante">
                      <ChevronRight size={28} />
                    </button>
                  </>
                ) : null}
              </div>
              <div className="album-lightbox-footer">
                <p>{formatLongDate(localDateKey(lightboxPhoto.takenAt))}</p>
                {lightboxPhoto.canDelete ? (
                  <Button tone="danger" disabled={Boolean(busy)} onClick={() => void onDelete(lightboxPhoto)}>
                    {busy === 'delete' ? 'Suppression…' : 'Supprimer'}
                  </Button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
