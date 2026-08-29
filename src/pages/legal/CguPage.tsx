import { Link } from 'react-router-dom';

import { LegalPage } from '@/components/LegalPage';
import { LEGAL_ROUTES, SITE } from '@/lib/site';

export function CguPage() {
  return (
    <LegalPage title="Conditions d’utilisation">
      <p className="muted">Dernière mise à jour : {SITE.legalUpdated}</p>

      <h2>Objet</h2>
      <p>
        {SITE.name} est une application web gratuite permettant de noter le quotidien d’un nourrisson (repas, couches,
        sommeil, etc.). L’utilisation implique l’acceptation des présentes conditions.
      </p>

      <h2>Accès au service</h2>
      <ul>
        <li>L’app fonctionne hors ligne sur votre navigateur.</li>
        <li>La synchronisation cloud via Google est optionnelle.</li>
        <li>L’éditeur peut faire évoluer ou interrompre le service sans préavis, dans la mesure du projet personnel.</li>
      </ul>

      <h2>Compte Google</h2>
      <p>
        En vous connectant, vous autorisez Abel à associer vos données locales à votre identifiant Google et à les
        transmettre au serveur {SITE.apiHost}. Vous pouvez vous déconnecter ou demander la suppression à tout moment
        (Profil).
      </p>

      <h2>Usage autorisé</h2>
      <ul>
        <li>Usage personnel ou familial du suivi de votre enfant.</li>
        <li>Pas d’usage commercial, de revente des données, ni d’automatisation abusive des API.</li>
        <li>Pas de contournement des mesures de sécurité (rate limiting, authentification).</li>
      </ul>

      <h2>Absence de conseil médical</h2>
      <p>
        Abel n’est pas un dispositif médical ni un service de télésanté. Les rappels, objectifs, horoscope et textes
        traditionnels sont des aides personnelles. Consultez un professionnel de santé pour toute question médicale. Voir
        aussi la page « Santé ».
      </p>

      <h2>Responsabilité</h2>
      <p>
        Le service est fourni « en l’état ». L’éditeur ne garantit pas l’absence d’erreur, de perte de données ou
        d’indisponibilité. Vous restez responsable des décisions prises pour votre enfant et de la sauvegarde de vos
        données (export recommandé).
      </p>

      <h2>Données personnelles</h2>
      <p>
        Voir la <Link to={LEGAL_ROUTES.privacy}>politique de confidentialité</Link>.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Droit français. En cas de litige, les tribunaux français seront compétents, sous réserve des règles impératives
        de protection des consommateurs le cas échéant.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={SITE.contactUrl} target="_blank" rel="noreferrer">
          {SITE.contactLabel}
        </a>
      </p>
    </LegalPage>
  );
}
