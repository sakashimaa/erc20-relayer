import { Router } from 'express';
import type { Request, Response } from 'express';
import { createTransferSchema, transferByIdSchema } from '../schemas/transfers.js';
import { BadRequestError, NotFoundError } from '../lib/http-error.js';
import { createTransfer, getTransferById } from '../service/transfers.js';
import { toTransferDto } from '../dto/transfer.js';
import z from 'zod';
import { VALIDATION_FAILED_CODE } from '../constants/error-code.js';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  const query = transferByIdSchema.safeParse(req.params);

  if (!query.success) throw new BadRequestError();

  const result = await getTransferById({ id: query.data.id });
  if (!result) throw new NotFoundError('transfer not found');

  res.status(200).json(toTransferDto(result));
});

router.post('/', async (req: Request, res: Response) => {
  const body = createTransferSchema.safeParse(req.body);
  if (!body.success)
    throw new BadRequestError(
      'invalid body',
      VALIDATION_FAILED_CODE,
      z.flattenError(body.error),
    );

  const { transfer, created } = await createTransfer(body.data);
  const mapped = toTransferDto(transfer);

  res.status(created ? 201 : 200).json(mapped);
});

export { router };
