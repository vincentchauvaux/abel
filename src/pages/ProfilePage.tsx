import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { LegalFooter } from '@/components/LegalFooter';
import { Button, Card } from '@/components/ui';
import { ensureBaby, linkBabyUser } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import { hasLegalConsent } from '@/lib/consent';
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
import { deleteRemoteAccount, downloadJson, exportLocalData, wipeLocalData } from '@/lib/privacy';
import { LEGAL_ROUTES } from '@/lib/site';
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
  const [busy, setBusy] = useState('');
  const buttonHost = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeSync(setSyncState), []);

  useEffect(() => {
    if (user || !GOOGLE_CLIENT_ID || !buttonHost.current) return;
    renderGoogleButton(buttonHost.current, async (next, credential) => {
      if (!hasLegalConsent()) return;
      writeGoogleSession(next, credential);
      setUser(next);
      if (baby) await linkBabyUser(baby.id, next.sub);
      await runSync();
    }).catch(() => setGoogleError('Impossible de charger Google pour le moment.'));
  }, [user, baby]);

  const exportData = async () => {
    setBusy('export');
    try {
      const data = await exportLocalData();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`abel-export-${stamp}.json`, data);
    } finally {
      setBusy('');
    }
  };

  const wipeLocal = async () => {
    if (
      !window.confirm(
        'Effacer toutes les données sur cet appareil ? Cette action est irréversible localement. Les données sur le VPS restent tant que vous ne les supprimez pas aussi.',
      )
    ) {
      return;
    }
    setBusy('wipe');
    try {
      await wipeLocalData();
      await ensureBaby();
      setUser(null);
      window.location.hash = '#/';
      window.location.reload();
    } finally {
      setBusy('');
    }
  };

  const wipeRemote = async () => {
    if (
      !window.confirm(
        'Supprimer toutes vos données sur le VPS ? Les données locales sur cet appareil ne seront pas effacées automatiquement.',
      )
    ) {
      return;
    }
    setBusy('remote');
    try {
      const result = await deleteRemoteAccount();
      if (result === 'auth') {
        window.alert('Session expirée. Reconnecte-toi puis réessaie.');
      } else if (result === 'error') {
        window.alert('Suppression impossible pour le moment.');
      } else {
        window.alert('Données serveur supprimées.');
      }
    } finally {
      setBusy('');
    }
  };

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
              Connecte-toi pour sauvegarder tétées et couches sur le VPS, et les retrouver sur un autre appareil. En te
              connectant, tu acceptes la{' '}
              <Link to={LEGAL_ROUTES.privacy}>politique de confidentialité</Link> et les{' '}
              <Link to={LEGAL_ROUTES.cgu}>conditions d’utilisation</Link>.
            </p>
            {!hasLegalConsent() ? (
              <p className="muted">Accepte d’abord le bandeau d’information en bas de l’écran.</p>
            ) : (
              <div ref={buttonHost} className="google-btn-host" />
            )}
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
        <h2>Données et droits (RGPD)</h2>
        <p className="muted">Export JSON, effacement local ou suppression sur le serveur de sync.</p>
        <Button tone="muted" disabled={busy !== ''} onClick={() => void exportData()}>
          {busy === 'export' ? 'Export…' : 'Exporter mes données'}
        </Button>
        <Button tone="muted" disabled={busy !== ''} onClick={() => void wipeLocal()}>
          {busy === 'wipe' ? 'Effacement…' : 'Effacer les données sur cet appareil'}
        </Button>
        {user ? (
          <Button tone="danger" disabled={busy !== ''} onClick={() => void wipeRemote()}>
            {busy === 'remote' ? 'Suppression…' : 'Supprimer mes données sur le VPS'}
          </Button>
        ) : null}
      </Card>
      <Card>
        <h2>Informations légales</h2>
        <p className="muted">
          Abel n’est pas un dispositif médical.{' '}
          <Link to={LEGAL_ROUTES.medical}>Avertissement santé</Link>.
        </p>
        <LegalFooter />
      </Card>
      <Card>
        <p className="muted">
          L’app marche hors ligne. Dès qu’il y a du réseau et un compte Google, Abel envoie les données vers{' '}
          vps-e09ed6db.vps.ovh.net (France, OVH).
        </p>
      </Card>
    </div>
  );
}
