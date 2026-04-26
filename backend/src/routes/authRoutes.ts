import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { query } from '../../db';
import { supabase, supabaseAdmin } from '../config/supabase';
import { verifyBranch } from '../middleware/auth';
import { createStaffSession, getAcademySessionExpiry } from '../utils/session';

const router = Router();
const IST_NOW_SQL = "(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse('Too many login attempts. Please try again in 15 minutes.'),
});

type ProfilePinRow = {
  id: string;
  branch_id: string;
  role: string;
  is_active: boolean;
  pin_hash: string | null;
  name?: string | null;
  failed_attempts?: number | null;
  locked_until?: string | null;
};

function errorResponse(message: string) {
  return { error: true, message };
}

function getStringField(body: unknown, fieldName: string): string | null {
  if (!body || typeof body !== 'object' || !(fieldName in body)) {
    return null;
  }

  const value = (body as Record<string, unknown>)[fieldName];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
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

function getAcademyBranchId(req: RequestWithBranch): number | null {
  return getNumericId(req.branch_id ?? req.user?.branch_id);
}

type RequestWithBranch = Parameters<typeof verifyBranch>[0];

function isSuperAdmin(req: RequestWithBranch) {
  return (req.role ?? req.user?.role) === 'super-admin';
}

async function startInstructorSession(req: RequestWithBranch, res: Response) {
  const profileId = getStringField(req.body, 'profile_id') ?? getStringField(req.body, 'profileId');
  const pin = getStringField(req.body, 'pin');
  const branchId = getAcademyBranchId(req);

  if (!profileId || !pin) {
    return res.status(400).json(errorResponse('profile_id and pin are required.'));
  }

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  try {
    const result = await query(
      `
        SELECT id, branch_id, role, is_active, pin_hash, name
        FROM public.profiles
        WHERE id = $1
          AND branch_id = $2::integer
          AND role = 'Instructor'
        LIMIT 1
      `,
      [profileId, branchId],
    );

    const profile = result.rows[0] as ProfilePinRow | undefined;

    if (!profile || !profile.pin_hash) {
      return res.status(401).json(errorResponse('Invalid profile or PIN.'));
    }

    if (!profile.is_active) {
      return res.status(403).json(errorResponse('Profile is not active.'));
    }

    const isValidPin = await bcrypt.compare(pin, profile.pin_hash);

    if (!isValidPin) {
      return res.status(401).json(errorResponse('Invalid profile or PIN.'));
    }

    return res.json({
      success: true,
      message: 'Instructor session started.',
      instructor_session: createStaffSession({
        id: profile.id,
        name: profile.name ?? 'Instructor',
        role: profile.role,
        branch_id: Number(profile.branch_id),
      }),
    });
  } catch (error) {
    console.error('Failed to start instructor session:', error);
    return res.status(500).json(errorResponse('Unable to start instructor session.'));
  }
}

router.post('/login', loginLimiter, async (req, res) => {
  const email = getStringField(req.body, 'email');
  const password = getStringField(req.body, 'password');

  if (!email || !password) {
    return res.status(400).json(errorResponse('email and password are required.'));
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return res.status(401).json(errorResponse('Invalid email or password.'));
    }

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: getAcademySessionExpiry().toISOString(),
      user: data.user,
    });
  } catch (error) {
    console.error('Failed to log in:', error);
    return res.status(401).json(errorResponse('Invalid email or password.'));
  }
});

router.post('/instructor-session', verifyBranch, startInstructorSession);
router.post('/verify-pin', verifyBranch, startInstructorSession);

