import { api } from './client';
import type { BeltRank, Student, StudentPayload } from '../types';

export async function getStudents() {
  const response = await api.get<Student[]>('/students');
  return response.data;
}

export async function createStudent(payload: StudentPayload) {
  const response = await api.post<{ student: Student }>('/students', payload);
  return response.data.student;
}

export async function updateStudent(studentId: number, payload: StudentPayload) {
  const response = await api.put<{ student: Student }>(`/students/${studentId}`, payload);
  return response.data.student;
}

export async function getBeltRanks() {
  const response = await api.get<{ belts: BeltRank[] }>('/belt-ranks');
  return response.data.belts;
}
