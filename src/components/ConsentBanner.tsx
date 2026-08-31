import { useState } from 'react';
import { Link } from 'react-router-dom';

import { acceptLegalConsent, hasLegalConsent } from '@/lib/consent';
import { LEGAL_ROUTES } from '@/lib/site';

export function ConsentBanner() {
  const [visible, setVisible] = useState(() => !hasLegalConsent());

  if (!visible) return null;

  return (
    <div className="consent-banner" role="dialog" aria-labelledby="consent-title">
      <p id="consent-title">
        Mimom garde un <strong>cache local</strong> pour le hors ligne. Avec Google, les données sont{' '}
        <strong>centralisées sur le VPS</strong>.{' '}
        <Link to={LEGAL_ROUTES.privacy}>Politique de confidentialité</Link> ·{' '}
        <Link to={LEGAL_ROUTES.medical}>Avertissement santé</Link>
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          acceptLegalConsent();
          setVisible(false);
        }}>
        J’ai compris
      </button>
    </div>
  );
}
