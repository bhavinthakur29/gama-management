export type Student = {
  id: number;
  membership_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  branch_name?: string | null;
  belt_rank?: string | null;
  belt_color?: string | null;
};

export type AttendanceRecord = {
  attendance_id?: number;
  attendance_date?: string;
  marked_by_profile?: string;
  student_id: number;
  membership_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  status?: string | null;
  belt_rank?: string | null;
  belt_color?: string | null;
};

export function getStudentName(student: Pick<Student, 'first_name' | 'last_name'>) {
  return [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unnamed Student';
}

export function getStudentBelt(student: { belt_rank?: string | null; metadata?: Record<string, unknown> | null }) {
  const metadataBelt = student.metadata?.belt_label ?? student.metadata?.beltRank;

  if (student.belt_rank) {
    return student.belt_rank;
  }

  return typeof metadataBelt === 'string' ? metadataBelt : 'Unranked';
}
