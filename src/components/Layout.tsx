import { Baby, CircleUser, Home, LayoutGrid } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { ConsentBanner } from '@/components/ConsentBanner';
import { useDb } from '@/db/DbProvider';

const MODULE_PREFIXES = [
  '/feeding',
  '/bottle',
  '/solids',
  '/supplements',
  '/diapers',
  '/pumping',
  '/growth',
  '/sleep',
  '/temperature',
  '/notes',
  '/manual',
];

export function Layout() {
  const path = useLocation().pathname;
  const { pendingInvitesCount } = useDb();
  const onTools = path === '/' || path === '/tools';
  const onBaby = path.startsWith('/baby');
  const onProfile = path.startsWith('/profile');
  const onModule = MODULE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

  // Accueil = Outils. Depuis un module (ou ailleurs), le bouton central ramène aux Outils.
  // Depuis Outils, il ouvre le Dashboard.
  const centerTo = onTools ? '/dashboard' : '/';
  const centerIsTools = !onTools;

  return (
    <div className="app">
      <Outlet />
      <ConsentBanner />
      <nav className="tabbar">
        <Link to="/baby" className={`tab ${onBaby ? 'on' : ''}`}>
          <Baby size={22} />
          Bébé
        </Link>
        <Link to={centerTo} className={`tab tab-center ${onTools || onModule ? 'on' : ''}`}>
          <span className="orb">{centerIsTools ? <LayoutGrid size={28} /> : <Home size={28} />}</span>
          {centerIsTools ? 'Outils' : 'Dashboard'}
        </Link>
        <Link to="/profile" className={`tab ${onProfile ? 'on' : ''}`}>
          <span className="tab-icon-wrap">
            <CircleUser size={22} />
            {pendingInvitesCount > 0 ? (
              <span className="tab-badge" aria-label={`${pendingInvitesCount} invitation(s)`}>
                {pendingInvitesCount}
              </span>
            ) : null}
          </span>
          Profil
        </Link>
      </nav>
    </div>
  );
}

export function ModuleHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="header">
      <button type="button" onClick={() => navigate('/')} aria-label="Retour aux outils">
        ←
      </button>
      <h1 style={{ fontSize: '1.25rem' }}>{title}</h1>
      <span style={{ width: 44 }} />
    </div>
  );
}
