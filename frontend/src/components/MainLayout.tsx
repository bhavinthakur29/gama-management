import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Home, Settings, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InstructorGate } from './InstructorGate';

const navItems = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Students', href: '/students', icon: Users },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function MainLayout() {
  const { logout, user, branchId } = useAuth();

  return (
    <>
      <InstructorGate />
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-badge">G</div>
            <div>
              <strong>GAMA</strong>
              <span>Management</span>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink key={item.href} to={item.href}>
                  <Icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div>
              <span>Signed in</span>
              <strong>{user?.email ?? `Branch ${branchId ?? '-'}`}</strong>
            </div>
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="main-panel">
          <Outlet />
        </main>

        <nav className="bottom-nav" aria-label="Tablet navigation">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.href} to={item.href}>
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );
}
