import { queryClient } from '../db/index.js';
import { claimBatch } from './batch.js';
import { setTimeout as sleep } from 'node:timers/promises';

export const BATCH_SIZE = 10;
export const POLL_MS = 1000;

const run = async (signal: AbortSignal) => {
  while (!signal.aborted) {
    const batch = await claimBatch(BATCH_SIZE);

    if (batch.length === 0) {
      await sleep(POLL_MS, undefined, { signal }).catch(() => undefined);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const row of batch) {
      /* signing transaction, sending to sepolia, handling errors
        retry c backoff + jitter, finalizing with token
      */
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
  .catch((err) => {
    console.error('worker error', err);
    process.exitCode = 1;
  })
  .finally(() => queryClient.end());
