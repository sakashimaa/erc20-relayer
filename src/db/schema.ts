import {
  numeric,
  pgEnum,
  pgTable,
  text,
  varchar,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';

const transferStatusEnum = pgEnum('transfer_status', [
  'queued',
  'sent',
  'confirmed',
  'failed',
]);

export const transfers = pgTable(
  'transfers',
  {
    id: uuid().primaryKey().defaultRandom(),

    idempotencyKey: varchar({ length: 255 }).unique().notNull(),
    toAddress: text().notNull(),
    amount: numeric({ precision: 78, scale: 0 }).notNull(),
    status: transferStatusEnum().notNull().default('queued'),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index('idx_transfers_status_created_at').on(t.status, t.createdAt)],
);
