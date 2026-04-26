import { Router } from 'express';
import { query } from '../../db';
import { supabaseAdmin } from '../config/supabase';

const router = Router();
const IST_NOW_SQL = "(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')";

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

router.patch('/update-academy/:id', async (req, res) => {
  const userId = req.params.id;
  const email = getStringField(req.body, 'email');
  const password = getStringField(req.body, 'password');

  if (!userId) {
    return res.status(400).json(errorResponse('academy id is required.'));
  }

  if (!email && !password) {
    return res.status(400).json(errorResponse('email or password is required.'));
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ...(email ? { email } : {}),
      ...(password ? { password } : {}),
    });

    if (error) {
      throw error;
    }

    return res.json({
      message: 'Academy account updated successfully.',
      user: data.user,
    });
  } catch (error) {
    console.error('Failed to update academy account:', error);
    return res.status(500).json(errorResponse('Unable to update academy account.'));
  }
});

router.patch('/update-branch/:id', async (req, res) => {
  const branchId = getNumericId(req.params.id);
  const name = getStringField(req.body, 'name');
  const location = getStringField(req.body, 'location');

  if (!branchId) {
    return res.status(400).json(errorResponse('branch id must be a valid integer.'));
  }

  if (!name && !location) {
    return res.status(400).json(errorResponse('name or location is required.'));
  }

  try {
    const result = await query(
      `
        UPDATE public.branches
        SET
          name = COALESCE($1, name),
          location = COALESCE($2, location)
        WHERE id = $3::integer
        RETURNING *
      `,
      [name, location, branchId],
    );

    const branch = result.rows[0];

    if (!branch) {
      return res.status(404).json(errorResponse('Branch was not found.'));
    }

    return res.json({ branch });
  } catch (error) {
    console.error('Failed to update branch:', error);
    return res.status(500).json(errorResponse('Unable to update branch.'));
  }
});

router.delete('/deactivate-branch/:id', async (req, res) => {
  const branchId = getNumericId(req.params.id);

  if (!branchId) {
    return res.status(400).json(errorResponse('branch id must be a valid integer.'));
  }

  try {
    const result = await query(
      `
        UPDATE public.branches
        SET deactivated_at = ${IST_NOW_SQL}
        WHERE id = $1::integer
        RETURNING *
      `,
      [branchId],
    );

    const branch = result.rows[0];

    if (!branch) {
      return res.status(404).json(errorResponse('Branch was not found.'));
    }

    return res.json({
      message: 'Branch deactivated successfully.',
      branch,
    });
  } catch (error) {
    console.error('Failed to deactivate branch:', error);
    return res.status(500).json(errorResponse('Unable to deactivate branch.'));
  }
});

export default router;
