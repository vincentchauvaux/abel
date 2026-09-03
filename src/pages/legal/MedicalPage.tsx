import { LegalPage } from '@/components/LegalPage';
import { HOROSCOPE_DISCLAIMER } from '@/lib/horoscope';
import { SITE } from '@/lib/site';

export function MedicalPage() {
  return (
    <LegalPage title="Avertissement santé">
      <p className="muted">Dernière mise à jour : {SITE.legalUpdated}</p>

      <h2>Pas un avis médical</h2>
      <p>
        <strong>{SITE.name} ne remplace pas un médecin, une sage-femme, une consultante en lactation ou tout autre
        professionnel de santé.</strong> Les informations affichées (quantités, rappels, température, compléments,
        croissance, horoscope, lectures traditionnelles) sont des notes et rappels personnels que vous configurez vous-même.
      </p>

      <h2>Rappels et objectifs</h2>
      <ul>
        <li>Les intervalles de tétée ou biberon, et le délai couche après repas, sont des préférences familiales, pas des prescriptions.</li>
        <li>Les notifications navigateur ne fonctionnent que si l’onglet reste ouvert.</li>
        <li>Un retard affiché n’indique pas un problème de santé.</li>
      </ul>

      <h2>Compléments et diversification</h2>
      <p>
        Le module « Compléments » sert à noter ce que vous avez donné (vitamine D, fer, etc.). Mimom ne recommande ni
        dose ni produit. Suivez l’avis de votre professionnel de santé.
      </p>

      <h2>Température et croissance</h2>
      <p>
        Les courbes et valeurs (dont l’IMC indicatif) sont un historique personnel, pas un diagnostic. En cas de
        fièvre, perte de poids ou inquiétude, contactez les urgences ou votre médecin selon la gravité.
      </p>

      <h2>Horoscope et lectures traditionnelles</h2>
      <p className="muted">{HOROSCOPE_DISCLAIMER}</p>

      <h2>En cas d’urgence</h2>
      <p>
        Composez le <strong>15</strong> (SAMU) ou le <strong>112</strong> (numéro d’urgence européen) selon la situation.
      </p>
    </LegalPage>
  );
}
