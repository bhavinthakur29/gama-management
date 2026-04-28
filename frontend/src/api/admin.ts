import { api } from './client';

export type CreateInstructorPayload = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  branch_id: number;
  belt_level_id: number;
};

type CreateInstructorResponse = {
  message: string;
  instructor?: {
    id: number;
    auth_id: string;
    branch_id: number;
    belt_level_id: number;
    first_name: string;
    last_name: string;
    is_active: boolean;
  };
};

export type ActiveInstructor = {
  id: number;
  auth_id: string;
  first_name: string;
  last_name: string;
  branch_id: number;
  belt_level_id: number;
  belt_rank?: string | null;
};

export async function createInstructor(payload: CreateInstructorPayload) {
  const token = localStorage.getItem('gama_token');
  const response = await api.post<CreateInstructorResponse>('/admin/instructors', payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  return response.data;
}

export async function getActiveInstructors() {
  const token = localStorage.getItem('gama_token');
  const response = await api.get<{ instructors: ActiveInstructor[] }>('/admin/instructors', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  return response.data.instructors;
}
