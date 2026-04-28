export type BeltRank = {
  id: number;
  rank_name: string;
  color_code: string;
};

export type Student = {
  id: number;
  membership_id?: string | null;
  first_name: string;
  last_name?: string | null;
  contact?: string | null;
  status?: string | null;
  belt_id?: number | null;
  metadata?: {
    date_of_birth?: string;
    [key: string]: unknown;
  } | null;
  belt?: string | null;
  belt_rank?: string | null;
  belt_color?: string | null;
};

export type AttendanceRecord = {
  attendance_id: number;
  student_id: number;
  first_name: string;
  last_name?: string | null;
  belt?: string | null;
  belt_rank?: string | null;
  belt_color?: string | null;
};

export type InstructorSession = {
  profile_id: string;
  name: string;
  role: string;
  branch_id: number;
  started_at: string;
  expires_at: string;
};

export type StudentPayload = {
  membership_id?: string;
  first_name: string;
  last_name?: string;
  contact?: string;
  status?: string;
  belt_id?: number;
  metadata?: {
    date_of_birth?: string;
  };
};

export function studentName(student: Pick<Student, 'first_name' | 'last_name'>) {
  return [student.first_name, student.last_name].filter(Boolean).join(' ');
}

export function studentBelt(student: Pick<Student, 'belt' | 'belt_rank'>) {
  return student.belt ?? student.belt_rank ?? 'Unranked';
}
