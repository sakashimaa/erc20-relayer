import { isAddress } from 'viem';
import z from 'zod';
import { baseEnvSchema, loadEnv, withDatabaseUrl } from './base-env.js';

export const env = loadEnv(
  baseEnvSchema
    .extend({
      HTTP_PORT: z.coerce.number().positive().default(3000),
      TOKEN_ADDRESS: z
        .string()
        .refine(isAddress, 'invalid token address')
        .transform((v) => v.toLowerCase()),
    })
    .transform(withDatabaseUrl),
  'api-env validation error',
);
