import postgres from 'postgres';
import env from '../config/env.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';

const client = postgres(env.DATABASE_URL, { max: 1 });

await migrate(drizzle(client), { migrationsFolder: './drizzle' });
await client.end();

console.log('✅ migrations applied successfully');
