import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { BeltRank, Student, StudentPayload } from '../types';

type StudentModalProps = {
  belts: BeltRank[];
  student?: Student | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: StudentPayload) => void;
};

function initialForm(student?: Student | null) {
  return {
    first_name: student?.first_name ?? '',
    last_name: student?.last_name ?? '',
    date_of_birth: student?.metadata?.date_of_birth ?? '',
    contact: student?.contact ?? '',
    belt_id: student?.belt_id ? String(student.belt_id) : '',
  };
}

export function StudentModal({ belts, student, isSaving, onClose, onSubmit }: StudentModalProps) {
  const [form, setForm] = useState(() => initialForm(student));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSubmit({
      membership_id: student?.membership_id ?? `GAMA-${Date.now()}`,
      first_name: form.first_name,
      last_name: form.last_name,
      contact: form.contact,
      status: student?.status ?? 'Active',
      belt_id: form.belt_id ? Number(form.belt_id) : undefined,
      metadata: {
        date_of_birth: form.date_of_birth,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50"
          aria-label="Close student modal"
        >
          <X size={18} />
        </button>

        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
          {student ? 'Edit Student' : 'New Student'}
        </p>
        <h2 className="mt-2 font-serif text-3xl font-bold text-gray-950">
          {student ? 'Update roster details' : 'Add a student'}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-gray-700">
            First Name
            <input
              required
              value={form.first_name}
              onChange={(event) => setForm({ ...form, first_name: event.target.value })}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-gray-700">
            Last Name
            <input
              value={form.last_name}
              onChange={(event) => setForm({ ...form, last_name: event.target.value })}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-gray-700">
            Date of Birth
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-gray-700">
            Contact Number
            <input
              value={form.contact}
              onChange={(event) => setForm({ ...form, contact: event.target.value })}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-gray-700 md:col-span-2">
            Belt Rank
            <select
              value={form.belt_id}
              onChange={(event) => setForm({ ...form, belt_id: event.target.value })}
              className="rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-amber-500/10"
            >
              <option value="">Select belt rank</option>
              {belts.map((belt) => (
                <option key={belt.id} value={belt.id}>
                  {belt.rank_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-3 font-bold text-gray-600">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60">
            {isSaving ? 'Saving...' : student ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </form>
    </div>
  );
}
