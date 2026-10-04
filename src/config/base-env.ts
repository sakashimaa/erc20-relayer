import { z } from 'zod';
import { fromError } from 'zod-validation-error';
import 'dotenv/config';

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5433),
});

type BaseEnv = z.infer<typeof baseEnvSchema>;

export const withDatabaseUrl = <T extends BaseEnv>(e: T) => ({
  ...e,
  DATABASE_URL: `postgres://${e.POSTGRES_USER}:${e.POSTGRES_PASSWORD}@${e.POSTGRES_HOST}:${e.POSTGRES_PORT}/${e.POSTGRES_DB}`,
});

export const loadEnv = <S extends z.ZodType>(schema: S, name: string): z.output<S> => {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ ', fromError(parsed.error, { prefix: name }));
    process.exit(1);
  }

  return parsed.data;
};

export const env = loadEnv(
  baseEnvSchema.transform(withDatabaseUrl),
  'env validation error',
);
