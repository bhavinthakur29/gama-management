import { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api/axios';
import { BeltBadge } from '../components/BeltBadge';
import { useAuth } from '../context/AuthContext';
import { type AttendanceRecord, getStudentBelt, getStudentName, type Student } from '../types/student';

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function getGreeting(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatIstTime(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

function formatCheckInTime(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function Dashboard() {
  const { instructor, isInstructorActive, token, user } = useAuth();
  const [clock, setClock] = useState(() => new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [checkedInTimes, setCheckedInTimes] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [checkInError, setCheckInError] = useState('');
  const userId = user?.id;

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isInstructorActive || !userId || !localStorage.getItem('gama_token')) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadDashboard() {
      setIsLoading(true);
      try {
        const [studentsResponse, attendanceResponse] = await Promise.all([
          api.get('/students'),
          api.get('/attendance/today'),
        ]);

        if (!isMounted) return;

        setStudents(studentsResponse.data ?? []);
        setTodayAttendance(attendanceResponse.data?.students ?? []);
      } catch (error) {
        if (isMounted) {
          setCheckInError('Unable to load dashboard data.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [isInstructorActive, userId]);

  const checkedInIds = useMemo(() => {
    return new Set([
      ...todayAttendance.map((record) => Number(record.student_id)),
      ...Object.keys(checkedInTimes).map(Number),
    ]);
  }, [todayAttendance, checkedInTimes]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return students;

    return students.filter((student) => (
      getStudentName(student).toLowerCase().includes(query) ||
      student.membership_id?.toLowerCase().includes(query) ||
      getStudentBelt(student).toLowerCase().includes(query)
    ));
  }, [students, search]);

  const recentCheckIns = useMemo(() => {
    const liveCheckIns = Object.entries(checkedInTimes).map(([studentId, time]) => {
      const student = students.find((item) => item.id === Number(studentId));
      return {
        id: studentId,
        name: student ? getStudentName(student) : 'Student',
        time,
      };
    });

    const existingCheckIns = todayAttendance.map((record) => ({
      id: String(record.attendance_id ?? record.student_id),
      name: getStudentName(record),
      time: 'Today',
    }));

    return [...liveCheckIns.reverse(), ...existingCheckIns].slice(0, 5);
  }, [checkedInTimes, students, todayAttendance]);

  const istHour = Number(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }).format(clock),
  );
  const senseiName = instructor?.name ?? user?.email?.split('@')[0] ?? 'Sensei';

  const handleCheckIn = async (student: Student) => {
    setCheckInError('');

    if (!token || !instructor) {
      setCheckInError('Instructor shift is not active yet.');
      return;
    }

    try {
      await api.post('/attendance/check-in', {
        student_id: student.id,
        staff_session: instructor,
      });
      setCheckedInTimes((current) => ({
        ...current,
        [student.id]: formatCheckInTime(new Date()),
      }));
    } catch (error: any) {
      const message =
        error.response?.data?.message ??
        error.message ??
        'Unable to check in student.';

      if (error.response?.status === 409) {
        setCheckedInTimes((current) => ({
          ...current,
          [student.id]: 'Today',
        }));
        return;
      }

      setCheckInError(message);
    }
  };

  return (
    <motion.section className="page-stack" variants={listVariants} initial="hidden" animate="show">
      <motion.div className="dashboard-hero card" variants={itemVariants}>
        <div>
          <p className="eyebrow">Daily Attendance</p>
          <h1>{getGreeting(istHour)}, Sensei {senseiName}</h1>
          <p>Mark today&apos;s training floor attendance with one tap.</p>
        </div>
        <div className="digital-clock">
          <span>IST</span>
          <strong>{formatIstTime(clock)}</strong>
        </div>
      </motion.div>

      <div className="dashboard-layout">
        <motion.div className="attendance-main" variants={itemVariants}>
          <div className="toolbar card">
            <Search size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students, membership ID, or belt"
            />
          </div>

          {checkInError && <p className="form-error">{checkInError}</p>}

          <motion.div className="student-card-grid" variants={listVariants}>
            {filteredStudents.map((student) => {
              const checkedIn = checkedInIds.has(student.id);
              const checkedTime = checkedInTimes[student.id] ?? 'Today';

              return (
                <motion.article className="student-card card" key={student.id} variants={itemVariants}>
                  <div>
                    <h2>{getStudentName(student)}</h2>
                    <p>{student.membership_id ?? 'No membership ID'}</p>
                  </div>
                  <BeltBadge belt={getStudentBelt(student)} />
                  {checkedIn ? (
                    <div className="checked-in-pill">
                      <Check size={18} />
                      <span>Checked In {checkedTime}</span>
                    </div>
                  ) : (
                    <button className="primary-button check-in-button" type="button" onClick={() => void handleCheckIn(student)}>
                      Check In
                    </button>
                  )}
                </motion.article>
              );
            })}
          </motion.div>

          {!isLoading && filteredStudents.length === 0 && (
            <article className="card empty-state">
              <h2>No students found</h2>
              <p>Try a different search or add students from the roster.</p>
            </article>
          )}
        </motion.div>

        <motion.aside className="attendance-sidebar" variants={itemVariants}>
          <article className="card attendance-meter">
            <span>Attendance Meter</span>
            <strong>{checkedInIds.size}/{students.length}</strong>
            <div className="meter-track">
              <div style={{ width: `${students.length ? Math.round((checkedInIds.size / students.length) * 100) : 0}%` }} />
            </div>
          </article>

          <article className="card recent-list">
            <h2>Last 5 Check-ins</h2>
            {recentCheckIns.length > 0 ? (
              recentCheckIns.map((item) => (
                <div className="recent-item" key={`${item.id}-${item.time}`}>
                  <span>{item.name}</span>
                  <strong>{item.time}</strong>
                </div>
              ))
            ) : (
              <p>No check-ins yet today.</p>
            )}
          </article>
        </motion.aside>
      </div>
    </motion.section>
  );
}
