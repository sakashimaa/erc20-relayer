import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import type { SelectTransfer } from '../db/schema.js';

export const LEASE_MS = 5000;

type ClaimedTransfer = Pick<
  SelectTransfer,
  'id' | 'toAddress' | 'tokenAddress' | 'amount' | 'attempts'
>;

export const claimBatch = async (limit: number): Promise<ClaimedTransfer[]> => {
  return await db.execute<ClaimedTransfer>(sql`
    UPDATE transfers
    SET attempts = attempts + 1,
        locked_until = now() + make_interval(secs => ${LEASE_MS / 1000})
    WHERE id IN (
      SELECT id FROM transfers
      WHERE status = 'queued'
        AND next_attempt_at <= now()
        AND (locked_until IS NULL OR locked_until < now())
      ORDER BY next_attempt_at 
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id,
              to_address AS "toAddress",
              token_address AS "tokenAddress",
              amount,
              attempts
  `);
};
