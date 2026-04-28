import { useEffect, useState } from 'react';
import { Edit3, Plus } from 'lucide-react';
import { AxiosError } from 'axios';
import { createStudent, getBeltRanks, getStudents, updateStudent } from '../api/students';
import { BeltBadge } from '../components/BeltBadge';
import { StudentModal } from '../components/StudentModal';
import type { BeltRank, Student, StudentPayload } from '../types';
import { studentName } from '../types';

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

export function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [belts, setBelts] = useState<BeltRank[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadRoster() {
    setError('');

    try {
      const [studentRows, beltRows] = await Promise.all([
        getStudents(),
        getBeltRanks(),
      ]);

      setStudents(studentRows);
      setBelts(beltRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load roster.');
    }
  }

  useEffect(() => {
    queueMicrotask(() => void loadRoster());
  }, []);

  const openNewStudent = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const openEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleSubmit = async (payload: StudentPayload) => {
    setIsSaving(true);
    setError('');

    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, payload);
      } else {
        await createStudent(payload);
      }

      setIsModalOpen(false);
      setEditingStudent(null);
      await loadRoster();
    } catch (saveError: unknown) {
      setError(getApiErrorMessage(saveError, 'Unable to save student.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Roster</p>
          <h1 className="mt-2 font-serif text-4xl font-bold text-gray-950">Student Management</h1>
          <p className="mt-2 text-gray-500">Create and maintain student profiles with schema-safe fields.</p>
        </div>

        <button
          type="button"
          onClick={openNewStudent}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-sm transition hover:bg-amber-700"
        >
          <Plus size={18} />
          New Student
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 font-semibold text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-gray-50 text-xs uppercase tracking-[0.12em] text-gray-500">
            <tr>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Contact</th>
              <th className="px-5 py-4">DOB</th>
              <th className="px-5 py-4">Belt</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-gray-100">
                <td className="px-5 py-4">
                  <strong className="block text-gray-950">{studentName(student)}</strong>
                  <span className="text-sm text-gray-500">{student.membership_id ?? 'No membership ID'}</span>
                </td>
                <td className="px-5 py-4 text-gray-600">{student.contact ?? '-'}</td>
                <td className="px-5 py-4 text-gray-600">{student.metadata?.date_of_birth ?? '-'}</td>
                <td className="px-5 py-4"><BeltBadge student={student} /></td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    {student.status ?? 'Active'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => openEditStudent(student)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <StudentModal
          key={editingStudent?.id ?? 'new-student'}
          belts={belts}
          student={editingStudent}
          isSaving={isSaving}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(payload) => void handleSubmit(payload)}
        />
      )}
    </section>
  );
}
