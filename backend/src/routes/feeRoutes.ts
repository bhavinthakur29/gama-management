import { Router, type Request } from 'express';
import { query } from '../../db';

const router = Router();

type FeeRequest = Request & {
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

function getCurrentBranchId(req: FeeRequest): number | null {
  return getNumericId(req.branch_id ?? req.user?.branch_id);
}

function getRecordedByProfileId(req: FeeRequest): string | null {
  return req.profile?.id ?? req.user?.profile?.id ?? req.user?.id ?? null;
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

function getAmount(body: unknown): number | null {
  if (!body || typeof body !== 'object' || !('amount' in body)) {
    return null;
  }

  const value = (body as Record<string, unknown>).amount;
  const amount = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function getPositiveIntegerField(body: unknown, fieldName: string): number | null {
  return getNumericId(getBodyField(body, fieldName));
}

router.post('/record', async (req: FeeRequest, res) => {
  const branchId = getCurrentBranchId(req);
  const recordedBy = getRecordedByProfileId(req);
  const studentId = getNumericId(getBodyField(req.body, 'student_id'));
  const amount = getAmount(req.body);
  const month = getPositiveIntegerField(req.body, 'month');
  const year = getPositiveIntegerField(req.body, 'year');
  const paymentMethod = getStringField(req.body, 'payment_method');

  if (!branchId || !recordedBy) {
    return res.status(401).json(errorResponse('Authenticated branch and profile are required.'));
  }

  if (!studentId || amount === null || month === null || year === null || !paymentMethod) {
    return res.status(400).json(errorResponse('student_id, amount, month, year, and payment_method are required.'));
  }

  if (month < 1 || month > 12) {
    return res.status(400).json(errorResponse('month must be between 1 and 12.'));
  }

  try {
    const result = await query(
      `
        INSERT INTO public.payments (
          student_id,
          branch_id,
          amount,
          month,
          year,
          payment_method,
          recorded_by,
          paid_at
        )
        SELECT
          s.id,
          s.branch_id,
          $2,
          $3::integer,
          $4::integer,
          $5,
          $6::uuid,
          (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
        FROM public.students s
        WHERE s.id = $1::integer
          AND s.branch_id = $7::integer
          AND s.deleted_at IS NULL
        RETURNING *
      `,
      [studentId, amount, month, year, paymentMethod, recordedBy, branchId],
    );

    const payment = result.rows[0];

    if (!payment) {
      return res.status(404).json(errorResponse('Student was not found in the current branch.'));
    }

    return res.status(201).json({
      message: 'Payment recorded successfully.',
      payment,
    });
  } catch (error) {
    console.error('Failed to record payment:', error);
    return res.status(500).json(errorResponse('Unable to record payment.'));
  }
});

router.get('/student/:id', async (req: FeeRequest, res) => {
  const branchId = getCurrentBranchId(req);
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
        SELECT
          p.*,
          s.first_name,
          s.last_name,
          s.membership_id
        FROM public.payments p
        INNER JOIN public.students s ON s.id = p.student_id
        WHERE p.student_id = $1::integer
          AND p.branch_id = $2::integer
          AND s.branch_id = $2::integer
          AND s.deleted_at IS NULL
        ORDER BY p.paid_at DESC
      `,
      [studentId, branchId],
    );

    return res.json({ payments: result.rows });
  } catch (error) {
    console.error('Failed to fetch payment history:', error);
    return res.status(500).json(errorResponse('Unable to fetch payment history.'));
  }
});

export default router;
