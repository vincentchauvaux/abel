import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui';
import {
  ALBUM_THUMB_MAX,
  ALBUM_THUMB_MIN,
  readAlbumThumbSize,
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

export function BabyAlbum({ open }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const urls = useRef(new Map<string, string>());
  const [signedIn, setSignedIn] = useState(() => Boolean(readGoogleToken() && readGoogleUser()));
  const [album, setAlbum] = useState<AlbumState | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [thumbSize, setThumbSize] = useState(readAlbumThumbSize);
  const [lightbox, setLightbox] = useState<AlbumPhotoMeta | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState('');

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
    };
  }, []);

  useEffect(() => {
    if (!lightbox) {
      setLightboxUrl('');
      return;
    }
    let revoked = false;
    let objectUrl = '';
    fetchAlbumImage(lightbox.id, 'full').then((blob) => {
      if (revoked || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setLightboxUrl(objectUrl);
    });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const groups = useMemo(() => {
    const photos = album?.photos ?? [];
    const filtered = photos.filter((photo) => {
      const key = localDateKey(photo.takenAt);
      if (fromDate && key < fromDate) return false;
      if (toDate && key > toDate) return false;
      return true;
    });
    const map = new Map<string, AlbumPhotoMeta[]>();
    for (const photo of filtered) {
      const key = localDateKey(photo.takenAt);
      const list = map.get(key) ?? [];
      list.push(photo);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [album, fromDate, toDate]);

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
        setNotice(
          done === 1 ? 'Photo enregistrée.' : `${done} photos enregistrées.`,
        );
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
    const url = urls.current.get(photo.id);
    if (url) {
      URL.revokeObjectURL(url);
      urls.current.delete(photo.id);
    }
    setLightbox(null);
    setNotice('Photo supprimée.');
    await load();
  };

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
      <div className="grid-2 album-dates">
        <label className="field">
          <span>Du</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Au</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
      </div>
      {fromDate || toDate ? (
        <button
          type="button"
          className="linkish"
          onClick={() => {
            setFromDate('');
            setToDate('');
          }}>
          Toutes les dates
        </button>
      ) : null}
      {loading ? <p className="muted">Actualisation…</p> : null}
      {error ? <p className="muted album-error">{error}</p> : null}
      {notice ? <p className="muted">{notice}</p> : null}
      {!loading && album.photos.length === 0 ? <p className="muted">Aucune photo pour l’instant.</p> : null}
      {!loading && album.photos.length > 0 && groups.length === 0 ? (
        <p className="muted">Aucune photo dans cette période.</p>
      ) : null}
      {groups.map(([dateKey, items]) => (
        <section key={dateKey} className="album-day">
          <h3>{formatLongDate(dateKey)}</h3>
          <div className="album-masonry" style={{ columnWidth: `${thumbSize}px` }}>
            {items.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className="album-tile"
                onClick={() => setLightbox(photo)}
                aria-label={`Photo du ${formatLongDate(dateKey)}`}>
                {thumbs[photo.id] ? (
                  <img src={thumbs[photo.id]} alt="" />
                ) : (
                  <span className="album-tile-fallback">…</span>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}
      {lightbox ? (
        <div
          className="album-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          onClick={() => setLightbox(null)}>
          <div className="album-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {lightboxUrl ? <img src={lightboxUrl} alt="" /> : <p className="muted">Ouverture…</p>}
            <p>{formatLongDate(localDateKey(lightbox.takenAt))}</p>
            {lightbox.canDelete ? (
              <Button tone="danger" disabled={Boolean(busy)} onClick={() => void onDelete(lightbox)}>
                {busy === 'delete' ? 'Suppression…' : 'Supprimer'}
              </Button>
            ) : null}
            <Button tone="muted" onClick={() => setLightbox(null)}>
              Fermer
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
