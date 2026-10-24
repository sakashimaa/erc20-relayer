import { db, queryClient } from '../db/index.js';
import { claimBatch } from './batch.js';
import { setTimeout as sleep } from 'node:timers/promises';
import { check, LeaseLostError, preflight, prepare, send } from './utils.js';
import logger from '../lib/logger.js';
import { BaseError } from 'viem';
import { transfers } from '../db/schema.js';
import { and, eq, sql } from 'drizzle-orm';
import { classify } from './errors.js';

export const BATCH_SIZE = 1;
export const POLL_MS = 1000;
export const CHECK_DELAY_MS = 12_000; /* one block */
export const BUMP_AFTER_MS = 1000 * 30; /* 3 mins */

const BASE_MS = 1000;
const MAX_MS = 30_000; /* 30 secs */
const MAX_ATTEMPTS = 5;

const failTransfer = async (id: string, attempts: number, message: string) => {
  await db
    .update(transfers)
    .set({
      status: 'failed',
      lastError: message,
      lockedUntil: null,
    })
    .where(
      and(
        eq(transfers.id, id),
        eq(transfers.status, 'queued'),
        eq(transfers.attempts, attempts),
      ),
    );
};

const retryLater = async (
  id: string,
  attempts: number,
  message: string,
  delayMs: number,
) => {
  await db
    .update(transfers)
    .set({
      lastError: message,
      nextAttemptAt: sql`now() + make_interval(secs => ${delayMs / 1000})`,
      lockedUntil: null,
    })
    .where(and(eq(transfers.id, id), eq(transfers.attempts, attempts)));
};

const backoffMs = (attempt: number) =>
  Math.min(BASE_MS * 2 ** (attempt - 1), MAX_MS) * (0.5 + Math.random() / 2);

const run = async (signal: AbortSignal) => {
  await preflight();

  while (!signal.aborted) {
    const batch = await claimBatch(BATCH_SIZE);

    if (batch.length === 0) {
      await sleep(POLL_MS, undefined, { signal }).catch(() => undefined);
      continue;
    }

    for (const row of batch) {
      if (signal.aborted) break;

      try {
        switch (row.status) {
          case 'queued':
            await prepare(row);
            await send({ ...row, status: 'signed' });

            break;
          case 'signed':
            await send(row);
            break;
          case 'sent':
            await check(row);
            break;
          default:
            continue;
        }
      } catch (e) {
        if (e instanceof LeaseLostError) {
          logger.info({ id: row.id }, 'row already occupied');
          continue;
        }

        const kind = classify(e);
        const message = e instanceof BaseError ? e.shortMessage : String(e);

        try {
          if (kind === 'network') {
            await retryLater(row.id, row.attempts, message, backoffMs(row.attempts));
          } else if (row.attempts >= MAX_ATTEMPTS && row.status === 'queued') {
            await failTransfer(row.id, row.attempts, message);
          } else {
            await retryLater(row.id, row.attempts, message, backoffMs(row.attempts));
          }
        } catch (e) {
          logger.error({ err: e }, 'failed to mark row');
        }

        logger.error({ id: row.id, reason: message }, 'transfer step failed');
      }
    }
  }
};

const ac = new AbortController();
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    ac.abort();
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}

run(ac.signal)
  .catch((e) => {
    logger.fatal(
      { reason: e instanceof BaseError ? e.shortMessage : String(e) },
      'worker failed',
    );
    process.exitCode = 1;
  })
  .finally(() => queryClient.end());
