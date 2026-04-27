import { Router, type Request, type Response } from 'express';
import { query } from '../../db.js';
import { isSessionActive } from '../utils/session.js';

const router = Router();

type AttendanceRequest = Request & {
  branch_id?: string | number;
  user?: {
    id: string;
    branch_id: string | number;
    profile?: {
      id: string;
    };
  };
  profile?: {
    id: string;
  };
};

function errorResponse(message: string) {
  return { error: true, message };
}

function getNumericId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!/^\d+$/.test(trimmedValue)) {
      return null;
    }

    const parsedValue = Number(trimmedValue);
    return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }

  return null;
}

function getBodyField(body: unknown, fieldName: string): unknown {
  if (!body || typeof body !== 'object' || !(fieldName in body)) {
    return null;
  }

  return (body as Record<string, unknown>)[fieldName];
}

function getStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getCurrentBranchId(req: AttendanceRequest): number | null {
  return getNumericId(req.branch_id ?? req.user?.branch_id);
}

function getActiveInstructorProfileId(req: AttendanceRequest): string | null {
  const session = getBodyField(req.body, 'staff_session') ?? getBodyField(req.body, 'instructor_session');

  if (session && typeof session === 'object' && !Array.isArray(session)) {
    const sessionRecord = session as Record<string, unknown>;
    const profileId = getStringValue(sessionRecord.profile_id);

    if (profileId && isSessionActive(sessionRecord.expires_at)) {
      return profileId;
    }
  }

  const headerProfileId =
    getStringValue(req.header('x-staff-profile-id')) ?? getStringValue(req.header('x-instructor-profile-id'));
  const headerExpiresAt = req.header('x-staff-session-expires-at') ?? req.header('x-instructor-session-expires-at');

  if (headerProfileId && isSessionActive(headerExpiresAt)) {
    return headerProfileId;
  }

  return null;
}

function getMarkedByProfileId(req: AttendanceRequest): string | null {
  const activeInstructorProfileId = getActiveInstructorProfileId(req);

  if (activeInstructorProfileId) {
    return activeInstructorProfileId;
  }

  return req.profile?.id ?? req.user?.profile?.id ?? req.user?.id ?? null;
}

router.post('/check-in', async (req: AttendanceRequest, res) => {
  const studentId = getNumericId(getBodyField(req.body, 'student_id'));
  const branchId = getCurrentBranchId(req);
  const markedBy = getMarkedByProfileId(req);

  if (!branchId || !markedBy) {
    return res.status(401).json(errorResponse('Authenticated branch and profile are required.'));
  }

  if (!studentId) {
    return res.status(400).json(errorResponse('student_id must be a valid integer.'));
  }

  try {
    const result = await query(
      `
        INSERT INTO public.attendance (
          student_id,
          branch_id,
          date,                -- Corrected from attendance_date
          marked_by_profile,   -- Corrected from marked_by
          status
        )
        SELECT
          s.id,
          s.branch_id,
          (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date,
          $2::uuid,            -- Explicitly cast to UUID to match your schema
          'present'
        FROM public.students s
        WHERE s.id = $1::integer -- Cast to integer if your student IDs are serial/int
          AND s.branch_id = $3::integer
          AND s.deleted_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = $2::uuid
              AND p.branch_id = s.branch_id
              AND p.is_active = true
          )
          AND NOT EXISTS (
            SELECT 1
            FROM public.attendance a
            WHERE a.student_id = s.id
              AND a.branch_id = s.branch_id
              AND a.date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          )
        RETURNING *
      `,
      [studentId, markedBy, branchId],
    );

    const attendance = result.rows[0];

    if (!attendance) {
      // Check if student exists or if it's a duplicate
      const studentResult = await query(
        'SELECT id FROM public.students WHERE id = $1::integer AND branch_id = $2::integer AND deleted_at IS NULL',
        [studentId, branchId]
      );

      if (!studentResult.rows[0]) {
        return res.status(404).json(errorResponse('Student was not found in the current branch.'));
      }

      const markerResult = await query(
        `
          SELECT id
          FROM public.profiles
          WHERE id = $1::uuid
            AND branch_id = $2::integer
            AND is_active = true
          LIMIT 1
        `,
        [markedBy, branchId],
      );

      if (!markerResult.rows[0]) {
        return res.status(401).json(errorResponse('Active instructor session is invalid or expired.'));
      }

      return res.status(409).json(errorResponse('Student has already checked in today.'));
    }

    return res.status(201).json({
      message: 'Student checked in successfully.',
      attendance,
    });
  } catch (error) {
    console.error('Failed to check in student:', error);
    return res.status(500).json(errorResponse('Unable to check in student.'));
  }
});

async function getTodayAttendance(req: AttendanceRequest, res: Response) {
  const branchId = getCurrentBranchId(req);

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  try {
    const result = await query(
      `
        SELECT
          a.id AS attendance_id,
          a.date AS attendance_date,
          a.marked_by_profile,
          s.id AS student_id,
          s.membership_id,
          s.first_name,
          s.last_name,
          s.status,
          r.rank_name AS belt_rank,
          r.color AS belt_color
        FROM public.attendance a
        INNER JOIN public.students s ON s.id = a.student_id
        LEFT JOIN public.belt_ranks r ON r.id = s.belt_id
        WHERE a.branch_id = $1::integer
          AND a.date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          AND s.deleted_at IS NULL
        ORDER BY s.last_name, s.first_name
      `,
      [branchId],
    );

    return res.json({ students: result.rows });
  } catch (error) {
    console.error('Failed to fetch daily attendance:', error);
    return res.status(500).json(errorResponse('Unable to fetch daily attendance.'));
  }
}

router.get('/today', getTodayAttendance);
router.get('/daily', getTodayAttendance);

export default router;
