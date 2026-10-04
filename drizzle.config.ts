import { defineConfig } from 'drizzle-kit';
import { env } from './src/config/base-env.js';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: env.DATABASE_URL },
  casing: 'snake_case',
});
