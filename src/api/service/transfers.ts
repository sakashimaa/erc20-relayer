import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { transfers, type SelectTransfer } from '../../db/schema.js';
import { ConflictError } from '../lib/http-error.js';
import { IDEMPOTENCY_KEY_CONFLICT_CODE } from '../constants/error-code.js';
import { env } from '../../config/api-env.js';
import { WORKER_ATTEMPTS } from '../constants/worker.js';

interface CreateTransferParams {
  to: string;
  amount: string;
  idempotencyKey: string;
}

export const getTransferById = async ({
  id,
}: {
  id: string;
}): Promise<SelectTransfer | undefined> => {
  return (await db.select().from(transfers).where(eq(transfers.id, id)))[0];
};

export const createTransfer = async ({
  to,
  amount,
  idempotencyKey,
}: CreateTransferParams): Promise<{ transfer: SelectTransfer; created: boolean }> => {
  const [created] = await db
    .insert(transfers)
    .values({
      toAddress: to,
      amount,
      idempotencyKey,
      tokenAddress: env.TOKEN_ADDRESS,
      attempts: WORKER_ATTEMPTS,
    })
    .onConflictDoNothing({ target: transfers.idempotencyKey })
    .returning();

  if (created) return { transfer: created, created: true };

  const [existing] = await db
    .select()
    .from(transfers)
    .where(eq(transfers.idempotencyKey, idempotencyKey));

  if (existing?.toAddress !== to || existing?.amount !== amount)
    throw new ConflictError(
      'transfer with this idempotency key already exists',
      IDEMPOTENCY_KEY_CONFLICT_CODE,
    );

  return { transfer: existing, created: false };
};
