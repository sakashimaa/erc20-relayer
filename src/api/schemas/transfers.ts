import z from 'zod';
import { addressSchema, amountSchema } from './common.js';

export const transferByIdSchema = z.object({
  id: z.uuid(),
});

export const createTransferSchema = z.object({
  to: addressSchema,
  amount: amountSchema,
  idempotencyKey: z.uuid(),
});
