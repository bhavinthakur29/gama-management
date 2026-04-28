import { LogOut } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

function linkClassName(isActive: boolean) {
  return `rounded-xl px-3 py-2 font-bold transition ${
    isActive ? 'bg-amber-50 text-primary' : 'text-gray-600 hover:bg-gray-50'
  }`;
}

export function Layout() {
  const { isSuperAdmin, logout, userEmail } = useAuth();

  return (
    <div className="min-h-screen bg-background text-gray-900">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-gray-100 bg-white p-6 shadow-sm xl:block">
        <div>
          <p className="font-serif text-2xl font-bold text-gray-950">GAMA</p>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Admin Console</p>
        </div>

        <nav className="mt-10 grid gap-2">
          <NavLink to="/dashboard" className={({ isActive }) => linkClassName(isActive)}>
            Dashboard
          </NavLink>
          {isSuperAdmin && (
            <NavLink to="/admin/settings" className={({ isActive }) => linkClassName(isActive)}>
              Admin Hub
            </NavLink>
          )}
        </nav>

        <p className="mt-auto rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
          Logged in as: <span className="text-gray-900">{userEmail ?? 'unknown user'}</span>
        </p>

        <button
          type="button"
          onClick={logout}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-bold text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-100 bg-white p-3 xl:hidden">
        <NavLink to="/dashboard" className={({ isActive }) => `flex-1 text-center ${linkClassName(isActive)}`}>
          Dashboard
        </NavLink>
        {isSuperAdmin && (
          <NavLink to="/admin/settings" className={({ isActive }) => `flex-1 text-center ${linkClassName(isActive)}`}>
            Admin Hub
          </NavLink>
        )}
        <span className="hidden text-xs font-semibold text-gray-600 md:inline">
          {userEmail ?? 'unknown user'}
        </span>
        <button type="button" onClick={logout} className="rounded-xl p-2 text-red-600 hover:bg-red-50" aria-label="Logout">
          <LogOut size={18} />
        </button>
      </header>

      <div className="xl:ml-72">
        <Outlet />
      </div>
    </div>
  );
}
