import { useEffect, useRef, useState } from 'react';

import { Button, Card } from '@/components/ui';
import { linkBabyUser, renameBaby } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import {
  GOOGLE_CLIENT_CONSOLE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CREDENTIALS_URL,
  type GoogleUser,
  readGoogleUser,
  renderGoogleButton,
  signOutGoogle,
  writeGoogleUser,
} from '@/lib/google';

export function ProfilePage() {
  const { baby } = useDb();
  const [name, setName] = useState(baby?.name ?? '');
  const [user, setUser] = useState<GoogleUser | null>(readGoogleUser);
  const [googleError, setGoogleError] = useState('');
  const buttonHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (baby?.name) setName(baby.name);
  }, [baby?.name]);

  useEffect(() => {
    if (user || !GOOGLE_CLIENT_ID || !buttonHost.current) return;
    renderGoogleButton(buttonHost.current, (next) => {
      writeGoogleUser(next);
      setUser(next);
      if (baby) linkBabyUser(baby.id, next.sub);
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
            <p className="muted">Connexion pour lier ce navigateur à ton compte. Les données restent locales pour l’instant.</p>
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
        <h2>Prénom du bébé</h2>
        <label className="field">
          <span>Nom</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => baby && renameBaby(baby.id, name)}
          />
        </label>
        <Button onClick={() => baby && renameBaby(baby.id, name)}>Enregistrer</Button>
      </Card>
      <Card>
        <p className="muted">
          Les données restent dans ce navigateur (même hors ligne). La sync vers le VPS viendra ensuite.
        </p>
      </Card>
    </div>
  );
}
