import { useEffect, useRef, useState } from 'react';

import { Button, Card } from '@/components/ui';
import { linkBabyUser } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import {
  GOOGLE_CLIENT_CONSOLE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CREDENTIALS_URL,
  type GoogleUser,
  readGoogleToken,
  readGoogleUser,
  renderGoogleButton,
  signOutGoogle,
  writeGoogleSession,
} from '@/lib/google';
import { runSync, subscribeSync, type SyncState } from '@/lib/sync';

const SYNC_LABEL: Record<SyncState, string> = {
  idle: 'Pas encore synchronisé',
  syncing: 'Synchronisation…',
  ok: 'À jour sur le VPS',
  auth: 'Reconnecte-toi pour synchroniser',
  offline: 'Hors ligne — les données restent ici',
  error: 'Sync impossible pour le moment',
};

export function ProfilePage() {
  const { baby } = useDb();
  const [user, setUser] = useState<GoogleUser | null>(readGoogleUser);
  const [googleError, setGoogleError] = useState('');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const buttonHost = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeSync(setSyncState), []);

  useEffect(() => {
    if (user || !GOOGLE_CLIENT_ID || !buttonHost.current) return;
    renderGoogleButton(buttonHost.current, async (next, credential) => {
      writeGoogleSession(next, credential);
      setUser(next);
      if (baby) await linkBabyUser(baby.id, next.sub);
      await runSync();
    }).catch(() => setGoogleError('Impossible de charger Google pour le moment.'));
  }, [user, baby]);

  return (
    <div className="screen">
      <h1>Profil</h1>
      <Card>
        <h2>Compte Google</h2>
        {user ? (
          <>
            <div className="google-user">
              {user.picture ? <img src={user.picture} alt="" /> : null}
              <div>
                <strong>{user.name}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  {user.email}
                </p>
              </div>
            </div>
            <p className="muted">{SYNC_LABEL[syncState]}</p>
            {!readGoogleToken() ? (
              <p className="muted">La session Google a expiré. Reconnecte-toi pour envoyer les données.</p>
            ) : (
              <Button tone="muted" onClick={() => void runSync()}>
                Synchroniser maintenant
              </Button>
            )}
            <Button
              tone="muted"
              onClick={() => {
                signOutGoogle();
                setUser(null);
                if (baby) linkBabyUser(baby.id, null);
              }}>
              Se déconnecter
            </Button>
          </>
        ) : GOOGLE_CLIENT_ID ? (
          <>
            <p className="muted">
              Connecte-toi pour sauvegarder tétées et couches sur le VPS, et les retrouver sur un autre appareil.
            </p>
            <div ref={buttonHost} className="google-btn-host" />
            {googleError ? <p className="muted">{googleError}</p> : null}
          </>
        ) : (
          <>
            <p className="muted">
              Pour activer la connexion, crée un identifiant client OAuth « Application Web » puis mets-le dans{' '}
              <code>VITE_GOOGLE_CLIENT_ID</code>.
            </p>
            <p>
              <a href={GOOGLE_CLIENT_CONSOLE_URL} target="_blank" rel="noreferrer">
                Créer le client OAuth
              </a>
            </p>
            <p>
              <a href={GOOGLE_CREDENTIALS_URL} target="_blank" rel="noreferrer">
                Identifiants Google Cloud
              </a>
            </p>
            <p className="muted">
              Origines autorisées : <code>https://vincentchauvaux.github.io</code> et{' '}
              <code>http://localhost:5173</code>.
            </p>
          </>
        )}
      </Card>
      <Card>
        <p className="muted">
          L’app marche hors ligne. Dès qu’il y a du réseau et un compte Google, Abel envoie les données vers{' '}
          vps-e09ed6db.vps.ovh.net.
        </p>
      </Card>
    </div>
  );
}
