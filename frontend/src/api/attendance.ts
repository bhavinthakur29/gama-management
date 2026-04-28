import { api } from './client';
import type { AttendanceRecord } from '../types';

export async function getTodayAttendance() {
  const response = await api.get<{ students: AttendanceRecord[] }>('/attendance/today');
  return response.data.students;
}

export async function checkInStudent(studentId: number) {
  const response = await api.post('/attendance/check-in', {
    student_id: studentId,
  });

  return response.data;
}
