import { Baby, CircleUser, Home, LayoutGrid } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

export function Layout() {
  const path = useLocation().pathname;
  const onDashboard = path === '/';
  const onBaby = path.startsWith('/baby');
  const onProfile = path.startsWith('/profile');

  return (
    <div className="app">
      <Outlet />
      <nav className="tabbar">
        <Link to="/baby" className={`tab ${onBaby ? 'on' : ''}`}>
          <Baby size={22} />
          Bébé
        </Link>
        <Link to={onDashboard ? '/tools' : '/'} className="tab tab-center">
          <span className="orb">{onDashboard ? <LayoutGrid size={28} /> : <Home size={28} />}</span>
          {onDashboard ? 'Outils' : 'Dashboard'}
        </Link>
        <Link to="/profile" className={`tab ${onProfile ? 'on' : ''}`}>
          <CircleUser size={22} />
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
      <button type="button" onClick={() => navigate(-1)} aria-label="Retour">
        ←
      </button>
      <h1 style={{ fontSize: '1.25rem' }}>{title}</h1>
      <span style={{ width: 44 }} />
    </div>
  );
}
