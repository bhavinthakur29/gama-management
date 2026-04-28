import { api } from './client';
import type { InstructorSession } from '../types';

type AdminLoginResponse = {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  user: {
    id: string;
    email?: string;
    role?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
};

type InstructorLoginResponse = {
  success: boolean;
  message: string;
  staff_session?: InstructorSession;
  instructor_session?: InstructorSession;
};

export async function loginAdmin(email: string, password: string) {
  const response = await api.post<AdminLoginResponse>('/auth/login', {
    email,
    password,
  });

  return response.data;
}

export async function loginInstructor(pin: string) {
  const response = await api.post<InstructorLoginResponse>('/auth/instructor-login', {
    pin,
  });

  const session = response.data.staff_session ?? response.data.instructor_session;

  if (!session?.profile_id) {
    throw new Error('Instructor session did not include auth_id.');
  }

  return session;
}
