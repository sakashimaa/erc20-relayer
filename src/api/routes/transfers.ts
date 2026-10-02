import { Router } from 'express';
import type { Request, Response } from 'express';
import { transferByIdSchema } from '../schemas/transfers.js';
import { BadRequestError, NotFoundError } from '../lib/http-error.js';
import { getTransferById } from '../service/transfers.js';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  const query = transferByIdSchema.safeParse(req.params);

  if (!query.success) throw new BadRequestError();

  const result = await getTransferById({ id: query.data.id });
  if (!result) throw new NotFoundError('transfer not found');

  res.status(200).json({
    id: result.id,
    idempotencyKey: result.idempotencyKey,
    toAddress: result.toAddress,
    amount: result.amount,
    status: result.status,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  });
});

export { router };