router.post('/instructor-login', async (req, res) => {
  const pin = getStringField(req.body, 'pin');
  const branchId = getNumericId(
    (req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).branch_id : null),
  );

  if (!pin || !branchId) {
    return res.status(400).json(errorResponse('pin and branch_id are required.'));
  }

  try {
    const result = await query(
      `
        SELECT id, branch_id, role, is_active, pin_hash, name, failed_attempts, locked_until
        FROM public.profiles
        WHERE branch_id = $1::integer
          AND role = 'Instructor'
          AND is_active = true
      `,
      [branchId],
    );

    const profiles = result.rows as ProfilePinRow[];
    const activeProfiles = profiles.filter((profile) => (
      !profile.locked_until || Date.parse(profile.locked_until) <= Date.now()
    ));

    if (profiles.length > 0 && activeProfiles.length === 0) {
      return res.status(423).json(errorResponse('All instructor PIN sessions are temporarily locked.'));
    }

    for (const profile of activeProfiles) {
      if (profile.pin_hash && await bcrypt.compare(pin, profile.pin_hash)) {
        await query(
          `
            UPDATE public.profiles
            SET failed_attempts = 0,
                locked_until = NULL
            WHERE id = $1::uuid
          `,
          [profile.id],
        );

        return res.json({
          success: true,
          message: 'Instructor login successful.',
          staff_session: createStaffSession({
            id: profile.id,
            name: profile.name ?? 'Instructor',
            role: profile.role,
            branch_id: Number(profile.branch_id),
          }),
        });
      }
    }

    await query(
      `
        UPDATE public.profiles
        SET
          failed_attempts = COALESCE(failed_attempts, 0) + 1,
          locked_until = CASE
            WHEN COALESCE(failed_attempts, 0) + 1 >= 10
              THEN ${IST_NOW_SQL} + INTERVAL '15 minutes'
            ELSE locked_until
          END
        WHERE branch_id = $1::integer
          AND role = 'Instructor'
          AND is_active = true
          AND (locked_until IS NULL OR locked_until <= ${IST_NOW_SQL})
      `,
      [branchId],
    );

    return res.status(401).json(errorResponse('Invalid instructor PIN.'));
  } catch (error) {
    console.error('Failed to log in instructor:', error);
    return res.status(500).json(errorResponse('Unable to log in instructor.'));
  }
});

router.post('/add-instructor', verifyBranch, async (req, res) => {
  const branchId = getAcademyBranchId(req);
  const name = getStringField(req.body, 'name');
  const pin = getStringField(req.body, 'pin');

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  if (!name || !pin) {
    return res.status(400).json(errorResponse('name and pin are required.'));
  }

  try {
    const pinHash = await bcrypt.hash(pin, 12);
    const result = await query(
      `
        INSERT INTO public.profiles (
          branch_id,
          name,
          role,
          is_active,
          pin_hash,
          failed_attempts,
          locked_until
        )
        VALUES ($1::integer, $2, 'Instructor', true, $3, 0, NULL)
        RETURNING id, branch_id, name, role, is_active
      `,
      [branchId, name, pinHash],
    );

    return res.status(201).json({
      message: 'Instructor created successfully.',
      instructor: result.rows[0],
    });
  } catch (error) {
    console.error('Failed to add instructor:', error);
    return res.status(500).json(errorResponse('Unable to add instructor.'));
  }
});

router.post('/create-branch-account', verifyBranch, async (req, res) => {
  const requesterRole = req.role ?? req.user?.role;
  const branchName = getStringField(req.body, 'name') ?? getStringField(req.body, 'branch_name');
  const email = getStringField(req.body, 'email');
  const password = getStringField(req.body, 'password');
  const accountName = getStringField(req.body, 'account_name') ?? branchName;

  if (!isSuperAdmin(req)) {
    return res.status(403).json(errorResponse('Only a super-admin can create branch accounts.'));
  }

  if (!branchName || !email || !password) {
    return res.status(400).json(errorResponse('name, email, and password are required.'));
  }

  try {
    const branchResult = await query(
      `
        INSERT INTO public.branches (
          name,
          created_at
        )
        VALUES (
          $1,
          (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
        )
        RETURNING id, name, created_at
      `,
      [branchName],
    );
    const branch = branchResult.rows[0];

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError || !createdUser.user) {
      throw createUserError ?? new Error('Supabase did not return a created user.');
    }

    const profileResult = await query(
      `
        INSERT INTO public.profiles (
          id,
          branch_id,
          name,
          role,
          is_active
        )
        VALUES ($1::uuid, $2::integer, $3, 'Academy', true)
        RETURNING id, branch_id, name, role, is_active
      `,
      [createdUser.user.id, branch.id, accountName],
    );

    return res.status(201).json({
      message: 'Branch account created successfully.',
      branch,
      profile: profileResult.rows[0],
      user: createdUser.user,
    });
  } catch (error) {
    console.error('Failed to create branch account:', error);
    return res.status(500).json(errorResponse('Unable to create branch account.'));
  }
});

