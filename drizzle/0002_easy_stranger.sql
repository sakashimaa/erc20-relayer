ALTER TABLE "transfers" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "last_error" text;--> statement-breakpoint
CREATE INDEX "idx_status_next_attempt_at" ON "transfers" USING btree ("status","next_attempt_at");