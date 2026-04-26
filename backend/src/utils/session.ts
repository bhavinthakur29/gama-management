const STAFF_SESSION_HOURS = 12;
const ACADEMY_SESSION_DAYS = 30;

export type InstructorSession = {
  profile_id: string;
  name: string;
  role: string;
  branch_id: number;
  started_at: string;
  expires_at: string;
};

export function getSessionExpiry(startDate = new Date(), hours = STAFF_SESSION_HOURS) {
  return new Date(startDate.getTime() + hours * 60 * 60 * 1000);
}

export function getAcademySessionExpiry(startDate = new Date()) {
  return new Date(startDate.getTime() + ACADEMY_SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function createInstructorSession(profile: {
  id: string;
  name: string;
  role: string;
  branch_id: number;
}): InstructorSession {
  const startedAt = new Date();

  return {
    profile_id: profile.id,
    name: profile.name,
    role: profile.role,
    branch_id: profile.branch_id,
    started_at: startedAt.toISOString(),
    expires_at: getSessionExpiry(startedAt, STAFF_SESSION_HOURS).toISOString(),
  };
}

export const createStaffSession = createInstructorSession;

export function isSessionActive(expiresAt: unknown, now = new Date()) {
  if (typeof expiresAt !== 'string') {
    return false;
  }

  const expiryTime = Date.parse(expiresAt);
  return Number.isFinite(expiryTime) && expiryTime > now.getTime();
}
