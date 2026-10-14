import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeftRight, ChefHat, LayoutDashboard, LogOut, QrCode, Store, Users, UtensilsCrossed } from 'lucide-react';
import { KITCHEN_PATH, useAuth } from '../auth';

const ADMIN_NAV = [
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/tables', label: 'Tables & QR', icon: QrCode },
  { to: '/admin/team', label: 'Team', icon: Users },
];

const KITCHEN_NAV = [{ to: KITCHEN_PATH, label: 'Orders', icon: ChefHat }];

export function BrandMark() {
  return (
    <div className="adm-brand">
      <span className="adm-brand-icon"><UtensilsCrossed size={18} /></span>
      <span className="adm-brand-name">Food Friend</span>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'A';
}

function ViewSwitch({ isKitchen }: { isKitchen: boolean }) {
  return (
    <div className="adm-view-switch-wrap">
      <span className="adm-view-switch-label" aria-hidden="true">
        <ArrowLeftRight size={12} /> Switch view
      </span>
      <nav className="adm-view-switch" aria-label="Switch dashboard view">
        <Link to="/admin/menu" className={isKitchen ? '' : 'is-active'} aria-current={isKitchen ? undefined : 'page'}>
          <LayoutDashboard size={16} /> Admin
        </Link>
        <Link to={KITCHEN_PATH} className={isKitchen ? 'is-active' : ''} aria-current={isKitchen ? 'page' : undefined}>
          <ChefHat size={16} /> Kitchen
        </Link>
      </nav>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin';
  const isKitchen = pathname.startsWith(KITCHEN_PATH);
  const navItems = isKitchen ? KITCHEN_NAV : ADMIN_NAV;
  const showBottomNav = navItems.length > 1;

  return (
    <div className={`adm adm-shell ${showBottomNav ? '' : 'adm-shell--no-bottom-nav'}`}>
      <aside className="adm-sidebar">
        <div className="adm-sidebar-top">
          <BrandMark />
          <span className="adm-restaurant-chip" title={user?.restaurant.name}>
            <Store size={14} /> {user?.restaurant.name}
          </span>
        </div>
        {isAdmin && <ViewSwitch isKitchen={isKitchen} />}
        <nav className="adm-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `adm-nav-link ${isActive ? 'is-active' : ''}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="adm-sidebar-footer">
          <div className="adm-user">
            <span className="adm-avatar">{initials(user?.name ?? '')}</span>
            <div className="adm-user-text">
              <strong>{user?.name}</strong>
              <span>{isAdmin ? 'Restaurant admin' : 'Chef'}</span>
            </div>
          </div>
          <button className="adm-icon-btn" onClick={logout} aria-label="Log out" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <header className="adm-mobile-topbar">
        <div className="adm-mobile-brand">
          <BrandMark />
          <span className="adm-restaurant-chip">{user?.restaurant.name}</span>
        </div>
        <button className="adm-icon-btn" onClick={logout} aria-label="Log out">
          <LogOut size={18} />
        </button>
        {isAdmin && <ViewSwitch isKitchen={isKitchen} />}
      </header>

      <main className="adm-content">
        <div className="adm-container">
          <Outlet />
        </div>
      </main>

      {showBottomNav && (
        <nav className="adm-bottom-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `adm-bottom-link ${isActive ? 'is-active' : ''}`}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
