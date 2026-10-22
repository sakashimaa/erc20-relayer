ALTER TABLE "transfer_attempts" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE "transfer_attempts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "transfer_attempts" ALTER COLUMN "transfer_id" SET NOT NULL;