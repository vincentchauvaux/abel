import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export function ConfidentialitePage() {
  return (
    <LegalPage title="Confidentialité">
      <p className="muted">Dernière mise à jour : {SITE.legalUpdated}</p>

      <h2>Responsable du traitement</h2>
      <p>
        {SITE.publisher} — contact via{' '}
        <a href={SITE.contactUrl} target="_blank" rel="noreferrer">
          {SITE.contactLabel}
        </a>
        .
      </p>

      <h2>Données traitées</h2>
      <p>Abel peut traiter les catégories suivantes :</p>
      <ul>
        <li>
          <strong>Sur l’appareil (IndexedDB)</strong> : prénom du bébé, date de naissance, tétées, biberons, couches,
          bains, sommeil, température, croissance, notes, objectifs de rappel, exercices (intitulé + durée), cache
          horoscope.
        </li>
        <li>
          <strong>Si vous connectez Google</strong> : identifiant Google (<code>sub</code>), nom, e-mail, photo de
          profil ; une session Abel (jeton sur l’appareil, 90 jours renouvelés à l’usage) ; les données bébé ci-dessus
          sont copiées sur le VPS OVH pour la sauvegarde multi-appareils.
        </li>
        <li>
          <strong>Co-parent</strong> : si vous invitez ou acceptez un partage, l’autre parent (identifié par son
          e-mail Google) accède aux mêmes données bébé sur le VPS. Abel ne partage pas votre compte Google : chacun
          se connecte avec le sien.
        </li>
        <li>
          <strong>Horoscope du jour</strong> : signe astrologique dérivé de la date de naissance (requête vers le VPS,
          puis APIs publiques tierces ; texte mis en cache localement 24 h).
        </li>
        <li>
          <strong>Album photos (optionnel)</strong> : un album par bébé, stocké <strong>chiffré</strong> (AES-256-GCM)
          sur le VPS OVH, hors du dossier web. Les fichiers sont ré-encodés (métadonnées GPS retirées). Le propriétaire
          y a accès ; le co-parent et les gardiens seulement si un parent ouvre l’accès dans Profil. Les photos ne sont
          pas dans IndexedDB ni dans l’export JSON du suivi. Suppression du compte propriétaire = effacement des
          fichiers.
        </li>
      </ul>
      <p>
        Certaines données (santé infantile : température, compléments, etc.) peuvent être considérées comme des{' '}
        <strong>données relatives à la santé</strong> au sens du RGPD. Abel est un carnet personnel, pas un dispositif
        médical.
      </p>

      <h2>Finalités et bases légales</h2>
      <ul>
        <li>
          <strong>Fonctionnement local</strong> — intérêt légitime / exécution du service demandé par l’utilisateur.
        </li>
        <li>
          <strong>Synchronisation Google</strong> — votre consentement explicite lors de la connexion.
        </li>
        <li>
          <strong>Album photos</strong> — votre consentement en ajoutant des photos ; l’accès co-parent / gardien est
          donné explicitement par un parent dans Profil.
        </li>
        <li>
          <strong>Horoscope</strong> — fonctionnalité de divertissement, sur la base de votre saisie de la date de
          naissance.
        </li>
      </ul>

      <h2>Destinataires et sous-traitants</h2>
      <ul>
        <li>Google LLC — authentification (Google Identity Services).</li>
        <li>GitHub Pages — hébergement de l’application.</li>
        <li>OVH SAS — hébergement API et base PostgreSQL (France).</li>
        <li>
          APIs horoscope / traduction publiques — uniquement le signe et le texte du jour (pas d’identité du bébé
          transmise par Abel).
        </li>
      </ul>
      <p>Aucune revente de données. Pas de publicité ciblée. Pas de cookies de traçage tiers.</p>

      <h2>Durées de conservation</h2>
      <ul>
        <li>Données locales : jusqu’à suppression par vous ou effacement du navigateur.</li>
        <li>Session Abel : jusqu’à 90 jours d’inactivité (renouvelée à chaque usage), ou jusqu’à déconnexion / suppression du compte.</li>
        <li>Données serveur : tant que le compte Google reste lié, ou jusqu’à suppression via Profil.</li>
        <li>Cache horoscope : 24 h dans le navigateur.</li>
        <li>Album : photos chiffrées sur le VPS jusqu’à suppression de la photo, de l’album (compte propriétaire) ou révocation d’accès (la photo reste, la personne ne la voit plus).</li>
      </ul>

      <h2>Vos droits (RGPD)</h2>
      <p>Vous disposez des droits d’accès, rectification, effacement, limitation, opposition et portabilité.</p>
      <ul>
        <li>
          <strong>Export</strong> : bouton « Exporter mes données » sur la page Profil (JSON de toutes les tables
          locales).
        </li>
        <li>
          <strong>Suppression locale</strong> : « Effacer les données sur cet appareil » (Profil).
        </li>
        <li>
          <strong>Suppression serveur</strong> : propriétaire — suppression du bébé pour tous ; co-parent — quitter le
          partage sans effacer les données de l’autre parent (Profil, compte Google connecté). Les photos de l’album
          sont effacées du VPS si le propriétaire supprime le compte.
        </li>
      </ul>
      <p>
        Pour toute demande :{' '}
        <a href={SITE.contactUrl} target="_blank" rel="noreferrer">
          {SITE.contactLabel}
        </a>
        . Vous pouvez introduire une réclamation auprès de la CNIL (cnil.fr).
      </p>

      <h2>Sécurité</h2>
      <p>
        L’API est accessible en HTTPS, authentifiée pour la sync, limitée en débit. L’album est chiffré hors du
        répertoire web (AES-256-GCM, clé serveur). Les données locales dépendent de la sécurité de votre appareil et
        navigateur.
      </p>

      <h2>Transferts hors UE</h2>
      <p>
        Google et GitHub peuvent traiter des données aux États-Unis, dans le cadre de leurs propres garanties
        contractuelles. La synchronisation VPS reste en France (OVH).
      </p>
    </LegalPage>
  );
}
