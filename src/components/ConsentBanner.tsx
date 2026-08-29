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
        Abel enregistre les données sur <strong>votre appareil</strong>. La synchronisation Google est{' '}
        <strong>facultative</strong>.{' '}
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
