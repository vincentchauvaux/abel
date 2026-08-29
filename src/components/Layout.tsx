import { ChevronLeft, CircleUser, Home, LayoutDashboard, LayoutGrid } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

export function Layout() {
  const loc = useLocation();
  const path = loc.pathname;
  const onTools = path.startsWith('/tools');
  const onDash = path === '/';
  const onProfile = path.startsWith('/profile');

  return (
    <div className="app">
      <Outlet />
      <nav className="tabbar">
        <Link to="/" className={`tab ${onDash ? 'on' : ''}`}>
          <LayoutDashboard size={22} />
          Dashboard
        </Link>
        <Link to={onTools ? '/' : '/tools'} className="tab tab-center">
          <span className="orb">{onTools ? <Home size={28} /> : <LayoutGrid size={28} />}</span>
          {onTools ? 'Dashboard' : 'Outils'}
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
        <ChevronLeft size={28} />
      </button>
      <h1 style={{ fontSize: '1.25rem' }}>{title}</h1>
      <span style={{ width: 44 }} />
    </div>
  );
}
