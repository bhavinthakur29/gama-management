import { useState } from 'react';
import { LayoutDashboard, Users } from 'lucide-react';
import { Dashboard } from '../pages/Dashboard';
import { Students } from '../pages/Students';

export function AppShell() {
  const [activePage, setActivePage] = useState<'dashboard' | 'students'>('dashboard');

  return (
    <section className="p-4 xl:p-8">
      <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        <nav className="flex flex-wrap gap-2">
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
      </div>

      <div className="mt-6">
        {activePage === 'dashboard' ? <Dashboard /> : <Students />}
      </div>
    </section>
  );
}
