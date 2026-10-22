CREATE TABLE "transfer_attempts" (
	"id" bigint PRIMARY KEY NOT NULL,
	"transfer_id" uuid,
	"tx_hash" text NOT NULL,
	"raw_tx" text NOT NULL,
	"max_fee_per_gas" numeric(78, 0) NOT NULL,
	"max_priority_fee_per_gas" numeric(78, 0) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfer_attempts_txHash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "nonce" integer;--> statement-breakpoint
ALTER TABLE "transfer_attempts" ADD CONSTRAINT "transfer_attempts_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_transfer_attempts_transfer_created" ON "transfer_attempts" USING btree ("transfer_id","created_at");--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_nonce_unique" UNIQUE("nonce");