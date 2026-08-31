import { useEffect, useState } from 'react';
import { Baby, CircleUser, Heart, Home, LayoutGrid } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { ConsentBanner } from '@/components/ConsentBanner';
import { useDb } from '@/db/DbProvider';
import { isToolFavorite, toggleToolFavorite, type ToolId } from '@/lib/tools';

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
  const onDashboard = path === '/' || path === '/dashboard';
  const onTools = path === '/tools';
  const onBaby = path.startsWith('/baby');
  const onProfile = path.startsWith('/profile');
  const onModule = MODULE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

  // Accueil = Dashboard. Depuis le dashboard, le bouton central ouvre Outils.
  const centerTo = onDashboard ? '/tools' : '/';
  const centerIsTools = onDashboard;

  return (
    <div className="app">
      <Outlet />
      <ConsentBanner />
      <nav className="tabbar">
        <Link to="/baby" className={`tab ${onBaby ? 'on' : ''}`}>
          <Baby size={22} />
          Bébé
        </Link>
        <Link to={centerTo} className={`tab tab-center ${onDashboard || onTools || onModule ? 'on' : ''}`}>
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

export function ModuleHeader({ title, toolId }: { title: string; toolId?: ToolId }) {
  const navigate = useNavigate();
  const [favorite, setFavorite] = useState(() => (toolId ? isToolFavorite(toolId) : false));

  useEffect(() => {
    if (toolId) setFavorite(isToolFavorite(toolId));
  }, [toolId]);

  const toggleFavorite = () => {
    if (!toolId) return;
    setFavorite(toggleToolFavorite(toolId));
  };

  return (
    <div className="header">
      <button type="button" onClick={() => navigate('/')} aria-label="Retour au dashboard">
        ←
      </button>
      <div className="header-title-wrap">
        <h1>{title}</h1>
        {toolId ? (
          <button
            type="button"
            className={`module-fav ${favorite ? 'on' : ''}`}
            onClick={toggleFavorite}
            aria-label={favorite ? 'Retirer des favoris du dashboard' : 'Ajouter aux favoris du dashboard'}
            aria-pressed={favorite}>
            <Heart size={20} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        ) : null}
      </div>
      <span className="header-balance" aria-hidden />
    </div>
  );
}
