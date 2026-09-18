import postgres from 'postgres';
import * as schema from './schema.js';
import env from '../config/env.js';
import { drizzle } from 'drizzle-orm/postgres-js';

export const queryClient = postgres(env.DATABASE_URL);
export const db = drizzle(queryClient, {
  schema,
  casing: 'snake_case',
  logger: env.NODE_ENV !== 'production',
});

export { schema };
