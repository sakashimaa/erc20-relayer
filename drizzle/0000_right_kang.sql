CREATE TYPE "public"."transfer_status" AS ENUM('queued', 'sent', 'confirmed', 'failed');--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"to_address" text NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"status" "transfer_status" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfers_idempotencyKey_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE INDEX "idx_transfers_status_created_at" ON "transfers" USING btree ("status","created_at");