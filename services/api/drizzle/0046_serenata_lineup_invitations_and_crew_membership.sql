ALTER TABLE "serenata_musician_lineup" ADD COLUMN "status" varchar(20) DEFAULT 'invited' NOT NULL;--> statement-breakpoint
ALTER TABLE "serenata_musician_lineup" ADD COLUMN "initiator" varchar(20);--> statement-breakpoint
ALTER TABLE "serenata_musician_lineup" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
ALTER TABLE "serenata_musician_lineup" ADD COLUMN "invited_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "serenata_musician_lineup" ADD COLUMN "responded_at" timestamp;--> statement-breakpoint
ALTER TABLE "serenata_musician_lineup" ADD COLUMN "decline_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "serenata_musician_lineup" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "serenata_musician_profiles" ADD COLUMN "membership_status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "serenata_musician_profiles" ADD COLUMN "membership_initiator" varchar(20);--> statement-breakpoint
ALTER TABLE "serenata_musician_profiles" ADD COLUMN "membership_invited_at" timestamp;--> statement-breakpoint
ALTER TABLE "serenata_musician_profiles" ADD COLUMN "membership_responded_at" timestamp;--> statement-breakpoint
ALTER TABLE "serenata_musician_profiles" ADD COLUMN "membership_message" text;--> statement-breakpoint
ALTER TABLE "serenata_musician_lineup" ADD CONSTRAINT "serenata_musician_lineup_invited_by_serenata_coordinator_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."serenata_coordinator_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "musician_lineup_status_idx" ON "serenata_musician_lineup" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "musician_lineup_serenata_musician_unique_idx" ON "serenata_musician_lineup" USING btree ("serenata_id","musician_id");--> statement-breakpoint
CREATE INDEX "musician_profiles_membership_status_idx" ON "serenata_musician_profiles" USING btree ("membership_status");--> statement-breakpoint
CREATE UNIQUE INDEX "musician_profiles_user_coord_unique_idx" ON "serenata_musician_profiles" USING btree ("user_id","coordinator_profile_id");--> statement-breakpoint
-- Backfill: las filas previas con confirmed_at se consideran aceptadas (self-pickup o flujo histórico)
UPDATE "serenata_musician_lineup"
SET "status" = 'accepted',
    "responded_at" = COALESCE("responded_at", "confirmed_at"),
    "initiator" = COALESCE("initiator", 'musician')
WHERE "confirmed_at" IS NOT NULL;