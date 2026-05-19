CREATE TABLE IF NOT EXISTS "serenata_availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_group_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serenata_availability_rules" ADD CONSTRAINT "serenata_availability_rules_provider_group_id_fk" FOREIGN KEY ("provider_group_id") REFERENCES "public"."serenata_provider_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_availability_rules_provider_idx" ON "serenata_availability_rules" USING btree ("provider_group_id");
--> statement-breakpoint
ALTER TABLE "serenata_provider_groups" ADD COLUMN IF NOT EXISTS "buffer_minutes" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "flexible_schedule" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "serenatas" ALTER COLUMN "event_time" DROP NOT NULL;
