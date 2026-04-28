import { Router } from 'express';
import { query } from '../../db.js';

const router = Router();

function errorResponse(message: string) {
  return { error: true, message };
}

router.get('/', async (_req, res) => {
  try {
    const result = await query(
      `
        SELECT id, rank_name, color_code
        FROM public.belt_ranks
        ORDER BY id
      `,
    );

    return res.json({ belts: result.rows });
  } catch (error) {
    console.error('Failed to fetch belt ranks:', error);
    return res.status(500).json(errorResponse('Unable to fetch belt ranks.'));
  }
});

export default router;
