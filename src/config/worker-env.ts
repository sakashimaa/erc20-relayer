import { baseEnvSchema, loadEnv, withDatabaseUrl } from './base-env.js';
import { z } from 'zod';

export const env = loadEnv(
  baseEnvSchema
    .extend({
      RELAYER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
      RPC_URL: z.url(),
    })
    .transform(withDatabaseUrl),
  'worker-env validation failed',
);
