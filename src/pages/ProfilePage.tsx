import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

import { AccordionSection } from '@/components/Accordion';
import { LegalFooter } from '@/components/LegalFooter';
import { Button, Field } from '@/components/ui';
import { ensureBaby, linkBabyUser } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import { hasLegalConsent } from '@/lib/consent';
import {
  GOOGLE_CLIENT_CONSOLE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CREDENTIALS_URL,
  type GoogleUser,
  completeGoogleSignIn,
  readGoogleToken,
  readGoogleUser,
  renderGoogleButton,
  signOutGoogle,
} from '@/lib/google';
import { deleteRemoteAccount, downloadJson, exportLocalData, wipeLocalData } from '@/lib/privacy';
import { LEGAL_ROUTES } from '@/lib/site';
import {
  acceptInvite,
  cancelInvite,
  createInvite,
  declineInvite,
  fetchSharing,
  INVITE_ERROR_LABEL,
  type SharingState,
} from '@/lib/sharing';
import { runSync, pullFromServer, subscribeSync, type SyncState } from '@/lib/sync';

const SYNC_LABEL: Record<SyncState, string> = {
  idle: 'Pas encore synchronisé',
  syncing: 'Synchronisation…',
  ok: '',
  auth: 'Session sync expirée',
  offline: 'Hors ligne — cache local, envoi dès que possible',
  error: 'Sync impossible pour le moment',
  rate_limit: 'Trop de requêtes — réessaie dans une minute',
};

function emailFontSize(email: string) {
  if (email.length > 32) return '0.68rem';
  if (email.length > 26) return '0.75rem';
  if (email.length > 20) return '0.82rem';
  return undefined;
}

