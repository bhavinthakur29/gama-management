import { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { AxiosError } from 'axios';
import { checkInStudent, getTodayAttendance } from '../api/attendance';
import { getStudents } from '../api/students';
import { BeltBadge } from '../components/BeltBadge';
import { useAuth } from '../context/auth-context';
import type { AttendanceRecord, Student } from '../types';
import { studentName } from '../types';

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

export function Dashboard() {
  const { userEmail } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<Record<number, boolean>>({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const [studentRows, attendanceRows] = await Promise.all([
        getStudents(),
        getTodayAttendance(),
      ]);

      setStudents(studentRows);
      setAttendance(attendanceRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void loadDashboard());
  }, []);

  const checkedInIds = useMemo(() => {
    return new Set(attendance.map((record) => Number(record.student_id)));
  }, [attendance]);

  const filteredStudents = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return students;

    return students.filter((student) => (
      studentName(student).toLowerCase().includes(search) ||
      student.belt_rank?.toLowerCase().includes(search)
    ));
  }, [query, students]);

  const handleCheckIn = async (student: Student) => {
    setCheckingIn((current) => ({ ...current, [student.id]: true }));
    setError('');

    const optimisticRecord: AttendanceRecord = {
      attendance_id: Date.now(),
      student_id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      belt: student.belt,
      belt_rank: student.belt_rank,
      belt_color: student.belt_color,
    };

    setAttendance((current) => checkedInIds.has(student.id) ? current : [...current, optimisticRecord]);

    try {
      await checkInStudent(student.id);
      setAttendance(await getTodayAttendance());
      setNotice(`${studentName(student)} checked in.`);
      window.setTimeout(() => setNotice(''), 2400);
    } catch (checkInError: unknown) {
      if (checkInError instanceof AxiosError && checkInError.response?.status === 409) {
        setNotice(`${studentName(student)} is already checked in.`);
        window.setTimeout(() => setNotice(''), 2400);
        return;
      }

      setAttendance((current) => current.filter((record) => record.student_id !== student.id));
      setError(getApiErrorMessage(checkInError, 'Unable to check in student.'));
    } finally {
      setCheckingIn((current) => {
        const next = { ...current };
        delete next[student.id];
        return next;
      });
    }
  };

  return (
    <section className="space-y-6">
      {notice && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 font-bold text-green-700 shadow-lg">
          <Check size={18} />
          {notice}
        </div>
      )}

      <div className="rounded-3xl border border-gray-100 bg-surface p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Live Attendance</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-bold text-gray-950">Daily Check-In</h1>
            <p className="mt-1 text-sm font-semibold text-gray-700">Welcome back, {userEmail ?? 'Sensei'}.</p>
            <p className="mt-2 text-gray-500">Mark students present for today&apos;s class.</p>
          </div>
          <div className="rounded-2xl bg-amber-50 px-5 py-4 text-right">
            <p className="text-sm font-bold text-amber-700">Attendance Meter</p>
            <strong className="text-3xl text-gray-950">{checkedInIds.size}/{students.length}</strong>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="text-primary" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search students or belts"
          className="w-full bg-transparent outline-none"
        />
      </div>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-500">Loading students...</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredStudents.map((student) => {
          const checkedIn = checkedInIds.has(student.id);

          return (
            <article key={student.id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-950">{studentName(student)}</h2>
                  <p className="text-sm text-gray-500">{student.membership_id ?? 'No membership ID'}</p>
                </div>
                <BeltBadge student={student} />
              </div>

              <button
                type="button"
                disabled={checkedIn || checkingIn[student.id]}
                onClick={() => void handleCheckIn(student)}
                className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-bold text-white transition hover:bg-amber-700 disabled:bg-green-600"
              >
                {checkedIn ? 'Checked In' : checkingIn[student.id] ? 'Checking In...' : 'Check In'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