router.patch('/reset-password', verifyBranch, async (req, res) => {
  const userId = getStringField(req.body, 'user_id') ?? getStringField(req.body, 'academy_user_id');
  const password = getStringField(req.body, 'password');

  if (!isSuperAdmin(req)) {
    return res.status(403).json(errorResponse('Only a super-admin can reset academy passwords.'));
  }

  if (!userId || !password) {
    return res.status(400).json(errorResponse('user_id and password are required.'));
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      throw error;
    }

    return res.json({
      message: 'Academy password reset successfully.',
      user: data.user,
    });
  } catch (error) {
    console.error('Failed to reset academy password:', error);
    return res.status(500).json(errorResponse('Unable to reset academy password.'));
  }
});

router.patch('/reset-pin', verifyBranch, async (req, res) => {
  const branchId = getAcademyBranchId(req);
  const profileId = getStringField(req.body, 'profile_id') ?? getStringField(req.body, 'profileId');
  const pin = getStringField(req.body, 'pin');

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  if (!profileId || !pin) {
    return res.status(400).json(errorResponse('profile_id and pin are required.'));
  }

  try {
    const pinHash = await bcrypt.hash(pin, 12);
    const result = await query(
      `
        UPDATE public.profiles
        SET
          pin_hash = $1,
          failed_attempts = 0,
          locked_until = NULL
        WHERE id = $2::uuid
          AND branch_id = $3::integer
          AND role = 'Instructor'
        RETURNING id, branch_id, name, role, is_active
      `,
      [pinHash, profileId, branchId],
    );

    const instructor = result.rows[0];

    if (!instructor) {
      return res.status(404).json(errorResponse('Instructor was not found in the current branch.'));
    }

    return res.json({
      message: 'Instructor PIN reset successfully.',
      instructor,
    });
  } catch (error) {
    console.error('Failed to reset instructor PIN:', error);
    return res.status(500).json(errorResponse('Unable to reset instructor PIN.'));
  }
});

router.get('/instructors', verifyBranch, async (req, res) => {
  const branchId = getAcademyBranchId(req);

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  try {
    const result = await query(
      `
        SELECT id, branch_id, name, role, is_active, failed_attempts, locked_until
        FROM public.profiles
        WHERE branch_id = $1::integer
          AND role = 'Instructor'
        ORDER BY name, id
      `,
      [branchId],
    );

    return res.json({ instructors: result.rows });
  } catch (error) {
    console.error('Failed to fetch instructors:', error);
    return res.status(500).json(errorResponse('Unable to fetch instructors.'));
  }
});

router.patch('/instructors/:id', verifyBranch, async (req, res) => {
  const branchId = getAcademyBranchId(req);
  const instructorId = req.params.id;
  const name = getStringField(req.body, 'name');
  const pin = getStringField(req.body, 'pin');

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  if (!instructorId) {
    return res.status(400).json(errorResponse('instructor id is required.'));
  }

  if (!name && !pin) {
    return res.status(400).json(errorResponse('name or pin is required.'));
  }

  try {
    const pinHash = pin ? await bcrypt.hash(pin, 12) : null;
    const result = await query(
      `
        UPDATE public.profiles
        SET
          name = COALESCE($1, name),
          pin_hash = COALESCE($2, pin_hash),
          failed_attempts = CASE WHEN $2 IS NULL THEN failed_attempts ELSE 0 END,
          locked_until = CASE WHEN $2 IS NULL THEN locked_until ELSE NULL END
        WHERE id = $3::uuid
          AND branch_id = $4::integer
          AND role = 'Instructor'
        RETURNING id, branch_id, name, role, is_active, failed_attempts, locked_until
      `,
      [name, pinHash, instructorId, branchId],
    );

    const instructor = result.rows[0];

    if (!instructor) {
      return res.status(404).json(errorResponse('Instructor was not found in the current branch.'));
    }

    return res.json({ instructor });
  } catch (error) {
    console.error('Failed to update instructor:', error);
    return res.status(500).json(errorResponse('Unable to update instructor.'));
  }
});

router.get('/profiles', verifyBranch, async (req, res) => {
  const branchId = req.branch_id;

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  try {
    const result = await query(
      `
        SELECT id, branch_id, role, is_active
        FROM public.profiles
        WHERE branch_id = $1::integer
        ORDER BY role, id
      `,
      [branchId],
    );

    return res.json({ profiles: result.rows });
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
    return res.status(500).json(errorResponse('Unable to fetch profiles.'));
  }
});

export default router;