export function ProfilePage() {
  const { baby, refreshSharing } = useDb();
  const [user, setUser] = useState<GoogleUser | null>(readGoogleUser);
  const [hasToken, setHasToken] = useState(() => Boolean(readGoogleToken()));
  const [googleError, setGoogleError] = useState('');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [busy, setBusy] = useState('');
  const [openSection, setOpenSection] = useState<string | null>('google');
  const [sharing, setSharing] = useState<SharingState | null>(null);
  const [sharingError, setSharingError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const buttonHost = useRef<HTMLDivElement>(null);
  const babyIdRef = useRef(baby?.id);
  babyIdRef.current = baby?.id;
  const needsReconnect = Boolean(user && (!hasToken || syncState === 'auth'));
  const syncOk = syncState === 'ok' && !needsReconnect;
  const syncTone = syncOk ? 'success' : 'muted';

  const loadSharing = async () => {
    if (!readGoogleToken()) {
      setSharing(null);
      return;
    }
    const state = await fetchSharing();
    if (state === 'auth') {
      setSharingError('Session expirée.');
      return;
    }
    if (state === 'rate_limit') {
      setSharingError('Trop de requêtes — réessaie dans une minute.');
      return;
    }
    if (state === 'error' || 'error' in state) {
      setSharingError('Impossible de charger le partage pour le moment.');
      return;
    }
    setSharing(state);
    setSharingError('');
    await refreshSharing();
  };

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  useEffect(() => subscribeSync(setSyncState), []);

  useEffect(() => {
    if (user && hasToken && !needsReconnect) {
      void loadSharing();
    } else {
      setSharing(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when auth state changes
  }, [user, hasToken, needsReconnect, baby?.id]);

  useEffect(() => {
    if (sharing?.pendingInvitesCount) {
      setOpenSection('coparent');
    }
  }, [sharing?.pendingInvitesCount]);

  useEffect(() => {
    const onAuth = () => setHasToken(Boolean(readGoogleToken()));
    onAuth();
    window.addEventListener('abel-auth', onAuth);
    return () => window.removeEventListener('abel-auth', onAuth);
  }, [syncState]);

  useEffect(() => {
    const showButton = (!user || needsReconnect) && GOOGLE_CLIENT_ID && hasLegalConsent();
    if (!showButton || !buttonHost.current) return;
    delete buttonHost.current.dataset.abelGsi;
    setGoogleError('');
    renderGoogleButton(buttonHost.current, async (next, credential) => {
      if (!hasLegalConsent()) return;
      await completeGoogleSignIn(next, credential);
      setUser(next);
      setHasToken(true);
      const id = babyIdRef.current;
      if (id) await linkBabyUser(id, next.sub);
      await runSync();
    }).catch(() => setGoogleError('Impossible de charger Google pour le moment.'));
  }, [user?.sub, needsReconnect]);

  const exportData = async () => {
    setBusy('export');
    try {
      const data = await exportLocalData();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`mimom-export-${stamp}.json`, data);
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
      setHasToken(false);
      window.location.hash = '#/';
      window.location.reload();
    } finally {
      setBusy('');
    }
  };

  const wipeRemote = async () => {
    const isMember = sharing?.role === 'member';
    if (
      !window.confirm(
        isMember
          ? 'Quitter le bébé partagé sur le VPS ? Les données restent accessibles pour l’autre parent. Les données locales sur cet appareil ne seront pas effacées.'
          : 'Supprimer toutes les données du bébé sur le VPS pour tout le monde ? Les données locales sur cet appareil ne seront pas effacées automatiquement.',
      )
    ) {
      return;
    }
    setBusy('remote');
    try {
      const result = await deleteRemoteAccount();
      if (result === 'auth') {
        setHasToken(false);
        window.alert('Session expirée. Appuie sur le bouton Google ci-dessus puis réessaie.');
      } else if (result === 'error') {
        window.alert('Action impossible pour le moment.');
      } else if (typeof result === 'object' && result !== null && 'action' in result && result.action === 'left') {
        window.alert('Tu as quitté le bébé partagé.');
        await loadSharing();
      } else if (typeof result === 'object' && result !== null && 'action' in result) {
        window.alert('Données serveur supprimées.');
        await loadSharing();
      }
    } finally {
      setBusy('');
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setBusy('invite');
    setSharingError('');
    try {
      const result = await createInvite(inviteEmail.trim());
      if (result === 'auth') {
        setSharingError('Session expirée.');
        return;
      }
      if (result === 'rate_limit') {
        setSharingError('Trop de requêtes — réessaie plus tard.');
        return;
      }
      if (result === 'error') {
        setSharingError('Invitation impossible pour le moment.');
        return;
      }
      if (typeof result === 'object' && 'error' in result) {
        setSharingError(INVITE_ERROR_LABEL[result.error] ?? 'Invitation impossible.');
        return;
      }
      setInviteEmail('');
      await loadSharing();
    } finally {
      setBusy('');
    }
  };

  const respondInvite = async (id: string, action: 'accept' | 'decline') => {
    setBusy(action);
    setSharingError('');
    try {
      const result = action === 'accept' ? await acceptInvite(id) : await declineInvite(id);
      if (result === 'auth') {
        setSharingError('Session expirée.');
        return;
      }
      if (result === 'rate_limit' || result === 'error') {
        setSharingError('Action impossible pour le moment.');
        return;
      }
      if (typeof result === 'object' && 'error' in result) {
        setSharingError(INVITE_ERROR_LABEL[result.error] ?? 'Action impossible.');
        return;
      }
      if (action === 'accept') {
        await pullFromServer();
        await runSync();
      }
      await loadSharing();
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="screen">
      <h1>Profil</h1>
      <AccordionSection
        id="google"
        title="Compte Google"
        open={openSection === 'google'}
        onToggle={toggleSection}>
        {user ? (
          <>
            <div className="google-user">
              {user.picture ? <img src={user.picture} alt="" /> : null}
              <div>
                <strong>{user.name}</strong>
                <p className="muted google-user-email" style={{ fontSize: emailFontSize(user.email) }}>
                  {user.email}
                </p>
              </div>
            </div>
            {needsReconnect ? (
              <>
                <p className="muted">Reconnecte-toi pour synchroniser.</p>
                {hasLegalConsent() ? (
                  <div ref={buttonHost} className="google-btn-host" aria-label="Se reconnecter avec Google" />
                ) : (
                  <p className="muted">Accepte d’abord le bandeau d’information en bas de l’écran.</p>
                )}
                {googleError ? <p className="muted">{googleError}</p> : null}
              </>
            ) : (
              <>
                <p className="muted">
                  Tes données sont centralisées sur le VPS. L’appareil garde un cache pour le hors ligne.
                </p>
                {SYNC_LABEL[syncState] ? <p className="muted">{SYNC_LABEL[syncState]}</p> : null}
                <Button tone={syncTone} onClick={() => void runSync()}>
                  Synchroniser maintenant
                </Button>
                <Button
                  tone={syncTone}
                  disabled={busy !== ''}
                  onClick={async () => {
                    setBusy('pull');
                    try {
                      const ok = await pullFromServer();
                      if (!ok) setGoogleError('Rien à récupérer ou session expirée.');
                      else setGoogleError('');
                    } finally {
                      setBusy('');
                    }
                  }}>
                  {busy === 'pull' ? 'Récupération…' : 'Récupérer depuis le VPS'}
                </Button>
              </>
            )}
            <Button
              tone="muted"
              onClick={() => {
                signOutGoogle();
                setUser(null);
                setHasToken(false);
                if (baby) linkBabyUser(baby.id, null);
              }}>
              Se déconnecter
            </Button>
          </>
        ) : GOOGLE_CLIENT_ID ? (
          <>
            <p className="muted">
              Connecte-toi pour centraliser tétées et couches sur le VPS et les retrouver sur chaque appareil. En te
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
              Origines autorisées : <code>https://mimom.be</code>, <code>https://www.mimom.be</code>,{' '}
              <code>https://vincentchauvaux.github.io</code> et <code>http://localhost:5173</code>.
            </p>
          </>
        )}
      </AccordionSection>
      <AccordionSection
        id="coparent"
        title="Co-parent"
        open={openSection === 'coparent'}
        onToggle={toggleSection}
        action={
          sharing?.pendingInvitesCount ? (
            <span className="dash-notes-badge">{sharing.pendingInvitesCount} reçue(s)</span>
          ) : null
        }>
        {!user || needsReconnect ? (
          <p className="muted">Connecte-toi avec Google pour inviter un co-parent ou accepter une invitation.</p>
        ) : (
          <>
            {sharingError ? <p className="muted">{sharingError}</p> : null}
            {sharing?.receivedInvites.length ? (
              <div className="sharing-block">
                <p className="goal-label">Invitations reçues</p>
                {sharing.receivedInvites.map((invite) => (
                  <div key={invite.id} className="sharing-invite-card">
                    <p>
                      Invitation à suivre <strong>{invite.babyName}</strong>
                    </p>
                    <div className="row">
                      <Button disabled={busy !== ''} onClick={() => void respondInvite(invite.id, 'accept')}>
                        Accepter
                      </Button>
                      <Button tone="muted" disabled={busy !== ''} onClick={() => void respondInvite(invite.id, 'decline')}>
                        Refuser
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {sharing?.babyId ? (
              <>
                <p className="muted">
                  Bébé partagé : <strong>{sharing.babyName}</strong>
                  {sharing.role === 'member' ? ' (co-parent)' : ' (propriétaire)'}
                </p>
                {sharing.members.length ? (
                  <div className="sharing-block">
                    <p className="goal-label">Personnes avec accès</p>
                    {sharing.members.map((member, index) => (
                      <p key={`${member.label}-${index}`} className="muted" style={{ margin: '4px 0' }}>
                        {member.label}
                        {member.role === 'owner' ? ' · propriétaire' : ' · co-parent'}
                      </p>
                    ))}
                  </div>
                ) : null}
                {sharing.members.length < 2 ? (
                  <div className="sharing-block">
                    <p className="goal-label">Inviter par e-mail Google</p>
                    <Field
                      label="E-mail du co-parent"
                      value={inviteEmail}
                      onChange={setInviteEmail}
                      placeholder="co-parent@exemple.com"
                      inputMode="text"
                    />
                    <p className="muted">
                      La personne doit se connecter avec ce compte Google. L’invitation apparaît dans son Profil.
                    </p>
                    <Button disabled={busy !== '' || !inviteEmail.trim()} onClick={() => void sendInvite()}>
                      {busy === 'invite' ? 'Envoi…' : 'Envoyer l’invitation'}
                    </Button>
                  </div>
                ) : (
                  <p className="muted">Ce bébé est déjà partagé avec un co-parent.</p>
                )}
                {sharing.sentInvites.some((row) => row.status === 'pending') ? (
                  <div className="sharing-block">
                    <p className="goal-label">Invitations envoyées</p>
                    {sharing.sentInvites
                      .filter((row) => row.status === 'pending')
                      .map((invite) => (
                        <div key={invite.id} className="sharing-invite-row">
                          <span className="muted sharing-invite-email">{invite.email}</span>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Annuler l’invitation"
                            disabled={busy !== ''}
                            onClick={async () => {
                              setBusy('cancel');
                              await cancelInvite(invite.id);
                              await loadSharing();
                              setBusy('');
                            }}>
                            <X size={18} aria-hidden />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : null}
              </>
            ) : !sharing?.receivedInvites.length ? (
              <p className="muted">
                Synchronise d’abord un bébé depuis cette page, puis invite ton co-parent par son e-mail Google.
              </p>
            ) : null}
          </>
        )}
      </AccordionSection>
      <AccordionSection
        id="rgpd"
        title="Données et droits (RGPD)"
        open={openSection === 'rgpd'}
        onToggle={toggleSection}>
        <p className="muted">Export JSON, effacement local ou suppression sur le serveur de sync.</p>
        <Button tone="muted" disabled={busy !== ''} onClick={() => void exportData()}>
          {busy === 'export' ? 'Export…' : 'Exporter mes données'}
        </Button>
        <Button tone="muted" disabled={busy !== ''} onClick={() => void wipeLocal()}>
          {busy === 'wipe' ? 'Effacement…' : 'Effacer les données sur cet appareil'}
        </Button>
        {user ? (
          <Button tone="danger" disabled={busy !== '' || needsReconnect} onClick={() => void wipeRemote()}>
            {busy === 'remote'
              ? 'Traitement…'
              : sharing?.role === 'member'
                ? 'Quitter le bébé partagé (VPS)'
                : 'Supprimer le bébé sur le VPS'}
          </Button>
        ) : null}
      </AccordionSection>
      <AccordionSection
        id="legal"
        title="Informations légales"
        open={openSection === 'legal'}
        onToggle={toggleSection}>
        <p className="muted">
          Mimom n’est pas un dispositif médical.{' '}
          <Link to={LEGAL_ROUTES.medical}>Avertissement santé</Link>.
        </p>
        <LegalFooter />
      </AccordionSection>
      <AccordionSection id="about" title="Sync et hors ligne" open={openSection === 'about'} onToggle={toggleSection}>
        <p className="muted">
          L’app marche hors ligne. Dès qu’il y a du réseau et un compte Google, Mimom envoie les données vers mimom.be
          (France, OVH).
        </p>
      </AccordionSection>
    </div>
  );
}
