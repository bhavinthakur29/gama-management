import { useState } from 'react';
import { LayoutDashboard, LogOut, Users } from 'lucide-react';
import { Dashboard } from '../pages/Dashboard';
import { Students } from '../pages/Students';
import { useAuth } from '../context/auth-context';

export function AppShell() {
  const { logout, user } = useAuth();
  const [activePage, setActivePage] = useState<'dashboard' | 'students'>('dashboard');

  return (
    <div className="min-h-screen bg-background text-gray-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-gray-100 bg-white/90 p-6 shadow-sm backdrop-blur xl:block">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 font-serif text-2xl font-black text-primary">
            G
          </div>
          <div>
            <p className="font-serif text-xl font-bold">GAMA</p>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Academy</p>
          </div>
        </div>

        <nav className="mt-10 grid gap-2">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold transition ${
              activePage === 'dashboard' ? 'bg-amber-50 text-primary' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard size={19} />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActivePage('students')}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold transition ${
              activePage === 'students' ? 'bg-amber-50 text-primary' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Users size={19} />
            Students
          </button>
        </nav>

        <div className="mt-auto grid gap-2 pt-10">
          <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-500">
            Signed in as<br />
            <span className="text-gray-800">{user?.email ?? 'Supabase user'}</span>
          </p>
          <button type="button" onClick={logout} className="flex items-center gap-2 rounded-2xl px-4 py-3 text-left font-bold text-red-600 hover:bg-red-50">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex gap-2 border-b border-gray-100 bg-white/90 p-3 backdrop-blur xl:hidden">
        <button type="button" onClick={() => setActivePage('dashboard')} className="flex-1 rounded-xl bg-amber-50 px-3 py-2 font-bold text-primary">
          Dashboard
        </button>
        <button type="button" onClick={() => setActivePage('students')} className="flex-1 rounded-xl px-3 py-2 font-bold text-gray-600">
          Students
        </button>
      </header>

      <main className="p-4 xl:ml-72 xl:p-8">
        {activePage === 'dashboard' ? <Dashboard /> : <Students />}
      </main>
    </div>
  );
}
