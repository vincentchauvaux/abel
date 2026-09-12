import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui';
import {
  ALBUM_THUMB_MAX,
  ALBUM_THUMB_MIN,
  albumFolderName,
  parseDriveFolderId,
  readAlbumThumbSize,
  readLinkedAlbum,
  writeAlbumThumbSize,
  writeLinkedAlbum,
  type LinkedAlbum,
} from '@/lib/album';
import { formatLongDate } from '@/lib/dates';
import { GOOGLE_CLIENT_ID, readGoogleToken, readGoogleUser } from '@/lib/google';
import {
  createAlbumFolder,
  driveErrorMessage,
  fetchAlbumPhotoBlob,
  findAppAlbumFolders,
  folderToLinkedAlbum,
  getDriveFolder,
  hasDriveToken,
  listAlbumPhotos,
  listSharedDrives,
  requestDriveToken,
  shareAlbumFolder,
  uploadAlbumPhoto,
  type AlbumPhoto,
  type DriveFolder,
  type SharedDrive,
} from '@/lib/google-drive';
import { fetchSharing } from '@/lib/sharing';

type Wizard = {
  existing: DriveFolder[];
  drives: SharedDrive[];
};

type Props = {
  open: boolean;
  babyId: string;
  babyName: string;
};

export function BabyAlbum({ open, babyId, babyName }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [signedIn, setSignedIn] = useState(() => Boolean(readGoogleToken() && readGoogleUser()));
  const [album, setAlbum] = useState<LinkedAlbum | null>(() => readLinkedAlbum(babyId));
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [wizard, setWizard] = useState<Wizard | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [thumbSize, setThumbSize] = useState(readAlbumThumbSize);
  const [lightbox, setLightbox] = useState<AlbumPhoto | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    const syncAuth = () => setSignedIn(Boolean(readGoogleToken() && readGoogleUser()));
    window.addEventListener('abel-auth', syncAuth);
    return () => window.removeEventListener('abel-auth', syncAuth);
  }, []);

  useEffect(() => {
    setAlbum(readLinkedAlbum(babyId));
    setPhotos([]);
    setWizard(null);
    setError('');
    setNotice('');
    setNeedsAuth(false);
  }, [babyId]);

  const loadPhotos = async (folderId: string) => {
    setLoading(true);
    setError('');
    try {
      if (!hasDriveToken()) await requestDriveToken('consent');
      const next = await listAlbumPhotos(folderId);
      setPhotos(next);
      setNeedsAuth(false);
    } catch (err) {
      if (err instanceof Error && err.message === 'needs_consent') setNeedsAuth(true);
      else setError(driveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !album) return;
    if (!hasDriveToken()) {
      setNeedsAuth(true);
      return;
    }
    void loadPhotos(album.folderId);
  }, [open, album?.folderId]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) {
      setLightboxUrl('');
      return;
    }
    let revoked = false;
    let objectUrl = '';
    fetchAlbumPhotoBlob(lightbox.id)
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setLightboxUrl(objectUrl);
      })
      .catch(() => {
        if (!revoked) setLightboxUrl(lightbox.thumbnailLink || '');
      });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [lightbox]);

  const groups = useMemo(() => {
    const filtered = photos.filter((photo) => {
      if (fromDate && photo.dateKey < fromDate) return false;
      if (toDate && photo.dateKey > toDate) return false;
      return true;
    });
    const map = new Map<string, AlbumPhoto[]>();
    for (const photo of filtered) {
      const list = map.get(photo.dateKey) ?? [];
      list.push(photo);
      map.set(photo.dateKey, list);
    }
    return [...map.entries()];
  }, [photos, fromDate, toDate]);

  const persistAlbum = (next: LinkedAlbum | null) => {
    writeLinkedAlbum(babyId, next);
    setAlbum(next);
    if (!next) setPhotos([]);
  };

  const shareWithFamily = async (folderId: string) => {
    const sharing = await fetchSharing();
    if (sharing === 'auth' || sharing === 'error' || sharing === 'rate_limit' || 'error' in sharing) {
      return;
    }
    const emails = sharing.members.map((row) => row.email).filter((email): email is string => Boolean(email));
    const failed = await shareAlbumFolder(folderId, emails);
    if (emails.length > 0 && failed.length === 0) {
      setNotice('Album partagé avec le co-parent et les gardiens (invitation Google Drive).');
    } else if (failed.length) {
      setNotice(`Album créé. Partage Drive incomplet pour : ${failed.join(', ')}. Tu peux partager le dossier à la main.`);
    }
  };

  const finishFolder = async (folder: DriveFolder, share: boolean) => {
    setBusy('link');
    try {
      const linked = folderToLinkedAlbum(folder);
      persistAlbum(linked);
      setWizard(null);
      setLinkOpen(false);
      if (share) await shareWithFamily(folder.id);
      await loadPhotos(folder.id);
    } finally {
      setBusy('');
    }
  };

  const startCreate = async () => {
    setBusy('drive');
    setError('');
    setNotice('');
    try {
      await requestDriveToken('consent');
      const [existing, drives] = await Promise.all([findAppAlbumFolders(babyId), listSharedDrives()]);
      if (existing.length === 1 && drives.length === 0) {
        await finishFolder(existing[0], false);
        setNotice('Album Mimom déjà présent sur ce Drive — il est maintenant lié.');
        return;
      }
      if (existing.length || drives.length) {
        setWizard({ existing, drives });
        return;
      }
      const folder = await createAlbumFolder({ babyId, babyName, driveId: null });
      await finishFolder(folder, true);
    } catch (err) {
      setError(driveErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const createOnDrive = async (driveId: string | null) => {
    setBusy('create');
    setError('');
    try {
      const folder = await createAlbumFolder({ babyId, babyName, driveId });
      await finishFolder(folder, true);
    } catch (err) {
      setError(driveErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const linkFromInput = async () => {
    const folderId = parseDriveFolderId(linkValue);
    if (!folderId) {
      setError('Colle le lien d’un dossier Google Drive (ou son identifiant).');
      return;
    }
    setBusy('link');
    setError('');
    try {
      await requestDriveToken('consent');
      const folder = await getDriveFolder(folderId);
      if (folder.trashed) throw new Error('Ce dossier est dans la corbeille Drive.');
      if (folder.mimeType && folder.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error('Ce lien n’est pas un dossier.');
      }
      await finishFolder(folder, false);
    } catch (err) {
      setError(driveErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const onPickFiles = async (list: FileList | null) => {
    if (!album || !list?.length) return;
    const files = [...list].filter((file) => file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name));
    if (!files.length) {
      setError('Choisis des photos (jpg, png, heic…).');
      return;
    }
    setBusy('upload');
    setError('');
    let done = 0;
    try {
      if (!hasDriveToken()) await requestDriveToken('consent');
      for (const file of files) {
        await uploadAlbumPhoto(album.folderId, file);
        done += 1;
        setNotice(`${done} / ${files.length} photo${files.length > 1 ? 's' : ''} envoyée${done > 1 ? 's' : ''}…`);
      }
      setNotice(
        files.length === 1 ? 'Photo ajoutée dans Google Drive.' : `${files.length} photos ajoutées dans Google Drive.`,
      );
      await loadPhotos(album.folderId);
    } catch (err) {
      setError(
        done
          ? `${done} photo${done > 1 ? 's' : ''} envoyée${done > 1 ? 's' : ''}, puis ${driveErrorMessage(err).toLowerCase()}`
          : driveErrorMessage(err),
      );
    } finally {
      setBusy('');
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  if (!open) return null;

  if (!GOOGLE_CLIENT_ID || !signedIn) {
    return (
      <>
        <p className="muted">
          L’album vit sur ton Google Drive, pas sur Mimom. Connecte-toi d’abord avec Google pour créer le dossier.
        </p>
        <Link to="/profile" className="btn btn-primary album-link-btn">
          Aller au Profil
        </Link>
      </>
    );
  }

  if (!album) {
    return (
      <>
        <p className="muted">
          Les photos restent dans <strong>ton</strong> Google Drive — rien n’est envoyé sur mimom.be. Idéalement, le
          parent principal crée l’album (son Drive). Si tu as un Drive partagé Google Workspace, tu peux aussi coller
          le lien d’un dossier.
        </p>
        {wizard ? (
          <>
            {wizard.existing.length ? (
              <>
                <p className="goal-label">Dossier Mimom déjà trouvé</p>
                <p className="muted">Choisis celui à afficher, ou crée-en un nouveau.</p>
                {wizard.existing.map((folder) => (
                  <Button
                    key={folder.id}
                    tone="muted"
                    disabled={Boolean(busy)}
                    onClick={() => void finishFolder(folder, false)}>
                    {folder.name}
                  </Button>
                ))}
              </>
            ) : null}
            <p className="goal-label">Créer l’album</p>
            <Button disabled={Boolean(busy)} onClick={() => void createOnDrive(null)}>
              {busy === 'create' ? 'Création…' : 'Dans mon Drive'}
            </Button>
            <p className="muted">Recommandé pour le parent principal. Mimom le partage ensuite avec le co-parent.</p>
            {wizard.drives.length ? (
              <>
                <p className="goal-label">Drive partagé (Workspace)</p>
                {wizard.drives.map((drive) => (
                  <Button
                    key={drive.id}
                    tone="muted"
                    disabled={Boolean(busy)}
                    onClick={() => void createOnDrive(drive.id)}>
                    {drive.name}
                  </Button>
                ))}
              </>
            ) : null}
            <Button tone="muted" disabled={Boolean(busy)} onClick={() => setWizard(null)}>
              Annuler
            </Button>
          </>
        ) : (
          <>
            <Button disabled={Boolean(busy)} onClick={() => void startCreate()}>
              {busy === 'drive' || busy === 'create' ? 'Ouverture de Drive…' : 'Ajouter un album'}
            </Button>
            <button type="button" className="linkish" onClick={() => setLinkOpen((v) => !v)}>
              J’ai déjà un dossier Drive
            </button>
          </>
        )}
        {linkOpen ? (
          <>
            <label className="field">
              <span>Lien du dossier</span>
              <input
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/…"
                inputMode="url"
              />
            </label>
            <Button tone="muted" disabled={Boolean(busy)} onClick={() => void linkFromInput()}>
              {busy === 'link' ? 'Liaison…' : 'Lier ce dossier'}
            </Button>
          </>
        ) : null}
        {error ? <p className="muted album-error">{error}</p> : null}
        {notice ? <p className="muted">{notice}</p> : null}
        <p className="muted">Dossier prévu : {albumFolderName(babyName)}</p>
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
      <div className="album-toolbar">
        <Button disabled={Boolean(busy) || loading} onClick={() => fileInput.current?.click()}>
          {busy === 'upload' ? 'Envoi…' : 'Ajouter des photos'}
        </Button>
        {album.webViewLink ? (
          <a className="btn btn-muted album-link-btn" href={album.webViewLink} target="_blank" rel="noreferrer">
            Ouvrir dans Drive
          </a>
        ) : null}
      </div>
      {needsAuth ? (
        <Button tone="muted" onClick={() => void loadPhotos(album.folderId)}>
          Afficher l’album
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
      {loading ? <p className="muted">Chargement des photos…</p> : null}
      {error ? <p className="muted album-error">{error}</p> : null}
      {notice ? <p className="muted">{notice}</p> : null}
      {!loading && !needsAuth && photos.length === 0 ? (
        <p className="muted">Aucune photo dans ce dossier pour l’instant.</p>
      ) : null}
      {!loading && photos.length > 0 && groups.length === 0 ? (
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
                aria-label={photo.name}>
                {photo.thumbnailLink ? (
                  <img src={photo.thumbnailLink} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="album-tile-fallback">{photo.name}</span>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}
      <button
        type="button"
        className="linkish"
        onClick={() => {
          persistAlbum(null);
          setNotice('');
        }}>
        Détacher l’album de cet appareil
      </button>
      <p className="muted">Détacher n’efface pas les photos : elles restent dans Google Drive.</p>
      {lightbox ? (
        <div
          className="album-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.name}
          onClick={() => setLightbox(null)}>
          <div className="album-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {lightboxUrl ? (
              <img src={lightboxUrl} alt={lightbox.name} referrerPolicy="no-referrer" />
            ) : (
              <p className="muted">Ouverture…</p>
            )}
            <p>
              {formatLongDate(lightbox.dateKey)}
              {lightbox.webViewLink ? (
                <>
                  {' · '}
                  <a href={lightbox.webViewLink} target="_blank" rel="noreferrer">
                    Drive
                  </a>
                </>
              ) : null}
            </p>
            <Button tone="muted" onClick={() => setLightbox(null)}>
              Fermer
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
