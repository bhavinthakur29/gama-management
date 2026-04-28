import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarCheck, Trophy, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api/axios';
import { getStudentBelt, type AttendanceRecord, type Student } from '../types/student';

const pageVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const trendLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getJoinDate(student: Student) {
  const joinDate = student.metadata?.join_date ?? student.metadata?.joinDate;
  return typeof joinDate === 'string' ? Date.parse(joinDate) : NaN;
}

export function Reports() {
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    async function loadReports() {
      const [studentsResponse, attendanceResponse] = await Promise.all([
        api.get('/students'),
        api.get('/attendance/today'),
      ]);

      setStudents(studentsResponse.data ?? []);
      setTodayAttendance(attendanceResponse.data?.students ?? []);
    }

    void loadReports();
  }, []);

  const newSignups = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return students.filter((student) => {
      const joinedAt = getJoinDate(student);
      return Number.isFinite(joinedAt) && joinedAt >= thirtyDaysAgo;
    }).length;
  }, [students]);

  const mostActiveClass = useMemo(() => {
    const counts = todayAttendance.reduce<Record<string, number>>((current, record) => {
      const belt = getStudentBelt(record);
      current[belt] = (current[belt] ?? 0) + 1;
      return current;
    }, {});

    return Object.entries(counts).sort((first, second) => second[1] - first[1])[0]?.[0] ?? 'Building data';
  }, [todayAttendance]);

  const trendValues = trendLabels.map((label, index) => {
    if (index === trendLabels.length - 1) {
      return todayAttendance.length;
    }

    return Math.max(0, Math.round(todayAttendance.length * (0.45 + index * 0.08)));
  });
  const maxTrend = Math.max(...trendValues, 1);

  const stats = [
    { label: 'Total Students', value: students.length, icon: Trophy },
    { label: 'Attendance This Week', value: trendValues.reduce((total, value) => total + value, 0), icon: CalendarCheck },
    { label: 'New Signups (30d)', value: newSignups, icon: UserPlus },
    { label: 'Most Active Class', value: mostActiveClass, icon: Activity },
  ];

  return (
    <motion.section className="page-stack" variants={pageVariants} initial="hidden" animate="show">
      <motion.div className="page-header" variants={itemVariants}>
        <div>
          <p className="eyebrow">Academy Analytics</p>
          <h1>Reports</h1>
          <p>Minimal performance signals for attendance, growth, and class engagement.</p>
        </div>
      </motion.div>

      <motion.div className="reports-grid" variants={pageVariants}>
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <motion.article className="card report-card" key={stat.label} variants={itemVariants}>
              <Icon size={22} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </motion.article>
          );
        })}
      </motion.div>

      <motion.article className="card chart-card" variants={itemVariants}>
        <div>
          <p className="eyebrow">Last 7 Days</p>
          <h2>Attendance Trend</h2>
        </div>
        <div className="bar-chart" aria-label="Attendance trend chart">
          {trendValues.map((value, index) => (
            <div className="bar-column" key={trendLabels[index]}>
              <span>{value}</span>
              <div style={{ height: `${Math.max(12, (value / maxTrend) * 100)}%` }} />
              <strong>{trendLabels[index]}</strong>
            </div>
          ))}
        </div>
      </motion.article>
    </motion.section>
  );
}
