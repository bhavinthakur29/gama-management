import type { Request, Response } from 'express';

import { query } from '../../db.js';
import { supabaseAdmin } from '../config/supabase.js';

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

async function deleteCreatedAuthUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error('Failed to roll back Supabase Auth user:', error);
  }
}

export async function createInstructorAccount(req: Request, res: Response) {
  const email = getStringField(req.body, 'email');
  const password = getStringField(req.body, 'password');
  const firstName = getStringField(req.body, 'first_name');
  const lastName = getStringField(req.body, 'last_name');
  const branchId = getNumericId((req.body as Record<string, unknown> | undefined)?.branch_id);
  const beltLevelId = getNumericId((req.body as Record<string, unknown> | undefined)?.belt_level_id);

  if (!email || !password || !firstName || !lastName || !branchId || !beltLevelId) {
    return res.status(400).json(errorResponse(
      'email, password, first_name, last_name, branch_id, and belt_level_id are required.',
    ));
  }

  let createdAuthUserId: string | null = null;

  try {
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError || !createdUser.user) {
      return res.status(400).json(errorResponse(
        createUserError?.message ?? 'Supabase did not return a created user.',
      ));
    }

    createdAuthUserId = createdUser.user.id;

    try {
      const instructorResult = await query(
        `
          INSERT INTO public.instructors (
            auth_id,
            branch_id,
            belt_level_id,
            first_name,
            last_name,
            is_active
          )
          VALUES ($1::uuid, $2::integer, $3::integer, $4, $5, true)
          RETURNING id, auth_id, branch_id, belt_level_id, first_name, last_name, is_active
        `,
        [createdAuthUserId, branchId, beltLevelId, firstName, lastName],
      );

      return res.status(201).json({
        message: 'Instructor account created successfully.',
        auth_user: {
          id: createdUser.user.id,
          email: createdUser.user.email,
        },
        instructor: instructorResult.rows[0],
      });
    } catch (insertError) {
      await deleteCreatedAuthUser(createdAuthUserId);
      console.error('Failed to insert instructor after creating Auth user:', insertError);

      return res.status(500).json(errorResponse(
        'Instructor profile insert failed. The created Auth user was rolled back.',
      ));
    }
  } catch (error) {
    if (createdAuthUserId) {
      await deleteCreatedAuthUser(createdAuthUserId);
    }

    console.error('Failed to create instructor account:', error);
    return res.status(500).json(errorResponse('Unable to create instructor account.'));
  }
}
