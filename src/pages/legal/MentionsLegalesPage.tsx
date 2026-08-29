import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales">
      <p className="muted">Dernière mise à jour : {SITE.legalUpdated}</p>

      <h2>Éditeur</h2>
      <p>
        <strong>{SITE.name}</strong> — application web de suivi du nourrisson.
        <br />
        Éditeur : {SITE.publisher} ({SITE.publisherType}).
        <br />
        Contact :{' '}
        <a href={SITE.contactUrl} target="_blank" rel="noreferrer">
          {SITE.contactLabel}
        </a>
        .
      </p>

      <h2>Directeur de la publication</h2>
      <p>{SITE.publisher}</p>

      <h2>Hébergement</h2>
      <ul>
        {SITE.hosts.map((host) => (
          <li key={host.name}>
            <strong>{host.name}</strong> — {host.role}
            <br />
            {host.detail}
            <br />
            <a href={host.url} target="_blank" rel="noreferrer">
              {host.url}
            </a>
          </li>
        ))}
      </ul>

      <h2>API de synchronisation</h2>
      <p>
        Données synchronisées (si vous connectez Google) : serveur {SITE.apiHost}, France (OVH), accessible via{' '}
        <a href={SITE.apiUrl}>{SITE.apiUrl}</a>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le code source est publié sur GitHub. L’interface, les textes et le nom « Abel » ne peuvent être reproduits
        sans autorisation, sauf usage personnel dans le cadre prévu par le service.
      </p>
    </LegalPage>
  );
}
