import {
  numeric,
  pgEnum,
  pgTable,
  text,
  varchar,
  timestamp,
  uuid,
  index,
  integer,
  bigint,
} from 'drizzle-orm/pg-core';

export const transferStatusEnum = pgEnum('transfer_status', [
  'queued',
  'signed',
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
    tokenAddress: text().notNull(),
    amount: numeric({ precision: 78, scale: 0 }).notNull(),
    status: transferStatusEnum().notNull().default('queued'),

    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lockedUntil: timestamp({ withTimezone: true }),
    lastError: text(),

    nonce: integer().unique(),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('idx_transfers_status_created_at').on(t.status, t.createdAt),
    index('idx_status_next_attempt_at').on(t.status, t.nextAttemptAt),
  ],
);

export const transferAttempts = pgTable(
  'transfer_attempts',
  {
    id: uuid().primaryKey().defaultRandom(),

    transferId: uuid()
      .references(() => transfers.id)
      .notNull(),
    txHash: text().notNull().unique(),
    rawTx: text().notNull(),
    maxFeePerGas: numeric({ precision: 78, scale: 0 }).notNull(),
    maxPriorityFeePerGas: numeric({ precision: 78, scale: 0 }).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_transfer_attempts_transfer_created').on(t.transferId, t.createdAt)],
);

export type SelectTransfer = typeof transfers.$inferSelect;
export type InsertTransfer = typeof transfers.$inferInsert;
