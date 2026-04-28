import { useEffect, useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { createInstructor, getActiveInstructors, type ActiveInstructor } from '../api/admin';
import { getBeltRanks } from '../api/students';
import type { BeltRank } from '../types';

type Notice = {
  type: 'success' | 'error';
  message: string;
} | null;

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  branch_id: string;
  belt_level_id: string;
};

const INITIAL_FORM: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  branch_id: '',
  belt_level_id: '',
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

export function AdminSettings() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [beltRanks, setBeltRanks] = useState<BeltRank[]>([]);
  const [staff, setStaff] = useState<ActiveInstructor[]>([]);
  const [loadingBelts, setLoadingBelts] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingBelts(true);
      setIsLoading(true);

      try {
        const [belts, instructors] = await Promise.all([
          getBeltRanks(),
          getActiveInstructors(),
        ]);

        setBeltRanks(belts);
        setStaff(Array.isArray(instructors) ? instructors : []);
      } catch (error) {
        setStaff([]);
        setNotice({
          type: 'error',
          message: getApiErrorMessage(error, 'Unable to load admin hub data.'),
        });
      } finally {
        setLoadingBelts(false);
        setIsLoading(false);
      }
    };

    queueMicrotask(() => void loadInitialData());
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setIsSubmitting(true);

    try {
      await createInstructor({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        branch_id: Number(form.branch_id),
        belt_level_id: Number(form.belt_level_id),
      });

      setNotice({
        type: 'success',
        message: 'Instructor account provisioned successfully.',
      });
      setForm(INITIAL_FORM);
      const refreshedStaff = await getActiveInstructors();
      setStaff(Array.isArray(refreshedStaff) ? refreshedStaff : []);
    } catch (error) {
      setNotice({
        type: 'error',
        message: getApiErrorMessage(error, 'Unable to provision instructor account.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 text-gray-900 sm:p-8">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Admin Hub</p>
        <h1 className="mt-3 font-serif text-4xl font-bold text-gray-950">Instructor Provisioning</h1>
        <p className="mt-2 text-gray-500">
          Create new instructor credentials and link each account to the correct branch and belt rank.
        </p>

        {notice && (
          <div className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 ${
            notice.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <p className="font-semibold">{notice.message}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            First Name
            <input
              type="text"
              required
              value={form.first_name}
              onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Last Name
            <input
              type="text"
              required
              value={form.last_name}
              onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-gray-700 sm:col-span-2">
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-gray-700 sm:col-span-2">
            Temporary Password
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Branch ID
            <input
              type="number"
              required
              min={1}
              value={form.branch_id}
              onChange={(event) => setForm((current) => ({ ...current, branch_id: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Belt Rank
            <select
              required
              value={form.belt_level_id}
              onChange={(event) => setForm((current) => ({ ...current, belt_level_id: event.target.value }))}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            >
              <option value="" disabled>
                {loadingBelts ? 'Loading belt ranks...' : 'Select belt rank'}
              </option>
              {beltRanks.map((belt) => (
                <option key={belt.id} value={belt.id}>
                  {belt.rank_name}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting || loadingBelts}
              className="w-full rounded-xl bg-primary px-5 py-3 font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Provisioning Instructor...' : 'Provision Instructor'}
            </button>
          </div>
        </form>
      </section>

      <section className="mx-auto mt-6 w-full max-w-5xl rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-serif text-3xl font-bold text-gray-950">Active Staff</h2>
        <p className="mt-2 text-gray-500">Current active instructors across branches.</p>

        {isLoading ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-500">
            Loading active staff...
          </div>
        ) : (staff?.length ?? 0) === 0 ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-500">
            No active staff found. Provision your first instructor above.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-gray-500">Branch ID</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-gray-500">Belt Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {staff?.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {[member.first_name, member.last_name].filter(Boolean).join(' ')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{member.branch_id}</td>
                    <td className="px-4 py-3 text-gray-600">{member.belt_rank ?? `Level ${member.belt_level_id}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
