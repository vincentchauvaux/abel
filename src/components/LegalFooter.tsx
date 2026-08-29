import { Link } from 'react-router-dom';

import { LEGAL_ROUTES } from '@/lib/site';

export function LegalFooter() {
  return (
    <nav className="legal-footer" aria-label="Informations légales">
      <Link to={LEGAL_ROUTES.mentions}>Mentions</Link>
      <Link to={LEGAL_ROUTES.privacy}>Confidentialité</Link>
      <Link to={LEGAL_ROUTES.cgu}>CGU</Link>
      <Link to={LEGAL_ROUTES.medical}>Santé</Link>
    </nav>
  );
}
