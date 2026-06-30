ALTER TABLE "serenata_coordinators" ADD COLUMN IF NOT EXISTS "working_comunas" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "serenata_coordinators" ADD COLUMN IF NOT EXISTS "accepts_urgent" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "serenata_notifications" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
--> statement-breakpoint
ALTER TABLE "serenatas" ALTER COLUMN "coordinator_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "serenatas" DROP CONSTRAINT IF EXISTS "serenatas_coordinator_id_serenata_coordinators_id_fk";
--> statement-breakpoint
ALTER TABLE "serenatas" ADD CONSTRAINT "serenatas_coordinator_id_serenata_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."serenata_coordinators"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "serenata_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serenata_id" uuid NOT NULL,
	"coordinator_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'offered' NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"offered_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "serenata_offers" DROP CONSTRAINT IF EXISTS "serenata_offers_serenata_id_serenatas_id_fk";
--> statement-breakpoint
ALTER TABLE "serenata_offers" ADD CONSTRAINT "serenata_offers_serenata_id_serenatas_id_fk" FOREIGN KEY ("serenata_id") REFERENCES "public"."serenatas"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "serenata_offers" DROP CONSTRAINT IF EXISTS "serenata_offers_coordinator_id_serenata_coordinators_id_fk";
--> statement-breakpoint
ALTER TABLE "serenata_offers" ADD CONSTRAINT "serenata_offers_coordinator_id_serenata_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."serenata_coordinators"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_offers_serenata_idx" ON "serenata_offers" USING btree ("serenata_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_offers_coordinator_idx" ON "serenata_offers" USING btree ("coordinator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_offers_status_idx" ON "serenata_offers" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "serenata_offers_unique_idx" ON "serenata_offers" USING btree ("serenata_id","coordinator_id");
--> statement-breakpoint
UPDATE "serenata_coordinators"
SET "working_comunas" = jsonb_build_array("comuna")
WHERE "comuna" IS NOT NULL
	AND ("working_comunas" IS NULL OR "working_comunas" = '[]'::jsonb);
