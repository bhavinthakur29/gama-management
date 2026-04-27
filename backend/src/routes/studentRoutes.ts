import { Router } from 'express';
import { query } from '../../db.js';

const router = Router();
const IST_NOW_SQL = "(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')";

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

function getObjectField(body: unknown, fieldName: string): Record<string, unknown> {
  if (!body || typeof body !== 'object' || !(fieldName in body)) {
    return {};
  }

  const value = (body as Record<string, unknown>)[fieldName];
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

router.get('/', async (req, res) => {
  const branchId = getNumericId(req.branch_id);

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  try {
    const result = await query(`
      SELECT 
        s.id,
        s.membership_id,
        s.first_name,
        s.last_name,
        s.status,
        s.metadata,
        b.name as branch_name,
        r.rank_name as belt_rank
      FROM public.students s
      LEFT JOIN public.branches b ON s.branch_id = b.id
      LEFT JOIN public.belt_ranks r ON s.belt_id = r.id  -- Changed this from belt_rank_id to belt_id
      WHERE s.branch_id = $1::integer
        AND s.deleted_at IS NULL
    `, [branchId]);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Failed to fetch students:", err);
    res.status(500).json(errorResponse("Internal Server Error"));
  }
});

router.get('/membership/:id', async (req, res) => {
  const branchId = getNumericId(req.branch_id);
  const membershipId = req.params.id?.trim();

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  if (!membershipId) {
    return res.status(400).json(errorResponse('membership id is required.'));
  }

  try {
    const result = await query(
      `
        SELECT 
          s.id,
          s.membership_id,
          s.first_name,
          s.last_name,
          s.status,
          s.metadata,
          b.name as branch_name,
          r.rank_name as belt_rank
        FROM public.students s
        LEFT JOIN public.branches b ON s.branch_id = b.id
        LEFT JOIN public.belt_ranks r ON s.belt_id = r.id
        WHERE s.membership_id = $1
          AND s.branch_id = $2::integer
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [membershipId, branchId],
    );

    const student = result.rows[0];

    if (!student) {
      return res.status(404).json(errorResponse('Student was not found in the current branch.'));
    }

    return res.json({ student });
  } catch (err) {
    console.error("❌ Failed to fetch student by membership:", err);
    return res.status(500).json(errorResponse("Internal Server Error"));
  }
});

router.post('/', async (req, res) => {
  const branchId = getNumericId(req.branch_id);
  const membershipId = getStringField(req.body, 'membership_id');
  const firstName = getStringField(req.body, 'first_name');
  const lastName = getStringField(req.body, 'last_name');
  const contact = getStringField(req.body, 'contact');
  const status = getStringField(req.body, 'status') ?? 'Active';
  const beltId = getNumericId(getBodyField(req.body, 'belt_id') ?? getBodyField(req.body, 'belt_rank_id'));
  const metadata = getObjectField(req.body, 'metadata');

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  if (!firstName) {
    return res.status(400).json(errorResponse('first_name is required.'));
  }

  try {
    const result = await query(
      `
        INSERT INTO public.students (
          branch_id,
          membership_id,
          first_name,
          last_name,
          contact,
          status,
          belt_id,
          metadata,
          deleted_at
        )
        VALUES ($1::integer, $2, $3, $4, $5, $6, $7::integer, $8::jsonb, NULL)
        RETURNING *
      `,
      [
        branchId,
        membershipId,
        firstName,
        lastName,
        contact,
        status,
        beltId,
        JSON.stringify(metadata),
      ],
    );

    return res.status(201).json({ student: result.rows[0] });
  } catch (err) {
    console.error("❌ Failed to create student:", err);
    return res.status(500).json(errorResponse("Internal Server Error"));
  }
});

router.patch('/:id', async (req, res) => {
  const branchId = getNumericId(req.branch_id);
  const studentId = getNumericId(req.params.id);
  const beltId = getNumericId(getBodyField(req.body, 'belt_id') ?? getBodyField(req.body, 'belt_rank_id'));
  const status = getStringField(req.body, 'status');

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  if (!studentId) {
    return res.status(400).json(errorResponse('student id must be a valid integer.'));
  }

  if (!beltId && !status) {
    return res.status(400).json(errorResponse('belt_id or status is required.'));
  }

  try {
    const result = await query(
      `
        UPDATE public.students
        SET
          belt_id = COALESCE($1::integer, belt_id),
          status = COALESCE($2, status)
        WHERE id = $3::integer
          AND branch_id = $4::integer
          AND deleted_at IS NULL
        RETURNING *
      `,
      [beltId, status, studentId, branchId],
    );

    const student = result.rows[0];

    if (!student) {
      return res.status(404).json(errorResponse('Student was not found in the current branch.'));
    }

    return res.json({ student });
  } catch (err) {
    console.error("❌ Failed to update student:", err);
    return res.status(500).json(errorResponse("Internal Server Error"));
  }
});

router.put('/:id', async (req, res) => {
  const branchId = getNumericId(req.branch_id);
  const studentId = getNumericId(req.params.id);
  const membershipId = getStringField(req.body, 'membership_id');
  const firstName = getStringField(req.body, 'first_name');
  const lastName = getStringField(req.body, 'last_name');
  const contact = getStringField(req.body, 'contact');
  const status = getStringField(req.body, 'status');
  const beltId = getNumericId(getBodyField(req.body, 'belt_id') ?? getBodyField(req.body, 'belt_rank_id'));
  const metadata = getObjectField(req.body, 'metadata');

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  if (!studentId) {
    return res.status(400).json(errorResponse('student id must be a valid integer.'));
  }

  if (!membershipId || !firstName) {
    return res.status(400).json(errorResponse('membership_id and first_name are required.'));
  }

  try {
    const result = await query(
      `
        UPDATE public.students
        SET
          membership_id = $1,
          first_name = $2,
          last_name = $3,
          contact = $4,
          status = $5,
          belt_id = $6::integer,
          metadata = $7::jsonb
        WHERE id = $8::integer
          AND branch_id = $9::integer
          AND deleted_at IS NULL
        RETURNING *
      `,
      [
        membershipId,
        firstName,
        lastName,
        contact,
        status,
        beltId,
        JSON.stringify(metadata),
        studentId,
        branchId,
      ],
    );

    const student = result.rows[0];

    if (!student) {
      return res.status(404).json(errorResponse('Student was not found in the current branch.'));
    }

    return res.json({ student });
  } catch (err) {
    console.error("❌ Failed to fully update student:", err);
    return res.status(500).json(errorResponse("Internal Server Error"));
  }
});

router.patch('/restore/:id', async (req, res) => {
  const branchId = getNumericId(req.branch_id);
  const studentId = getNumericId(req.params.id);

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  if (!studentId) {
    return res.status(400).json(errorResponse('student id must be a valid integer.'));
  }

  try {
    const result = await query(
      `
        UPDATE public.students
        SET deleted_at = NULL
        WHERE id = $1::integer
          AND branch_id = $2::integer
          AND deleted_at IS NOT NULL
        RETURNING *
      `,
      [studentId, branchId],
    );

    const student = result.rows[0];

    if (!student) {
      return res.status(404).json(errorResponse('Deleted student was not found in the current branch.'));
    }

    return res.json({
      message: 'Student restored successfully.',
      student,
    });
  } catch (err) {
    console.error("❌ Failed to restore student:", err);
    return res.status(500).json(errorResponse("Internal Server Error"));
  }
});

router.delete('/:id', async (req, res) => {
  const branchId = getNumericId(req.branch_id);
  const studentId = getNumericId(req.params.id);

  if (!branchId) {
    return res.status(401).json(errorResponse('Authenticated branch is required.'));
  }

  if (!studentId) {
    return res.status(400).json(errorResponse('student id must be a valid integer.'));
  }

  try {
    const result = await query(
      `
        UPDATE public.students
        SET deleted_at = ${IST_NOW_SQL}
        WHERE id = $1::integer
          AND branch_id = $2::integer
          AND deleted_at IS NULL
        RETURNING id, deleted_at
      `,
      [studentId, branchId],
    );

    const student = result.rows[0];

    if (!student) {
      return res.status(404).json(errorResponse('Student was not found in the current branch.'));
    }

    return res.json({
      message: 'Student deleted successfully.',
      student,
    });
  } catch (err) {
    console.error("❌ Failed to delete student:", err);
    return res.status(500).json(errorResponse("Internal Server Error"));
  }
});

export default router;